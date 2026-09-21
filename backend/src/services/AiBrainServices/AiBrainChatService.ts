/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import OpenAI from "openai";
import logger from "../../utils/logger";
import CreateActivityService from "../ActivityServices/CreateService";
import CreateContactService from "../ContactServices/CreateContactService";
import CreateConvertedLeadService from "../ConvertedLeadServices/CreateService";
import CreateLeadSaleService from "../LeadSalesServices/CreateService";
import DashboardDataService from "../ReportService/DashbardDataService";
import Activity from "../../models/Activity";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import ConvertedLead from "../../models/ConvertedLead";
import LeadSale from "../../models/LeadSale";
import Inventory from "../../models/Inventory";
import User from "../../models/User";
import Company from "../../models/Company";
import Project from "../../models/Project";
import AiBrainConversation from "../../models/AiBrainConversation";
import AiBrainMessage from "../../models/AiBrainMessage";
import Whatsapp from "../../models/Whatsapp";
import LeadPipeline from "../../models/LeadPipeline";
import LeadPipelineStage from "../../models/LeadPipelineStage";
import QuickMessage from "../../models/QuickMessage";
import Tag from "../../models/Tag";
import ContactTag from "../../models/ContactTag";
import Queue from "../../models/Queue";
import Campaign from "../../models/Campaign";
import ContactList from "../../models/ContactList";
import ContactListItem from "../../models/ContactListItem";
import { Op } from "sequelize";
import CreateWhatsAppService from "../WhatsappService/CreateWhatsAppService";
import CreateTicketService from "../TicketServices/CreateTicketService";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import ShowTicketService from "../TicketServices/ShowTicketService";
import { TelegramConnectionSaveResult } from "../TelegramServices/CreateTelegramConnectionService";
import CreateTelegramConnectionService from "../TelegramServices/CreateTelegramConnectionService";
import CreateSmsConnectionService from "../SmsServices/CreateSmsConnectionService";
import { getIO } from "../../libs/socket";
import { StartWhatsAppSession } from "../WbotServices/StartWhatsAppSession";
import UpdateSettingService from "../SettingServices/UpdateSettingService";
import CompaniesSettings from "../../models/CompaniesSettings";
import { buildBrainTools, executeAiBrainCrmTool } from "./AiBrainCrmTools";
import { isClaudeModelId } from "../../providers/anthropic/utils/isClaudeModel";
import { anthropicBrainChat } from "../../providers/anthropic/brain/AnthropicBrainChatService";
import { geminiBrainChat } from "../../providers/gemini/brain/GeminiBrainChatService";
import { grokBrainChat } from "../../providers/grok/brain/GrokBrainChatService";
import {
  assertBrainModelAvailable,
  brainProviderFromModel,
  normalizeBrainModelId
} from "./brainModelRouting";
import { buildBrainSystemPrompt } from "./brainSystemPrompt";
import { parseBrainPersonalization } from "./brainPersonalizationPrompt";
import {
  parseBrainToolGeneratedFile,
  BrainCodeSnapshotAccumulator,
  type BrainGeneratedFile
} from "./brainGeneratedFile";
import { assertConversationBelongsToProject } from "./brainConversationScope";
import { syncGeneratedFileToIdeBuild } from "./brainSyncGeneratedFileToIde";
import { resolveBrainOpenAiApiKey } from "./brainPlatformApiKeys";
import { chargeBrainTurn } from "./BrainCreditService";
import { enrichBrainMessageWithAttachments } from "./brainAttachmentContent";

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
  /** Quando auto/flash, persiste o modo na conversa em vez do modelo concreto. */
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


