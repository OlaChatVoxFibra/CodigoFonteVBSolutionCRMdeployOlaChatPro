/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const REQUEST_TIMEOUT_MS = Number(process.env.GEMINI_REQUEST_TIMEOUT_MS || 60000);

export function createGeminiClient(apiKey: string): GoogleGenerativeAI {
  return new GoogleGenerativeAI(String(apiKey || "").trim());
}

export function geminiRequestTimeoutMs(): number {
  return Math.min(Math.max(REQUEST_TIMEOUT_MS, 5000), 120000);
}

export async function withGeminiTimeout<T>(
  promise: Promise<T>,
  timeoutMs = geminiRequestTimeoutMs()
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`Gemini request timeout (${timeoutMs}ms)`)),
          timeoutMs
        );
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
