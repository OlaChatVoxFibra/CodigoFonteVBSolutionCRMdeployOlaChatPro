/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AnthropicIntegration from "../../../models/AnthropicIntegration";
import AppError from "../../../errors/AppError";
import { decryptAnthropicApiKeySecret } from "../utils/anthropicApiKeyCrypto";
import { compileAnthropicAgentFromProfile } from "../utils/anthropicAgentProfile";
import { createAnthropicAgentResponse } from "../runtime/AnthropicAgentResponseService";
import { getMultiAgent } from "./AnthropicMultiAgentService";
import { ANTHROPIC_ALLOWED_MODEL_IDS, AnthropicAllowedModelId } from "../utils/isClaudeModel";

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

function buildTestSystemPrompt(compiled: ReturnType<typeof compileAnthropicAgentFromProfile>): string {
  const meta = (compiled.cerebro as any)?.agentMeta || {};
  const parts: string[] = [
    `Você é o agente "${compiled.name}" no CRM VB Solution.`,
    compiled.role ? `Papel: ${compiled.role}.` : "",
    compiled.description ? `Objetivo: ${compiled.description}.` : "",
    meta.language ? `Idioma: ${meta.language}.` : "",
    meta.formality ? `Formalidade: ${meta.formality}.` : "",
    meta.writingStyle ? `Estilo: ${meta.writingStyle}.` : "",
    meta.emojisEnabled === false ? "Não use emojis." : "",
    "Responda em português do Brasil, de forma natural, como no atendimento WhatsApp real.",
    "Use as regras, roteiro, FAQ e base de conhecimento abaixo quando forem relevantes.",
    compiled.systemPrompt || compiled.prompt || ""
  ];
  return parts.filter(Boolean).join("\n\n").trim();
}

export async function testAnthropicMultiAgent(params: {
  companyId: number;
  userMessage: string;
  agentId?: number;
  profileJson?: unknown;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}) {
  const apiKey = await loadAnthropicApiKey(params.companyId);
  const integration = await AnthropicIntegration.findOne({ where: { companyId: params.companyId } });

  let legacy = {
    name: "Agente teste",
    systemPrompt: "",
    model: String(params.model || integration?.defaultModel || "claude-sonnet-4-5-20250929"),
    temperature: Number(params.temperature ?? integration?.temperature ?? 1),
    topP: Number(integration?.topP ?? 1)
  };
  let profileJson = params.profileJson;

  if (params.agentId != null && !Number.isNaN(Number(params.agentId))) {
    const agent = await getMultiAgent(params.companyId, Number(params.agentId));
    legacy = {
      name: agent.name,
      systemPrompt: agent.systemPrompt || "",
      model: String(params.model || agent.model || legacy.model),
      temperature: Number(params.temperature ?? agent.temperature ?? legacy.temperature),
      topP: Number(agent.topP ?? legacy.topP)
    };
    profileJson = profileJson ?? agent.profileJson;
  }

  const compiled = compileAnthropicAgentFromProfile(profileJson, legacy);
  const modelId = String(params.model || compiled.model || legacy.model).trim();
  if (!ANTHROPIC_ALLOWED_MODEL_IDS.includes(modelId as AnthropicAllowedModelId)) {
    throw new AppError("Modelo Anthropic inválido.", 422);
  }

  const userMsg = String(params.userMessage || "").trim() || "Olá, preciso de ajuda.";
  const system = buildTestSystemPrompt(compiled);
  const started = Date.now();

  try {
    const result = await createAnthropicAgentResponse({
      apiKey,
      model: modelId,
      maxTokens: Math.min(Math.max(Number(params.maxTokens ?? 1024), 1), 8192),
      temperature: compiled.temperature ?? legacy.temperature,
      structuredJson: false,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg }
      ]
    });

    const profile = profileJson && typeof profileJson === "object" ? (profileJson as any) : null;
    return {
      ok: true,
      response: result.content,
      model: result.model,
      durationMs: Date.now() - started,
      sectionsUsed: {
        generalRules: Boolean(String(profile?.generalRules || compiled.prompt || "").trim()),
        script: Boolean(String(profile?.attendance?.script || compiled.attendanceScript || "").trim()),
        faq: Boolean(Array.isArray(profile?.faq) && profile.faq.length > 0),
        knowledge: Boolean(
          String(profile?.knowledge?.manualText || "").trim() ||
            (Array.isArray(profile?.knowledge?.sources) && profile.knowledge.sources.length > 0)
        )
      }
    };
  } catch (e: any) {
    return {
      ok: false,
      response: "",
      model: modelId,
      durationMs: Date.now() - started,
      error: String(e?.message || e || "Falha no teste do agente Claude.")
    };
  }
}
