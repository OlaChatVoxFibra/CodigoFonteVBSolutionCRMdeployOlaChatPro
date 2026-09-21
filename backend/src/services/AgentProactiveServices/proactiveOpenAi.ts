/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import OpenAI from "openai";
import Mustache from "mustache";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Whatsapp from "../../models/Whatsapp";
import ListSettingsServiceOne from "../SettingServices/ListSettingsServiceOne";
import ShowPromptService from "../PromptServices/ShowPromptService";
import { resolveOwnedPromptBlobsForRuntime } from "../../helpers/promptJsonOwner";
import { buildWhatsappPromptScopePreamble } from "../../helpers/whatsappPromptPreamble";
import { buildWhereForConnectionAgentHistory } from "../../helpers/connectionAiMessageHistory";
import { logAiCallDebug } from "../../helpers/aiCallDebugLog";
import {
  AgentProactiveSettings,
  ProactiveContextType,
  ProactiveMediaPack,
  ProactiveMissionMode
} from "../../types/agentProactiveSettings";
import logger from "../../utils/logger";
import { OPENAI_DEFAULT_CHAT_MODEL } from "../../config/openAiDefaults";

const PLAYBOOK_SNIPPETS: Record<
  string,
  Partial<Record<ProactiveContextType, string>>
> = {
  consultivo: {
    follow_up:
      "Tom consultivo: ouça mais do que fale; evite pressão comercial agressiva.",
    hot_lead:
      "Seja claro em valor e próximos passos, sem urgência falsa nem promessas vagas.",
    reengagement:
      "Novo ângulo de valor; linguagem humana, sem culpar o silêncio.",
    cold_outreach:
      "Curiosidade genuína na primeira abordagem; não venda direto."
  },
  prospeccao: {
    follow_up: "Reforce encaixe (fit) e convide a um próximo passo objetivo.",
    hot_lead: "CTA explícito para demo, proposta ou fechamento.",
    reengagement: "Gatilho de relevância ou oportunidade, com honestidade.",
    cold_outreach: "Gancho sobre dores comuns do segmento, mensagem curta."
  },
  suporte_upsell: {
    follow_up: "Combine acolhimento com valor incremental quando couber.",
    hot_lead: "Destaque planos ou upgrades alinhados ao que o cliente já usa.",
    reengagement: "Relembre benefícios já obtidos e o que há de novo.",
    cold_outreach: "Conecte problema típico a solução de forma breve."
  },
  sdr_light: {
    follow_up: "Uma pergunta objetiva de qualificação; evite texto longo.",
    hot_lead: "Confirme interesse e proponha um próximo passo curto (ex.: 15 min).",
    reengagement: "Reabra com gancho de segmento ou novidade, sem parecer robô.",
    cold_outreach: "Primeira linha humana + pergunta aberta; sem pitch completo."
  },
  closer: {
    follow_up: "Remova objeções comuns com empatia e ofereça caminho claro para decidir.",
    hot_lead: "Seja direto: condições, próximo passo e prazo sugerido (sem pressão tóxica).",
    reengagement: "Reative com oferta ou condição que faça sentido ao histórico.",
    cold_outreach: "Curto e assertivo: valor + convite a responder com disponibilidade."
  },
  customer_success: {
    follow_up: "Cheque se está tudo ok e ofereça ajuda proativa.",
    hot_lead: "Se houver sinal de expansão, conecte valor adicional ao uso atual.",
    reengagement: "Relembre conquistas e novidades do produto/serviço.",
    cold_outreach: "Tom de parceria; foco em adoção e sucesso, não em venda fria."
  }
};

const CONTEXT_INSTRUCTIONS: Record<ProactiveContextType, string> = {
  follow_up:
    "Contexto: follow_up. O cliente não respondeu há dias. Reengaje com curiosidade leve, tom humano, sem pressão comercial agressiva. Uma mensagem curta.",
  cold_outreach:
    "Contexto: cold_outreach. Primeira mensagem de prospecção. Desperte curiosidade, não venda diretamente. Curta e natural.",
  hot_lead:
    "Contexto: hot_lead. O lead demonstrou interesse real. Apresente proposta personalizada com base no histórico, tom profissional e um CTA claro no texto (ex.: convite para responder com uma palavra ou confirmar interesse).",
  reengagement:
    "Contexto: reengagement. Lead inativo há tempo. Use um ângulo diferente (novo benefício, nova abordagem), sem repetir o que já foi dito antes. Curto.",
  inbound:
    "Contexto: conversa ativa (chat). O cliente enviou mensagem; responda de forma natural e alinhada ao roteiro comercial definido nas configurações."
};

