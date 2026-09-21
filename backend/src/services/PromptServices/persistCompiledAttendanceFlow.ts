/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Camada de persistência do Step IR + AttendanceFlowDefinition (PR 1).
 *
 * Antes desta camada o roteiro era persistido como N linhas em `AttendanceFlowSteps`
 * apenas com `agentPrompt/responseOptions/conditions/attachments`. Agora cada linha
 * recebe também o IR compilado por `compileAttendanceFlowIR`, e uma linha 1:1 em
 * `AttendanceFlowDefinitions` guarda metadados globais do fluxo.
 *
 * Princípios:
 * - Idempotente por save: apaga as N etapas anteriores do agente e recria com o IR novo.
 * - Backwards-compat: agentes sem `attendanceScript` continuam funcionando — não rodamos
 *   o compilador (segue o caminho legado em CreatePromptService/UpdatePromptService).
 * - Sempre dentro de uma transação Sequelize (o caller passa).
 */

import { Transaction } from "sequelize";
import AttendanceFlowStep from "../../models/AttendanceFlowStep";
import AttendanceFlowDefinition from "../../models/AttendanceFlowDefinition";
import logger from "../../utils/logger";
import {
  compileAttendanceFlowIR,
  type CompiledFlowDefinitionDraft,
  type CompiledStepIR,
  type CompileAttendanceFlowIRInput
} from "../../helpers/compileAttendanceFlowIR";
import {
  computeAttendanceFlowIrHash,
  type IrHashInput
} from "../../helpers/computeAttendanceFlowIrHash";
import {
  generateAttendanceFlowUnderstanding,
  resolveUnderstandingMode,
  type FlowUnderstanding
} from "./AttendanceFlowUnderstandingService";

const asDbJson = <T = unknown>(value: unknown, fallback: T): T | string => {
  try {
    return JSON.stringify(value ?? fallback);
  } catch {
    return JSON.stringify(fallback);
  }
};

export type PersistCompiledFlowParams = {
  promptId: number;
  companyId: number;
  transaction: Transaction;
  compilerInput: CompileAttendanceFlowIRInput;
  /**
   * Quando true, persiste mesmo se o roteiro for vazio (só com fallback). Default false:
   * agentes sem script não criam linhas — o motor cai no caminho legado.
   */
  alwaysPersist?: boolean;
  /**
   * API key OpenAI do agente — usada pelo `AttendanceFlowUnderstandingService` quando
   * o modo é `llm` ou `auto`. Quando ausente, o serviço cai automaticamente em fallback.
   */
  apiKey?: string | null;
  /** Modelo OpenAI a usar na pré-compreensão (default lê env / OPENAI_DEFAULT_CHAT_MODEL). */
  understandingModel?: string;
  /** Override do modo de pré-compreensão; default lê env (`fallback` por segurança). */
  understandingMode?: "auto" | "llm" | "fallback";
};

export type PersistCompiledFlowResult = {
  steps: CompiledStepIR[];
  definition: CompiledFlowDefinitionDraft;
  warnings: string[];
  persisted: boolean;
  irHash?: string;
  understanding?: FlowUnderstanding | null;
  understandingCacheHit?: boolean;
};

/**
 * Compila o roteiro e persiste tudo (passos + definition) na transação aberta.
 * Caller deve garantir que `transaction` esteja ativa.
 */
