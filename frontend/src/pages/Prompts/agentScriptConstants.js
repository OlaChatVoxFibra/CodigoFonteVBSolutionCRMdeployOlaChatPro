/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** Variáveis padrão do roteiro: inserir com * (menu) — substituídas no atendimento em tempo real. */
export const STANDARD_SCRIPT_VARIABLES = [
  { key: "nome_contato", label: "Nome do contato", sub: "{nome_contato}", emoji: "👤" },
  { key: "nome_agente", label: "Nome do agente IA", sub: "{nome_agente}", emoji: "🤖" },
  { key: "nome_empresa", label: "Nome da empresa", sub: "{nome_empresa}", emoji: "🏢" },
  { key: "data_hora", label: "Data e hora", sub: "{data_hora}", emoji: "🕐" },
  { key: "ano", label: "Ano", sub: "{ano}", emoji: "📅" },
  { key: "mes_atual", label: "Mês atual", sub: "{mes_atual}", emoji: "📆" },
  { key: "telefone", label: "Telefone do contato", sub: "{telefone}", emoji: "📱" },
  { key: "data_completa", label: "Data (dia/mês/ano)", sub: "{data_completa}", emoji: "📌" }
];

export const STANDARD_VARIABLE_KEYS = new Set(STANDARD_SCRIPT_VARIABLES.map((v) => v.key));

/** Para realce: chaves sem chaves */
export function placeholderKeyFromToken(tokenText) {
  const m = String(tokenText || "").match(/^\{([a-zA-Z0-9_]+)\}$/);
  return m ? m[1] : null;
}
