/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import SmtpConfig from "../models/SmtpConfig";
import AppError from "../errors/AppError";
import {
  verifyCredentials,
  invalidateSmtpTransportCache,
  probeSmtpTcp,
  isGmailSmtpHost,
  isRailwayRuntime
} from "../helpers/SmtpTransport";
import { resolveSmtpRelayForCompany } from "../helpers/resolveSmtpRelay";
import Setting from "../models/Setting";
import { encryptRelaySecret, decryptRelaySecret } from "../helpers/RelayCrypto";
import {
  SMTP_RELAY_SETTING_URL,
  SMTP_RELAY_SETTING_SECRET_ENC
} from "../helpers/resolveSmtpRelay";

function parseSmtpPort(raw: unknown): number {
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n) || n < 1 || n > 65535) {
    throw new AppError("INVALID_SMTP_CONFIG", 400);
  }
  return Math.trunc(n);
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const items = await SmtpConfig.findAll({ where: { companyId }, order: [["isDefault", "DESC"], ["createdAt", "DESC"]] });
  return res.json({ items });
};

/** Só testa conexão/credenciais — use timeout maior no cliente (não bloqueia Salvar). */
export const verifyConnection = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id, smtpHost, smtpPort, smtpUsername, smtpPassword, smtpEncryption } = req.body || {};

  const host = String(smtpHost || "").trim();
  if (!host) {
    throw new AppError("INVALID_SMTP_CONFIG", 400);
  }
  const port = parseSmtpPort(smtpPort);

  const rawPass = typeof smtpPassword === "string" ? smtpPassword.trim() : "";
  let pass: string | undefined = rawPass.length > 0 ? rawPass : undefined;
  let selectedConfig: SmtpConfig | null = null;

  if (id != null) {
    selectedConfig = await SmtpConfig.findOne({ where: { id, companyId } });
    if (!selectedConfig) throw new AppError("SMTP_CONFIG_NOT_FOUND", 404);
  } else {
    selectedConfig = await SmtpConfig.findOne({
      where: { companyId, smtpHost: host, smtpUsername },
      order: [["isDefault", "DESC"], ["updatedAt", "DESC"]]
    });
    if (!selectedConfig) {
      selectedConfig = await SmtpConfig.findOne({
        where: { companyId },
        order: [["isDefault", "DESC"], ["updatedAt", "DESC"]]
      });
    }
  }

  if ((!pass || pass === "") && selectedConfig) {
    pass = selectedConfig.smtpPassword || undefined;
  }
  if (!pass || pass === "") {
    throw new AppError(
      "Nenhuma senha SMTP persistida foi recuperada. Salve novamente a senha de app e teste de novo. Se persistir, confira SMTP_SECRET_KEY no servidor.",
      400
    );
  }

  /** Hospedagens sem saída SMTP: verificação via worker HTTPS (ex.: Vercel). */
  const relayCfg = await resolveSmtpRelayForCompany(companyId);
  if (relayCfg) {
    const base = relayCfg.url.replace(/\/+$/, "");
    const r = await fetch(`${base}/api/verify-smtp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${relayCfg.secret}`
      },
      body: JSON.stringify({
        smtp: {
          host,
          port,
          username: smtpUsername,
          password: pass,
          encryption: smtpEncryption || "tls"
        }
      }),
      signal: AbortSignal.timeout(120_000)
    });
    const text = await r.text();
    let data: { error?: string; ok?: boolean } = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new AppError(text || `RELAY_VERIFY_HTTP_${r.status}`, 400);
    }
    if (!r.ok) {
      throw new AppError(data.error || text || `Verificação via worker falhou (HTTP ${r.status}).`, 400);
    }
    return res.json({
      ok: true,
      tcpLatencyMs: 0,
      smtpRelay: true,
      message:
        "SMTP verificado pelo worker (HTTPS). O disparo de e-mails na API usa o mesmo relay quando essas variáveis estão definidas."
    });
  }

  const tcp = await probeSmtpTcp(host, port, 12000);

  if (tcp.ok === false && isGmailSmtpHost(host) && port === 587) {
    const g465 = await probeSmtpTcp(host, 465, 12000);
    if (g465.ok === true) {
      try {
        await verifyCredentials({
          smtpHost: host,
          smtpPort: 465,
          smtpUsername,
          smtpPassword: pass,
          smtpEncryption: "ssl"
        });
        return res.json({
          ok: true,
          tcpLatencyMs: g465.ms,
          gmail465Fallback: true,
          suggestedPort: 465,
          suggestedEncryption: "ssl",
          message:
            "A porta 587 não responde a partir deste servidor; a verificação com 465 + SSL foi bem-sucedida. Salve com Porta 465 e Segurança SSL."
        });
      } catch (e: any) {
        const raw = String(e?.message || e || "");
        throw new AppError(
          raw ||
            "A porta 465 abriu, mas a autenticação TLS falhou. Revise usuário e senha de app do Gmail.",
          400
        );
      }
    }
  }

  if (tcp.ok === false) {
    const base =
      `O servidor onde roda a API não conseguiu abrir TCP até ${host}:${port} (${tcp.error}). ` +
      `Isso não é senha de app — é bloqueio de rede até o servidor SMTP.`;
    let hint = ` Peça liberação de saída nas portas 587 e 465 ou configure 465 com SSL.`;
    if (isRailwayRuntime()) {
      hint +=
        ` Na Railway, planos Free, Trial e Hobby não permitem saída SMTP (só HTTPS); é política da plataforma. Para usar SMTP (ex.: Gmail) é necessário plano Pro ou superior e redeploy — https://docs.railway.com/reference/outbound-networking`;
    }
    throw new AppError(base + hint, 400);
  }

  try {
    await verifyCredentials({
      smtpHost: host,
      smtpPort: port,
      smtpUsername,
      smtpPassword: pass,
      smtpEncryption
    });
  } catch (e: any) {
    const raw = String(e?.message || e || "");
    const afterTcp =
      /connection timeout|ETIMEDOUT/i.test(raw) || /timeout/i.test(raw)
        ? " O teste TCP inicial passou: o bloqueio costuma ser na fase STARTTLS/TLS ou na autenticação — tente 465 + SSL ou revise senha de app."
        : "";
    throw new AppError(
      (raw || "Falha ao verificar SMTP após conectar (credencial, TLS ou servidor SMTP).") + afterTcp,
      400
    );
  }

  return res.json({ ok: true, tcpLatencyMs: tcp.ms });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { smtpHost, smtpPort, smtpUsername, smtpPassword, smtpEncryption, isDefault } = req.body;

  if (!smtpHost || smtpPort === undefined || smtpPort === null || smtpPort === "") {
    throw new AppError("INVALID_SMTP_CONFIG", 400);
  }
  const port = parseSmtpPort(smtpPort);

  const existingCount = await SmtpConfig.count({ where: { companyId } });
  const firstForCompany = existingCount === 0;
  const defaultWanted = !!isDefault || firstForCompany;

  if (defaultWanted) {
    await SmtpConfig.update({ isDefault: false }, { where: { companyId } });
  }

  const item = await SmtpConfig.create({
    companyId,
    smtpHost,
    smtpPort: port,
    smtpUsername,
    smtpEncryption: smtpEncryption || "tls",
    isDefault: defaultWanted
  } as any);

  if (smtpPassword) {
    (item as any).smtpPassword = smtpPassword;
    await item.save();
  }

  invalidateSmtpTransportCache(companyId);

  return res.status(201).json(item);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params as any;
  const item = await SmtpConfig.findOne({ where: { id, companyId } });
  if (!item) throw new AppError("SMTP_CONFIG_NOT_FOUND", 404);

  const { smtpHost, smtpPort, smtpUsername, smtpPassword, smtpEncryption, isDefault } = req.body;

  if (isDefault) {
    await SmtpConfig.update({ isDefault: false }, { where: { companyId } });
  }

  const nextPort =
    smtpPort !== undefined && smtpPort !== null && smtpPort !== "" ? parseSmtpPort(smtpPort) : item.smtpPort;

  await item.update({
    smtpHost: smtpHost ?? item.smtpHost,
    smtpPort: nextPort,
    smtpUsername: smtpUsername ?? item.smtpUsername,
    smtpEncryption: smtpEncryption ?? item.smtpEncryption,
    isDefault: isDefault ?? item.isDefault
  });

  // Não apagar senha quando vier string vazia; somente atualizar se houver conteúdo
  if (smtpPassword !== undefined && smtpPassword !== "") {
    (item as any).smtpPassword = smtpPassword;
    await item.save();
  }

  invalidateSmtpTransportCache(companyId);

  return res.json(item);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params as any;
  const item = await SmtpConfig.findOne({ where: { id, companyId } });
  if (!item) throw new AppError("SMTP_CONFIG_NOT_FOUND", 404);

  await item.destroy();
  invalidateSmtpTransportCache(companyId);
  return res.status(204).send();
};

