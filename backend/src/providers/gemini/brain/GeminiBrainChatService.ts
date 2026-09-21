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
import GeminiIntegration from "../../../models/GeminiIntegration";
import { geminiGenerateContent } from "../runtime/GeminiRuntime";
import { resolveGeminiModelId } from "../utils/isGeminiModel";
import { resolveBrainGeminiApiKey } from "../../../services/AiBrainServices/brainPlatformApiKeys";
import { chargeBrainTurn } from "../../../services/AiBrainServices/BrainCreditService";
import { isGeminiImageGenerationModel } from "../utils/geminiModelCapabilities";
import {
  listGeminiBrainImageModelsToTry,
  resolveGeminiBrainImageModelForTurn,
  userRequestsGeminiImageGeneration
} from "../utils/geminiImageIntent";
import {
  formatGeminiErrorForUser,
  isGeminiImageQuotaError,
  isGeminiQuotaOrRateLimit,
  listGeminiBrainChatModelsToTry
} from "../utils/geminiApiErrors";
import {
  brainAttachmentsToParts,
  buildPublicMediaUrl,
  saveGeminiImageBase64
} from "../utils/geminiMediaFiles";
import { buildBrainSystemPrompt } from "../../../services/AiBrainServices/brainSystemPrompt";
import { parseBrainPersonalization } from "../../../services/AiBrainServices/brainPersonalizationPrompt";
import { assertConversationBelongsToProject } from "../../../services/AiBrainServices/brainConversationScope";
import {
  parseBrainToolGeneratedFile,
  BrainCodeSnapshotAccumulator,
  type BrainGeneratedFile
} from "../../../services/AiBrainServices/brainGeneratedFile";
import { syncGeneratedFileToIdeBuild } from "../../../services/AiBrainServices/brainSyncGeneratedFileToIde";
import { brainProviderFromModel } from "../../../services/AiBrainServices/brainModelRouting";
import { executeAiBrainCrmTool } from "../../../services/AiBrainServices/AiBrainCrmTools";
import { openAiCrmToolsToGemini } from "./geminiBrainToolAdapter";
import {
  appendGeminiFunctionResponses,
  appendGeminiModelTurn,
  geminiBrainMessagesTurn,
  GeminiBrainContent,
  logGeminiBrainToolError
} from "./GeminiBrainToolsRuntime";
import logger from "../../../utils/logger";

interface Attachment {
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
}

interface GeminiBrainChatParams {
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

function buildLanguageInstruction(language: string): string {
  const LANGUAGE_MAP: Record<string, string> = {
    "pt-BR": "português do Brasil",
    en: "English",
    es: "español"
  };
  const langLabel = LANGUAGE_MAP[language] || "português do Brasil";
  return `\n\nIMPORTANTE: Responda SEMPRE em ${langLabel}.`;
}

async function loadUserContext(companyId: number, userId: number): Promise<string> {
  try {
    const [currentUser, company, productCount, leadSaleCount] = await Promise.all([
      User.findByPk(userId, { attributes: ["id", "name", "email", "profile"] }),
      Company.findByPk(companyId, { attributes: ["id", "name"] }),
      Inventory.count({ where: { companyId } }),
      LeadSale.count({ where: { companyId } })
    ]);
    return `\n\n**CONTEXTO:** Usuário ${currentUser?.name || "?"} · Org ${company?.name || "?"} · Produtos ${productCount} · Leads ${leadSaleCount}`;
  } catch {
    return "";
  }
}

/** Modelos Nano Banana — chat + imagem, sem tools CRM. */
async function geminiBrainChatImageMode(params: {
  apiKey: string;
  modelId: string;
  conversation: AiBrainConversation;
  companyId: number;
  userId: number;
  userContent: string;
  attachmentParts: ReturnType<typeof brainAttachmentsToParts>;
  systemPrompt: string;
  integration: GeminiIntegration | null;
}): Promise<{ response: string; generatedFile?: BrainGeneratedFile; latencyMs: number }> {
  const history = await AiBrainMessage.findAll({
    where: { conversationId: params.conversation.id },
    order: [["createdAt", "ASC"]],
    limit: 24
  });

  const imageInstruction =
    "\n\nVocê está gerando ou editando imagens (Nano Banana / Google Gemini). Gere a imagem conforme o pedido e inclua um texto breve em português explicando o resultado quando fizer sentido.";

  const messages = [
    { role: "system", content: params.systemPrompt + imageInstruction },
    ...history.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "")
    }))
  ];

  const modelsToTry = listGeminiBrainImageModelsToTry(params.modelId);
  let result: Awaited<ReturnType<typeof geminiGenerateContent>> | null = null;
  let lastErr: unknown;

  for (const tryModel of modelsToTry) {
    try {
      result = await geminiGenerateContent({
        apiKey: params.apiKey,
        model: tryModel,
        messages,
        maxOutputTokens: params.integration?.maxOutputTokens ?? 8192,
        temperature: params.integration?.temperature ?? 0.7,
        topP: params.integration?.topP,
        topK: params.integration?.topK,
        parts: params.attachmentParts.length ? params.attachmentParts : undefined
      });
      break;
    } catch (e) {
      lastErr = e;
      if (!isGeminiQuotaOrRateLimit(e)) {
        throw e;
      }
      logger.warn({
        msg: "[GEMINI-BRAIN] image model quota, trying next",
        model: tryModel,
        err: String((e as Error)?.message || e).slice(0, 120)
      });
    }
  }

  if (!result) {
    throw lastErr || new Error("Não foi possível gerar imagem com os modelos Nano Banana.");
  }

  let response = String(result.text || "").trim();
  let generatedFile: BrainGeneratedFile | undefined;

  if (result.images?.length) {
    const first = result.images[0];
    const saved = saveGeminiImageBase64({
      companyId: params.companyId,
      subfolder: "gemini-brain",
      base64: first.data,
      mimeType: first.mimeType,
      prefix: "brain"
    });
    const url = buildPublicMediaUrl(params.companyId, saved.relativePath);
    generatedFile = {
      type: "image",
      title: "Imagem Gemini",
      content: `<img src="${url}" alt="Imagem gerada pelo Gemini" style="max-width:100%;border-radius:12px" />`
    };
    if (!response) {
      response = "Imagem gerada com sucesso.";
    }
  }

  return { response, generatedFile, latencyMs: result.latencyMs };
}

