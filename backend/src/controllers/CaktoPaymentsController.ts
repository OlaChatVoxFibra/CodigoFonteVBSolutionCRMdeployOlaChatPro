/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import { Op } from "sequelize";
import Company from "../models/Company";
import User from "../models/User";
import Subscriptions from "../models/Subscriptions";
import { SendMailSmart } from "../helpers/SendMail";
import logger from "../utils/logger";
import { issueToken, resolvePlanByName } from "./PaymentConfirmationController";

function addDays(date: Date, days: number) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

function resolveCycleDays(cycle?: string) {
  const c = String(cycle || "").toLowerCase();
  if (c.includes("semes") || c === "semestral") return 180;
  if (c.includes("an") || c === "anual" || c === "annual" || c === "year") return 365;
  return 30;
}

/** Grava ciclo pago na empresa (substitui recurrence "freemium"). */
function normalizePaidRecurrence(cycle?: string) {
  const c = String(cycle || "").toLowerCase();
  if (c.includes("semes") || c === "semestral") return "semestral";
  if (c.includes("an") || c === "anual" || c === "annual" || c === "year") return "anual";
  if (c.includes("men") || c === "mensal" || c === "monthly") return "mensal";
  return "mensal";
}

async function findCompanyByEmail(email: string) {
  const q = String(email || "").trim();
  if (!q) return null;
  const company = await Company.findOne({
    where: { email: { [Op.iLike]: q } } as any
  });
  if (company) return company;
  const user = await User.findOne({
    where: { email: { [Op.iLike]: q } } as any
  });
  if (!user) return null;
  const comp = await Company.findOne({ where: { id: user.companyId } as any });
  return comp;
}

function parseEventType(payload: any): string | null {
  return payload?.event || payload?.type || payload?.event_id || null;
}

function extractEmail(payload: any): string | null {
  return payload?.customer?.email || payload?.order?.customer?.email || payload?.data?.customer?.email || null;
}

function extractCycle(payload: any): string | null {
  return payload?.subscription_period || payload?.intervalType || payload?.plan?.cycle || payload?.data?.subscription_period || null;
}

function isApproved(type: string) {
  return ["purchase_approved", "subscription_renewed", "subscription_created"].includes(type);
}

function isRefused(type: string) {
  return ["purchase_refused", "subscription_renewal_refused"].includes(type);
}

function isCanceled(type: string) {
  return ["subscription_canceled", "refund", "chargeback"].includes(type);
}

function readProvidedToken(req: Request): string {
  const authHeader = (req.headers["authorization"] as string) || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const headers = req.headers as Record<string, any>;
  const candidates = [
    headers["x-cakto-webhook-token"],
    headers["x-webhook-token"],
    headers["x-callback-token"],
    headers["x-cakto-token"],
    req.query.token,
    req.query.secret,
    req.query.webhook_token,
    bearer
  ];
  const provided = candidates.find(v => typeof v === "string" && v.length > 0);
  return (provided as string) || "";
}

function extractAnyEmail(payload: any): string | null {
  const candidates = [
    payload?.customer?.email,
    payload?.order?.customer?.email,
    payload?.data?.customer?.email,
    payload?.email,
    payload?.buyer?.email,
    payload?.payer?.email,
    payload?.customer_email
  ].filter(Boolean);
  return (candidates[0] as string) || null;
}

