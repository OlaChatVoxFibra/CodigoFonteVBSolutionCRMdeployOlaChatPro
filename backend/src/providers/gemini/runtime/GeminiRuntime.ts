/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Content, Part } from "@google/generative-ai";
import axios from "axios";
import { createGeminiClient, withGeminiTimeout } from "./GeminiClient";
import {
  isGeminiImageGenerationModel,
  resolveGeminiRuntimeModelId
} from "../utils/geminiModelCapabilities";
import { parseGeminiResponsePayload, GeminiParsedImage } from "../utils/parseGeminiResponse";
import logger from "../../../utils/logger";

export type GeminiGenerateParams = {
  apiKey: string;
  model: string;
  systemInstruction?: string;
  messages: Array<{ role: string; content: string }>;
  maxOutputTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  parts?: Part[];
};

export type GeminiGenerateResult = {
  text: string;
  images: GeminiParsedImage[];
  model: string;
  latencyMs: number;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

function buildHistory(
  messages: Array<{ role: string; content: string }>
): { history: Content[]; lastUserText: string } {
  const history = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [{ text: String(m.content || "") }] as Part[]
    }));

  const lastUserIdx = [...history].map((h) => h.role).lastIndexOf("user");
  const lastUser = lastUserIdx >= 0 ? history[lastUserIdx] : null;
  const prior = lastUserIdx >= 0 ? history.slice(0, lastUserIdx) : history.slice(0, -1);
  const userText = lastUser?.parts?.[0]?.text || "Olá";
  return { history: prior, lastUserText: userText };
}

function buildSystemInstruction(
  params: GeminiGenerateParams
): string | undefined {
  const systemParts = params.messages
    .filter((m) => m.role === "system")
    .map((m) => String(m.content || "").trim())
    .filter(Boolean);
  const merged = [params.systemInstruction || "", ...systemParts].filter(Boolean).join("\n\n");
  return merged || undefined;
}

async function geminiGenerateViaRest(
  params: GeminiGenerateParams,
  modelId: string,
  userParts: Part[],
  prior: Content[]
): Promise<any> {
  const apiKey = String(params.apiKey || "").trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    modelId
  )}:generateContent`;

  const contents: Content[] = [
    ...prior,
    { role: "user", parts: userParts }
  ];

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      maxOutputTokens: params.maxOutputTokens ?? 8192,
      temperature: params.temperature ?? 1,
      topP: params.topP,
      topK: params.topK,
      responseModalities: ["TEXT", "IMAGE"]
    }
  };

  const systemInstruction = buildSystemInstruction(params);
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  const { data } = await axios.post(url, body, {
    params: { key: apiKey },
    timeout: 90000,
    headers: { "Content-Type": "application/json" }
  });
  return data;
}

export async function geminiGenerateContent(
  params: GeminiGenerateParams
): Promise<GeminiGenerateResult> {
  const started = Date.now();
  const modelId = resolveGeminiRuntimeModelId(params.model);
  const imageModel = isGeminiImageGenerationModel(modelId);
  const client = createGeminiClient(params.apiKey);
  const systemInstruction = buildSystemInstruction(params);
  const { history: prior, lastUserText } = buildHistory(params.messages);

  const userParts: Part[] = params.parts?.length
    ? [...params.parts, { text: lastUserText }]
    : [{ text: lastUserText }];

  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: params.maxOutputTokens ?? 8192,
    temperature: params.temperature ?? 1,
    topP: params.topP,
    topK: params.topK
  };
  if (imageModel) {
    generationConfig.responseModalities = ["TEXT", "IMAGE"];
  }

  const runSdk = async () => {
    const model = client.getGenerativeModel({
      model: modelId,
      systemInstruction: systemInstruction || undefined,
      generationConfig: generationConfig as any
    });

    if (prior.length) {
      const chat = model.startChat({ history: prior });
      const result = await chat.sendMessage(userParts);
      return result;
    }
    const result = await model.generateContent(userParts);
    return result;
  };

  try {
    let parsed: { text: string; images: GeminiParsedImage[] };

    if (imageModel) {
      try {
        const data = await withGeminiTimeout(
          geminiGenerateViaRest(params, modelId, userParts, prior)
        );
        parsed = parseGeminiResponsePayload(data);
      } catch (restErr) {
        logger.warn({
          msg: "[GEMINI-RUNTIME] REST image gen failed, trying SDK",
          model: modelId,
          err: String((restErr as Error)?.message || restErr).slice(0, 200)
        });
        const result = await withGeminiTimeout(runSdk());
        parsed = parseGeminiResponsePayload((result as any)?.response || result);
        if (!parsed.text) {
          try {
            parsed.text = String((result as any)?.response?.text?.() || "").trim();
          } catch {
            /* ignore */
          }
        }
      }
    } else {
      const result = await withGeminiTimeout(runSdk());
      parsed = parseGeminiResponsePayload((result as any)?.response || result);
      if (!parsed.text) {
        try {
          parsed.text = String((result as any)?.response?.text?.() || "").trim();
        } catch {
          /* ignore */
        }
      }
    }

    return {
      text: parsed.text,
      images: parsed.images,
      model: modelId,
      latencyMs: Date.now() - started
    };
  } catch (e) {
    logger.warn({
      msg: "[GEMINI-RUNTIME] generate failed",
      model: modelId,
      err: String((e as Error)?.message || e).slice(0, 400)
    });
    throw e;
  }
}
