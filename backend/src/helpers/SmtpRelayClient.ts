/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import type { SendMailOptions } from "nodemailer";
import { getSmtpCredentialsForCompany } from "./SmtpTransport";

type RelayAttachment = {
  filename: string;
  contentBase64: string;
  contentType?: string;
  cid?: string;
  contentDisposition?: string;
};

type RelayPayload = {
  smtp: {
    host: string;
    port: number;
    username?: string;
    password?: string;
    encryption?: string;
  };
  mail: {
    from?: string;
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    attachments?: RelayAttachment[];
  };
};

function serializeAttachments(mail: SendMailOptions): RelayAttachment[] | undefined {
  const list = mail.attachments;
  if (!list?.length) return undefined;
  const out: RelayAttachment[] = [];
  for (const a of list as any[]) {
    if (a.path && !a.content) {
      throw new Error(
        "SMTP_RELAY_PATH_ATTACHMENT: anexo só com path não é suportado no relay; o disparo deve usar buffer em memória."
      );
    }
    if (a.content != null) {
      const buf = Buffer.isBuffer(a.content) ? a.content : Buffer.from(String(a.content));
      out.push({
        filename: String(a.filename || "attachment"),
        contentBase64: buf.toString("base64"),
        contentType: a.contentType,
        cid: a.cid,
        contentDisposition: a.contentDisposition
      });
    }
  }
  return out.length ? out : undefined;
}

/**
 * Envia e-mail via worker HTTP (ex.: Vercel) que abre SMTP na internet.
 * Railway Hobby bloqueia saída SMTP; o relay usa HTTPS (443) até o worker.
 */
export async function sendMailThroughHttpRelay(
  companyId: number,
  mail: SendMailOptions,
  relayUrl: string,
  relaySecret: string
): Promise<void> {
  const creds = await getSmtpCredentialsForCompany(companyId);
  const payload: RelayPayload = {
    smtp: {
      host: creds.smtpHost,
      port: creds.smtpPort,
      username: creds.smtpUsername,
      password: creds.smtpPassword,
      encryption: creds.smtpEncryption
    },
    mail: {
      from: mail.from as string | undefined,
      to: mail.to as string | string[],
      subject: String(mail.subject || ""),
      html: mail.html as string | undefined,
      text: mail.text as string | undefined,
      attachments: serializeAttachments(mail)
    }
  };

  const url = relayUrl.replace(/\/+$/, "");
  const res = await fetch(`${url}/api/send-mail`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${relaySecret}`
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120_000)
  });

  const text = await res.text();
  let body: { error?: string; ok?: boolean };
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { error: text || `HTTP ${res.status}` };
  }

  if (!res.ok) {
    throw new Error(body.error || `SMTP_RELAY_HTTP_${res.status}: ${text.slice(0, 500)}`);
  }
  if (body.ok !== true) {
    throw new Error(body.error || "SMTP_RELAY_INVALID_RESPONSE");
  }
}