/** Modelos de chat — loop de tools CRM (mesmo executeAiBrainCrmTool do OpenAI/Claude). */
async function geminiBrainChatWithTools(params: {
  apiKey: string;
  modelId: string;
  conversation: AiBrainConversation;
  companyId: number;
  userId: number;
  userContent: string;
  attachmentParts: ReturnType<typeof brainAttachmentsToParts>;
  system: string;
  integration: GeminiIntegration | null;
  mcpConnections?: string[];
  projectId?: number;
}): Promise<{
  response: string;
  toolsUsed: string[];
  generatedFile?: BrainGeneratedFile;
  codeSnapshot?: { projectTitle: string; files: Record<string, string>; workspaceId?: number };
}> {
  const geminiTools = openAiCrmToolsToGemini(params.mcpConnections);
  const toolHint = params.attachmentParts.length
    ? "\n\nO usuário enviou arquivos em anexo — use as ferramentas CRM quando pedirem ações no sistema."
    : "";

  const previousMessages = await AiBrainMessage.findAll({
    where: { conversationId: params.conversation.id },
    order: [["createdAt", "ASC"]],
    limit: 50
  });

  const contents: GeminiBrainContent[] = [];
  for (const msg of previousMessages) {
    const role = msg.role as string;
    if (role !== "user" && role !== "assistant") continue;
    contents.push({
      role: role === "assistant" ? "model" : "user",
      parts: [{ text: String(msg.content || "") }]
    });
  }

  if (params.attachmentParts.length && contents.length) {
    const last = contents[contents.length - 1];
    if (last.role === "user") {
      last.parts = [...params.attachmentParts, { text: params.userContent }];
    }
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
      turn = await geminiBrainMessagesTurn({
        apiKey: params.apiKey,
        model: params.modelId,
        maxOutputTokens: params.integration?.maxOutputTokens ?? 8192,
        temperature: params.integration?.temperature ?? 0.7,
        topP: params.integration?.topP,
        topK: params.integration?.topK,
        system: params.system + toolHint,
        tools: { functionDeclarations: geminiTools },
        contents
      });
    } catch (e) {
      logGeminiBrainToolError(e);
      throw new Error(
        String((e as Error)?.message || e).slice(0, 300) ||
          "Erro ao chamar Gemini com ferramentas CRM."
      );
    }

    if (turn.functionCalls.length > 0) {
      appendGeminiModelTurn(contents, turn.modelParts);
      const fnResponses: { name: string; resultJson: string }[] = [];

      for (const call of turn.functionCalls) {
        toolsUsed.push(call.name);
        const result = await executeAiBrainCrmTool(
          call.name,
          call.args,
          params.companyId,
          params.userId,
          { brainProjectId: params.projectId ?? params.conversation.projectId ?? undefined }
        );

        const fileFromTool = parseBrainToolGeneratedFile(call.name, result);
        if (fileFromTool) {
          generatedFile = fileFromTool;
          codeSnapshotAcc.absorb(fileFromTool);
        }

        fnResponses.push({ name: call.name, resultJson: result });
      }

      appendGeminiFunctionResponses(contents, fnResponses);
      continue;
    }

    finalResponse = turn.text || "";
    break;
  }

  if (!finalResponse && iterations >= maxIterations) {
    finalResponse = "Desculpe, atingi o limite de iterações. Tente uma solicitação mais simples.";
  }

  return {
    response: finalResponse,
    toolsUsed,
    generatedFile,
    codeSnapshot: codeSnapshotAcc.toSnapshot()
  };
}

