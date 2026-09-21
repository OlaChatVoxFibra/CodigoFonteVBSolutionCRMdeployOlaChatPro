/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import type OpenAI from "openai";
import type Anthropic from "@anthropic-ai/sdk";
import { buildBrainTools } from "../../../services/AiBrainServices/AiBrainCrmTools";

export function openAiCrmToolsToAnthropic(
  mcpConnections?: string[]
): Anthropic.Messages.Tool[] {
  const tools = buildBrainTools(mcpConnections);
  const out: Anthropic.Messages.Tool[] = [];
  for (const t of tools) {
    if (t.type !== "function") continue;
    const fn = (t as { type: "function"; function: OpenAI.FunctionDefinition }).function;
    if (!fn?.name) continue;
    out.push({
      name: fn.name,
      description: fn.description || "",
      input_schema: (fn.parameters || { type: "object", properties: {} }) as Anthropic.Messages.Tool.InputSchema
    });
  }
  return out;
}

export function extractTextFromAnthropicContent(
  blocks: Anthropic.Messages.ContentBlock[]
): string {
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.type === "text") {
      parts.push(b.text);
    }
  }
  return parts.join("\n").trim();
}

export function extractToolUsesFromAnthropicContent(
  blocks: Anthropic.Messages.ContentBlock[]
): Anthropic.Messages.ToolUseBlock[] {
  return blocks.filter((b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use");
}
