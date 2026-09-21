/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** Valor unificado no seletor de agente da conexão (WhatsApp, Telegram, etc.). */
export function toConnectionAgentValue(agent) {
  if (!agent) return "__none__";
  if (agent.connectionValue) return agent.connectionValue;
  if (agent.provider === "anthropic" && agent.id != null) {
    return `anthropic:${agent.id}`;
  }
  if (agent.id != null) return `prompt:${agent.id}`;
  return "__none__";
}

export function connectionAgentLabel(agent) {
  if (!agent) return "";
  const model = agent.model ? ` · ${agent.model}` : "";
  const badge =
    agent.provider === "anthropic"
      ? "Claude"
      : agent.provider === "gemini"
        ? "Gemini"
        : "OpenAI";
  return `${agent.name} (${badge}${model})`;
}

export function parseConnectionAgentValueForSave(selected) {
  if (!selected || selected === "__none__") {
    return { connectionAgent: "__none__", agentDisabled: true };
  }
  return { connectionAgent: String(selected), agentDisabled: false };
}

export function whatsappAgentValueFromRecord(data) {
  if (data?.agentDisabled === true) return "__none__";
  const anthropicId = data?.anthropicMultiAgentId;
  if (anthropicId != null && String(anthropicId).trim() !== "") {
    return `anthropic:${anthropicId}`;
  }
  const promptId = data?.promptId;
  if (promptId != null && String(promptId).trim() !== "" && !Number.isNaN(Number(promptId))) {
    return `prompt:${promptId}`;
  }
  return "__none__";
}
