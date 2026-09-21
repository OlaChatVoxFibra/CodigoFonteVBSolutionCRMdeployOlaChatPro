/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import dns from "dns";
import net from "net";
import nodemailer, { Transporter, SendMailOptions } from "nodemailer";
import SmtpConfig from "../models/SmtpConfig";
import { resolveSmtpRelayForCompany } from "./resolveSmtpRelay";

type SmtpCacheEntry = {
  transporter: Transporter;
  source: "db" | "env";
  dbRowId?: number;
  dbUpdatedAtMs?: number;
  envFingerprint?: string;
};

type TcpProbeResult = { ok: true; ms: number } | { ok: false; error: string };

function isTcpProbeFail(r: TcpProbeResult): r is { ok: false; error: string } {
  return r.ok === false;
}

const cache: Record<string, SmtpCacheEntry> = {};

function smtpCacheKey(companyId: number | string): string {
  const n = Math.trunc(Number(companyId));
  return String(Number.isFinite(n) && n >= 1 ? n : companyId);
}

/** Identidade do fallback MAIL_* no .env (mudou → reconstrói transporter). */
function envSmtpFingerprint(): string {
  const h = String(process.env.MAIL_HOST || "").trim();
  const p = String(process.env.MAIL_PORT ?? "");
  const u = String(process.env.MAIL_USER || "");
  const sec = String(process.env.MAIL_SECURE || "");
  const passLen = process.env.MAIL_PASS != null ? String(process.env.MAIL_PASS).length : 0;
  return `${h}|${p}|${u}|${sec}|${passLen}`;
}

function closeCacheEntry(entry: SmtpCacheEntry | undefined): void {
  if (!entry?.transporter) return;
  try {
    entry.transporter.close();
  } catch {
    /* ignore */
  }
}

/** Encerra pool e remove transporter da memória (obrigatório após alterar SMTP no banco). */
export function invalidateSmtpTransportCache(companyId: number | string): void {
  const key = smtpCacheKey(companyId);
  const existing = cache[key];
  if (existing) {
    closeCacheEntry(existing);
    delete cache[key];
  }
}

/**
 * Linha SMTP a usar: padrão explícito; se nenhum estiver marcado, usa o mais recente
 * (evita SMTP_NOT_CONFIGURED com registros no banco sem isDefault).
 */
export async function resolveSmtpConfigForCompany(companyId: number): Promise<SmtpConfig | null> {
  let row = await SmtpConfig.findOne({ where: { companyId, isDefault: true } });
  if (!row) {
    row = await SmtpConfig.findOne({
      where: { companyId },
      order: [["updatedAt", "DESC"], ["id", "DESC"]]
    } as any);
  }
  return row;
}

/** Remetente efetivo: MAIL_FROM inválido/placeholder cai para usuário SMTP (evita Gmail rejeitar por From errado). Não abre firewall. */
export function resolveMailFromAddress(smtpUsername?: string | null): string | undefined {
  const envFrom = String(process.env.MAIL_FROM || "").trim();
  const envUser = String(process.env.MAIL_USER || "").trim();
  const smtp = smtpUsername != null ? String(smtpUsername).trim() : "";
  const lower = envFrom.toLowerCase();
  const placeholder =
    !envFrom ||
    lower === "seu.email@gmail.com" ||
    lower === "noreply@localhost" ||
    lower.endsWith("@example.com") ||
    lower.includes("seuemail@") ||
    lower.includes("seu.email@");
  const fallback = smtp || envUser;
  if (placeholder) {
    return fallback || undefined;
  }
  return envFrom || fallback || undefined;
}

export function isGmailSmtpHost(hostname: string): boolean {
  const l = String(hostname || "").trim().toLowerCase();
  return l === "smtp.gmail.com" || l === "smtp.googlemail.com";
}

/** Deploy na Railway (plano Free/Hobby/Trial bloqueia saída SMTP por política). */
export function isRailwayRuntime(): boolean {
  return (
    String(process.env.RAILWAY_PROJECT_ID || "").length > 0 ||
    String(process.env.RAILWAY_ENVIRONMENT || "").length > 0 ||
    String(process.env.RAILWAY_SERVICE_ID || "").length > 0
  );
}

/**
 * Destino TCP/TLS: para Gmail, por padrão conecta no IPv4 literal com SNI no hostname (evita IPv6 sem rota).
 * SMTP_SKIP_GMAIL_IPV4_LITERAL=true desliga isso. SMTP_CONNECT_VIA_IPV4=true força IPv4 para qualquer host.
 */
