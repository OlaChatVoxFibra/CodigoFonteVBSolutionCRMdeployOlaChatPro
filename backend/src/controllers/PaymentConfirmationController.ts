/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { Op } from "sequelize";
import PaymentConfirmationToken from "../models/PaymentConfirmationToken";
import Company from "../models/Company";
import User from "../models/User";
import Plan from "../models/Plan";

export async function issueToken(email: string, companyId?: number, desiredPlanName?: string, ttlHours = 72) {
  const token = uuidv4().replace(/-/g, "");
  const expires = new Date();
  expires.setHours(expires.getHours() + ttlHours);
  const rec = await PaymentConfirmationToken.create({
    token,
    email,
    companyId: companyId || null,
    desiredPlanName: desiredPlanName || null,
    expiresAt: expires
  } as any);
  return rec;
}

export async function show(req: Request, res: Response) {
  const { token } = req.params as any;
  const rec = await PaymentConfirmationToken.findOne({ where: { token } as any });
  if (!rec) return res.status(404).json({ error: "Token inválido" });
  if (rec.usedAt) return res.status(400).json({ error: "Token já utilizado" });
  if (rec.expiresAt && rec.expiresAt.getTime() < Date.now()) return res.status(400).json({ error: "Token expirado" });
  return res.status(200).json({ email: rec.email });
}

export async function byEmail(req: Request, res: Response) {
  const { email } = req.query as any;
  if (!email) return res.status(400).json({ error: "Email obrigatório" });
  const q = String(email).trim();
  /** Só com variável explícita — nunca inferir por NODE_ENV (evita “confirmação” falsa em dev). */
  const allowSelf = String(process.env.CONFIRM_ALLOW_SELF_ISSUE || "").toLowerCase() === "true";
  // 1) Tenta case-insensitive por email diretamente
  let rec = await PaymentConfirmationToken.findOne({
    where: {
      email: { [Op.iLike]: q },
      usedAt: { [Op.is]: null },
      expiresAt: { [Op.gt]: new Date() }
    } as any,
    order: [["createdAt", "DESC"]]
  });
  if (rec) return res.status(200).json({ token: rec.token });
  // 2) Busca empresa via email fornecido (company.email) ou usuário (user.email)
  const company = await Company.findOne({ where: { email: { [Op.iLike]: q } } as any }) ||
                  await (async () => {
                    const user = await User.findOne({ where: { email: { [Op.iLike]: q } } as any });
                    if (!user) return null as any;
                    return Company.findByPk(user.companyId as any);
                  })();
  if (company) {
    // 2a) Procura token por companyId
    rec = await PaymentConfirmationToken.findOne({
      where: {
        companyId: company.id,
        usedAt: { [Op.is]: null },
        expiresAt: { [Op.gt]: new Date() }
      } as any,
      order: [["createdAt", "DESC"]]
    });
    if (rec) return res.status(200).json({ token: rec.token });
    /* Sem token pendente: não emitir aqui — só o webhook Cakto (pagamento aprovado) cria o registro. */
    return res.status(404).json({ error: "Token não encontrado" });
  }
  // 3) Não achou. Em ambiente dev (ou se habilitado), emite token para destravar fluxo
  if (allowSelf) {
    const fresh = await issueToken(q, undefined, undefined);
    return res.status(200).json({ token: fresh.token, dev: true });
  }
  // Caso produção e sem empresa/token, mantém 404
  return res.status(404).json({ error: "Token não encontrado" });
}

export async function resolvePlanByName(planName?: string) {
  if (!planName) return null;
  const name = String(planName).toLowerCase();
  const synonyms: Record<string, string[]> = {
    starter: ["starter", "iniciante", "basic", "básico", "basico"],
    essencial: ["essencial", "essential", "standard"],
    pro: ["pro", "professional", "profissional", "premium"]
  };
  const all = await Plan.findAll();
  const byName = (needleList: string[]) =>
    all.find(p => {
      const n = String(p.name || "").toLowerCase();
      return needleList.some(needle => n.includes(needle));
    }) || null;
  if (synonyms.starter.some(s => name.includes(s))) return byName(synonyms.starter);
  if (synonyms.essencial.some(s => name.includes(s))) return byName(synonyms.essencial);
  if (synonyms.pro.some(s => name.includes(s))) return byName(synonyms.pro);
  const direct = await Plan.findOne({ where: { name: { [Op.iLike]: `%${planName}%` } } as any });
  return direct;
}

/**
 * Usuário já logado: marca token de confirmação de pagamento como usado (fluxo freemium / upgrade no app).
 * O webhook já atualizou plano e vencimento; isso alinha o fluxo com o Register (polling + confirmação).
 */
export async function acknowledgePaid(req: Request, res: Response) {
  const { token } = req.params as any;
  const auth = req.user as any;
  if (!auth?.id) {
    return res.status(401).json({ error: "Não autenticado" });
  }
  const user = await User.findByPk(auth.id);
  if (!user) {
    return res.status(401).json({ error: "Usuário não encontrado" });
  }
  const rec = await PaymentConfirmationToken.findOne({ where: { token } as any });
  if (!rec) return res.status(404).json({ error: "Token inválido" });
  if (rec.usedAt) return res.status(400).json({ error: "Token já utilizado" });
  if (rec.expiresAt && rec.expiresAt.getTime() < Date.now()) {
    return res.status(400).json({ error: "Token expirado" });
  }
  const mailOk =
    rec.email &&
    user.email &&
    String(rec.email).toLowerCase() === String(user.email).toLowerCase();
  const companyOk =
    rec.companyId &&
    user.companyId &&
    Number(rec.companyId) === Number(user.companyId);
  if (!mailOk && !companyOk) {
    return res.status(403).json({ error: "Token não pertence à sua sessão" });
  }
  rec.usedAt = new Date();
  await rec.save();
  return res.status(200).json({ ok: true });
}

export async function consume(req: Request, res: Response) {
  const { token } = req.params as any;
  const { name, password } = req.body as any;
  const rec = await PaymentConfirmationToken.findOne({ where: { token } as any });
  if (!rec) return res.status(404).json({ error: "Token inválido" });
  if (rec.usedAt) return res.status(400).json({ error: "Token já utilizado" });
  if (rec.expiresAt && rec.expiresAt.getTime() < Date.now()) return res.status(400).json({ error: "Token expirado" });
  let company = null as any;
  if (rec.companyId) {
    company = await Company.findByPk(rec.companyId as any);
  }
  if (!company) {
    const planName = rec.desiredPlanName || "Starter";
    const plan = await resolvePlanByName(planName);
    company = await Company.create({
      name: name || rec.email.split("@")[0],
      email: rec.email,
      phone: "",
      planId: plan ? (plan as any).id : null,
      status: true,
      dueDate: new Date().toISOString().slice(0, 10),
      recurrence: ""
    } as any);
  }
  let user = await User.findOne({ where: { email: rec.email } as any });
  if (!user) {
    user = await User.create({
      email: rec.email,
      password,
      name: name || rec.email,
      profile: "admin",
      companyId: company.id
    } as any);
  } else {
    await user.update({ password } as any);
  }
  rec.usedAt = new Date();
  await rec.save();
  return res.status(200).json({ ok: true });
}
