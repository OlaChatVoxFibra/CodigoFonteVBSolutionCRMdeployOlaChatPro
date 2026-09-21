/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import BullQueue from "bull";
import { Op } from "sequelize";
import { REDIS_URI_CONNECTION } from "./config/redis";
import EmailSchedule from "./models/EmailSchedule";
import EmailCampaign from "./models/EmailCampaign";
import EmailTemplate from "./models/EmailTemplate";
import EmailContact from "./models/EmailContact";
import EmailLog from "./models/EmailLog";
import EmailAnalytics from "./models/EmailAnalytics";
import {
  sendMailWithCompanySmtp,
  invalidateSmtpTransportCache,
  resolveMailFromAddress,
  resolveSmtpConfigForCompany
} from "./helpers/SmtpTransport";
import EmailTemplateAttachment from "./models/EmailTemplateAttachment";
import uploadConfig from "./config/upload";
import path from "path";
import fs from "fs";
import logger from "./utils/logger";
import { isDevNoDb } from "./helpers/devNoDbAuth";
 

const connection = REDIS_URI_CONNECTION;
const USE_REDIS = !!(connection && connection !== "");

let emailSendQueue: BullQueue.Queue | null = null;
let emailScheduler: BullQueue.Queue | null = null;
let queueReady = false;
let fallbackStarted = false;

function renderTemplate(input: string | null | undefined, context: Record<string, any>): string | undefined {
  if (!input) return undefined;
  const now = new Date();
  const map: Record<string, string> = {
    "{nome}": String(context.nome ?? context.name ?? ""),
    "{name}": String(context.name ?? context.nome ?? ""),
    "{email}": String(context.email ?? ""),
    "{telefone}": String(context.telefone ?? context.phone ?? ""),
    "{phone}": String(context.phone ?? context.telefone ?? ""),
    "{data}": now.toLocaleDateString("pt-BR"),
    "{hora}": now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  };
  return input.replace(/\{[a-zA-Z_]+\}/g, token => {
    const key = token.toLowerCase();
    if (key in map) return map[key];
    const rawKey = key.slice(1, -1);
    const val = context[rawKey];
    return val != null ? String(val) : "";
  });
}

function startFallbackScheduler() {
  if (fallbackStarted) return;
  fallbackStarted = true;
  setInterval(() => {
    handleEmailScheduler().catch(() => {});
  }, 30 * 1000);
}

if (isDevNoDb()) {
  logger.info("DEV_NO_DB — emailQueues desativadas (sem banco)");
} else if (USE_REDIS) {
  try {
    emailSendQueue = new BullQueue("EmailSendQueue", connection);
    emailScheduler = new BullQueue("EmailScheduler", connection);
    emailSendQueue.on("ready", () => { queueReady = true; });
    emailScheduler.on("ready", () => { queueReady = true; });
    emailSendQueue.on("error", () => { if (!queueReady) startFallbackScheduler(); });
    emailScheduler.on("error", () => { if (!queueReady) startFallbackScheduler(); });
    // Se em 5s a fila não ficar pronta, ativa fallback
    setTimeout(() => { if (!queueReady) startFallbackScheduler(); }, 5000);
  } catch {
    startFallbackScheduler();
  }
} else {
  startFallbackScheduler();
}

