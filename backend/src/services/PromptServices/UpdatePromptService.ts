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

interface PromptData {
    id?: number;
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

interface Request {
    promptData: PromptData;
    promptId: string | number;
    companyId: string | number;
}

const asDbJson = <T = any>(value: unknown, fallback: T): T | string => {
  try {
    return JSON.stringify(value ?? fallback);
  } catch {
    return JSON.stringify(fallback);
  }
};

const UpdatePromptService = async ({
    promptId,
    promptData,
    companyId
}: Request): Promise<Prompt | undefined> => {
    const companyIdNum = Number(companyId);
    const promptTable = await ShowPromptService({ promptId: promptId, companyId });

    const promptSchema = Yup.object().shape({
        name: Yup.string().required("ERR_PROMPT_NAME_INVALID"),
        prompt: Yup.string().required("ERR_PROMPT_PROMPT_INVALID"),
        apiKey: Yup.string().required("ERR_PROMPT_APIKEY_INVALID"),
        maxMessages: Yup.number().typeError("ERR_PROMPT_MAX_MESSAGES_INVALID").required("ERR_PROMPT_MAX_MESSAGES_INVALID")
    });

    const { name, apiKey, prompt, model, voice, voiceKey, voiceRegion, cargo, cerebro, produtividade, midias, attendanceFlowSteps, attendanceFlowCompilerInput } = promptData;

    const rawMaxMsg = promptData.maxMessages as unknown;
    const maxMessages = rawMaxMsg === "" || rawMaxMsg == null ? 10 : Number(rawMaxMsg);
    const toOptNum = (v: unknown): number | undefined => {
      if (v === "" || v == null) return undefined;
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };
    const maxTokens = toOptNum(promptData.maxTokens as unknown);
    const temperature = toOptNum(promptData.temperature as unknown);
    const promptTokens = toOptNum(promptData.promptTokens as unknown);
    const completionTokens = toOptNum(promptData.completionTokens as unknown);
    const totalTokens = toOptNum(promptData.totalTokens as unknown);

    try {
        await promptSchema.validate({
          name,
          apiKey,
          prompt,
          maxMessages
        });
    } catch (err: any) {
        const msg =
          typeof err?.message === "string"
            ? err.message
            : Array.isArray(err?.errors) && err.errors[0]
              ? String(err.errors[0])
              : "Dados do agente inválidos.";
        throw new AppError(msg, 400);
    }

    if (!Number.isFinite(maxMessages) || maxMessages < 1) {
        throw new AppError("Número máximo de mensagens inválido.", 400);
    }

    await assertPromptUniqueInCompany(companyIdNum, prompt, Number(promptTable.id));

    const queueId = resolvePromptQueueId(
      promptData.queueId,
      promptTable.getDataValue("queueId") as number | null | undefined
    );

    const ownedBlobs = attachPromptOwnerToPromptRow(Number(promptTable.id), {
      cargo,
      cerebro,
      produtividade
    });

    const midiasVal = midias !== undefined ? midias : promptTable.getDataValue("midias");

    await sequelize.transaction(async (t) => {
      await promptTable.update(
        {
          name,
          apiKey,
          prompt,
          model,
          maxTokens,
          temperature,
          promptTokens,
          completionTokens,
          totalTokens,
          queueId,
          maxMessages,
          voice,
          voiceKey,
          voiceRegion,
          cargo: ownedBlobs.cargo as any,
          cerebro: ownedBlobs.cerebro as any,
          produtividade: ownedBlobs.produtividade as any,
          midias: midiasVal as any,
          description: promptData.description ?? promptTable.getDataValue("description"),
          role: promptData.role ?? promptTable.getDataValue("role"),
          language: promptData.language ?? promptTable.getDataValue("language"),
          emojisEnabled:
            promptData.emojisEnabled !== undefined
              ? promptData.emojisEnabled
              : (promptTable.getDataValue("emojisEnabled") as boolean),
          responseDelay:
            promptData.responseDelay !== undefined
              ? promptData.responseDelay
              : promptTable.getDataValue("responseDelay"),
          generalRules: promptData.generalRules ?? promptTable.getDataValue("generalRules"),
          attendanceScript: promptData.attendanceScript ?? promptTable.getDataValue("attendanceScript"),
          faqEnabled:
            promptData.faqEnabled !== undefined
              ? promptData.faqEnabled
              : (promptTable.getDataValue("faqEnabled") as boolean),
          knowledgeEnabled:
            promptData.knowledgeEnabled !== undefined
              ? promptData.knowledgeEnabled
              : (promptTable.getDataValue("knowledgeEnabled") as boolean),
          agentColor:
            promptData.agentColor !== undefined
              ? promptData.agentColor
              : promptTable.getDataValue("agentColor"),
          linkedAgentId: Number(promptTable.id)
        },
        { transaction: t }
      );

      if (attendanceFlowCompilerInput && typeof attendanceFlowCompilerInput.script === "string") {
        /** Caminho V2: compila o roteiro + pré-compreensão e persiste passos + Definition. */
        await persistCompiledAttendanceFlow({
          promptId: Number(promptTable.id),
          companyId: companyIdNum,
          transaction: t,
          compilerInput: attendanceFlowCompilerInput,
          alwaysPersist: true,
          apiKey: apiKey || null
        });
      } else if (Array.isArray(attendanceFlowSteps)) {
        /** Caminho legado: payload v1 com `attendanceFlowSteps` cru. */
        await AttendanceFlowStep.destroy({
          where: { promptId: promptTable.id, companyId: companyIdNum },
          transaction: t
        });
        for (let idx = 0; idx < attendanceFlowSteps.length; idx++) {
          const step = attendanceFlowSteps[idx];
          const row = pickAttendanceFlowStepRow(step, promptTable.id);
          row.stepNumber = idx + 1;
          await AttendanceFlowStep.create(
            {
              ...row,
              responseOptions: asDbJson(row.responseOptions, []),
              conditions: asDbJson(row.conditions, []),
              attachments: asDbJson(row.attachments, []),
              promptId: promptTable.id,
              companyId: companyIdNum
            },
            { transaction: t }
          );
        }
      }
    });

    return ShowPromptService({ promptId: promptTable.id, companyId: companyIdNum });
};

export default UpdatePromptService;