export const setDefault = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params as any;
  const item = await SmtpConfig.findOne({ where: { id, companyId } });
  if (!item) throw new AppError("SMTP_CONFIG_NOT_FOUND", 404);

  await SmtpConfig.update({ isDefault: false }, { where: { companyId } });
  await item.update({ isDefault: true });
  invalidateSmtpTransportCache(companyId);
  return res.json(item);
};

/** GET: URL do worker (sem segredo). Segredo nunca é devolvido. */
export const getRelaySettings = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const envActive =
    !!String(process.env.EMAIL_SMTP_RELAY_URL || "").trim() &&
    !!String(process.env.EMAIL_SMTP_RELAY_SECRET || "").trim();
  const urlRow = await Setting.findOne({ where: { companyId, key: SMTP_RELAY_SETTING_URL } });
  const secRow = await Setting.findOne({ where: { companyId, key: SMTP_RELAY_SETTING_SECRET_ENC } });
  const dbUrl = String(urlRow?.value || "").trim();
  const hasDbSecret = !!(secRow?.value && decryptRelaySecret(String(secRow.value)));
  return res.json({
    environmentOverride: envActive,
    relayUrl: envActive ? "" : dbUrl,
    hasSecret: envActive || hasDbSecret,
    source: envActive ? "environment" : dbUrl || hasDbSecret ? "database" : "none"
  });
};

