/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import Company from "../models/Company";
import User from "../models/User";
import logger from "../utils/logger";
import {
  getCompanyTransporter,
  resolveMailFromAddress,
  resolveSmtpConfigForCompany
} from "../helpers/SmtpTransport";
import { getCompanyOptionalColumns } from "../helpers/companyOptionalColumns";

const NOTIFY_TO = "visaobusiniesstech@gmail.com";

function resolveSmtpCompanyId(): number {
  const raw = process.env.WHITE_LABEL_NOTIFY_COMPANY_ID;
  if (raw && !Number.isNaN(Number(raw))) return Number(raw);
  return 1;
}

/**
 * Envia resumo do cadastro White Label para a equipe interna.
 * Usa SMTP da empresa configurada (padrão companyId 1 — ex.: admin com SMTP em Configurações > Email).
 */
export const notify = async (req: Request, res: Response): Promise<Response> => {
  try {
    const body = req.body || {};
    const {
      hostingDomain,
      email,
      payload
    } = body as {
      hostingDomain?: string;
      email?: string;
      payload?: Record<string, unknown>;
    };

    if (!hostingDomain || !String(hostingDomain).trim()) {
      return res.status(400).json({ error: "DOMINIO_OBRIGATORIO" });
    }

    const companyId = resolveSmtpCompanyId();
    const smtpRow = await resolveSmtpConfigForCompany(companyId);
    let fromAddr: string | undefined = resolveMailFromAddress(smtpRow?.smtpUsername);

    if (!fromAddr) {
      const admin = await User.findOne({
        where: { profile: "admin", companyId } as any,
        order: [["id", "ASC"]]
      });
      if (admin?.email) fromAddr = admin.email;
    }
    if (!fromAddr) {
      fromAddr = process.env.MAIL_USER || "noreply@localhost";
    }

    const transporter = await getCompanyTransporter(companyId);
    const subject = `[White Label] Novo pedido — ${String(hostingDomain).trim()}`;
    const jsonBlock = JSON.stringify(
      {
        emailContato: email || null,
        dominioHospedagem: hostingDomain,
        ...payload
      },
      null,
      2
    );
    const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body style="font-family:Arial,sans-serif;line-height:1.5">
  <h2>Novo cadastro White Label</h2>
  <p><strong>Domínio de hospedagem:</strong> ${escapeHtml(String(hostingDomain))}</p>
  <p><strong>E-mail informado:</strong> ${escapeHtml(String(email || ""))}</p>
  <h3>Dados completos (JSON)</h3>
  <pre style="background:#f4f4f4;padding:12px;border-radius:8px;overflow:auto">${escapeHtml(jsonBlock)}</pre>
</body></html>`;

    await transporter.sendMail({
      from: fromAddr,
      to: NOTIFY_TO,
      subject,
      text: jsonBlock,
      html
    });

    try {
      const em = email && String(email).trim().toLowerCase();
      if (em) {
        const u = await User.findOne({ where: { email: em } as any });
        if (u?.companyId) {
          const comp = await Company.findByPk(u.companyId);
          if (comp) {
            const cols = await getCompanyOptionalColumns();
            const payload: Record<string, unknown> = {};
            if (cols.whiteLabelHostDomain) {
              payload.whiteLabelHostDomain = String(hostingDomain).trim();
            }
            if (cols.signupMetadata) {
              const prev =
                (comp as any).getDataValue?.("signupMetadata") ||
                (comp as any).signupMetadata ||
                {};
              payload.signupMetadata = {
                ...(typeof prev === "object" && prev !== null ? prev : {}),
                whiteLabel: true,
                signupSource: "whitelabel"
              };
            }
            if (Object.keys(payload).length) {
              await comp.update(payload as any);
            }
          }
        }
      }
    } catch (e) {
      logger.warn({ msg: "WhiteLabel notify company metadata", err: (e as Error)?.message });
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    logger.error({ msg: "WhiteLabel notify failed", err: err?.message });
    return res.status(500).json({ error: "EMAIL_SEND_FAILED", detail: err?.message });
  }
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Atualiza domínio white label na empresa do usuário autenticado (após login). */
export const saveDomain = async (req: Request, res: Response): Promise<Response> => {
  const auth = req.user as any;
  if (!auth?.companyId) return res.status(401).json({ error: "UNAUTHORIZED" });
  const { hostingDomain } = req.body || {};
  if (!hostingDomain || !String(hostingDomain).trim()) {
    return res.status(400).json({ error: "DOMINIO_OBRIGATORIO" });
  }
  const company = await Company.findByPk(auth.companyId);
  if (!company) return res.status(404).json({ error: "COMPANY_NOT_FOUND" });
  const cols = await getCompanyOptionalColumns();
  const payload: Record<string, unknown> = {};
  if (cols.whiteLabelHostDomain) {
    payload.whiteLabelHostDomain = String(hostingDomain).trim();
  }
  if (cols.signupMetadata) {
    const prev =
      (company as any).getDataValue?.("signupMetadata") ||
      (company as any).signupMetadata ||
      {};
    payload.signupMetadata = {
      ...(typeof prev === "object" && prev !== null ? prev : {}),
      whiteLabel: true,
      signupSource: "whitelabel"
    };
  }
  if (Object.keys(payload).length) {
    await company.update(payload as any);
  }
  return res.json({ ok: true });
};