const MISSION_SNIPPETS: Record<ProactiveMissionMode, string> = {
  sales:
    "Missão COMERCIAL na proatividade: conduza com perguntas curtas que avancem o entendimento da necessidade. Aproxime de próximo passo (demo, proposta, fechamento) de forma natural. Se a configuração enviar mídia após esta mensagem, prepare o cliente numa frase (o que ele vai receber e por quê).",
  support:
    "Missão SUPORTE na proatividade: priorize diagnóstico, clareza e empatia. Pergunte o que falta para resolver. Se houver mídia após o texto, explique em uma linha o que será enviado (tutorial, print, vídeo). Evite empurrar venda.",
  balanced:
    "Missão EQUILIBRADA: seja útil, mantenha tom humano e sugira um próximo passo quando fizer sentido no histórico. Se mídia seguir esta mensagem, contextualize brevemente.",
  nurture:
    "Missão NUTRIÇÃO: eduque com micro-insights e perguntas leves; construa confiança antes de empurrar oferta. Evite spam e mensagens genéricas.",
  appointment_focus:
    "Missão AGENDAMENTO: conduza a conversa para marcar reunião, demo ou call — com duas opções de horário quando fizer sentido. Seja breve e respeite o tempo do lead.",
  retention:
    "Missão RETENÇÃO: valor já entregue, motivação e risco; proponha caminhos antes de encerrar. Tom acolhedor e objetivo.",
  billing:
    "Missão FINANCEIRO/COBRANÇA: clareza em valores e prazos; confirme entendimento e canal para regularização. Sem pressão desrespeitosa.",
  onboarding:
    "Missão ONBOARDING: uma etapa por vez; confirme progresso e próximo passo concreto. Mensagens curtas.",
  technical_depth:
    "Missão TÉCNICA: confirme requisitos e limitações; não invente especificações além do que a empresa documentou."
};

function buildHistory(messages: Message[], max: number): string {
  const slice = messages.slice(-max);
  return slice
    .map(m => {
      const who = m.fromMe ? "Assistente" : "Cliente";
      const body = (m.body || "").trim() || `[${m.mediaType || "mídia"}]`;
      return `${who}: ${body}`;
    })
    .join("\n");
}

/** Última mensagem com texto ou mídia: se fromMe = vácuo (cliente não respondeu depois da sua msg). */
function detectFollowUpSituation(messages: Message[]): "vacuo" | "cliente_falou_por_ultimo" {
  const sorted = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  let last: Message | undefined;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const m = sorted[i];
    if ((m.body || "").trim() || m.mediaType) {
      last = m;
      break;
    }
  }
  if (!last) return "cliente_falou_por_ultimo";
  return last.fromMe ? "vacuo" : "cliente_falou_por_ultimo";
}

function contextHasMedia(settings: AgentProactiveSettings, context: ProactiveContextType): boolean {
  const p = settings.mediaByContext?.[context];
  if (!p) return false;
  const n =
    (p.imageUrls?.length || 0) + (p.documentUrls?.length || 0) + (p.videoUrls?.length || 0);
  return n > 0;
}

/** Texto para o prompt: cartões (inboundMediaSlots) + instrução global opcional (beforeMediaContext). */
export function buildBeforeMediaHintForPrompt(pack: ProactiveMediaPack | undefined): string | null {
  if (!pack) return null;
  const global = pack.beforeMediaContext?.trim();
  const slots = pack.inboundMediaSlots;
  if (slots && slots.length > 0) {
    const lines: string[] = [];
    for (const s of slots) {
      const title = (s.title || "").trim();
      const w = (s.whenToUse || "").trim();
      const label = title || "Anexo";
      if (w) lines.push(`${label}: ${w}`);
      else if (title) lines.push(title);
    }
    const slotBlock = lines.filter(Boolean).join("\n\n");
    if (slotBlock && global) return `${slotBlock}\n\n${global}`;
    if (slotBlock) return slotBlock;
    if (global) return global;
    return null;
  }
  if (global) return global;
  return null;
}

