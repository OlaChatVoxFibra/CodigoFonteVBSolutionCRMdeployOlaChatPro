/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import fs from "fs";
import path from "path";
import { proto } from "baileys";
import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import TicketTraking from "../../models/TicketTraking";
import Prompt from "../../models/Prompt";
import PromptSmartAction from "../../models/PromptSmartAction";
import PromptAgentMedia from "../../models/PromptAgentMedia";
import Inventory from "../../models/Inventory";
import { getMessageOptions } from "../WbotServices/SendWhatsAppMedia";
import CreateConvertedLeadService from "../ConvertedLeadServices/CreateService";
import { executeSmartAction } from "./PromptSmartActionExecutorService";
import CreateLogTicketService from "../TicketServices/CreateLogTicketService";
import { resolveReplyJid } from "../WbotServices/getJidOf";
import logger from "../../utils/logger";
import { sanitizeAgentCustomerVisibleText } from "../../helpers/sanitizeAgentCustomerVisibleText";
import { assistantTextImpliesTransferToHuman } from "../../helpers/assistantTransferIntent";
import {
  extractSlashCommandsFromTrainingTail,
  matchScriptCommandSlugFromLine,
  sliceAgentStepTextForInitialSend
} from "../../helpers/agentScriptInitialSendSlice";

type Session = any;

function transferVarsIfDeclared(
  actionSlug: string,
  vars: Record<string, unknown>,
  customerVisibleText: string
): Record<string, unknown> | null {
  if (actionSlug !== "transferirChamado" && actionSlug !== "transferirAtendimento") {
    return vars;
  }
  if (!assistantTextImpliesTransferToHuman(customerVisibleText)) {
    return null;
  }
  return {
    ...vars,
    assistantDeclaredTransfer: true,
    transferAuthorized: true,
    scriptTransferWithDeclaration: true
  };
}

function parseMidiasJson(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return p && typeof p === "object" && !Array.isArray(p) ? p : {};
    } catch {
      return {};
    }
  }
  return {};
}

type MediaEntry = { slug: string; fileUrl?: string; fileType?: string; caption?: string; name?: string };

async function loadMediaIndex(prompt: Prompt, companyId: number): Promise<Map<string, MediaEntry>> {
  const map = new Map<string, MediaEntry>();
  const mid = parseMidiasJson(prompt.getDataValue("midias"));
  const lib = mid.guimoMediaLibrary;
  if (Array.isArray(lib)) {
    for (const m of lib) {
      const slug = String(m?.slug || "").trim();
      if (!slug) continue;
      map.set(slug, {
        slug,
        fileUrl: m.fileUrl != null ? String(m.fileUrl) : "",
        fileType: m.fileType != null ? String(m.fileType) : "",
        caption: m.caption != null ? String(m.caption) : "",
        name: m.name != null ? String(m.name) : slug
      });
    }
  }
  try {
    const rows = await PromptAgentMedia.findAll({
      where: { promptId: prompt.id, companyId }
    });
    for (const r of rows) {
      const slug = String(r.slug || "").trim();
      if (!slug) continue;
      map.set(slug, {
        slug,
        fileUrl: r.fileUrl || "",
        fileType: r.fileType || "",
        caption: r.caption || "",
        name: r.name || slug
      });
    }
  } catch (e) {
    logger.warn(`[SCRIPT-CMD] PromptAgentMedia load falhou prompt=${prompt.id}`, e);
  }
  return map;
}