async function geminiBrainChatWithToolsResilient(
  preferredModelId: string,
  params: Omit<Parameters<typeof geminiBrainChatWithTools>[0], "modelId">
): Promise<{ toolRun: Awaited<ReturnType<typeof geminiBrainChatWithTools>>; modelUsed: string }> {
  const models = listGeminiBrainChatModelsToTry(preferredModelId);
  let lastErr: unknown;

  for (const tryModel of models) {
    try {
      const toolRun = await geminiBrainChatWithTools({ ...params, modelId: tryModel });
      if (tryModel !== preferredModelId) {
        logger.info({
          msg: "[GEMINI-BRAIN] chat fallback model ok",
          preferred: preferredModelId,
          used: tryModel
        });
      }
      return { toolRun, modelUsed: tryModel };
    } catch (e) {
      lastErr = e;
      if (!isGeminiQuotaOrRateLimit(e)) {
        throw e;
      }
      logger.warn({
        msg: "[GEMINI-BRAIN] chat model quota, trying next",
        model: tryModel,
        err: String((e as Error)?.message || e).slice(0, 120)
      });
    }
  }

  throw lastErr || new Error("Cota Gemini esgotada em todos os modelos de chat testados.");
}

/**
 * Brain.AI + Gemini — isolado; reutiliza executeAiBrainCrmTool (OpenAI/Claude inalterados).
 */
