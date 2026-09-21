/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** Préâmbulo do system prompt no WhatsApp: reforça uso exclusivo deste registro Prompt. */
export function buildWhatsappPromptScopePreamble(prompt: {
  id: number;
  name?: string | null;
}): string {
  const label = String(prompt.name || "").trim() || "Agente";
  return [
    "--- Agente ativo (exclusivo desta conexão) ---",
    `ID do agente (prompt): ${prompt.id}`,
    `Nome: ${label}`,
    "Regras de isolamento (obrigatório):",
    "- Use somente o texto deste agente: Regras Gerais, roteiro (etapas/script), cérebro/base, actions e file_search quando existir para ESTE promptId.",
    "- Não invente preços, prazos, políticas, nomes de produtos, nem dados de outra empresa, outro agente ou conhecimento genérico que não apareça nesses blocos.",
    "- Se algo não estiver escrito aqui, diga que não tem essa informação no material do agente ou faça uma pergunta neutra para seguir o roteiro — não preencha lacunas com suposições.",
    "---",
    ""
  ].join("\n");
}