export async function aiBrainChat(params: ChatParams): Promise<ChatResult> {
  const route = await assertBrainModelAvailable(params.companyId, params.model, {
    message: params.message,
    hasAttachments: (params.attachments?.length || 0) > 0,
    voiceMode: !!params.voiceMode,
    mcpCount: params.mcpConnections?.length || 0
  });
  const routedParams: ChatParams = {
    ...params,
    model: route.modelId,
    persistModel: route.persistModel
  };
  if (route.provider === "gemini") {
    return geminiBrainChat(routedParams as any) as any;
  }
  if (route.provider === "grok") {
    return grokBrainChat(routedParams as any) as any;
  }
  if (route.provider === "anthropic") {
    return anthropicBrainChat(routedParams as any) as any;
  }
  const { companyId, userId, attachments } = routedParams;
  let message = enrichBrainMessageWithAttachments(
    routedParams.message,
    companyId,
    attachments
  );

  const apiKey = resolveBrainOpenAiApiKey();

  const selectedModel = normalizeBrainModelId(routedParams.model);
  const conversationModel = routedParams.persistModel || selectedModel;

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
    const title = message.length > 60 ? message.substring(0, 57) + "..." : message;
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
    "en": "English",
    "es": "español",
    "fr": "français",
    "de": "Deutsch",
    "it": "italiano"
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
  } catch { /* context enrichment best-effort */ }

  const openaiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: buildBrainSystemPrompt({
        provider: "openai",
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

  const client = new OpenAI({ apiKey });
  const brainTools = buildBrainTools(params.mcpConnections);
  const toolsUsed: string[] = [];
  let finalResponse = "";
  let generatedFile: BrainGeneratedFile | undefined;
  const codeSnapshotAcc = new BrainCodeSnapshotAccumulator();
  let iterations = 0;
  const maxIterations = 5;

  const MODEL_FALLBACKS = ["gpt-5.5", "gpt-5.5-mini", "gpt-4.1", "gpt-4o", "gpt-4o-mini"];
  let effectiveModel = selectedModel;

  async function tryCompletion(model: string, msgs: typeof openaiMessages) {
    return client.chat.completions.create({
      model,
      messages: msgs,
      tools: brainTools,
      tool_choice: "auto",
      max_tokens: 4096
    });
  }

  while (iterations < maxIterations) {
    iterations++;

    let completion: any;
    try {
      completion = await tryCompletion(effectiveModel, openaiMessages);
    } catch (modelErr: any) {
      const errMsg = String(modelErr?.message || modelErr || "").toLowerCase();
      const isModelError = errMsg.includes("model") || errMsg.includes("not found") ||
        errMsg.includes("does not exist") || errMsg.includes("invalid") ||
        modelErr?.status === 404 || modelErr?.code === "model_not_found";

      if (isModelError && effectiveModel === selectedModel) {
        let fallbackWorked = false;
        for (const fb of MODEL_FALLBACKS) {
          if (fb === effectiveModel) continue;
          try {
            logger.info(`[AI-BRAIN] Model "${effectiveModel}" failed, trying fallback "${fb}"`);
            completion = await tryCompletion(fb, openaiMessages);
            effectiveModel = fb;
            fallbackWorked = true;
            break;
          } catch { /* try next */ }
        }
        if (!fallbackWorked) {
          throw new Error(
            `Modelo "${selectedModel}" não acessível. Verifique se sua API Key tem acesso ou tente outro modelo.`
          );
        }
      } else {
        const msg = String(modelErr?.message || "").trim();
        if (/auth|unauthorized|invalid.*key|incorrect.*key/i.test(msg)) {
          throw new Error("API Key inválida ou expirada. Verifique em Agente IA → Integração.");
        }
        if (/quota|rate.*limit|billing|insufficient/i.test(msg)) {
          throw new Error("Limite de uso ou créditos esgotados na OpenAI. Verifique sua conta.");
        }
        throw new Error(msg || "Erro ao conectar com a OpenAI. Tente novamente.");
      }
    }

    const choice = completion.choices[0];
    if (!choice) break;

    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      openaiMessages.push(choice.message);

      for (const toolCall of choice.message.tool_calls) {
        const fnName = toolCall.function.name;
        let fnArgs: any = {};
        try {
          fnArgs = JSON.parse(toolCall.function.arguments || "{}");
        } catch { /* */ }

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
    model: effectiveModel,
    provider: "openai",
    conversationId: conversation.id,
    voiceMode: params.voiceMode,
    toolsUsed,
    hasCodeSnapshot: Boolean(snap)
  });

  return result;
}

export async function listConversations(
  companyId: number,
  userId: number,
  projectId?: number
) {
  if (!projectId) return [];
  return AiBrainConversation.findAll({
    where: { companyId, userId, projectId },
    order: [["updatedAt", "DESC"]],
    limit: 50,
    attributes: ["id", "title", "model", "projectId", "createdAt", "updatedAt"]
  });
}

export async function getConversation(conversationId: number, companyId: number, userId: number) {
  const conversation = await AiBrainConversation.findOne({
    where: { id: conversationId, companyId, userId },
    include: [{
      model: AiBrainMessage,
      order: [["createdAt", "ASC"]]
    }]
  });
  if (!conversation) throw new Error("Conversa não encontrada.");
  return conversation;
}

export async function deleteConversation(conversationId: number, companyId: number, userId: number) {
  const conversation = await AiBrainConversation.findOne({
    where: { id: conversationId, companyId, userId }
  });
  if (!conversation) throw new Error("Conversa não encontrada.");
  await AiBrainMessage.destroy({ where: { conversationId: conversation.id } });
  await conversation.destroy();
  return { success: true };
}

export async function renameConversation(conversationId: number, companyId: number, userId: number, title: string) {
  const conversation = await AiBrainConversation.findOne({
    where: { id: conversationId, companyId, userId }
  });
  if (!conversation) throw new Error("Conversa não encontrada.");
  conversation.title = title;
  await conversation.save();
  return conversation;
}