function parseAttachments(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

async function sendOneMedia(
  verifyMediaMessage: any,
  wbot: Session,
  msg: proto.IWebMessageInfo,
  ticket: Ticket,
  contact: Contact,
  ticketTraking: TicketTraking | undefined,
  companyId: number,
  entry: MediaEntry,
  verifyMessage: any
): Promise<void> {
  const url = String(entry.fileUrl || "").trim();
  if (!url) {
    logger.warn(`[SCRIPT-CMD] Mídia sem URL slug=${entry.slug}`);
    return;
  }
  const publicRoot = path.resolve(__dirname, "..", "..", "..", "public");
  const rel = url.startsWith("/") ? url.slice(1) : url;
  const fullPath = path.join(publicRoot, rel);
  if (!fs.existsSync(fullPath)) {
    logger.warn(`[SCRIPT-CMD] Arquivo ausente: ${fullPath}`);
    return;
  }
  const fileName = path.basename(fullPath).slice(0, 380);
  try {
    const opts = await getMessageOptions(fileName, fullPath, String(companyId), " ");
    if (opts && Object.keys(opts).length) {
      const mediaMsg = await wbot.sendMessage(resolveReplyJid(msg, contact), { ...opts });
      await verifyMediaMessage(mediaMsg!, ticket, contact, ticketTraking!, false, false, wbot, true);
    }
    const cap = String(entry.caption || "").trim();
    if (cap) {
      const sent = await wbot.sendMessage(resolveReplyJid(msg, contact), { text: `\u200e ${cap}` });
      await verifyMessage(sent!, ticket, contact, ticketTraking, true, false, true);
    }
  } catch (e) {
    logger.error(`[SCRIPT-CMD] Falha ao enviar mídia slug=${entry.slug}`, e);
  }
}

/** Resolve linha de “Ação inteligente” pelo slug do roteiro (/agendamento, aliases). */
export async function findPromptSmartActionRowByScriptSlug(
  promptId: number,
  companyId: number,
  slug: string
): Promise<PromptSmartAction | null> {
  const s = String(slug || "").trim();
  if (!s) return null;
  try {
    const rows = await PromptSmartAction.findAll({
      where: { promptId, companyId }
    });
    const lower = (x: unknown) => String(x || "").toLowerCase();
    const bySlug = rows.find((r) => lower(r.slug) === s.toLowerCase());
    if (bySlug) return bySlug;
    const sl = s.toLowerCase();
    if (sl === "agendar" || sl === "marcarhorario" || sl === "marcar_horario") {
      const ag =
        rows.find((r) => lower(r.slug) === "agendamento" || lower(r.type) === "agendamento") || null;
      if (ag) return ag;
    }
    /** Roteiro pode usar /transferirAtendimento enquanto o preset salva slug transferirchamado. */
    if (
      sl === "transferiratendimento" ||
      sl === "transferirchamado" ||
      sl === "transferir_chamado" ||
      sl === "transferir_atendimento" ||
      (sl.includes("transferir") && (sl.includes("atendimento") || sl.includes("chamado")))
    ) {
      const xfer =
        rows.find((r) => {
          const rt = lower(r.type);
          const rs = lower(r.slug);
          return (
            rt === "transferir" ||
            rt === "transfer" ||
            rs === "transferirchamado" ||
            rs === "transferiratendimento"
          );
        }) || null;
      if (xfer) return xfer;
    }
    return rows.find((r) => lower(r.type) === sl) || null;
  } catch {
    return null;
  }
}

async function sendLineText(
  verifyMessage: any,
  wbot: Session,
  msg: proto.IWebMessageInfo,
  ticket: Ticket,
  contact: Contact,
  ticketTraking: TicketTraking | undefined,
  text: string
): Promise<void> {
  const t = sanitizeAgentCustomerVisibleText(String(text || ""));
  if (!t) return;
  const sent = await wbot.sendMessage(resolveReplyJid(msg, contact), { text: `\u200e ${t}` });
  await verifyMessage(sent!, ticket, contact, ticketTraking, true, false, true);
}

export async function presentStepWithScriptCommands(params: {
  stepText: string;
  stepAttachments: unknown;
  wbot: Session;
  msg: proto.IWebMessageInfo;
  ticket: Ticket;
  contact: Contact;
  ticketTraking: TicketTraking | undefined;
  prompt: Prompt;
  verifyMessage: any;
  verifyMediaMessage: any;
  sendStepTextBlocks: (
    verifyMessage: any,
    wbot: Session,
    msg: proto.IWebMessageInfo,
    ticket: Ticket,
    contact: Contact,
    ticketTraking: TicketTraking | undefined,
    text: string
  ) => Promise<void>;
  /** transferQueue(queueId, ticket, contact, userId?, whatsappId?) do wbotMessageListener */
  transferQueue: (
    queueId: number,
    ticket: Ticket,
    contact: Contact,
    userId?: number | null,
    whatsappId?: number | null
  ) => Promise<void>;
  /** Se true (padrão), /agendamento sem data fixa nas variáveis da ação só roda após o cliente responder com data/hora. */
  deferAgendamentoUntilReply?: boolean;
  /** Etapa do fluxo de atendimento — evita deduplicar a mesma ação em passos diferentes do roteiro. */
  attendanceFlowStep?: number;
}): Promise<{
  executedCommands: Array<{ kind: "action" | "media"; slug: string }>;
  deferredActions: Array<{ slug: string; actionId: number; kind?: string }>;
}> {
  const {
    stepText,
    stepAttachments,
    wbot,
    msg,
    ticket,
    contact,
    ticketTraking,
    prompt,
    verifyMessage,
    verifyMediaMessage,
    sendStepTextBlocks,
    transferQueue,
    deferAgendamentoUntilReply = true,
    attendanceFlowStep
  } = params;

  const companyId = ticket.companyId;
  const mediaMap = await loadMediaIndex(prompt, companyId);
  let working = sliceAgentStepTextForInitialSend(String(stepText || ""));
  const lines = working.split(/\n/);
  const textBuffer: string[] = [];
  const executedCommands: Array<{ kind: "action" | "media"; slug: string }> = [];
  const deferredActions: Array<{ slug: string; actionId: number; kind?: string }> = [];

  const flushText = async () => {
    const chunk = sanitizeAgentCustomerVisibleText(textBuffer.join("\n").trim());
    textBuffer.length = 0;
    if (chunk) await sendStepTextBlocks(verifyMessage, wbot, msg, ticket, contact, ticketTraking, chunk);
  };

  /** Após "EXEMPLO..." não enviar linhas ao cliente até "RESPOSTA:" (rótulo de treinamento). */
  let lineMode: "normal" | "skip_exemplo" = "normal";

  for (const line of lines) {
    const trimmed = line.trim();

    if (lineMode === "skip_exemplo") {
      if (/^resposta\s*:/i.test(trimmed)) {
        lineMode = "normal";
        continue;
      }
      continue;
    }

    if (/^EXEMPLO\s+DE\s+RESPOSTA/i.test(trimmed)) {
      await flushText();
      lineMode = "skip_exemplo";
      continue;
    }

    if (
      /^#+\s+\S/.test(trimmed) ||
      /^[\s\-=*_·•]{3,}$/.test(trimmed) ||
      /^(\*\s*){3,}$/.test(trimmed) ||
      /^(-\s*){3,}$/.test(trimmed)
    ) {
      continue;
    }
    if (/^mensagem\s*:?\s*$/i.test(trimmed)) continue;
    if (/^resposta\s*:/i.test(trimmed)) continue;
    const cmdSlug = matchScriptCommandSlugFromLine(trimmed);
    if (cmdSlug) {
      await flushText();
      const slug = cmdSlug;
      const media = mediaMap.get(slug);
      if (media && media.fileUrl) {
        executedCommands.push({ kind: "media", slug });
        await sendOneMedia(
          verifyMediaMessage,
          wbot,
          msg,
          ticket,
          contact,
          ticketTraking,
          companyId,
          media,
          verifyMessage
        );
        continue;
      }
      const action = await findPromptSmartActionRowByScriptSlug(prompt.id, companyId, slug);
      if (!action) {
        logger.info(`[SCRIPT-CMD] slug sem mídia nem ação: ${slug}`);
        continue;
      }
      const vars = (action.variables && typeof action.variables === "object" ? action.variables : {}) as Record<
        string,
        unknown
      >;
      const type = String(action.type || "").toLowerCase();
      try {
        let actionSlug = slug;
        
        if (
          type === "transferir" ||
          type === "transfer" ||
          slug.toLowerCase().includes("transfer") ||
          slug.toLowerCase().includes("transferir") ||
          slug.toLowerCase() === "transferiratendimento"
        ) {
          actionSlug = "transferirChamado";
        } else if (type === "criar_lead" || type === "criarlead") {
          actionSlug = "criarLead";
        } else if (type === "inventario" || type === "preco") {
          actionSlug = "passarPreco";
        } else if (
          type === "consultar_agenda" ||
          type === "consultaragenda" ||
          /agenda/i.test(slug)
        ) {
          actionSlug = "consultarAgenda";
        } else if (type === "agendamento" || slug.toLowerCase() === "agendar") {
          actionSlug = "agendamento";
        } else if (type === "atender" || slug.toLowerCase().includes("atender")) {
          actionSlug = "atenderChamado";
        } else if (type === "enviar_link" || slug.toLowerCase().includes("enviar") || slug.toLowerCase().includes("link")) {
          actionSlug = "enviarLink";
        }

        const explicitSchedule =
          vars.useNow === true ||
          vars.scheduleNow === true ||
          (vars.date != null && String(vars.date).trim() !== "") ||
          (vars.sendAt != null && String(vars.sendAt).trim() !== "");

        if (
          actionSlug === "agendamento" &&
          deferAgendamentoUntilReply &&
          !explicitSchedule
        ) {
          deferredActions.push({
            kind: "agendamento",
            slug: String(action.slug || slug).trim() || "agendamento",
            actionId: action.id
          });
          continue;
        }

        const customerVisible = sanitizeAgentCustomerVisibleText(textBuffer.join("\n"));
        const execVars = transferVarsIfDeclared(actionSlug, vars, customerVisible);
        if (execVars === null) {
          logger.info(
            `[SCRIPT-CMD] transferência omitida — agente não declarou transferência na mensagem ticket=${ticket.id}`
          );
          continue;
        }

        executedCommands.push({ kind: "action", slug });
        const actionResult = await executeSmartAction(actionSlug, prompt, ticket, contact, execVars, {
          smartActionId: action.id,
          scriptSlug: slug,
          attendanceFlowStep
        });

        const isTransferAction =
          actionSlug === "transferirChamado" || actionSlug === "transferirAtendimento";
        const isSilentCrm =
          actionSlug === "criarLead" ||
          actionSlug === "criarAtividade" ||
          actionSlug === "criarContato";

        if (actionResult.success) {
          if (isSilentCrm) {
            continue;
          }
          const rm = sanitizeAgentCustomerVisibleText(
            String(actionResult.message || action.responseMessage || "").trim()
          );
          if (rm) {
            await sendLineText(verifyMessage, wbot, msg, ticket, contact, ticketTraking, rm);
          } else if (!isTransferAction) {
            /* outras ações sem texto configurado */
          }
        } else {
          logger.warn(`[SCRIPT-CMD] Ação ${actionSlug} falhou: ${actionResult.message}`);
          const rm = sanitizeAgentCustomerVisibleText(String(action.responseMessage || "").trim());
          if (rm) {
            await sendLineText(verifyMessage, wbot, msg, ticket, contact, ticketTraking, rm);
          }
        }
      } catch (e) {
        logger.error(`[SCRIPT-CMD] ação slug=${slug} falhou`, e);
      }
      continue;
    }
    textBuffer.push(line);
  }
  await flushText();

  const tailSlugs = extractSlashCommandsFromTrainingTail(String(stepText || ""));
  const haveDeferredId = new Set(deferredActions.map((d) => d.actionId));
  const haveExecutedActionSlug = new Set(
    executedCommands.filter((e) => e.kind === "action").map((e) => e.slug)
  );

  for (const tailSlug of tailSlugs) {
    if (haveExecutedActionSlug.has(tailSlug)) continue;
    const action = await findPromptSmartActionRowByScriptSlug(prompt.id, companyId, tailSlug);
    if (!action) {
      logger.info(`[SCRIPT-CMD] tail /${tailSlug} sem ação configurada`);
      continue;
    }
    if (haveDeferredId.has(action.id)) continue;

    const vars = (action.variables && typeof action.variables === "object" ? action.variables : {}) as Record<
      string,
      unknown
    >;
    const type = String(action.type || "").toLowerCase();
    let actionSlug = tailSlug;
    if (
      type === "transferir" ||
      type === "transfer" ||
      tailSlug.toLowerCase().includes("transfer") ||
      tailSlug.toLowerCase().includes("transferir") ||
      tailSlug.toLowerCase() === "transferiratendimento"
    ) {
      actionSlug = "transferirChamado";
    } else if (type === "criar_lead" || type === "criarlead") {
      actionSlug = "criarLead";
    } else if (type === "inventario" || type === "preco") {
      actionSlug = "passarPreco";
    } else if (type === "consultar_agenda" || type === "consultaragenda" || /agenda/i.test(tailSlug)) {
      actionSlug = "consultarAgenda";
    } else if (type === "agendamento" || tailSlug.toLowerCase() === "agendar") {
      actionSlug = "agendamento";
    } else if (type === "atender" || tailSlug.toLowerCase().includes("atender")) {
      actionSlug = "atenderChamado";
    } else if (
      type === "enviar_link" ||
      tailSlug.toLowerCase().includes("enviar") ||
      tailSlug.toLowerCase().includes("link")
    ) {
      actionSlug = "enviarLink";
    }

    const explicitSchedule =
      vars.useNow === true ||
      vars.scheduleNow === true ||
      (vars.date != null && String(vars.date).trim() !== "") ||
      (vars.sendAt != null && String(vars.sendAt).trim() !== "");

    if (actionSlug === "agendamento" && deferAgendamentoUntilReply && !explicitSchedule) {
      deferredActions.push({
        kind: "agendamento",
        slug: String(action.slug || tailSlug).trim() || "agendamento",
        actionId: action.id
      });
      haveDeferredId.add(action.id);
      continue;
    }
    /**
     * Transferência no tail (RESPOSTA após EXEMPLO): executar neste mesmo turno após o texto ao cliente.
     * Diferente do agendamento, não depende de uma nova mensagem inbound — senão o ticket fica sem transferir.
     */
    if (actionSlug === "transferirChamado" || actionSlug === "transferirAtendimento") {
      const tailVisible = sanitizeAgentCustomerVisibleText(working);
      const tailVars = transferVarsIfDeclared(actionSlug, vars, tailVisible);
      if (tailVars === null) {
        logger.info(
          `[SCRIPT-CMD] tail transferência omitida — sem declaração na etapa ticket=${ticket.id}`
        );
        continue;
      }
      executedCommands.push({ kind: "action", slug: tailSlug });
      try {
        const actionResult = await executeSmartAction(actionSlug, prompt, ticket, contact, tailVars, {
          smartActionId: action.id,
          scriptSlug: tailSlug,
          attendanceFlowStep
        });
        if (actionResult.success) {
          const rmOk = sanitizeAgentCustomerVisibleText(
            String(actionResult.message || action.responseMessage || "").trim()
          );
          if (rmOk) {
            await sendLineText(verifyMessage, wbot, msg, ticket, contact, ticketTraking, rmOk);
          }
        } else {
          const rmFail = sanitizeAgentCustomerVisibleText(
            String(action.responseMessage || actionResult.message || "").trim()
          );
          if (rmFail) {
            await sendLineText(verifyMessage, wbot, msg, ticket, contact, ticketTraking, rmFail);
          }
        }
      } catch (e) {
        logger.error(`[SCRIPT-CMD] tail ação transfer slug=${tailSlug}`, e);
      }
      continue;
    }

    executedCommands.push({ kind: "action", slug: tailSlug });
    try {
      const actionResult = await executeSmartAction(actionSlug, prompt, ticket, contact, vars, {
        smartActionId: action.id,
        scriptSlug: tailSlug,
        attendanceFlowStep
      });
      const isSilentCrm =
        actionSlug === "criarLead" ||
        actionSlug === "criarAtividade" ||
        actionSlug === "criarContato";
      if (actionResult.success && !isSilentCrm) {
        const rm = sanitizeAgentCustomerVisibleText(
          String(actionResult.message || action.responseMessage || "").trim()
        );
        if (rm) {
          await sendLineText(verifyMessage, wbot, msg, ticket, contact, ticketTraking, rm);
        }
      }
    } catch (e) {
      logger.error(`[SCRIPT-CMD] tail ação slug=${tailSlug}`, e);
    }
  }

  const list = parseAttachments(stepAttachments);
  const publicRoot = path.resolve(__dirname, "..", "..", "..", "public");
  for (const att of list) {
    const url = String(att?.url || "").trim();
    if (!url) continue;
    const rel = url.startsWith("/") ? url.slice(1) : url;
    const fullPath = path.join(publicRoot, rel);
    if (!fs.existsSync(fullPath)) continue;
    const fileName = String(att.originalName || path.basename(fullPath)).slice(0, 380);
    try {
      const opts = await getMessageOptions(fileName, fullPath, String(companyId), " ");
      if (opts && Object.keys(opts).length) {
        const mediaMsg = await wbot.sendMessage(resolveReplyJid(msg, contact), { ...opts });
        await verifyMediaMessage(mediaMsg!, ticket, contact, ticketTraking!, false, false, wbot, true);
      }
    } catch (e) {
      logger.error(`[SCRIPT-CMD] anexo passo falhou`, e);
    }
  }

  return { executedCommands, deferredActions };
}