async function processEmailSend(job: any) {
  const { scheduleId } = job.data;
  const schedule = await EmailSchedule.findByPk(scheduleId, {
    include: [{ model: EmailCampaign, as: "campaign", include: [{ model: EmailTemplate, as: "template" }] }, { model: EmailContact, as: "contact" }]
  });
  if (!schedule) return;
  if (schedule.status !== "scheduled" && schedule.status !== "retrying") return;
  const companyId = schedule.companyId;
  try {
    if (schedule.status === "scheduled") {
      try {
        await schedule.update({ status: "retrying", updatedAt: new Date() } as any);
      } catch {}
    }
    const smtpConfig = await resolveSmtpConfigForCompany(companyId);
    const from = resolveMailFromAddress(smtpConfig?.smtpUsername);
    let tpl: any = (schedule as any).campaign?.template;
    const tplId = tpl?.id || (schedule as any).campaign?.templateId;
    if (!tpl && tplId) {
      tpl = await EmailTemplate.findOne({ where: { id: tplId, companyId } } as any);
    }
    const NBsubject = (schedule as any).campaign?.subject || tpl?.subject || "";
    const htmlRaw = tpl?.contentHtml || null;
    const textRaw = (schedule as any).campaign?.template?.contentText || undefined;
    const to = (schedule as any).contact?.email || null;
    const ctx = {
      nome: (schedule as any).contact?.name,
      name: (schedule as any).contact?.name,
      email: (schedule as any).contact?.email,
      telefone: (schedule as any).contact?.phone,
      phone: (schedule as any).contact?.phone
    };
    const subject = renderTemplate(NBsubject, ctx) || "";
    let html = renderTemplate(htmlRaw, ctx);
    const text = renderTemplate(textRaw as any, ctx);
    if (!html && text) {
      html = String(text).replace(/\n/g, "<br/>");
    }
    if (!to) throw new Error("NO_RECIPIENT");
    const attachments: any[] = [];
    if (tpl?.id) {
      // Buscar anexos apenas por templateId para evitar divergências de companyId
      const rows = await EmailTemplateAttachment.findAll({ where: { templateId: tpl.id } } as any);
      for (const a of rows) {
        // Prioriza conteúdo binário salvo no banco
        if ((a as any).data && (a as any).data.length > 0) {
          try {
            attachments.push({
              filename: a.filename,
              content: Buffer.from((a as any).data),
              contentType: a.mimetype,
              contentDisposition: "attachment"
            });
            continue;
          } catch {
            // se falhar, tenta fallback em disco
          }
        }
        const rel = a.path?.startsWith("/public/") ? a.path.replace(/^\/public\/*/, "") : "";
        const candidates = [
          rel ? path.join(uploadConfig.directory, rel) : null,
          rel ? path.join(process.cwd(), "public", rel) : null,
          path.join(uploadConfig.directory, `company${companyId}`, "emailTemplates", String(tpl.id), a.filename),
          a.path ? path.join(uploadConfig.directory, `company${companyId}`, "emailTemplates", String(tpl.id), path.basename(a.path)) : null
        ].filter(Boolean) as string[];
        const found = candidates.find(p => fs.existsSync(p));
        if (found) {
          try {
            const buffer = fs.readFileSync(found);
            attachments.push({ filename: path.basename(found), content: buffer, contentType: a.mimetype, contentDisposition: "attachment" });
          } catch {
            attachments.push({ filename: path.basename(found), path: found, contentType: a.mimetype, contentDisposition: "attachment" });
          }
        } else {
          logger.warn({ msg: "Anexo não encontrado no disco", templateId: tpl.id, filename: a.filename, path: a.path, candidates });
        }
      }
      // Fallback adicional: varrer diretório do template e anexar qualquer arquivo encontrado
      try {
        const dir = path.join(uploadConfig.directory, `company${companyId}`, "emailTemplates", String(tpl.id));
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          for (const fn of files) {
            const full = path.join(dir, fn);
            if (!fs.statSync(full).isFile()) continue;
            // Evitar duplicar assinatura inline
            const isSignature = tpl.signatureImagePath && path.basename(tpl.signatureImagePath) === fn;
            if (isSignature) continue;
            const already = attachments.find(a => a.filename === fn);
            if (already) continue;
            try {
              const buffer = fs.readFileSync(full);
              attachments.push({ filename: fn, content: buffer, contentDisposition: "attachment" });
            } catch {
              attachments.push({ filename: fn, path: full, contentDisposition: "attachment" });
            }
          }
        }
      } catch {}
      // Assinatura: prioriza conteúdo do banco
      if (tpl.signatureImageData) {
        const cid = `signature-${tpl.id}@vbsolution`;
        const filename = tpl.signatureImagePath ? path.basename(tpl.signatureImagePath) : "signature.png";
        const contentType = filename ? (require("mime-types").lookup(filename) || "image/png") : "image/png";
        attachments.push({ filename, content: Buffer.from(tpl.signatureImageData), cid, contentType: String(contentType) });
        if (html && html.length > 0) {
          html = `${html}<br/><img src="cid:${cid}" alt="assinatura" />`;
        } else {
          const textAsHtml = (text || "").replace(/\n/g, "<br/>");
          html = `${textAsHtml}${textAsHtml ? "<br/>" : ""}<img src="cid:${cid}" alt="assinatura" />`;
        }
      } else if (tpl.signatureImagePath) {
        const rel = tpl.signatureImagePath.startsWith("/public/")
          ? tpl.signatureImagePath.replace(/^\/public\/*/, "")
          : path.join(`company${companyId}`, "emailTemplates", String(tpl.id), path.basename(tpl.signatureImagePath));
        const candidatesSig = [
          path.join(uploadConfig.directory, rel),
          path.join(process.cwd(), "public", rel)
        ];
        const absSig = candidatesSig.find(p => fs.existsSync(p));
        if (absSig) {
          const cid = `signature-${tpl.id}@vbsolution`;
          const filename = path.basename(absSig);
          const contentType = (require("mime-types").lookup(filename) || "image/png") as string;
          try {
            const buffer = fs.readFileSync(absSig);
            attachments.push({ filename, content: buffer, cid, contentType });
          } catch {
            attachments.push({ filename, path: absSig, cid, contentType });
          }
          if (html && html.length > 0) {
            html = `${html}<br/><img src="cid:${cid}" alt="assinatura" />`;
          } else {
            const textAsHtml = (text || "").replace(/\n/g, "<br/>");
            html = `${textAsHtml}${textAsHtml ? "<br/>" : ""}<img src="cid:${cid}" alt="assinatura" />`;
          }
        } else {
          logger.warn({ msg: "Assinatura não encontrada no disco", templateId: tpl.id, signaturePath: tpl.signatureImagePath, candidatesSig });
        }
      }
    }
    logger.info({ msg: "Enviando email", to, subject, attachmentsCount: attachments.length, hasSignature: !!tpl?.signatureImagePath });
    await sendMailWithCompanySmtp(companyId, { from, to, subject, html: html || undefined, text, attachments });
    await schedule.update({ status: "sent", sentAt: new Date(), errorMessage: null });
    await EmailLog.create({
      companyId,
      campaignId: schedule.campaignId,
      contactId: schedule.contactId,
      sentAt: new Date()
    } as any);
    const dateKey = new Date().toISOString().slice(0, 10);
    const [an] = await EmailAnalytics.findOrCreate({ where: { companyId, date: dateKey }, defaults: { totalSent: 0, totalOpened: 0, totalClicked: 0, totalBounced: 0, unsubscribeCount: 0 } as any });
    await an.update({ totalSent: an.totalSent + 1 });
  } catch (e: any) {
    try {
      invalidateSmtpTransportCache(companyId);
    } catch {
      /* ignore */
    }
    const retries = (schedule.retryCount || 0) + 1;
    const willRetry = retries <= 3;
    await schedule.update({ status: willRetry ? "retrying" : "failed", errorMessage: String(e?.message || e), retryCount: retries });
    if (willRetry) {
      const delayMs = Math.min(300000, 10000 * retries);
      if (emailSendQueue) {
        try {
          await emailSendQueue.add({ scheduleId: schedule.id }, { delay: delayMs, removeOnComplete: true });
        } catch (requeueErr: any) {
          logger.warn({
            msg: "Retry na fila falhou; reprocessamento agendado no processo",
            scheduleId: schedule.id,
            error: String(requeueErr?.message || requeueErr)
          });
          setTimeout(() => {
            processEmailSend({ data: { scheduleId: schedule.id } } as any).catch(() => {});
          }, delayMs);
        }
      } else {
        setTimeout(() => {
          processEmailSend({ data: { scheduleId: schedule.id } } as any).catch(() => {});
        }, delayMs);
      }
    }
  }
}