export async function geminiBrainChat(params: GeminiBrainChatParams): Promise<ChatResult> {
  const { companyId, userId } = params;
  const apiKey = resolveBrainGeminiApiKey();
  const modelId = resolveGeminiModelId(params.model);
  const message = String(params.message || "").trim();
  const language = params.language || "pt-BR";

  const integration = await GeminiIntegration.findOne({ where: { companyId } });
  const userContext = await loadUserContext(companyId, userId);
  const langInstruction = buildLanguageInstruction(language);

  let conversation: AiBrainConversation;
  let previousProvider = null;
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
    const title = message.length > 60 ? `${message.substring(0, 57)}...` : message || "Gemini";
    if (!params.projectId) {
      throw new Error("Selecione um projeto Brain antes de iniciar uma conversa.");
    }
    conversation = await AiBrainConversation.create({
      title,
      model: params.persistModel || modelId,
      companyId,
      userId,
      projectId: params.projectId
    });
  }

  const attachmentParts = brainAttachmentsToParts(companyId, params.attachments);
  const attachmentNote =
    params.attachments?.length && !attachmentParts.length
      ? `\n\n[Anexos listados mas não foi possível ler os arquivos no servidor: ${params.attachments.map((a) => a.originalName).join(", ")}]`
      : "";
  const userContent = message + attachmentNote;

  const systemPrompt = buildBrainSystemPrompt({
    provider: "gemini",
    modelId,
    userContext,
    langInstruction,
    previousProvider: previousProvider || undefined,
    voiceMode: params.voiceMode,
    mcpConnections: params.mcpConnections,
    personalization: parseBrainPersonalization(params.personalization)
  });

  await AiBrainMessage.create({
    conversationId: conversation.id,
    role: "user",
    content: userContent,
    companyId
  });

  let response = "";
  let toolsUsed: string[] = [];
  let generatedFile: BrainGeneratedFile | undefined;
  let codeSnapshotFromTools:
    | { projectTitle: string; files: Record<string, string>; workspaceId?: number }
    | undefined;
  let effectiveChatModel = modelId;
  const brainProjectId = params.projectId ?? conversation.projectId ?? undefined;

  try {
  const useImageTurn =
    isGeminiImageGenerationModel(modelId) || userRequestsGeminiImageGeneration(userContent);

  if (useImageTurn) {
    const imageModelId = resolveGeminiBrainImageModelForTurn(modelId);
    try {
      const imageRun = await geminiBrainChatImageMode({
        apiKey,
        modelId: imageModelId,
        conversation,
        companyId,
        userId,
        userContent,
        attachmentParts,
        systemPrompt,
        integration
      });
      response = imageRun.response;
      generatedFile = imageRun.generatedFile;
      logger.info({
        msg: "[GEMINI-BRAIN] image turn ok",
        companyId,
        chatModel: modelId,
        imageModel: imageModelId,
        latencyMs: imageRun.latencyMs
      });
    } catch (imageErr) {
      logger.warn({
        msg: "[GEMINI-BRAIN] image turn failed",
        companyId,
        chatModel: modelId,
        imageModel: imageModelId,
        err: String((imageErr as Error)?.message || imageErr).slice(0, 200)
      });

      if (isGeminiImageQuotaError(imageErr) || isGeminiQuotaOrRateLimit(imageErr)) {
        const quotaMsg = formatGeminiErrorForUser(imageErr);
        try {
          const { toolRun: textFallback, modelUsed } = await geminiBrainChatWithToolsResilient(
            modelId,
            {
              apiKey,
              conversation,
              companyId,
              userId,
              userContent,
              attachmentParts,
              system:
                systemPrompt +
                "\n\nO usuário pediu um criativo/imagem, mas a API Gemini desta organização não tem cota para geração de imagem (Nano Banana). " +
                "Não invente que gerou imagem. Entregue um briefing criativo detalhado em texto (título, conceito, cores, tipografia, layout) para o pedido.",
              integration,
              mcpConnections: params.mcpConnections,
              projectId: brainProjectId
            }
          );
          effectiveChatModel = modelUsed;
          response = `${textFallback.response}\n\n---\n\n${quotaMsg}`;
          toolsUsed = textFallback.toolsUsed;
          generatedFile = textFallback.generatedFile;
          codeSnapshotFromTools = textFallback.codeSnapshot;
        } catch {
          response = quotaMsg;
        }
      } else {
        response = formatGeminiErrorForUser(imageErr);
      }
    }
  } else {
    const { toolRun, modelUsed } = await geminiBrainChatWithToolsResilient(modelId, {
      apiKey,
      conversation,
      companyId,
      userId,
      userContent,
      attachmentParts,
      system: systemPrompt,
      integration,
      mcpConnections: params.mcpConnections,
      projectId: brainProjectId
    });
    effectiveChatModel = modelUsed;
    response = toolRun.response;
    toolsUsed = toolRun.toolsUsed;
    generatedFile = toolRun.generatedFile;
    codeSnapshotFromTools = toolRun.codeSnapshot;
    logger.info({
      msg: "[GEMINI-BRAIN] tools mode ok",
      companyId,
      model: modelUsed,
      tools: toolsUsed.length
    });
  }
  } catch (brainErr) {
    logger.warn({
      msg: "[GEMINI-BRAIN] turn failed",
      companyId,
      model: modelId,
      err: String((brainErr as Error)?.message || brainErr).slice(0, 240)
    });
    response = formatGeminiErrorForUser(brainErr);
  }

  if (!response && !generatedFile) {
    response = "Não foi possível obter resposta do modelo Gemini. Tente outro modelo ou reformule o pedido.";
  }

  await AiBrainMessage.create({
    conversationId: conversation.id,
    role: "assistant",
    content: response,
    toolCalls: toolsUsed.length > 0 ? toolsUsed : null,
    companyId
  });

  const persistModel = params.persistModel || effectiveChatModel;
  if (conversation.model !== persistModel) {
    await conversation.update({ model: persistModel });
  }

  const out: ChatResult = {
    conversationId: conversation.id,
    response,
    toolsUsed
  };
  const codeSnapshotAcc = new BrainCodeSnapshotAccumulator();
  if (codeSnapshotFromTools) {
    codeSnapshotAcc.absorb({
      type: "code_workspace",
      title: codeSnapshotFromTools.projectTitle,
      content: "",
      files: Object.entries(codeSnapshotFromTools.files).map(([path, content]) => ({
        path,
        content
      })),
      workspaceId: codeSnapshotFromTools.workspaceId
    });
  }
  if (generatedFile) {
    out.generatedFile = await syncGeneratedFileToIdeBuild({
      companyId,
      userId,
      brainProjectId,
      generatedFile
    });
    codeSnapshotAcc.absorb(out.generatedFile);
  }
  const snap = codeSnapshotAcc.toSnapshot();
  if (snap) out.codeSnapshot = snap;

  await chargeBrainTurn({
    companyId,
    userId,
    model: effectiveChatModel,
    provider: "gemini",
    conversationId: conversation.id,
    voiceMode: params.voiceMode,
    toolsUsed,
    hasCodeSnapshot: Boolean(snap),
    isImage: userRequestsGeminiImageGeneration(params.message)
  });

  return out;
}
