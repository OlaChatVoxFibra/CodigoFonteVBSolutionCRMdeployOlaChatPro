/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import IntegrationBrandIcon, { getBrandVisual } from "./IntegrationBrandIcon";

/**
 * Catálogo de integrações exibido no hub /connections.
 * `channels` filtram registros do WhatsAppsContext (modelo Whatsapp).
 */
export const INTEGRATION_CATALOG = [
  {
    key: "whatsapp-web",
    channels: ["whatsapp"],
    label: "WhatsApp Web",
    description: "Conecte via QR Code e atenda conversas no navegador, como WhatsApp Web.",
    infoLine: "QR Code · Sessão web",
    highlights: ["Leitura em tempo real", "Filas e tags", "Múltiplos atendentes"],
    iconColor: "#25D366",
    planFlag: "useWhatsapp",
  },
  {
    key: "whatsapp-oficial",
    channels: ["whatsapp_oficial"],
    label: "WhatsApp API Oficial",
    description: "API oficial Meta (Cloud API) com templates, webhook e número verificado.",
    infoLine: "Meta Cloud API · Templates",
    highlights: ["Templates aprovados", "Webhook Meta", "Número verificado"],
    iconColor: "#25D366",
    planFlag: "useWhatsappOfficial",
  },
  {
    key: "telegram-bot",
    channels: ["telegram"],
    label: "Telegram",
    description: "Bot API — clientes enviam mensagem ao seu @bot e viram tickets.",
    infoLine: "Bot API · Webhook",
    highlights: ["@bot do Telegram", "Webhook ou polling", "Tickets automáticos"],
    iconColor: "#0088cc",
  },
  {
    key: "telegram-oficial",
    channels: ["telegram_oficial"],
    label: "Telegram Oficial",
    description: "Conta real (MTProto). Mensagens da conta logada viram tickets.",
    infoLine: "MTProto · Conta real",
    highlights: ["Login SMS/app", "Sessão MTProto", "Mensagens da conta"],
    iconColor: "#229ED9",
  },
  {
    key: "sms",
    channels: ["sms"],
    label: "SMS",
    description: "Envio e recebimento via Vonage ou Twilio com webhook inbound.",
    infoLine: "Vonage · Twilio",
    highlights: ["Inbound webhook", "Vonage ou Twilio", "Filas de atendimento"],
    iconColor: "#2563eb",
  },
  {
    key: "instagram",
    channels: ["instagram"],
    label: "Instagram",
    description: "Direct e comentários do Instagram Business via Meta.",
    infoLine: "Direct · Instagram Business",
    highlights: ["Direct", "Comentários", "Conta Business"],
    iconColor: "#E1306C",
    planFlag: "useInstagram",
  },
  {
    key: "facebook",
    channels: ["facebook"],
    label: "Facebook",
    description: "Messenger e páginas Meta vinculadas à sua empresa.",
    infoLine: "Messenger · Páginas Meta",
    highlights: ["Messenger", "Páginas vinculadas", "Login Meta"],
    iconColor: "#1877F2",
    planFlag: "useFacebook",
  },
  {
    key: "email",
    channels: [],
    label: "E-mail",
    description: "Campanhas, templates, agendamentos e caixa de envio integrada.",
    infoLine: "Gmail · Outlook",
    highlights: ["Campanhas", "Templates", "Agendamentos"],
    iconColor: "#EA4335",
  },
  {
    key: "openai",
    channels: [],
    label: "Open IA",
    description: "Agentes de IA, prompts e automações — configure a API Key aqui.",
    infoLine: "API Key · Modelos",
    highlights: ["Agentes IA", "Prompts", "Automações"],
    iconColor: "#10a37f",
  },
  {
    key: "claude",
    channels: [],
    label: "Claude",
    description:
      "Modelos Anthropic para agentes, respostas longas e fluxos com raciocínio avançado.",
    infoLine: "Sonnet · Opus · Haiku",
    highlights: ["API Anthropic", "Sonnet 4", "Contexto estendido"],
    iconColor: "#D97757",
  },
  {
    key: "gemini",
    channels: [],
    label: "Gemini",
    description:
      "Modelos Google Gemini para agentes, multimodal (texto, imagem) e fluxos no ecossistema Google.",
    infoLine: "Gemini Pro · Flash · API Google AI",
    highlights: ["API Google AI Studio", "Multimodal", "Contexto longo"],
    iconColor: "#4285F4",
  },
  {
    key: "figma",
    channels: [],
    label: "Figma",
    description:
      "MCP para o Brain: consultar frames, componentes, protótipos e contexto de design para revisão, aprovação e handoff.",
    infoLine: "Design files",
    highlights: ["Links de protótipo", "Comentários", "Handoff visual"],
    iconColor: "#A259FF",
    mcp: true,
  },
  {
    key: "github",
    channels: [],
    label: "GitHub",
    description:
      "MCP para o Brain: issues, pull requests, repositórios e código da organização para suporte técnico e bugs.",
    infoLine: "Repositories",
    highlights: ["Issues vinculadas", "Pull requests", "Código no Brain"],
    iconColor: "#181717",
    mcp: true,
  },
  {
    key: "vbsolution-api",
    channels: [],
    label: "API & MCP CRM",
    description:
      "Gere credenciais de API e MCP da sua organização para extrair leads, atividades, tickets e enviar contexto ao Claude Code, Cursor, Zapier e mais.",
    infoLine: "API · MCP · Sua organização",
    highlights: ["Leads e contatos", "Atividades e projetos", "Claude · Zapier · Make"],
    iconColor: "#1e3a5f",
    mcp: true,
    externalPath: "/platform-api",
  },
];

/** Canais com formulário em /connections/:key/new */
export const INTEGRATION_SETUP_KEYS = new Set([
  "whatsapp-web",
  "whatsapp-oficial",
  "telegram-bot",
  "telegram-oficial",
  "sms",
  "facebook",
  "instagram",
  "email",
  "openai",
  "claude",
  "gemini",
  "figma",
  "github",
]);

export const GOOGLE_WORKSPACE_INTEGRATION_KEYS = new Set([]);

export function getIntegrationByKey(key) {
  return INTEGRATION_CATALOG.find((i) => i.key === key) || null;
}

export function integrationSupportsNewForm(key) {
  return INTEGRATION_SETUP_KEYS.has(key);
}

/** Integrações com cartão único (OAuth/API) em /connections/:key/manage */
export function integrationUsesConfigManage(integration) {
  if (!integration?.key) return false;
  return ["email", "openai", "claude", "gemini", "figma", "github"].includes(
    integration.key
  );
}

export function countConnectionsForIntegration(whatsApps, integration) {
  if (!integration?.channels?.length) return 0;
  return (whatsApps || []).filter((w) =>
    integration.channels.includes(w.channel || "whatsapp")
  ).length;
}

export function renderIntegrationIcon(integration, size = 22) {
  if (!integration) return null;
  const visual = getBrandVisual(integration);
  const variant =
    size >= 40 ? "hub" : size >= 30 ? "header" : size >= 22 ? "list" : "table";
  return (
    <IntegrationBrandIcon
      brandKey={visual.brandKey}
      variant={variant}
      background={visual.iconBg}
    />
  );
}
