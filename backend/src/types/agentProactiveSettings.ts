/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export type ProactiveContextType =
  | "follow_up"
  | "hot_lead"
  | "reengagement"
  | "cold_outreach"
  /** Mídia após resposta da IA no chat (mensagem inbound do cliente) */
  | "inbound";

export type AgentProactivePlaybook =
  | "consultivo"
  | "prospeccao"
  | "suporte_upsell"
  | "sdr_light"
  | "closer"
  | "customer_success"
  | "";

/** Direção da conversa quando a proatividade está ligada */
export type ProactiveMissionMode =
  | "balanced"
  | "sales"
  | "support"
  | "nurture"
  | "appointment_focus"
  | "retention"
  | "billing"
  | "onboarding"
  | "technical_depth";

export interface ProactiveSegmentRule {
  /** Contato deve ter pelo menos uma destas tags */
  tagIds?: number[];
  /** Contato deve existir na lista (match por número normalizado) */
  contactListId?: number | null;
}

export interface ProactiveBusinessHours {
  enabled?: boolean;
  /** 0–23, horário America/Sao_Paulo */
  startHour?: number;
  endHour?: number;
}

/** Links com rótulo e quando usar (injetados no prompt do chat reativo). */
export interface ContextualLink {
  id: string;
  url: string;
  label: string;
  /** Ex.: pagamento, site, agenda */
  whenToUse: string;
  /** Se true, tenta buscar trecho de texto da página para o prompt */
  fetchContent?: boolean;
}

/** Um anexo com rótulo e “quando usar”, espelhando ContextualLink na UI. */
export interface InboundMediaSlot {
  id: string;
  /** Nome curto do anexo (ex.: catálogo, tabela de preços) */
  title?: string;
  /** Quando a IA deve preparar o cliente para este arquivo */
  whenToUse?: string;
  imageUrl?: string;
  documentUrl?: string;
  videoUrl?: string;
}

export interface ProactiveMediaPack {
  imageUrls?: string[];
  documentUrls?: string[];
  videoUrls?: string[];
  /**
   * Cartões na UI (inbound). Opcional; URLs planas legadas continuam válidas.
   * Ordem dos slots define ordem dentro de cada tipo ao derivar image/document/video.
   */
  inboundMediaSlots?: InboundMediaSlot[];
  /** Pausa em segundos após o texto antes de enviar anexos (0–180) */
  delayAfterTextSec?: number;
  /** Não enviar anexos se já houve mídia sua neste ticket nas últimas 48h */
  skipIfRecentOutboundMedia?: boolean;
  /**
   * Instrução geral opcional para o modelo (além do texto por cartão em inboundMediaSlots).
   * Ex.: tom global ou observação que vale para todos os anexos.
   */
  beforeMediaContext?: string;
}

export interface ProactiveSequenceStep {
  delayHours: number;
  hint?: string;
}

/**
 * Reservado para funil comercial explícito (integrações / evolução futura).
 * Nenhum job do core preenche este campo automaticamente hoje.
 */
export type ProactiveSalesFunnelStage =
  | "discovery"
  | "material_sent"
  | "meeting_proposed"
  | "chase"
  | "closed_won"
  | "closed_lost";

export interface AgentProactiveTicketState {
  followUpAttempts?: number;
  lastFollowUpAt?: string;
  lastUserInboundAt?: string;
  hotPending?: boolean;
  hotProposalSent?: boolean;
  automationInactive?: boolean;
  inactiveMarkedAt?: string;
  lastReengagementAt?: string;
  /** Total de mensagens de reengajamento já enviadas neste ticket */
  reengagementAttempts?: number;
  /** YYYY-MM-DD (America/Sao_Paulo) para limite diário */
  proactiveSentDay?: string;
  proactiveSentCount?: number;
  /** Opcional: estágio do funil (preenchimento manual ou automação futura) */
  proactiveSalesStage?: ProactiveSalesFunnelStage | string;
}

