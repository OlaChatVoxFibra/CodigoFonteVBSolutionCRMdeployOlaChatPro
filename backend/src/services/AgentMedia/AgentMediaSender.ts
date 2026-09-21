/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import fs from "fs";
import path from "path";
import axios from "axios";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import { getWbot } from "../../libs/wbot";
import { getJidOf } from "../WbotServices/getJidOf";
import { getMessageOptions } from "../WbotServices/SendWhatsAppMedia";
import { verifyMediaMessage } from "../WbotServices/wbotMessageListener";
import FindOrCreateATicketTrakingService from "../TicketServices/FindOrCreateATicketTrakingService";
import logger from "../../utils/logger";

const publicRoot = path.resolve(__dirname, "..", "..", "..", "public");

async function resolveTraking(ticket: Ticket) {
  return FindOrCreateATicketTrakingService({
    ticketId: ticket.id,
    companyId: ticket.companyId,
    whatsappId: ticket.whatsappId,
    userId: ticket.userId
  });
}

async function resolveLatestTicketForContact(contactId: number): Promise<Ticket | null> {
  const contact = await Contact.findByPk(contactId);
  if (!contact) {
    logger.warn("[SENDER] Contato não encontrado:", contactId);
    return null;
  }
  const ticket = await Ticket.findOne({
    where: { contactId, companyId: contact.companyId },
    order: [["updatedAt", "DESC"]],
    include: [{ model: Contact, as: "contact" }]
  });
  return ticket;
}

function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim());
}

async function materializeToCompanyFolder(
  companyId: number,
  source: string,
  suggestedName: string
): Promise<{ fullPath: string; fileName: string } | null> {
  const dir = path.join(publicRoot, `company${companyId}`, "agent-media");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const safe = suggestedName.replace(/[^\w.\-]+/g, "_") || `file_${Date.now()}`;

  const trimmed = String(source || "").trim();
  /** Caminho servido em /public (upload /files ou agent-proactive) */
  if (trimmed.startsWith("/company")) {
    const fullPath = path.join(publicRoot, trimmed.replace(/^\//, ""));
    if (fs.existsSync(fullPath)) {
      return { fullPath, fileName: path.basename(fullPath) };
    }
    logger.error("[SENDER] Arquivo público inexistente:", fullPath);
    return null;
  }

  if (isHttpUrl(source)) {
    const res = await axios.get(source, { responseType: "arraybuffer", timeout: 60000 });
    const ext = path.extname(new URL(source).pathname) || ".bin";
    const fileName = `${Date.now()}_${safe}${ext.includes(".") ? "" : ext}`;
    const fullPath = path.join(dir, fileName);
    fs.writeFileSync(fullPath, Buffer.from(res.data));
    return { fullPath, fileName };
  }

  const local = path.isAbsolute(source) ? source : path.resolve(source);
  if (!fs.existsSync(local)) {
    logger.error("[SENDER] Arquivo local inexistente:", local);
    return null;
  }
  const fileName = `${Date.now()}_${safe || path.basename(local)}`;
  const fullPath = path.join(dir, fileName);
  fs.copyFileSync(local, fullPath);
  return { fullPath, fileName };
}

/**
 * Envia imagem (URL pública ou caminho local). Opcional legenda.
 */
export async function sendImage(
  contactId: number,
  imageUrlOrLocalPath: string,
  caption?: string
): Promise<void> {
  logger.info("[SENDER] sendImage contactId=%s", contactId);
  const ticket = await resolveLatestTicketForContact(contactId);
  if (!ticket?.whatsappId) return;

  const mat = await materializeToCompanyFolder(
    ticket.companyId,
    imageUrlOrLocalPath,
    path.basename(imageUrlOrLocalPath.split("?")[0]) || "image.jpg"
  );
  if (!mat) return;

  const wbot = await getWbot(ticket.whatsappId);
  const opts = await getMessageOptions(mat.fileName, mat.fullPath, String(ticket.companyId), caption || " ");
  if (!opts) return;
  const traking = await resolveTraking(ticket);
  const sent = await wbot.sendMessage(getJidOf(ticket), { ...opts });
  await verifyMediaMessage(sent!, ticket, ticket.contact!, traking, false, false, wbot, true);
}

/**
 * Envia documento (PDF, planilha, etc.).
 */
export async function sendDocument(
  contactId: number,
  filePath: string,
  filename?: string
): Promise<void> {
  logger.info("[SENDER] sendDocument contactId=%s", contactId);
  const ticket = await resolveLatestTicketForContact(contactId);
  if (!ticket?.whatsappId) return;

  const base = filename || path.basename(filePath);
  const mat = await materializeToCompanyFolder(ticket.companyId, filePath, base);
  if (!mat) return;

  const wbot = await getWbot(ticket.whatsappId);
  const opts = await getMessageOptions(mat.fileName, mat.fullPath, String(ticket.companyId), " ");
  if (!opts) return;
  const traking = await resolveTraking(ticket);
  const sent = await wbot.sendMessage(getJidOf(ticket), { ...opts });
  await verifyMediaMessage(sent!, ticket, ticket.contact!, traking, false, false, wbot, true);
}

/**
 * Envia áudio (ex.: voz). Caminho local ou URL.
 */
export async function sendAudio(contactId: number, audioPath: string): Promise<void> {
  logger.info("[SENDER] sendAudio contactId=%s", contactId);
  const ticket = await resolveLatestTicketForContact(contactId);
  if (!ticket?.whatsappId) return;

  const mat = await materializeToCompanyFolder(
    ticket.companyId,
    audioPath,
    path.basename(audioPath.split("?")[0]) || "audio"
  );
  if (!mat) return;

  const wbot = await getWbot(ticket.whatsappId);
  const opts = await getMessageOptions(mat.fileName, mat.fullPath, String(ticket.companyId), "");
  if (!opts) return;
  const traking = await resolveTraking(ticket);
  const sent = await wbot.sendMessage(getJidOf(ticket), { ...opts });
  await verifyMediaMessage(sent!, ticket, ticket.contact!, traking, false, false, wbot, true);
}

/**
 * Envia vídeo (URL pública ou caminho local). Opcional legenda.
 */
export async function sendVideo(
  contactId: number,
  videoUrlOrLocalPath: string,
  caption?: string
): Promise<void> {
  logger.info("[SENDER] sendVideo contactId=%s", contactId);
  const ticket = await resolveLatestTicketForContact(contactId);
  if (!ticket?.whatsappId) return;

  const mat = await materializeToCompanyFolder(
    ticket.companyId,
    videoUrlOrLocalPath,
    path.basename(videoUrlOrLocalPath.split("?")[0]) || "video.mp4"
  );
  if (!mat) return;

  const wbot = await getWbot(ticket.whatsappId);
  const opts = await getMessageOptions(mat.fileName, mat.fullPath, String(ticket.companyId), caption || " ");
  if (!opts) return;
  const traking = await resolveTraking(ticket);
  const sent = await wbot.sendMessage(getJidOf(ticket), { ...opts });
  await verifyMediaMessage(sent!, ticket, ticket.contact!, traking, false, false, wbot, true);
}
