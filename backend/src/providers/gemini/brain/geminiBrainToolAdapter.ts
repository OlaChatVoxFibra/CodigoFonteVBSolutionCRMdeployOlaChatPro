/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import type OpenAI from "openai";
import type { FunctionDeclaration, Part } from "@google/generative-ai";
import { buildBrainTools } from "../../../services/AiBrainServices/AiBrainCrmTools";

/** Converte ferramentas Brain (OpenAI) para functionDeclarations do Gemini. */
export function openAiCrmToolsToGemini(
  mcpConnections?: string[]
): FunctionDeclaration[] {
  const tools = buildBrainTools(mcpConnections);
  const out: FunctionDeclaration[] = [];
  for (const t of tools) {
    if (t.type !== "function") continue;
    const fn = (t as { type: "function"; function: OpenAI.FunctionDefinition }).function;
    if (!fn?.name) continue;
    out.push({
      name: fn.name,
      description: fn.description || "",
      parameters: (fn.parameters || { type: "object", properties: {} }) as unknown as FunctionDeclaration["parameters"]
    });
  }
  return out;
}

export type GeminiFunctionCall = {
  name: string;
  args: Record<string, unknown>;
};

export function extractTextFromGeminiParts(parts: Part[]): string {
  const chunks: string[] = [];
  for (const p of parts) {
    if (typeof (p as { text?: string }).text === "string") {
      chunks.push((p as { text: string }).text);
    }
  }
  return chunks.join("\n").trim();
}

export function extractFunctionCallsFromGeminiParts(parts: Part[]): GeminiFunctionCall[] {
  const calls: GeminiFunctionCall[] = [];
  for (const p of parts) {
    const fc = (p as { functionCall?: { name?: string; args?: Record<string, unknown> } })
      .functionCall;
    if (!fc?.name) continue;
    calls.push({
      name: fc.name,
      args: fc.args && typeof fc.args === "object" ? fc.args : {}
    });
  }
  return calls;
}
