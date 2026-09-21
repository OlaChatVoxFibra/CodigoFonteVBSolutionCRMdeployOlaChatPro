/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export type GeminiCapabilities = {
  functionCalling: boolean;
  grounding: boolean;
  search: boolean;
  vision: boolean;
  audioUnderstanding: boolean;
  videoUnderstanding: boolean;
  fileProcessing: boolean;
  structuredOutput: boolean;
  jsonMode: boolean;
};

export const DEFAULT_GEMINI_CAPABILITIES: GeminiCapabilities = {
  functionCalling: true,
  grounding: false,
  search: false,
  vision: true,
  audioUnderstanding: true,
  videoUnderstanding: true,
  fileProcessing: true,
  structuredOutput: true,
  jsonMode: true
};

export function parseGeminiCapabilitiesJson(raw?: string | null): GeminiCapabilities {
  if (!raw || !String(raw).trim()) {
    return { ...DEFAULT_GEMINI_CAPABILITIES };
  }
  try {
    const parsed = JSON.parse(String(raw));
    return {
      ...DEFAULT_GEMINI_CAPABILITIES,
      ...(parsed && typeof parsed === "object" ? parsed : {})
    };
  } catch {
    return { ...DEFAULT_GEMINI_CAPABILITIES };
  }
}

export function serializeGeminiCapabilities(cap: Partial<GeminiCapabilities>): string {
  return JSON.stringify({ ...DEFAULT_GEMINI_CAPABILITIES, ...cap });
}
