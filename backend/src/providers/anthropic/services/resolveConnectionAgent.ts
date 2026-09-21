/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AnthropicIntegration from "../../../models/AnthropicIntegration";
import AnthropicMultiAgent from "../../../models/AnthropicMultiAgent";
import Prompt from "../../../models/Prompt";
import Whatsapp from "../../../models/Whatsapp";
import ShowPromptService from "../../../services/PromptServices/ShowPromptService";
import AppError from "../../../errors/AppError";
import { decryptAnthropicApiKeySecret } from "../utils/anthropicApiKeyCrypto";
import { isClaudeModelId, normalizeAgentModelId } from "../utils/isClaudeModel";
import { resolveAnthropicModelId } from "../utils/anthropicModelResolve";
import { compileAnthropicAgentFromProfile } from "../utils/anthropicAgentProfile";
import { tryResolveGeminiPrompt } from "../../gemini/services/resolveGeminiPrompt";
import { isGeminiModelId } from "../../gemini/utils/isGeminiModel";
import { tryResolveGrokPrompt } from "../../grok/services/resolveGrokPrompt";
import { isGrokModelId } from "../../grok/utils/isGrokModel";

export type ConnectionAgentRef =
  | { kind: "prompt"; promptId: number }
  | { kind: "anthropic"; anthropicMultiAgentId: number };

export type ResolvedConnectionAgent = {
  prompt: Record<string, any>;
  ref: ConnectionAgentRef;
  llmProvider: "openai" | "anthropic" | "gemini" | "grok";
};

function promptToRuntimePlain(prompt: Record<string, any> | Prompt): Record<string, any> {
  const row =
    prompt && typeof (prompt as any).get === "function"
      ? ((prompt as any).get({ plain: true }) as Record<string, any>)
      : ({ ...(prompt as any) } as Record<string, any>);
  const id = Number(row.id);
  if (!Number.isFinite(id)) {
    throw new AppError("Agente inválido: id do prompt ausente.", 422);
  }
  return { ...row, id };
}

const ANTHROPIC_PROMPT_ID_OFFSET = 2_000_000_000;

export function syntheticPromptIdForAnthropicAgent(anthropicMultiAgentId: number): number {
  return ANTHROPIC_PROMPT_ID_OFFSET + Number(anthropicMultiAgentId);
}

export function isSyntheticAnthropicPromptId(promptId: number): boolean {
  return Number(promptId) >= ANTHROPIC_PROMPT_ID_OFFSET;
}

export function anthropicAgentIdFromSyntheticPromptId(promptId: number): number {
  return Number(promptId) - ANTHROPIC_PROMPT_ID_OFFSET;
}

async function loadAnthropicApiKey(companyId: number): Promise<string> {
  const row = await AnthropicIntegration.findOne({ where: { companyId } });
  if (!row?.enabled) {
    throw new AppError("Integração Claude não está ativa.", 422);
  }
  const key = decryptAnthropicApiKeySecret(row.apiKeyEncrypted || "") || "";
  if (!key.trim()) {
    throw new AppError("API Key Claude não configurada.", 422);
  }
  return key.trim();
}