export async function persistCompiledAttendanceFlow(
  params: PersistCompiledFlowParams
): Promise<PersistCompiledFlowResult> {
  const { promptId, companyId, transaction, compilerInput, alwaysPersist = false } = params;
  const { steps, definition, warnings } = compileAttendanceFlowIR(compilerInput);

  const hasMeaningfulScript = String(compilerInput.script || "").trim().length > 0;
  const shouldPersist = alwaysPersist || hasMeaningfulScript;
  if (!shouldPersist) {
    return { steps, definition, warnings, persisted: false };
  }

  /** Apaga linhas anteriores deste agente: idempotência por save. */
  await AttendanceFlowStep.destroy({ where: { promptId, companyId }, transaction });

  /**
   * Lista de campos IR — se o model em runtime já tiver feito `removeAttribute`
   * (auto-migrator detectou coluna ausente), o build do payload exclui esses campos
   * para evitar erro do tipo "column does not exist" no INSERT.
   */
  const stepAttrs: Set<string> = new Set(
    Object.keys((AttendanceFlowStep as any).rawAttributes || {})
  );
  const safe = <T>(name: string, value: T): Record<string, T> =>
    stepAttrs.has(name) ? ({ [name]: value } as any) : ({} as any);

  for (const s of steps) {
    const payload: Record<string, any> = {
      stepNumber: s.stepNumber,
      agentPrompt: s.agentPrompt,
      responseOptions: asDbJson(s.responseOptions, []) as any,
      conditions: asDbJson(s.conditions, []) as any,
      attachments: asDbJson(s.attachments, []) as any,
      promptId,
      companyId,
      ...safe("title", s.title || null),
      ...safe("objective", s.objective || null),
      ...safe("expectedReply", s.expectedReply || null),
      ...safe("slotName", s.slotName || null),
      ...safe("slotSchema", s.slotSchema ? (asDbJson(s.slotSchema, null) as any) : null),
      ...safe("branchesIR", asDbJson(s.branchesIR, []) as any),
      ...safe("commandsIR", asDbJson(s.commandsIR, []) as any),
      ...safe("customerVisibleText", s.customerVisibleText || null),
      ...safe(
        "trainingMarkers",
        asDbJson(s.trainingMarkers, { examples: [], objections: [] }) as any
      ),
      ...safe("version", 1)
    };
    await AttendanceFlowStep.create(payload as any, { transaction });
  }

  /** Hash determinístico do IR — chave de cache do flowUnderstanding. */
  const irHash = computeAttendanceFlowIrHash({
    compilerVersion: definition.compilerVersion,
    entryStepId: definition.entryStepId,
    fallbackStepId: definition.fallbackStepId,
    policy: definition.policy,
    transitionHooks: definition.transitionHooks,
    steps: steps as IrHashInput["steps"]
  });

  /**
   * Upsert manual em AttendanceFlowDefinition (Sequelize 5/6 com tipos antigos não tem upsert garantido).
   * Resiliência: se a tabela `AttendanceFlowDefinitions` não existir (auto-migrator falhou),
   * captura o erro e segue sem persistir definition — os passos já foram salvos.
   */
  let existing: any = null;
  let definitionTableAvailable = true;
  try {
    existing = await AttendanceFlowDefinition.findOne({
      where: { promptId, companyId },
      transaction
    });
  } catch (e: any) {
    definitionTableAvailable = false;
    logger.warn(
      `[ATTENDANCE-FLOW] AttendanceFlowDefinitions indisponível (promptId=${promptId}): ${
        e?.message || e
      } — persistindo apenas os passos.`
    );
    return { steps, definition, warnings, persisted: true, irHash: undefined };
  }
  void definitionTableAvailable;

  /**
   * Cache hit: se o IR não mudou desde a última pré-compreensão, mantém o
   * `flowUnderstanding` antigo e não chama LLM. Isso garante que o `understanding`
   * só é regenerado quando o roteiro efetivamente muda.
   */
  let understanding: FlowUnderstanding | null = null;
  let understandingCacheHit = false;
  const existingUnderstanding =
    existing?.getDataValue("flowUnderstanding") as FlowUnderstanding | null | undefined;
  if (existingUnderstanding && (existingUnderstanding as any)?.irHash === irHash) {
    understanding = existingUnderstanding as FlowUnderstanding;
    understandingCacheHit = true;
  }

  const defPayload: Record<string, any> = {
    promptId,
    companyId,
    entryStepId: definition.entryStepId,
    fallbackStepId: definition.fallbackStepId,
    policy: definition.policy as any,
    compilerVersion: definition.compilerVersion,
    lastCompiledAt: new Date(definition.lastCompiledAt),
    transitionHooks: definition.transitionHooks as any
  };

  if (existing) {
    /** Não toca em flowUnderstanding aqui (cache); pré-compreensão grava depois. */
    await existing.update(defPayload as any, { transaction });
  } else {
    await AttendanceFlowDefinition.create(
      {
        ...defPayload,
        flowUnderstanding: null,
        flowUnderstandingVersion: 0
      } as any,
      { transaction }
    );
  }

  if (warnings.length) {
    try {
      logger.info(
        JSON.stringify({
          evt: "attendance_flow_compiled",
          promptId,
          companyId,
          stepCount: steps.length,
          compilerVersion: definition.compilerVersion,
          irHash,
          warnings: warnings.slice(0, 20)
        })
      );
    } catch {
      /* ignore log failure */
    }
  }

  /**
   * Cache miss → roda pré-compreensão. Por padrão o modo é `fallback` (sem LLM)
   * para manter saves rápidos e deploys seguros. Ative `ATTENDANCE_FLOW_UNDERSTANDING_LLM_ENABLED=true`
   * para ligar o caminho LLM em `auto`.
   */
  if (!understandingCacheHit) {
    try {
      const mode = resolveUnderstandingMode(params.understandingMode);
      const result = await generateAttendanceFlowUnderstanding({
        steps,
        definition,
        apiKey: params.apiKey || null,
        model: params.understandingModel,
        mode,
        irHash
      });
      understanding = result.understanding;
      warnings.push(...result.warnings);

      /** Persistência da pré-compreensão + bump da versão (fora da transação principal
       *  evita aumentar tempo de lock; mas dentro do mesmo update se persistido na linha 1:1). */
      const newRow = existing
        ? existing
        : await AttendanceFlowDefinition.findOne({ where: { promptId, companyId }, transaction });
      if (newRow) {
        const prevVersion = Number(newRow.getDataValue("flowUnderstandingVersion") || 0);
        await newRow.update(
          {
            flowUnderstanding: understanding as any,
            flowUnderstandingVersion: prevVersion + 1
          } as any,
          { transaction }
        );
      }

      try {
        logger.info(
          JSON.stringify({
            evt: "attendance_flow_understanding_built",
            promptId,
            companyId,
            irHash,
            source: understanding?.source || "unknown",
            mode,
            confidence: understanding?.confidence ?? null,
            steps: understanding?.stepMap.length ?? 0,
            risks: understanding?.risksDetected.length ?? 0
          })
        );
      } catch {
        /* ignore log */
      }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      logger.warn(
        `[ATTENDANCE-FLOW] geração de flowUnderstanding falhou (promptId=${promptId}): ${errMsg}`
      );
      warnings.push(`flowUnderstanding indisponível: ${errMsg}`);
    }
  }

  return {
    steps,
    definition,
    warnings,
    persisted: true,
    irHash,
    understanding,
    understandingCacheHit
  };
}
