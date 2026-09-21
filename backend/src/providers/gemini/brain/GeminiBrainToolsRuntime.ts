/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Content, Part } from "@google/generative-ai";
import { createGeminiClient, withGeminiTimeout } from "../runtime/GeminiClient";
import { resolveGeminiRuntimeModelId } from "../utils/geminiModelCapabilities";
import {
  extractFunctionCallsFromGeminiParts,
  extractTextFromGeminiParts,
  GeminiFunctionCall
} from "./geminiBrainToolAdapter";
import logger from "../../../utils/logger";

export type GeminiBrainContent = Content;

export type GeminiBrainTurnResult = {
  text: string;
  functionCalls: GeminiFunctionCall[];
  modelParts: Part[];
  model: string;
};

function collectPartsFromPayload(payload: unknown): Part[] {
  const candidates = (payload as any)?.candidates || (payload as any)?.response?.candidates || [];
  const parts: Part[] = [];
  for (const c of candidates) {
    if (Array.isArray(c?.content?.parts)) {
      parts.push(...c.content.parts);
    }
  }
  return parts;
}

export async function geminiBrainMessagesTurn(params: {
  apiKey: string;
  model: string;
  maxOutputTokens: number;
  temperature: number;
  topP?: number;
  topK?: number;
  system?: string;
  tools: { functionDeclarations: import("@google/generative-ai").FunctionDeclaration[] };
  contents: GeminiBrainContent[];
}): Promise<GeminiBrainTurnResult> {
  const modelId = resolveGeminiRuntimeModelId(params.model);
  const client = createGeminiClient(params.apiKey);

  const model = client.getGenerativeModel({
    model: modelId,
    systemInstruction: params.system || undefined,
    tools: [params.tools],
    generationConfig: {
      maxOutputTokens: params.maxOutputTokens,
      temperature: params.temperature,
      topP: params.topP,
      topK: params.topK
    }
  });

  const result = await withGeminiTimeout(model.generateContent({ contents: params.contents }));
  const response = result.response;
  let parts: Part[] = [];
  try {
    parts = (response as any)?.candidates?.[0]?.content?.parts || [];
  } catch {
    parts = collectPartsFromPayload(response);
  }
  if (!parts.length) {
    try {
      const t = response.text();
      if (t) parts = [{ text: t }];
    } catch {
      /* ignore */
    }
  }

  return {
    text: extractTextFromGeminiParts(parts),
    functionCalls: extractFunctionCallsFromGeminiParts(parts),
    modelParts: parts,
    model: modelId
  };
}

export function appendGeminiModelTurn(contents: GeminiBrainContent[], parts: Part[]): void {
  contents.push({ role: "model", parts });
}

export function appendGeminiFunctionResponses(
  contents: GeminiBrainContent[],
  responses: { name: string; resultJson: string }[]
): void {
  const parts: Part[] = responses.map((r) => {
    let responsePayload: Record<string, unknown> = { content: r.resultJson };
    try {
      const parsed = JSON.parse(r.resultJson);
      if (parsed && typeof parsed === "object") {
        responsePayload = parsed as Record<string, unknown>;
      }
    } catch {
      /* string bruta */
    }
    return {
      functionResponse: {
        name: r.name,
        response: responsePayload
      }
    };
  });
  contents.push({ role: "user", parts });
}

export function logGeminiBrainToolError(err: unknown): void {
  logger.warn({
    msg: "[GEMINI-BRAIN-TOOLS] turn failed",
    err: String((err as Error)?.message || err).slice(0, 400)
  });
}
