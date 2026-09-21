/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export function whatsappHasConnectionAgent(whatsapp) {
  if (!whatsapp || whatsapp.agentDisabled === true) return false;
  const promptId = whatsapp.promptId;
  const anthropicId = whatsapp.anthropicMultiAgentId;
  return (
    (promptId != null &&
      String(promptId).trim() !== "" &&
      !Number.isNaN(Number(promptId))) ||
    (anthropicId != null &&
      String(anthropicId).trim() !== "" &&
      !Number.isNaN(Number(anthropicId)))
  );
}

export function ticketFromCampaign(ticket) {
  const sourceId = ticket?.dataWebhook?.sourceCampaignId;
  if (sourceId != null && sourceId !== "") return true;
  const tags = ticket?.contact?.tags || [];
  return tags.some((t) => /^Campanha #\d+$/i.test(String(t?.name || "")));
}

/** Tag azul "Agente de IA" só quando o agente realmente enviou mensagem na conversa. */
export function shouldShowAiAgentPreview(ticket) {
  if (!ticket?.lastMessage) return false;
  if (ticket.fromMe !== true) return false;
  if (ticketFromCampaign(ticket)) return false;
  if (!whatsappHasConnectionAgent(ticket?.whatsapp)) return false;

  const hasAgentMessage =
    ticket.hasAgentMessage === true ||
    ticket.hasAgentMessage === 1 ||
    ticket.hasAgentMessage === "1" ||
    ticket.hasAgentMessage === "true";
  if (!hasAgentMessage) return false;

  return ticket.isBot === true || ticket.useIntegration === true;
}