async function handleEmailScheduler() {
  const due = await EmailSchedule.findAll({
    where: {
      status: "scheduled",
      scheduledAt: { [Op.lte]: new Date() }
    },
    limit: 200
  } as any);
  if (USE_REDIS && emailSendQueue) {
    for (const s of due) {
      try {
        await emailSendQueue.add({ scheduleId: s.id }, { removeOnComplete: true, jobId: `send-${s.id}` });
      } catch (e: any) {
        logger.warn({ msg: "EmailSendQueue.add falhou no scan; enviando inline", scheduleId: s.id, error: String(e?.message || e) });
        await processEmailSend({ data: { scheduleId: s.id } } as any);
      }
    }
  } else {
    for (const s of due) {
      await processEmailSend({ data: { scheduleId: s.id } } as any);
    }
  }
}

if (USE_REDIS && emailSendQueue && emailScheduler) {
  emailSendQueue.process(processEmailSend as any);
  emailScheduler.add(
    "ScanDueEmailSchedules",
    {},
    { repeat: { cron: "*/30 * * * * *", key: "scan-email-schedules" }, removeOnComplete: true }
  );
  emailScheduler.process(async () => {
    await handleEmailScheduler();
  });
}

export async function enqueueEmailSchedule(scheduleId: number, scheduledAt?: Date) {
  const isDue = !scheduledAt || scheduledAt.getTime() <= Date.now();
  try {
    if (USE_REDIS && emailSendQueue) {
      const delayMs = scheduledAt ? Math.max(0, scheduledAt.getTime() - Date.now()) : 0;
      await emailSendQueue.add({ scheduleId }, { delay: delayMs, removeOnComplete: true, jobId: `send-${scheduleId}` });
    } else if (isDue) {
      await processEmailSend({ data: { scheduleId } } as any);
    }
  } catch (e: any) {
    logger.warn({
      msg: "Falha ao enfileirar envio de e-mail; tentando processar no processo atual",
      scheduleId,
      useRedis: USE_REDIS,
      error: String(e?.message || e)
    });
    if (isDue) {
      try {
        await processEmailSend({ data: { scheduleId } } as any);
      } catch (e2: any) {
        logger.error({
          msg: "processEmailSend (fallback após falha na fila) falhou",
          scheduleId,
          error: String(e2?.message || e2)
        });
      }
    }
  }
}

export { emailSendQueue, emailScheduler };

export async function processEmailNow(scheduleId: number) {
  try {
    await processEmailSend({ data: { scheduleId } } as any);
  } catch {
    /* noop */
  }
}