export async function buildPromptFromAnthropicMultiAgent(
  companyId: number,
  agentId: number
): Promise<ResolvedConnectionAgent> {
  const agent = await AnthropicMultiAgent.findOne({
    where: { id: agentId, companyId, enabled: true }
  });
  if (!agent) {
    throw new AppError("Agente Claude não encontrado ou desativado.", 404);
  }
  const integration = await AnthropicIntegration.findOne({ where: { companyId } });
  const apiKey = await loadAnthropicApiKey(companyId);
  const syntheticId = syntheticPromptIdForAnthropicAgent(agent.id);
  const compiled = compileAnthropicAgentFromProfile(agent.profileJson, {
    name: agent.name,
    systemPrompt: agent.systemPrompt || "",
    model: agent.model || integration?.defaultModel || "claude-3-7-sonnet-latest",
    temperature: agent.temperature ?? integration?.temperature ?? 1,
    topP: agent.topP ?? integration?.topP ?? 1
  });
  const prompt = promptToRuntimePlain({
    id: syntheticId,
    name: compiled.name,
    apiKey,
    model: compiled.model || integration?.defaultModel || "claude-3-7-sonnet-latest",
    prompt: compiled.prompt || compiled.systemPrompt || "",
    attendanceScript: compiled.attendanceScript || "",
    role: compiled.role || "",
    description: compiled.description || "",
    cerebro: compiled.cerebro,
    maxMessages: 30,
    maxTokens: 4096,
    temperature: compiled.temperature ?? integration?.temperature ?? 1,
    topP: compiled.topP ?? integration?.topP ?? 1,
    presencePenalty: integration?.presencePenalty ?? 0,
    frequencyPenalty: integration?.frequencyPenalty ?? 0,
    __llmProvider: "anthropic",
    __anthropicMultiAgentId: agent.id
  });
  return {
    prompt,
    ref: { kind: "anthropic", anthropicMultiAgentId: agent.id },
    llmProvider: "anthropic"
  };
}

export async function resolvePromptWithLlmProvider(
  companyId: number,
  promptId: number
): Promise<ResolvedConnectionAgent> {
  const geminiResolved = await tryResolveGeminiPrompt(companyId, promptId);
  if (geminiResolved) {
    return {
      prompt: geminiResolved.prompt,
      ref: { kind: "prompt", promptId: geminiResolved.prompt.id },
      llmProvider: "gemini"
    };
  }

  const grokResolved = await tryResolveGrokPrompt(companyId, promptId);
  if (grokResolved) {
    return {
      prompt: grokResolved.prompt,
      ref: { kind: "prompt", promptId: grokResolved.prompt.id },
      llmProvider: "grok"
    };
  }

  const prompt = await ShowPromptService({ promptId, companyId });
  const rawModel = String((prompt as any).model || "").trim();
  const model = resolveAnthropicModelId(normalizeAgentModelId(rawModel));
  if (!isClaudeModelId(model)) {
    const plain = promptToRuntimePlain(prompt as any);
    return {
      prompt: plain,
      ref: { kind: "prompt", promptId: plain.id },
      llmProvider: "openai"
    };
  }
  const apiKey = await loadAnthropicApiKey(companyId);
  const plain = promptToRuntimePlain(prompt as any);
  return {
    prompt: {
      ...plain,
      apiKey,
      model,
      __llmProvider: "anthropic"
    },
    ref: { kind: "prompt", promptId: plain.id },
    llmProvider: "anthropic"
  };
}

/** Conexão WhatsApp/Telegram com agente de IA ativo (Prompt GPT/Claude ou multi-agente Claude). */
export function whatsappHasConnectionAgent(whatsapp: Whatsapp): boolean {
  if (whatsapp.getDataValue("agentDisabled") === true) {
    return false;
  }
  const promptId = whatsapp.getDataValue("promptId") as number | null | undefined;
  const anthropicId = whatsapp.getDataValue("anthropicMultiAgentId") as number | null | undefined;
  return (
    (promptId != null && String(promptId).trim() !== "" && !Number.isNaN(Number(promptId))) ||
    (anthropicId != null && String(anthropicId).trim() !== "" && !Number.isNaN(Number(anthropicId)))
  );
}

export async function resolveConnectionAgentFromWhatsapp(
  whatsapp: Whatsapp,
  companyId: number
): Promise<ResolvedConnectionAgent | null> {
  const anthropicId = whatsapp.getDataValue("anthropicMultiAgentId") as number | null | undefined;
  if (anthropicId != null && !Number.isNaN(Number(anthropicId))) {
    return buildPromptFromAnthropicMultiAgent(companyId, Number(anthropicId));
  }
  const promptId = whatsapp.getDataValue("promptId") as number | null | undefined;
  if (promptId != null && !Number.isNaN(Number(promptId))) {
    return resolvePromptWithLlmProvider(companyId, Number(promptId));
  }
  return null;
}