export async function webhook(req: Request, res: Response) {
  try {
    const secret = process.env.CAKTO_WEBHOOK_TOKEN;
    const strict = String(process.env.CAKTO_WEBHOOK_STRICT || "").toLowerCase() === "true";
    const provided = readProvidedToken(req);
    const authorized = secret && provided && secret === provided;
    if (!authorized) {
      logger.warn({
        msg: "Webhook Cakto não autorizado",
        path: req.path,
        method: req.method,
        hasToken: Boolean(provided),
        strict
      });
      if (strict) {
        return res.status(403).json({ detail: "unauthorized" });
      }
    }

    const body: any = req.body;
    const events: any[] = Array.isArray(body?.results)
      ? body.results
      : Array.isArray(body?.events)
      ? body.events
      : body?.event || body?.type
      ? [body]
      : [];

    for (const ev of events) {
      const type = parseEventType(ev);
      if (!type) continue;
      const email = extractAnyEmail(ev);
      const company = await findCompanyByEmail(email || "");
      if (!company) {
        const planCandidate = ev?.plan?.name || ev?.plan?.title || ev?.plan || ev?.data?.plan?.name || ev?.data?.plan;
        const rec = await issueToken(email || "", undefined, planCandidate ? String(planCandidate) : undefined);
        const link = `${process.env.FRONTEND_URL?.replace(/\/$/, "")}/confirm?token=${rec.token}`;
        await SendMailSmart({
          to: email || "",
          subject: "Confirme seu acesso",
          text: `Seu pagamento foi reconhecido. Conclua seu cadastro e crie sua senha: ${link}`
        });
        logger.info({ msg: "Token de confirmação emitido para pagamento aprovado sem empresa", email, type });
        continue;
      }

      const cycle = extractCycle(ev) || company.recurrence || "";
      const days = resolveCycleDays(cycle);
      const now = new Date();
      const base = company.dueDate ? new Date(company.dueDate) : now;
      const nextDue = addDays(base > now ? base : now, days);
      const nextDueStr = nextDue.toISOString().slice(0, 10);
      const paidRecurrence = normalizePaidRecurrence(cycle);

      if (isApproved(type)) {
        const planCandidate = ev?.plan?.name || ev?.plan?.title || ev?.plan || ev?.data?.plan?.name || ev?.data?.plan;
        if (planCandidate) {
          const plan = await resolvePlanByName(String(planCandidate));
          if (plan && company.planId !== (plan as any).id) {
            await company.update({ planId: (plan as any).id } as any);
          }
        }
        await company.reload();
        const prevRec = String((company as any).recurrence || "");
        const cycleFromEvent = extractCycle(ev);
        const patch: any = { dueDate: nextDueStr, status: true };
        if (prevRec === "freemium") {
          patch.recurrence = normalizePaidRecurrence(cycleFromEvent || cycle);
        } else if (cycleFromEvent) {
          patch.recurrence = normalizePaidRecurrence(cycleFromEvent);
        }
        await company.update(patch as any);
        await company.reload();
        let sub = await Subscriptions.findOne({ where: { companyId: company.id } as any });
        if (!sub) {
          sub = await Subscriptions.create({
            companyId: company.id,
            isActive: true,
            expiresAt: nextDue
          } as any);
        } else {
          await sub.update({ isActive: true, expiresAt: nextDue } as any);
        }
        const planLabel =
          (company as any).plan?.name || (company as any).recurrence || undefined;
        const tokenEmail = String((email && email.trim()) || company.email || "").trim();
        const rec = await issueToken(tokenEmail, company.id, planLabel);
        const link = `${process.env.FRONTEND_URL?.replace(/\/$/, "")}/confirm?token=${rec.token}`;
        const adminUser = await User.findOne({
          where: { companyId: company.id } as any
        });
        const notifyTo = tokenEmail || company.email || "";
        if (adminUser) {
          await SendMailSmart({
            to: notifyTo,
            subject: "Pagamento aprovado — plano atualizado",
            text: `Seu pagamento foi aprovado. O plano da sua organização foi liberado conforme a contratação. Se estiver no sistema, confirme na barra de planos (e-mail do checkout) ou atualize a página após alguns instantes. Link de apoio: ${link}`
          });
        } else {
          await SendMailSmart({
            to: notifyTo,
            subject: "Confirme seu acesso",
            text: `Seu pagamento foi aprovado. Crie sua senha para acessar: ${link}`
          });
        }
        logger.info({ msg: "Pagamento aprovado/renovado processado", companyId: company.id, nextDue: nextDueStr });
        await SendMailSmart({
          to: "visaobusinesstech@gmail.com",
          subject: "Pagamento aprovado",
          text: `Empresa #${company.id} (${company.email}) aprovada. Próximo vencimento: ${nextDueStr}.`
        });
      } else if (isRefused(type)) {
        let sub = await Subscriptions.findOne({ where: { companyId: company.id } as any });
        if (!sub) {
          sub = await Subscriptions.create({
            companyId: company.id,
            isActive: false
          } as any);
        } else {
          await sub.update({ isActive: false } as any);
        }
        logger.info({ msg: "Pagamento recusado processado", companyId: company.id });
        await SendMailSmart({
          to: "visaobusinesstech@gmail.com",
          subject: "Pagamento recusado",
          text: `Empresa #${company.id} (${company.email}) teve pagamento recusado.`
        });
      } else if (isCanceled(type)) {
        await company.update({ status: false } as any);
        let sub = await Subscriptions.findOne({ where: { companyId: company.id } as any });
        if (sub) {
          await sub.update({ isActive: false } as any);
        }
        logger.info({ msg: "Assinatura cancelada/estorno processada", companyId: company.id });
        await SendMailSmart({
          to: "visaobusinesstech@gmail.com",
          subject: "Assinatura cancelada/estorno",
          text: `Empresa #${company.id} (${company.email}) cancelada/estornada.`
        });
      }
    }

    return res.status(200).json({ detail: "ok" });
  } catch (e) {
    logger.error({ msg: "Erro no webhook Cakto", error: (e as Error)?.message });
    return res.status(500).json({ detail: "error" });
  }
}
