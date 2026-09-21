/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Prompt from "../../../models/Prompt";

export type RuntimeSmartActionScope =
  | { kind: "prompt"; promptId: number }
  | { kind: "anthropic"; anthropicMultiAgentId: number };

export function resolveRuntimeSmartActionScope(
  prompt: Prompt | Record<string, unknown>
): RuntimeSmartActionScope {
  const anthropicId = Number((prompt as any).__anthropicMultiAgentId);
  if (anthropicId && !Number.isNaN(anthropicId)) {
    return { kind: "anthropic", anthropicMultiAgentId: anthropicId };
  }
  const promptId = Number((prompt as any).id);
  if (!Number.isFinite(promptId)) {
    throw new Error("smartActionScope: prompt.id inválido");
  }
  return { kind: "prompt", promptId };
}

export function smartActionWhereForRuntime(
  prompt: Prompt | Record<string, unknown>,
  companyId: number
): Record<string, unknown> {
  const scope = resolveRuntimeSmartActionScope(prompt);
  if (scope.kind === "anthropic") {
    return { companyId, anthropicMultiAgentId: scope.anthropicMultiAgentId };
  }
  return { companyId, promptId: scope.promptId };
}
