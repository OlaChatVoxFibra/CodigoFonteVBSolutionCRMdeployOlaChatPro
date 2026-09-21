/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Prompt from "../../models/Prompt";
import AttendanceFlowStep from "../../models/AttendanceFlowStep";
import sequelize from "../../database";
import ShowPromptService from "./ShowPromptService";
import { pickAttendanceFlowStepRow } from "../../helpers/pickAttendanceFlowStepRow";
import { attachPromptOwnerToPromptRow } from "../../helpers/promptJsonOwner";
import { assertPromptUniqueInCompany } from "../../helpers/assertPromptUniqueInCompany";
import { resolvePromptQueueId } from "../../helpers/resolvePromptQueueId";
import { persistCompiledAttendanceFlow } from "./persistCompiledAttendanceFlow";
import type { CompileAttendanceFlowIRInput } from "../../helpers/compileAttendanceFlowIR";
import { OPENAI_DEFAULT_CHAT_MODEL } from "../../config/openAiDefaults";

interface PromptData {
    name: string;
    apiKey: string;
    prompt: string;
    model?: string;
    maxTokens?: number | string | null;
    temperature?: number | string | null;
    promptTokens?: number | string | null;
    completionTokens?: number | string | null;
    totalTokens?: number | string | null;
    queueId?: number | string | null;
    maxMessages?: number | string | null;
    companyId: string | number;
    voice?: string;
    voiceKey?: string;
    voiceRegion?: string;
    cargo?: any;
    cerebro?: any;
    produtividade?: any;
    midias?: any;
    attendanceFlowSteps?: any[];
    /** Entrada para o compilador IR (fluxo agente IA senior revamp / PR 1). */
    attendanceFlowCompilerInput?: CompileAttendanceFlowIRInput;
    description?: string | null;
    role?: string | null;
    language?: string | null;
    emojisEnabled?: boolean;
    responseDelay?: number | null;
    generalRules?: string | null;
    attendanceScript?: string | null;
    faqEnabled?: boolean;
    knowledgeEnabled?: boolean;
    agentColor?: string | null;
}

const asDbJson = <T = any>(value: unknown, fallback: T): T | string => {
  try {
    return JSON.stringify(value ?? fallback);
  } catch {
    return JSON.stringify(fallback);
  }
};

const CreatePromptService = async (promptData: PromptData): Promise<Prompt> => {
    const { name, apiKey, prompt, model, cargo, cerebro, produtividade, midias, attendanceFlowSteps, attendanceFlowCompilerInput } = promptData;

    const rawMax = promptData.maxMessages as unknown;
    const maxMessages = rawMax === "" || rawMax == null ? 10 : Number(rawMax);
    const companyId = Number(promptData.companyId);

    const promptSchema = Yup.object().shape({
        name: Yup.string().required("ERR_PROMPT_NAME_INVALID"),
        prompt: Yup.string().required("ERR_PROMPT_INTELLIGENCE_INVALID"),
        apiKey: Yup.string().required("ERR_PROMPT_APIKEY_INVALID"),
        model: Yup.string().optional(),
        maxMessages: Yup.number().typeError("ERR_PROMPT_MAX_MESSAGES_INVALID").required("ERR_PROMPT_MAX_MESSAGES_INVALID"),
        companyId: Yup.number().typeError("ERR_PROMPT_companyId_INVALID").required("ERR_PROMPT_companyId_INVALID")
    });

    try {
        await promptSchema.validate({ name, apiKey, prompt, model, maxMessages, companyId });
    } catch (err: any) {
        const msg =
          typeof err?.message === "string"
            ? err.message
            : Array.isArray(err?.errors) && err.errors[0]
              ? String(err.errors[0])
              : "Dados do agente inválidos. Verifique nome, API key, fila e mensagens.";
        throw new AppError(msg, 400);
    }

    if (!Number.isFinite(companyId) || companyId <= 0) {
        throw new AppError("Sessão inválida.", 401);
    }
    if (!Number.isFinite(maxMessages) || maxMessages < 1) {
        throw new AppError("Número máximo de mensagens inválido.", 400);
    }

    await assertPromptUniqueInCompany(companyId, prompt);

    const queueId = resolvePromptQueueId(promptData.queueId, null);

    const promptTable = await sequelize.transaction(async (t) => {
      let p = await Prompt.create(
        {
          name,
          apiKey,
          prompt,
          model: model || OPENAI_DEFAULT_CHAT_MODEL,
          queueId,
          maxMessages,
          companyId,
          voice: promptData.voice,
          voiceKey: promptData.voiceKey,
          voiceRegion: promptData.voiceRegion,
          maxTokens: promptData.maxTokens,
          temperature: promptData.temperature,
          promptTokens: promptData.promptTokens,
          completionTokens: promptData.completionTokens,
          totalTokens: promptData.totalTokens,
          cargo,
          cerebro,
          produtividade,
          midias,
          description: promptData.description ?? null,
          role: promptData.role ?? null,
          language: promptData.language ?? null,
          emojisEnabled: promptData.emojisEnabled !== undefined ? promptData.emojisEnabled : true,
          responseDelay: promptData.responseDelay ?? null,
          generalRules: promptData.generalRules ?? null,
          attendanceScript: promptData.attendanceScript ?? null,
          faqEnabled: promptData.faqEnabled !== undefined ? promptData.faqEnabled : true,
          knowledgeEnabled: promptData.knowledgeEnabled !== undefined ? promptData.knowledgeEnabled : true,
          agentColor: promptData.agentColor ?? null
        },
        { transaction: t }
      );

      const ownedBlobs = attachPromptOwnerToPromptRow(p.id, {
        cargo,
        cerebro,
        produtividade
      });
      await p.update(
        {
          cargo: ownedBlobs.cargo as any,
          cerebro: ownedBlobs.cerebro as any,
          produtividade: ownedBlobs.produtividade as any,
          linkedAgentId: p.id
        },
        { transaction: t }
      );

      if (attendanceFlowCompilerInput && typeof attendanceFlowCompilerInput.script === "string") {
        /** Caminho V2: roda o compilador IR + pré-compreensão e persiste passos + Definition. */
        await persistCompiledAttendanceFlow({
          promptId: p.id,
          companyId,
          transaction: t,
          compilerInput: attendanceFlowCompilerInput,
          apiKey: apiKey || null
        });
      } else if (Array.isArray(attendanceFlowSteps) && attendanceFlowSteps.length > 0) {
        /** Caminho legado: payload v1 com `attendanceFlowSteps` cru — sem IR. */
        for (let idx = 0; idx < attendanceFlowSteps.length; idx++) {
          const step = attendanceFlowSteps[idx];
          const row = pickAttendanceFlowStepRow(step, p.id);
          row.stepNumber = idx + 1;
          await AttendanceFlowStep.create(
            {
              ...row,
              responseOptions: asDbJson(row.responseOptions, []),
              conditions: asDbJson(row.conditions, []),
              attachments: asDbJson(row.attachments, []),
              promptId: p.id,
              companyId
            },
            { transaction: t }
          );
        }
      }

      return p;
    });

    return ShowPromptService({ promptId: promptTable.id, companyId });
};

export default CreatePromptService;