export async function listConnectionAgentOptions(companyId: number) {
  const prompts = await Prompt.findAll({
    where: { companyId },
    attributes: ["id", "name", "model"],
    order: [["name", "ASC"]]
  });
  const claudeMultiAgents = await AnthropicMultiAgent.findAll({
    where: { companyId, enabled: true },
    attributes: ["id", "name", "model"],
    order: [["name", "ASC"]]
  });
  const openAiAgents: Array<{
    id: number;
    name: string;
    model: string;
    provider: string;
    connectionValue: string;
  }> = [];
  const claudeAgents: Array<{
    id: number;
    name: string;
    model: string;
    provider: string;
    connectionValue: string;
  }> = [];

  for (const p of prompts) {
    const model = normalizeAgentModelId(String((p as any).model || ""));
    const entry = {
      id: p.id,
      name: p.name,
      model,
      provider: isGeminiModelId(model)
        ? "gemini"
        : isGrokModelId(model)
          ? "grok"
          : isClaudeModelId(model)
            ? "anthropic"
            : "openai",
      connectionValue: `prompt:${p.id}`
    };
    if (isClaudeModelId(model)) {
      claudeAgents.push(entry);
    } else {
      // OpenAI, Gemini e Grok usam promptId na conexão (prompt:{id}).
      openAiAgents.push(entry);
    }
  }

  for (const a of claudeMultiAgents) {
    claudeAgents.push({
      id: a.id,
      name: a.name,
      model: normalizeAgentModelId(a.model || "") || a.model || "",
      provider: "anthropic",
      connectionValue: `anthropic:${a.id}`
    });
  }

  return { openAiAgents, claudeAgents };
}

export function normalizeWhatsappAgentFields(body: {
  agentDisabled?: boolean;
  promptId?: number | null;
  anthropicMultiAgentId?: number | null;
  connectionAgent?: unknown;
}): { promptId: number | null; anthropicMultiAgentId: number | null } {
  if (body.agentDisabled) {
    return { promptId: null, anthropicMultiAgentId: null };
  }
  if (body.connectionAgent != null && String(body.connectionAgent).trim() !== "") {
    return parseConnectionAgentValue(body.connectionAgent);
  }
  const promptId =
    body.promptId != null && !Number.isNaN(Number(body.promptId)) ? Number(body.promptId) : null;
  const anthropicMultiAgentId =
    body.anthropicMultiAgentId != null && !Number.isNaN(Number(body.anthropicMultiAgentId))
      ? Number(body.anthropicMultiAgentId)
      : null;
  if (anthropicMultiAgentId) {
    return { promptId: null, anthropicMultiAgentId };
  }
  return { promptId, anthropicMultiAgentId: null };
}

export function parseConnectionAgentValue(raw: unknown): {
  promptId: number | null;
  anthropicMultiAgentId: number | null;
} {
  const s = String(raw ?? "").trim();
  if (!s || s === "__none__") {
    return { promptId: null, anthropicMultiAgentId: null };
  }
  if (s.startsWith("anthropic:")) {
    const id = Number(s.slice("anthropic:".length));
    return {
      promptId: null,
      anthropicMultiAgentId: Number.isNaN(id) ? null : id
    };
  }
  if (s.startsWith("prompt:")) {
    const id = Number(s.slice("prompt:".length));
    return {
      promptId: Number.isNaN(id) ? null : id,
      anthropicMultiAgentId: null
    };
  }
  const n = Number(s);
  if (!Number.isNaN(n)) {
    return { promptId: n, anthropicMultiAgentId: null };
  }
  return { promptId: null, anthropicMultiAgentId: null };
}
