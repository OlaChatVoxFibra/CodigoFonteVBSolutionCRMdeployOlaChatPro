/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import crypto from "crypto";

const ALG = "aes-256-gcm";
const IV_LEN = 16;

function getDerivedKey(): Buffer {
  const raw =
    process.env.GEMINI_KEY_ENCRYPTION_SECRET ||
    process.env.JWT_SECRET ||
    process.env.SMTP_SECRET_KEY ||
    "";
  return Buffer.from(
    crypto.createHash("sha256").update(raw || "gemini-fallback-secret-change-env").digest()
  );
}

export function encryptGeminiApiKeySecret(text: string): string {
  const iv = crypto.randomBytes(IV_LEN);
  const key = getDerivedKey();
  const cipher = crypto.createCipheriv(ALG, key, iv);
  const enc = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

export function decryptGeminiApiKeySecret(payload: string): string | null {
  try {
    const raw = Buffer.from(payload, "base64");
    if (raw.length < IV_LEN + 16) {
      return null;
    }
    const iv = raw.subarray(0, IV_LEN);
    const tag = raw.subarray(IV_LEN, IV_LEN + 16);
    const data = raw.subarray(IV_LEN + 16);
    const decipher = crypto.createDecipheriv(ALG, getDerivedKey(), iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}