function renderCustomTemplate(
  tpl: string,
  contact: Contact,
  ticket: Ticket
): string {
  const nome = (contact.name || "").trim() || "cliente";
  const primeiro_nome = nome.split(/\s+/)[0] || "cliente";
  return Mustache.render(tpl, {
    nome,
    primeiro_nome,
    numero: contact.number || "",
    ticket_id: String(ticket.id)
  }).trim();
}

async function loadAgentRoleSnippet(companyId: number): Promise<string> {
  try {
    const row = await ListSettingsServiceOne({ companyId, key: "agent_role" });
    const raw = row?.value
      ? typeof row.value === "string"
        ? JSON.parse(row.value as string)
        : row.value
      : null;
    if (!raw || typeof raw !== "object") return "";
    const v = raw as Record<string, unknown>;
    const parts: string[] = [];
    if (v.agente) parts.push(`Nome do agente: ${String(v.agente)}`);
    if (v.funcao) parts.push(`Função/cargo: ${String(v.funcao)}`);
    if (v.objetivoAgente) parts.push(`Objetivo: ${String(v.objetivoAgente).slice(0, 500)}`);
    if (v.instrucoes) parts.push(`Instruções: ${String(v.instrucoes).slice(0, 600)}`);
    if (v.personalidade) parts.push(`Personalidade: ${String(v.personalidade)}`);
    return parts.length ? `Perfil do agente (aba Cargo):\n${parts.join("\n")}` : "";
  } catch {
    return "";
  }
}