async function smtpConnectTarget(hostname: string): Promise<{ host: string; tlsServername?: string }> {
  const h = String(hostname || "").trim();
  if (!h || net.isIP(h)) {
    return { host: h };
  }

  const lower = h.toLowerCase();
  const isGmailSmtp = lower === "smtp.gmail.com" || lower === "smtp.googlemail.com";

  const tryLookupV4 = async (): Promise<{ host: string; tlsServername: string } | null> => {
    try {
      const { address } = await dns.promises.lookup(h, { family: 4 });
      return { host: address, tlsServername: h };
    } catch {
      return null;
    }
  };

  if (isGmailSmtp && String(process.env.SMTP_SKIP_GMAIL_IPV4_LITERAL || "").toLowerCase() !== "true") {
    const v4 = await tryLookupV4();
    if (v4) return v4;
  }

  if (String(process.env.SMTP_CONNECT_VIA_IPV4 || "").toLowerCase() === "true") {
    const v4 = await tryLookupV4();
    if (v4) return v4;
  }

  return { host: h };
}

function probeTcpOnce(targetHost: string, port: number, timeoutMs: number): Promise<TcpProbeResult> {
  return new Promise(resolve => {
    const started = Date.now();
    const socket = new net.Socket();
    const finishOk = () => {
      try {
        socket.destroy();
      } catch {
        /* ignore */
      }
      resolve({ ok: true, ms: Date.now() - started });
    };
    const finishErr = (err: string) => {
      try {
        socket.destroy();
      } catch {
        /* ignore */
      }
      resolve({ ok: false, error: err || "falha" });
    };
    const timer = setTimeout(() => finishErr(`sem resposta em ${timeoutMs}ms (timeout TCP)`), timeoutMs);
    socket.once("connect", () => {
      clearTimeout(timer);
      finishOk();
    });
    socket.once("error", (e: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      finishErr(e.code ? `${e.code}: ${e.message || ""}`.trim() : e.message || "erro de socket");
    });
    try {
      socket.connect(port, targetHost);
    } catch (e: any) {
      clearTimeout(timer);
      finishErr(String(e?.message || e));
    }
  });
}

/**
 * Teste TCP até host:port. Tenta o hostname e, se não for IP, tenta de novo no IPv4 (mesmo sintoma de ETIMEDOUT em IPv6 quebrado).
 */
export async function probeSmtpTcp(
  host: string,
  port: number,
  timeoutMs = 12000
): Promise<TcpProbeResult> {
  const h = String(host || "").trim();
  const p = Number(port);
  if (!h || !Number.isFinite(p)) {
    return { ok: false, error: "host ou porta inválido" };
  }

  const first = await probeTcpOnce(h, p, timeoutMs);
  if (isTcpProbeFail(first)) {
    const errHost = first.error;
    if (net.isIP(h)) {
      return { ok: false, error: errHost };
    }
    try {
      const { address } = await dns.promises.lookup(h, { family: 4 });
      const second = await probeTcpOnce(address, p, timeoutMs);
      if (isTcpProbeFail(second)) {
        return {
          ok: false,
          error: `hostname "${h}": ${errHost}; IPv4 "${address}": ${second.error}`
        };
      }
      return second;
    } catch (e: any) {
      return {
        ok: false,
        error: `${errHost} (resolução IPv4: ${String(e?.message || e)})`
      };
    }
  }
  return first;
}

async function buildNodemailerOptions(params: {
  smtpHost: string;
  smtpPort: number;
  smtpUsername?: string;
  smtpPassword?: string;
  smtpEncryption?: string;
  pool: boolean;
}) {
  const target = await smtpConnectTarget(params.smtpHost);
  const port = Number(params.smtpPort) || 587;
  const enc = String(params.smtpEncryption || "tls").toLowerCase();

  const ignoreTLS = enc === "none";
  let secure = false;
  if (!ignoreTLS && port === 465) {
    secure = true;
  } else if (!ignoreTLS && enc === "ssl" && port !== 587 && port !== 25) {
    secure = true;
  }
  // Na 587 o Gmail negocia STARTTLS sem exigir requireTLS (alguns filtros de rede travavam com requireTLS true).
  const requireTLS = !secure && !ignoreTLS && port !== 587 && port !== 2587;

  const o: Record<string, unknown> = {
    host: target.host,
    port,
    secure,
    ignoreTLS,
    requireTLS,
    pool: params.pool,
    connectionTimeout: 55_000,
    greetingTimeout: 28_000,
    socketTimeout: 55_000,
    auth:
      params.smtpUsername || params.smtpPassword
        ? { user: params.smtpUsername, pass: params.smtpPassword }
        : undefined
  };

  if (target.tlsServername) {
    o.tls = { servername: target.tlsServername, rejectUnauthorized: true };
  }

  return o as any;
}