/** PUT: salva URL/segredo do worker no banco (criptografado). Ignorado se env da API já definir relay. */
export const putRelaySettings = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  if (
    String(process.env.EMAIL_SMTP_RELAY_URL || "").trim() &&
    String(process.env.EMAIL_SMTP_RELAY_SECRET || "").trim()
  ) {
    throw new AppError(
      "RELAY_LOCKED_BY_ENV: Worker SMTP está definido nas variáveis do servidor (EMAIL_SMTP_RELAY_*). Remova-as no painel da hospedagem para editar aqui.",
      400
    );
  }
  const { relayUrl, relaySecret } = (req.body || {}) as { relayUrl?: string; relaySecret?: string };
  const url = String(relayUrl ?? "").trim();

  if (!url) {
    await Setting.destroy({ where: { companyId, key: SMTP_RELAY_SETTING_URL } });
    await Setting.destroy({ where: { companyId, key: SMTP_RELAY_SETTING_SECRET_ENC } });
    return res.json({ ok: true });
  }

  const [urlSetting] = await Setting.findOrCreate({
    where: { companyId, key: SMTP_RELAY_SETTING_URL },
    defaults: { companyId, key: SMTP_RELAY_SETTING_URL, value: "" }
  });
  await urlSetting.update({ value: url });

  if (relaySecret !== undefined && String(relaySecret).length > 0) {
    const [secSetting] = await Setting.findOrCreate({
      where: { companyId, key: SMTP_RELAY_SETTING_SECRET_ENC },
      defaults: { companyId, key: SMTP_RELAY_SETTING_SECRET_ENC, value: "" }
    });
    await secSetting.update({ value: encryptRelaySecret(String(relaySecret)) });
  }

  return res.json({ ok: true });
};
