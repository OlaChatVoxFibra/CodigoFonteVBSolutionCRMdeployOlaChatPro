/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import crypto from "crypto";
import logger from "../utils/logger";

const ALG = "aes-256-gcm";
const IV_LEN = 16;

function getKey() {
  const key = process.env.SMTP_SECRET_KEY || "";
  return Buffer.from(crypto.createHash("sha256").update(key).digest());
}

export function encryptRelaySecret(text: string): string {
  try {
    const iv = crypto.randomBytes(IV_LEN);
    const key = getKey();
    const cipher = crypto.createCipheriv(ALG, key, iv);
    const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, enc]).toString("base64");
  } catch {
    return text;
  }
}

export function decryptRelaySecret(payload: string): string | null {
  try {
    const raw = Buffer.from(payload, "base64");
    if (raw.length < IV_LEN + 16) {
      return null;
    }
    const iv = raw.subarray(0, IV_LEN);
    const tag = raw.subarray(IV_LEN, IV_LEN + 16);
    const data = raw.subarray(IV_LEN + 16);
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALG, key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    logger.warn({ msg: "RelayCrypto: falha ao descriptografar segredo do worker SMTP (SMTP_SECRET_KEY?)." });
    return null;
  }
}