function isLikelyConnectionOrTlsTimeout(err: unknown): boolean {
  const e = err as { code?: string; message?: string };
  const code = String(e?.code || "");
  const msg = String(e?.message || err || "").toLowerCase();
  if (code === "ETIMEDOUT" || code === "ESOCKETTIMEDOUT" || code === "ECONNRESET" || code === "EPIPE") {
    return true;
  }
  if (
    /connection timeout|greeting timed out|socket hang up|timed out|etimedout|econnreset|esocket|tls connection|starttls/i.test(
      msg
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Envia e-mail com SMTP da empresa (DB ou MAIL_*). Para Gmail em 587/tls, uma falha de rede/timeout
 * dispara uma segunda tentativa efêmera em 465/ssl sem alterar o banco.
 *
 * Se `EMAIL_SMTP_RELAY_URL` e `EMAIL_SMTP_RELAY_SECRET` estiverem definidos, o envio é delegado a um
 * worker HTTP (ex.: Vercel) que abre o SMTP — útil quando a API não tem saída SMTP (ex.: Railway Hobby).
 */
export async function sendMailWithCompanySmtp(companyId: number, mail: SendMailOptions): Promise<void> {
  const relay = await resolveSmtpRelayForCompany(companyId);
  if (relay) {
    const { sendMailThroughHttpRelay } = await import("./SmtpRelayClient");
    await sendMailThroughHttpRelay(companyId, mail, relay.url, relay.secret);
    return;
  }

  const cid = Math.trunc(Number(companyId));
  if (!Number.isFinite(cid) || cid < 1) {
    throw new Error(`SMTP_INVALID_COMPANY: companyId inválido (${companyId}).`);
  }
  const config = await resolveSmtpConfigForCompany(cid);
  if (!config) {
    const transporter = await getCompanyTransporter(cid);
    await transporter.sendMail(mail);
    return;
  }
  const transporter = await getCompanyTransporter(cid);
  try {
    await transporter.sendMail(mail);
  } catch (err: unknown) {
    const enc = String(config.smtpEncryption || "tls").toLowerCase();
    const canTryGmail465 =
      isGmailSmtpHost(config.smtpHost) &&
      Number(config.smtpPort) === 587 &&
      enc !== "none" &&
      isLikelyConnectionOrTlsTimeout(err);
    if (!canTryGmail465) {
      throw err;
    }
    invalidateSmtpTransportCache(cid);
    const ephemeral = nodemailer.createTransport(
      await buildNodemailerOptions({
        smtpHost: config.smtpHost,
        smtpPort: 465,
        smtpUsername: config.smtpUsername,
        smtpPassword: config.smtpPassword ?? undefined,
        smtpEncryption: "ssl",
        pool: false
      })
    );
    try {
      await ephemeral.sendMail(mail);
    } finally {
      try {
        ephemeral.close();
      } catch {
        /* ignore */
      }
    }
  }
}

/** Credenciais SMTP resolvidas (DB ou MAIL_*) — usado pelo relay HTTP sem abrir socket na API. */
export type ResolvedSmtpCredentials = {
  smtpHost: string;
  smtpPort: number;
  smtpUsername?: string;
  smtpPassword?: string;
  smtpEncryption: string;
};

export async function getSmtpCredentialsForCompany(companyId: number | string): Promise<ResolvedSmtpCredentials> {
  const cid = Math.trunc(Number(companyId));
  if (!Number.isFinite(cid) || cid < 1) {
    throw new Error(`SMTP_INVALID_COMPANY: companyId inválido (${companyId}).`);
  }
  const config = await resolveSmtpConfigForCompany(cid);
  if (config) {
    const encRaw = config.getDataValue("smtpPasswordEnc") as string | null | undefined;
    const user = config.smtpUsername != null ? String(config.smtpUsername).trim() : "";
    const pass = config.smtpPassword;
    if (user && encRaw && (pass == null || pass === "")) {
      throw new Error(
        "SMTP_PASSWORD_UNAVAILABLE: Não foi possível recuperar a senha SMTP (SMTP_SECRET_KEY diferente da usada ao salvar, ou dado corrompido). Atualize a senha nas configurações de e-mail."
      );
    }
    return {
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      smtpUsername: config.smtpUsername ?? undefined,
      smtpPassword: pass ?? undefined,
      smtpEncryption: String(config.smtpEncryption || "tls")
    };
  }
  const envHost = String(process.env.MAIL_HOST || "").trim();
  if (!envHost) {
    throw new Error(
      `SMTP_NOT_CONFIGURED: Empresa ${cid} não possui linha em SmtpConfigs e MAIL_HOST não está definido no servidor. ` +
        `Cadastre em Configurações > Email ou defina MAIL_HOST (e credenciais) nas variáveis de ambiente da API.`
    );
  }
  return {
    smtpHost: envHost,
    smtpPort: process.env.MAIL_PORT ? Number(process.env.MAIL_PORT) : 587,
    smtpUsername: process.env.MAIL_USER || undefined,
    smtpPassword: process.env.MAIL_PASS || undefined,
    smtpEncryption: String(process.env.MAIL_SECURE || "false").toLowerCase() === "true" ? "ssl" : "tls"
  };
}

export async function getCompanyTransporter(companyId: number | string): Promise<Transporter> {
  const cid = Math.trunc(Number(companyId));
  if (!Number.isFinite(cid) || cid < 1) {
    throw new Error(
      `SMTP_INVALID_COMPANY: companyId inválido (${companyId}). Não foi possível resolver SMTP.`
    );
  }
  const key = String(cid);
  const config = await resolveSmtpConfigForCompany(cid);
  const dbUpdatedMs =
    config && (config as any).updatedAt != null
      ? new Date((config as any).updatedAt).getTime()
      : null;

  const hit = cache[key];
  let cacheOk = false;
  if (hit?.transporter) {
    if (config) {
      cacheOk =
        hit.source === "db" &&
        hit.dbRowId === config.id &&
        hit.dbUpdatedAtMs === dbUpdatedMs;
    } else {
      const envHost = String(process.env.MAIL_HOST || "").trim();
      cacheOk =
        !!envHost &&
        hit.source === "env" &&
        hit.envFingerprint === envSmtpFingerprint();
    }
  }
  if (cacheOk && hit?.transporter) {
    return hit.transporter;
  }

  if (hit) {
    closeCacheEntry(hit);
    delete cache[key];
  }

  if (config) {
    const creds = await getSmtpCredentialsForCompany(cid);
    const transporter = nodemailer.createTransport(
      await buildNodemailerOptions({
        smtpHost: creds.smtpHost,
        smtpPort: creds.smtpPort,
        smtpUsername: creds.smtpUsername,
        smtpPassword: creds.smtpPassword,
        smtpEncryption: creds.smtpEncryption,
        pool: false
      })
    );
    cache[key] = {
      transporter,
      source: "db",
      dbRowId: config.id,
      dbUpdatedAtMs: dbUpdatedMs ?? undefined
    };
    return transporter;
  }

  const envHost = String(process.env.MAIL_HOST || "").trim();
  if (envHost) {
    const creds = await getSmtpCredentialsForCompany(cid);
    const transporter = nodemailer.createTransport(
      await buildNodemailerOptions({
        smtpHost: creds.smtpHost,
        smtpPort: creds.smtpPort,
        smtpUsername: creds.smtpUsername,
        smtpPassword: creds.smtpPassword,
        smtpEncryption: creds.smtpEncryption,
        pool: false
      })
    );
    cache[key] = {
      transporter,
      source: "env",
      envFingerprint: envSmtpFingerprint()
    };
    return transporter;
  }

  throw new Error(
    `SMTP_NOT_CONFIGURED: Empresa ${cid} não possui linha em SmtpConfigs e MAIL_HOST não está definido no servidor. ` +
      `Cadastre em Configurações > Email ou defina MAIL_HOST (e credenciais) nas variáveis de ambiente da API.`
  );
}

export async function verifyCredentials(params: {
  smtpHost: string;
  smtpPort: number;
  smtpUsername?: string;
  smtpPassword?: string;
  smtpEncryption?: string;
}) {
  const transporter = nodemailer.createTransport(
    await buildNodemailerOptions({
      smtpHost: params.smtpHost,
      smtpPort: params.smtpPort,
      smtpUsername: params.smtpUsername,
      smtpPassword: params.smtpPassword,
      smtpEncryption: params.smtpEncryption,
      pool: false
    })
  );
  try {
    await transporter.verify();
  } finally {
    try {
      transporter.close();
    } catch {
      /* ignore */
    }
  }
}
