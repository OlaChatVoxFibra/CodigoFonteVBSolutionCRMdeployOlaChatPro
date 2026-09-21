/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import OpenAI from "openai";
import AiBrainConversation from "../../../models/AiBrainConversation";
import AiBrainMessage from "../../../models/AiBrainMessage";
import User from "../../../models/User";
import Company from "../../../models/Company";
import Inventory from "../../../models/Inventory";
import LeadSale from "../../../models/LeadSale";
import { createGrokClient } from "../runtime/GrokRuntime";
import { resolveGrokModelId } from "../utils/isGrokModel";
import { assertGrokBrainModelAvailable } from "../utils/grokBrainRouting";
import { buildBrainSystemPrompt } from "../../../services/AiBrainServices/brainSystemPrompt";
import { parseBrainPersonalization } from "../../../services/AiBrainServices/brainPersonalizationPrompt";
import { assertConversationBelongsToProject } from "../../../services/AiBrainServices/brainConversationScope";
import { enrichBrainMessageWithAttachments } from "../../../services/AiBrainServices/brainAttachmentContent";
import { chargeBrainTurn } from "../../../services/AiBrainServices/BrainCreditService";
import {
  buildBrainTools,
  executeAiBrainCrmTool
} from "../../../services/AiBrainServices/AiBrainCrmTools";
import {
  parseBrainToolGeneratedFile,
  BrainCodeSnapshotAccumulator,
  type BrainGeneratedFile
} from "../../../services/AiBrainServices/brainGeneratedFile";
import { syncGeneratedFileToIdeBuild } from "../../../services/AiBrainServices/brainSyncGeneratedFileToIde";
import { brainProviderFromModel } from "../../../services/AiBrainServices/brainModelRouting";
import logger from "../../../utils/logger";

type Attachment = {
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
};

type ChatParams = {
  companyId: number;
  userId: number;
  conversationId?: number;
  message: string;
  model?: string;
  persistModel?: string | null;
  attachments?: Attachment[];
  language?: string;
  voiceMode?: boolean;
  mcpConnections?: string[];
  projectId?: number;
  personalization?: unknown;
};

type ChatResult = {
  conversationId: number;
  response: string;
  toolsUsed: string[];
  generatedFile?: BrainGeneratedFile;
  codeSnapshot?: { projectTitle: string; files: Record<string, string>; workspaceId?: number };
};

/**
 * Brain.AI com Grok (API xAI — chat.completions + tools no formato OpenAI).
 */
