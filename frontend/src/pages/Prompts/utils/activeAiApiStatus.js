/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** Rótulo de status das integrações GPT e Claude (podem coexistir). */
export function formatActiveApiStatus({
  openAiModel = "",
  openAiHasKey = false,
  openAiActive = true,
  hasAnthropicKey = false,
  claudeEnabled = false,
  claudeModelTitle = ""
}) {
  const gptModel = String(openAiModel || "gpt-5.5")
    .replace(/^anthropic:/, "")
    .trim();
  const gptOk = openAiHasKey && openAiActive !== false;
  const claudeOk = hasAnthropicKey && claudeEnabled;

  if (gptOk && claudeOk) {
    return {
      line: "OpenAI (GPT) e Anthropic (Claude) ativos",
      sub: `GPT · ${gptModel || "—"} · Claude · ${claudeModelTitle || "Claude"}`
    };
  }
  if (claudeOk) {
    return {
      line: `Anthropic (Claude) · ${claudeModelTitle || "Claude"}`,
      sub: gptOk
        ? `OpenAI (GPT) · ${gptModel || "—"} também configurado`
        : null
    };
  }
  if (hasAnthropicKey && !claudeEnabled) {
    return {
      line: "Anthropic (Claude) — inativa",
      sub: claudeModelTitle ? `Modelo: ${claudeModelTitle}` : "Ative o toggle Claude na integração."
    };
  }
  if (openAiHasKey) {
    const inactive = openAiActive === false ? " (integração desativada)" : "";
    return {
      line: `OpenAI (GPT) · ${gptModel || "—"}${inactive}`,
      sub: hasAnthropicKey
        ? "Claude com chave salva — ative o toggle para usar modelos Anthropic."
        : "Configure Anthropic em Integrações → Claude para usar modelos Claude."
    };
  }
  return {
    line: "Nenhuma API ativa",
    sub: "Informe API Key OpenAI (GPT) e/ou Anthropic (Claude)."
  };
}