export async function generateProactiveMessage(params: {
  companyId: number;
  ticket: Ticket;
  contact: Contact;
  context: ProactiveContextType;
  settings: AgentProactiveSettings;
  /** Hint extra (ex.: passo de sequência) */
  extraHint?: string;
}): Promise<string | null> {
  const { companyId, ticket, contact, context, settings, extraHint } = params;

  try {
    const custom = settings.customProactiveText?.[context]?.trim();
    if (custom) {
      const out = renderCustomTemplate(custom, contact, ticket);
      if (out) {
        logger.info(`[${context.toUpperCase()}] Usando texto personalizado (template) ticket=${ticket.id}`);
        return out;
      }
    }

    let connectionPrompt: Awaited<ReturnType<typeof ShowPromptService>> | null = null;
    try {
      const wa = await Whatsapp.findByPk(ticket.whatsappId, {
        attributes: ["id", "promptId", "agentDisabled"]
      });
      const pid = wa?.getDataValue("promptId") as number | null | undefined;
      const disabled = wa?.getDataValue("agentDisabled") === true;
      if (pid != null && String(pid).trim() !== "" && !Number.isNaN(Number(pid)) && !disabled) {
        connectionPrompt = await ShowPromptService({ promptId: Number(pid), companyId });
      }
    } catch {
      connectionPrompt = null;
    }

    const integ = await ListSettingsServiceOne({ companyId, key: "agent_integration" });
    const raw = integ?.value
      ? typeof integ.value === "string"
        ? JSON.parse(integ.value as string)
        : integ.value
      : null;

    let apiKey = "";
    let model = OPENAI_DEFAULT_CHAT_MODEL;
    let maxTokens = Math.min(Number(raw?.maxTokens) || 500, 800);
    let temperature = typeof raw?.temperature === "number" ? raw.temperature : 0.7;

    if (connectionPrompt?.apiKey) {
      apiKey = String(connectionPrompt.apiKey);
      model = String(connectionPrompt.model || OPENAI_DEFAULT_CHAT_MODEL);
      maxTokens = Math.min(Number(connectionPrompt.maxTokens) || 500, 800);
      temperature =
        typeof connectionPrompt.temperature === "number" ? connectionPrompt.temperature : temperature;
    } else {
      apiKey = raw?.apiKey ? String(raw.apiKey) : "";
      model = String(raw?.model || OPENAI_DEFAULT_CHAT_MODEL);
    }

    if (!apiKey) {
      logger.warn("[FOLLOW-UP] Sem API key (agente da conexão ou integração) — pulando geração LLM");
      return null;
    }

    const msgWhere =
      connectionPrompt != null
        ? buildWhereForConnectionAgentHistory(ticket, connectionPrompt.id)
        : { ticketId: ticket.id };

    let messages = await Message.findAll({
      where: msgWhere,
      order: [["createdAt", "ASC"]],
      limit: 50
    });
    messages = messages.slice(-30);

    const history = buildHistory(messages, 24);
    const playbookKey = settings.playbook ? String(settings.playbook) : "";
    const playbookLine = playbookKey
      ? PLAYBOOK_SNIPPETS[playbookKey]?.[context]?.trim()
      : "";
    const hintParts = [
      settings.hints?.[context]?.trim(),
      extraHint?.trim(),
      playbookLine ? `Estratégia (${playbookKey}): ${playbookLine}` : ""
    ].filter(Boolean);

    if (context === "follow_up") {
      const situation = detectFollowUpSituation(messages);
      if (situation === "vacuo") {
        hintParts.push(
          "Situação detectada: a última mensagem relevante foi SUA (ou do bot). O cliente ainda não respondeu — recontato leve, humano, sem cobrar; pode assumir que não viu ou ficou pendente."
        );
        const tv = settings.followUpToneVacuo?.trim();
        if (tv) hintParts.push(`Tom sugerido para este caso: ${tv}`);
      } else {
        hintParts.push(
          "Situação detectada: a última mensagem relevante foi do CLIENTE. Ele falou e depois houve silêncio — retome com utilidade, uma pergunta clara, sem culpar o silêncio."
        );
        const tc = settings.followUpToneClienteSilencioso?.trim();
        if (tc) hintParts.push(`Tom sugerido para este caso: ${tc}`);
      }
    }

    const mission: ProactiveMissionMode = settings.proactiveMission || "balanced";
    const missionLine = MISSION_SNIPPETS[mission] || MISSION_SNIPPETS.balanced;
    hintParts.push(missionLine);

    let roleSnippet = "";
    let connectionAgentBlocks = "";
    if (connectionPrompt) {
      const { buildAgentRoleInstructionLines, getExtensionsForWhatsappAgentPrompt } = await import(
        "../IntegrationsServices/OpenAiService"
      );
      const owned = resolveOwnedPromptBlobsForRuntime(
        connectionPrompt.id,
        connectionPrompt.cargo,
        connectionPrompt.cerebro,
        connectionPrompt.produtividade
      );
      roleSnippet = await buildAgentRoleInstructionLines(companyId, owned.cargo, {
        preferPromptOnly: true
      });
      const ext = await getExtensionsForWhatsappAgentPrompt(companyId, connectionPrompt);
      connectionAgentBlocks = [
        buildWhatsappPromptScopePreamble(connectionPrompt),
        ext.brainBlock,
        ext.proactiveBlock,
        ext.actionsBlock
      ]
        .filter(Boolean)
        .join("\n");
    } else {
      roleSnippet = await loadAgentRoleSnippet(companyId);
    }
    if (roleSnippet) {
      hintParts.push(roleSnippet);
    }

    if (contextHasMedia(settings, context)) {
      const pack = settings.mediaByContext?.[context];
      const bmc = buildBeforeMediaHintForPrompt(pack);
      if (bmc) {
        hintParts.push(
          `Contexto antes dos anexos (definido pelo operador):\n${bmc}\nO sistema enviará arquivos logo após esta mensagem — alinhe o texto a isso.`
        );
      } else {
        hintParts.push(
          "O sistema pode enviar anexos (imagens/documentos/vídeos) em seguida. Prepare o cliente numa frase curta, sem prometer o que não está configurado."
        );
      }
    }

    const hint = hintParts.join("\n");
    const objective = settings.objectives?.[context]?.trim();
    const sys = `Você é o assistente no WhatsApp. Escreva em português do Brasil.
${connectionAgentBlocks ? `${connectionAgentBlocks}\n` : ""}
${CONTEXT_INSTRUCTIONS[context]}
${objective ? `Objetivo neste envio: ${objective}\n` : ""}
${hint ? `Instruções combinadas:\n${hint}\n` : ""}
O contato pode ser novo ou sem cadastro completo no CRM — use o nome disponível ou trate com neutralidade.
Nome para saudação: ${contact.name || "cliente"}.
Responda APENAS com o texto da mensagem a enviar, sem aspas, sem prefixos.`;

    const user = `Histórico recente:\n${history || "(sem histórico textual)"}\n\nGere a mensagem.`;

    const openai = new OpenAI({ apiKey });
    logAiCallDebug("proactiveOpenAi.ts:generateProactiveMessage", ticket, sys);
    const chat = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user }
      ],
      max_tokens: maxTokens,
      temperature
    });

    const text = (chat.choices[0]?.message?.content || "").trim();
    return text || null;
  } catch (e) {
    logger.error(`[${context.toUpperCase()}] Erro OpenAI proativo:`, e);
    return null;
  }
}