export async function grokBrainChat(params: ChatParams): Promise<ChatResult> {
  const routed = await assertGrokBrainModelAvailable(params.companyId, params.model);
  const { companyId, userId, attachments } = params;
  const message = enrichBrainMessageWithAttachments(
    params.message,
    companyId,
    attachments
  );
  const selectedModel = resolveGrokModelId(routed.modelId);
  const conversationModel = params.persistModel || selectedModel;
  const client = createGrokClient(routed.apiKey);

  let conversation: AiBrainConversation;
  let previousProvider: ReturnType<typeof brainProviderFromModel> | null = null;
  if (params.conversationId) {
    conversation = await AiBrainConversation.findOne({
      where: { id: params.conversationId, companyId, userId }
    });
    if (!conversation) {
      throw new Error("Conversa não encontrada.");
    }
    assertConversationBelongsToProject(conversation, params.projectId);
    if (conversation.model) {
      previousProvider = brainProviderFromModel(conversation.model);
    }
  } else {
    const title = message.length > 60 ? `${message.substring(0, 57)}...` : message;
    if (!params.projectId) {
      throw new Error("Selecione um projeto Brain antes de iniciar uma conversa.");
    }
    conversation = await AiBrainConversation.create({
      title,
      model: conversationModel,
      companyId,
      userId,
      projectId: params.projectId
    });
  }

  await AiBrainMessage.create({
    role: "user",
    content: message,
    conversationId: conversation.id,
    companyId
  });

  const previousMessages = await AiBrainMessage.findAll({
    where: { conversationId: conversation.id },
    order: [["createdAt", "ASC"]],
    limit: 50
  });

  const LANGUAGE_MAP: Record<string, string> = {
    "pt-BR": "português do Brasil",
    en: "English",
    es: "español",
    fr: "français",
    de: "Deutsch",
    it: "italiano"
  };
  const langLabel = LANGUAGE_MAP[params.language || "pt-BR"] || "português do Brasil";
  const langInstruction = `\n\nIMPORTANTE: Responda SEMPRE em ${langLabel}.`;

  let userContext = "";
  try {
    const [currentUser, company, productCount, leadSaleCount] = await Promise.all([
      User.findByPk(userId, { attributes: ["id", "name", "email", "profile"] }),
      Company.findByPk(companyId, { attributes: ["id", "name", "phone", "email"] }),
      Inventory.count({ where: { companyId } }),
      LeadSale.count({ where: { companyId } })
    ]);
    userContext = `\n\n**CONTEXTO DO USUÁRIO ATUAL:**
- Usuário: ${currentUser?.name || "?"} (${currentUser?.email || "?"}) — Perfil: ${currentUser?.profile || "?"}
- Organização: ${company?.name || "?"} (ID: ${companyId})
- Produtos cadastrados: ${productCount}
- Leads de venda: ${leadSaleCount}
- Data/Hora atual: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`;
  } catch {
    /* best-effort */
  }

  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: buildBrainSystemPrompt({
        provider: "grok",
        modelId: selectedModel,
        userContext,
        langInstruction,
        previousProvider,
        voiceMode: !!params.voiceMode,
        mcpConnections: params.mcpConnections,
        personalization: parseBrainPersonalization(params.personalization)
      })
    }
  ];

  for (const msg of previousMessages) {
    openaiMessages.push({
      role: msg.role as "user" | "assistant",
      content: msg.content
    });
  }

  const brainTools = buildBrainTools(params.mcpConnections);
  const toolsUsed: string[] = [];
  let finalResponse = "";
  let generatedFile: BrainGeneratedFile | undefined;
  const codeSnapshotAcc = new BrainCodeSnapshotAccumulator();
  let iterations = 0;
  const maxIterations = 5;
  let promptTokens = 0;
  let completionTokens = 0;

  while (iterations < maxIterations) {
    iterations += 1;
    let completion: OpenAI.Chat.ChatCompletion;
    try {
      completion = await client.chat.completions.create({
        model: selectedModel,
        messages: openaiMessages,
        tools: brainTools,
        tool_choice: "auto",
        max_tokens: 4096
      });
    } catch (modelErr: any) {
      const msg = String(modelErr?.message || "").trim();
      if (/auth|unauthorized|invalid.*key|incorrect.*key/i.test(msg)) {
        throw new Error(
          "API Key Grok (xAI) inválida. Verifique em Conexões → Grok ou a chave da plataforma."
        );
      }
      if (/quota|rate.*limit|billing|insufficient/i.test(msg)) {
        throw new Error("Limite de uso ou créditos esgotados na xAI. Verifique sua conta.");
      }
      throw new Error(msg || "Erro ao conectar com a Grok (xAI). Tente novamente.");
    }

    promptTokens += completion.usage?.prompt_tokens || 0;
    completionTokens += completion.usage?.completion_tokens || 0;

    const choice = completion.choices[0];
    if (!choice) break;

    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      openaiMessages.push(choice.message);

      for (const toolCall of choice.message.tool_calls as any[]) {
        const fnName = toolCall.function?.name || "";
        let fnArgs: any = {};
        try {
          fnArgs = JSON.parse(toolCall.function?.arguments || "{}");
        } catch {
          /* ignore */
        }

        toolsUsed.push(fnName);
        const result = await executeAiBrainCrmTool(fnName, fnArgs, companyId, userId, {
          brainProjectId: params.projectId
        });

        const fileFromTool = parseBrainToolGeneratedFile(fnName, result);
        if (fileFromTool) {
          generatedFile = fileFromTool;
          codeSnapshotAcc.absorb(fileFromTool);
        }

        openaiMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result
        });
      }
    } else {
      finalResponse = choice.message.content || "";
      break;
    }
  }

  if (!finalResponse && iterations >= maxIterations) {
    finalResponse =
      "Desculpe, atingi o limite de iterações. Tente uma solicitação mais simples.";
  }

  await AiBrainMessage.create({
    role: "assistant",
    content: finalResponse,
    toolCalls: toolsUsed.length > 0 ? toolsUsed : null,
    conversationId: conversation.id,
    companyId
  });

  await conversation.update({ model: conversationModel });

  const result: ChatResult = {
    conversationId: conversation.id,
    response: finalResponse,
    toolsUsed
  };

  if (generatedFile) {
    try {
      result.generatedFile = await syncGeneratedFileToIdeBuild({
        companyId,
        userId,
        brainProjectId: params.projectId,
        generatedFile
      });
      codeSnapshotAcc.absorb(result.generatedFile);
    } catch (e: any) {
      logger.warn(`[GROK-BRAIN] sync IDE: ${e?.message || e}`);
      result.generatedFile = generatedFile;
    }
  }

  const snap = codeSnapshotAcc.toSnapshot();
  if (snap) result.codeSnapshot = snap;

  await chargeBrainTurn({
    companyId,
    userId,
    model: selectedModel,
    provider: "grok",
    conversationId: conversation.id,
    voiceMode: params.voiceMode,
    toolsUsed,
    hasCodeSnapshot: Boolean(snap),
    promptTokens,
    completionTokens
  });

  return result;
}
