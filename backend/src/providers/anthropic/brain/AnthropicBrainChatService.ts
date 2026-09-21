/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AiBrainConversation from "../../../models/AiBrainConversation";
import AiBrainMessage from "../../../models/AiBrainMessage";
import User from "../../../models/User";
import Company from "../../../models/Company";
import Inventory from "../../../models/Inventory";
import LeadSale from "../../../models/LeadSale";
import { executeAiBrainCrmTool } from "../../../services/AiBrainServices/AiBrainCrmTools";
import { resolveBrainAnthropicApiKey } from "../../../services/AiBrainServices/brainPlatformApiKeys";
import { chargeBrainTurn } from "../../../services/AiBrainServices/BrainCreditService";
import { buildBrainSystemPrompt } from "../../../services/AiBrainServices/brainSystemPrompt";
import { parseBrainPersonalization } from "../../../services/AiBrainServices/brainPersonalizationPrompt";
import { assertConversationBelongsToProject } from "../../../services/AiBrainServices/brainConversationScope";
import {
  parseBrainToolGeneratedFile,
  BrainCodeSnapshotAccumulator,
  type BrainGeneratedFile
} from "../../../services/AiBrainServices/brainGeneratedFile";
import { syncGeneratedFileToIdeBuild } from "../../../services/AiBrainServices/brainSyncGeneratedFileToIde";
import { enrichBrainMessageWithAttachments } from "../../../services/AiBrainServices/brainAttachmentContent";
import {
  brainProviderFromModel,
  normalizeBrainModelId
} from "../../../services/AiBrainServices/brainModelRouting";
import { openAiCrmToolsToAnthropic } from "./anthropicBrainToolAdapter";
import {
  anthropicBrainMessagesTurn,
  appendAssistantToolTurn,
  appendToolResults,
  AnthropicBrainMessage,
  logAnthropicBrainToolError
} from "../runtime/AnthropicBrainToolsRuntime";
import { parseAnthropicError } from "../utils/anthropicApiErrors";

interface Attachment {
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
}

interface ChatParams {
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
}

interface ChatResult {
  conversationId: number;
  response: string;
  toolsUsed: string[];
  generatedFile?: BrainGeneratedFile;
  codeSnapshot?: { projectTitle: string; files: Record<string, string>; workspaceId?: number };
}

/**
 * BrainAI + Anthropic — isolado do fluxo OpenAI em AiBrainChatService.
 * Reutiliza as mesmas ferramentas CRM (executeAiBrainCrmTool) sem alterar o loop OpenAI.
 */
export async function anthropicBrainChat(params: ChatParams): Promise<ChatResult> {
  const { companyId, userId, message, attachments, language = "pt-BR" } = params;

  const apiKey = resolveBrainAnthropicApiKey();

  const enriched = enrichBrainMessageWithAttachments(
    message,
    companyId,
    attachments
  );

  const LANGUAGE_MAP: Record<string, string> = {
    "pt-BR": "português do Brasil",
    en: "English",
    es: "español",
    fr: "français",
    de: "Deutsch",
    it: "italiano"
  };
  const langLabel = LANGUAGE_MAP[language] || "português do Brasil";
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
    userContext = "";
  }

  const selectedModel = normalizeBrainModelId(
    params.model || "claude-sonnet-4-5-20250929"
  );
  const conversationModel = params.persistModel || selectedModel;
  const anthropicTools = openAiCrmToolsToAnthropic(params.mcpConnections);

  let conversation: AiBrainConversation | null;
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
    const title = enriched.length > 60 ? `${enriched.substring(0, 57)}...` : enriched;
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

  const system = buildBrainSystemPrompt({
    provider: "anthropic",
    modelId: selectedModel,
    userContext,
    langInstruction,
    previousProvider,
    voiceMode: !!params.voiceMode,
    mcpConnections: params.mcpConnections,
    personalization: parseBrainPersonalization(params.personalization)
  });

  await AiBrainMessage.create({
    role: "user",
    content: enriched,
    conversationId: conversation.id,
    companyId
  });

  const previousMessages = await AiBrainMessage.findAll({
    where: { conversationId: conversation.id },
    order: [["createdAt", "ASC"]],
    limit: 50
  });

  const apiMessages: AnthropicBrainMessage[] = [];
  for (const msg of previousMessages) {
    const role = msg.role as string;
    if (role !== "user" && role !== "assistant") continue;
    apiMessages.push({ role: role as "user" | "assistant", content: msg.content });
  }

  const toolsUsed: string[] = [];
  let generatedFile: BrainGeneratedFile | undefined;
  const codeSnapshotAcc = new BrainCodeSnapshotAccumulator();
  let finalResponse = "";
  let iterations = 0;
  const maxIterations = 5;

  while (iterations < maxIterations) {
    iterations++;
    let turn;
    try {
      turn = await anthropicBrainMessagesTurn({
        apiKey,
        model: selectedModel,
        maxTokens: 4096,
        temperature: 1,
        topP: 1,
        system,
        tools: anthropicTools,
        messages: apiMessages
      });
    } catch (e) {
      logAnthropicBrainToolError(e);
      const parsed = parseAnthropicError(e);
      throw new Error(parsed.userMessage);
    }

    if (turn.toolUses.length > 0) {
      appendAssistantToolTurn(apiMessages, turn.rawContent);
      const toolResults: { toolUseId: string; content: string }[] = [];

      for (const toolUse of turn.toolUses) {
        const fnName = toolUse.name;
        const fnArgs =
          toolUse.input && typeof toolUse.input === "object"
            ? (toolUse.input as Record<string, unknown>)
            : {};
        toolsUsed.push(fnName);
        const result = await executeAiBrainCrmTool(
          fnName,
          fnArgs,
          companyId,
          userId,
          { brainProjectId: params.projectId }
        );

        const fileFromTool = parseBrainToolGeneratedFile(fnName, result);
        if (fileFromTool) {
          generatedFile = fileFromTool;
          codeSnapshotAcc.absorb(fileFromTool);
        }

        toolResults.push({
          toolUseId: toolUse.id,
          content: result
        });
      }

      appendToolResults(apiMessages, toolResults);
      continue;
    }

    finalResponse = turn.text || "";
    break;
  }

  if (!finalResponse && iterations >= maxIterations) {
    finalResponse = "Desculpe, atingi o limite de iterações. Tente uma solicitação mais simples.";
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
    result.generatedFile = await syncGeneratedFileToIdeBuild({
      companyId,
      userId,
      brainProjectId: params.projectId,
      generatedFile
    });
    codeSnapshotAcc.absorb(result.generatedFile);
  }
  const snap = codeSnapshotAcc.toSnapshot();
  if (snap) result.codeSnapshot = snap;

  await chargeBrainTurn({
    companyId,
    userId,
    model: selectedModel,
    provider: "anthropic",
    conversationId: conversation.id,
    voiceMode: params.voiceMode,
    toolsUsed,
    hasCodeSnapshot: Boolean(snap)
  });

  return result;
}
