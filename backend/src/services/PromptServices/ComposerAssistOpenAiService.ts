/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AppError from "../../errors/AppError";
import { OPENAI_DEFAULT_CHAT_MODEL } from "../../config/openAiDefaults";
import ListSettingsServiceOne from "../SettingServices/ListSettingsServiceOne";
import logger from "../../utils/logger";

const OPENAI_V1 = "https://api.openai.com/v1";
const MAX_PROMPT_CHARS = 12000;

/** Modelos de raciocínio / GPT-5 só aceitam temperature padrão (1) — omitir no payload. */
function modelSupportsCustomTemperature(model: string): boolean {
  const m = String(model || "").trim().toLowerCase();
  if (!m) return true;
  if (/^o[0-9]/.test(m)) return false;
  if (/^gpt-5/.test(m)) return false;
  if (m.includes("reasoning")) return false;
  return true;
}

function isTemperatureUnsupportedError(message: string): boolean {
  const msg = String(message || "").toLowerCase();
  return msg.includes("temperature") && (msg.includes("not support") || msg.includes("unsupported"));
}

function parseAgentIntegration(raw: unknown): { apiKey: string; model: string } {
  if (!raw) return { apiKey: "", model: OPENAI_DEFAULT_CHAT_MODEL };
  try {
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    return {
      apiKey: v?.apiKey ? String(v.apiKey).trim() : "",
      model: String(v?.model || OPENAI_DEFAULT_CHAT_MODEL).trim() || OPENAI_DEFAULT_CHAT_MODEL
    };
  } catch {
    return { apiKey: "", model: OPENAI_DEFAULT_CHAT_MODEL };
  }
}

export async function composerAssistTransform(params: {
  companyId: number;
  systemPrompt: string;
  userPrompt: string;
}): Promise<string> {
  const systemPrompt = String(params.systemPrompt || "").trim();
  const userPrompt = String(params.userPrompt || "").trim();
  if (!systemPrompt || !userPrompt) {
    throw new AppError("Instruções e texto são obrigatórios.", 400);
  }

  const integ = await ListSettingsServiceOne({
    companyId: params.companyId,
    key: "agent_integration"
  });
  const { apiKey, model } = parseAgentIntegration(integ?.value);
  if (!apiKey) {
    throw new AppError(
      "Configure a API Key do agente em Agente IA → Integração (/prompts).",
      400
    );
  }

  const messages = [
    { role: "system" as const, content: systemPrompt.slice(0, MAX_PROMPT_CHARS) },
    { role: "user" as const, content: userPrompt.slice(0, MAX_PROMPT_CHARS) }
  ];

  const buildBody = (includeTemperature: boolean) => {
    const body: Record<string, unknown> = { model, messages };
    if (includeTemperature && modelSupportsCustomTemperature(model)) {
      body.temperature = 0.3;
    }
    return body;
  };

  const requestOpenAi = async (includeTemperature: boolean): Promise<Response> => {
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 45000);
    try {
      return await fetch(`${OPENAI_V1}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(buildBody(includeTemperature)),
        signal: ac.signal
      });
    } catch (e: any) {
      logger.warn(`[ComposerAssist] OpenAI request failed: ${e?.message || e}`);
      throw new AppError("Falha ao contactar a OpenAI. Tente novamente.", 502);
    } finally {
      clearTimeout(to);
    }
  };

  let res = await requestOpenAi(true);

  let data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    const msg = data?.error?.message || `OpenAI HTTP ${res.status}`;
    if (res.status === 400 && isTemperatureUnsupportedError(msg)) {
      logger.info(`[ComposerAssist] Retrying without temperature model=${model}`);
      res = await requestOpenAi(false);
      data = (await res.json()) as typeof data;
    }
  }

  if (!res.ok) {
    const msg = data?.error?.message || `OpenAI HTTP ${res.status}`;
    logger.warn(`[ComposerAssist] OpenAI HTTP ${res.status}: ${msg}`);
    throw new AppError(
      res.status === 401
        ? "API Key inválida. Verifique em Agente IA → Integração."
        : `Falha na IA: ${msg}`,
      res.status === 401 ? 400 : 400
    );
  }

  const text = String(data?.choices?.[0]?.message?.content || "").trim();
  if (!text) {
    throw new AppError("A IA não retornou texto. Verifique o modelo configurado.", 400);
  }
  return text;
}