/** Persistido em Settings (key: agent_proactive) */
export interface AgentProactiveSettings {
  enabled?: boolean;
  followUpEnabled?: boolean;
  hotLeadEnabled?: boolean;
  reengagementEnabled?: boolean;
  /** Dias após última mensagem do usuário para 1ª / próxima tentativa de follow-up */
  followUpAfterDays?: number;
  /** Semanas após marcar inativo para tentar reengajamento */
  reengageAfterWeeks?: number;
  hotLeadKeywords?: string[];
  /** Textos opcionais por contexto (guia para o modelo) */
  hints?: Partial<Record<ProactiveContextType, string>>;
  /** Objetivo comercial explícito por contexto (orienta o LLM) */
  objectives?: Partial<Record<ProactiveContextType, string>>;
  /** Preset de estratégia (UI pode mesclar em hints ao salvar) */
  playbook?: AgentProactivePlaybook;
  /** Público-alvo por contexto (tags e/ou lista de contatos) */
  segments?: Partial<Record<ProactiveContextType, ProactiveSegmentRule>>;
  businessHours?: ProactiveBusinessHours;
  /** Mídias enviadas após o texto proativo, por contexto */
  mediaByContext?: Partial<Record<ProactiveContextType, ProactiveMediaPack>>;
  defaultOutbound?: { allowAgentToSuggestUrls?: boolean };
  /** Máximo de mensagens proativas (texto) por contato/ticket por dia; 0 ou ausente = sem limite extra */
  maxProactivePerContactPerDay?: number;
  /** Toques adicionais após cold outreach inicial (delay + hint opcional) */
  sequences?: { cold_outreach?: ProactiveSequenceStep[] };
  /** Disparo manual/API: merge | list_only | ids_only */
  coldOutreachBlendMode?: string;
  /**
   * Se true (padrão quando omitido), aplica tags/listas por fluxo.
   * Se false, toda conversa elegível recebe proatividade — inclusive contato “só WhatsApp” fora de listas.
   */
  applySegmentFilters?: boolean;
  /** Máximo de follow-ups sem resposta antes de marcar inativo (padrão 3) */
  maxFollowUpAttempts?: number;
  /** Mínimo de horas entre um follow-up e o próximo (0 = só regra de dias) */
  minHoursBetweenFollowUps?: number;
  /** Máximo total de reengajamentos por ticket (omitido = só intervalo de 7 dias, sem teto extra) */
  maxReengagementAttempts?: number;
  /** Texto fixo por contexto; substitui a IA se preenchido. Mustache: {{nome}} {{primeiro_nome}} {{numero}} {{ticket_id}} */
  customProactiveText?: Partial<Record<ProactiveContextType, string>>;
  /** Como o agente deve “conduzir” a conversa proativa */
  proactiveMission?: ProactiveMissionMode;
  /** Incluir botões rápidos em proposta (Baileys templateButtons) */
  useHotLeadButtons?: boolean;
  /** Analisar imagens recebidas com OpenAI Vision (fluxo integração) */
  openAiVisionInbound?: boolean;
  /** Resposta curta ao receber mídia sem análise */
  acknowledgeMedia?: boolean;
  /**
   * Roteiro comercial injetado no prompt do chat reativo (qualificar, apresentar serviço, CTA).
   */
  inboundConversationBrief?: string;
  /**
   * Se true, anexos do contexto `inbound` só na primeira resposta da IA do ticket (antes não havia mensagem fromMe).
   */
  inboundMediaOnlyFirstResponse?: boolean;
  /**
   * Se true, mantém o comportamento antigo: após cada resposta “sent”, envia todo o pack inbound (se houver).
   * Omitido/false: só envia quando há intenção (pedido de material etc.), marcação [[SEND_INBOUND_MEDIA]] na resposta, ou texto da IA indicando envio.
   */
  inboundMediaAlwaysAfterReply?: boolean;
  /** Links (site, pagamento, etc.) com contexto para o modelo no chat reativo */
  contextualLinks?: ContextualLink[];
  /**
   * Se true, para cada link com fetchContent (ou todos se o link não define), tenta incluir trecho da página no prompt.
   */
  fetchLinkContentForPrompt?: boolean;
  /** Tom guia quando o follow-up detecta que a última mensagem foi sua (cliente em vácuo) */
  followUpToneVacuo?: string;
  /** Tom guia quando a última mensagem foi do cliente (silêncio depois da fala dele) */
  followUpToneClienteSilencioso?: string;
}

export const defaultHotLeadKeywords = [
  "preço",
  "preco",
  "proposta",
  "orçamento",
  "orcamento",
  "quero",
  "contratar",
  "fechar",
  "valor",
  "plano",
  "comprar"
];

export function parseAgentProactiveSettings(raw: unknown): AgentProactiveSettings {
  if (!raw || typeof raw !== "object") return {};
  return { ...(raw as AgentProactiveSettings) };
}
