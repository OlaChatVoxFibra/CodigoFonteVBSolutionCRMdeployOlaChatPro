/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import crypto from "crypto";
import logger from "../utils/logger";

export interface WebhookSignatureResult {
  ok: boolean;
  skipped: boolean;
  reason?: string;
}

export const verifyMetaWebhookSignature = (req: {
  headers: Record<string, unknown>;
  rawBody?: string;
}): WebhookSignatureResult => {
  if (process.env.META_WEBHOOK_SKIP_SIGNATURE === "true") {
    return { ok: true, skipped: true, reason: "META_WEBHOOK_SKIP_SIGNATURE" };
  }

  const appSecret = (process.env.FACEBOOK_APP_SECRET || "").trim();
  const signatureHeader = String(req.headers["x-hub-signature-256"] || "");

  if (!appSecret) {
    logger.warn(
      "[WABA Webhook] FACEBOOK_APP_SECRET não definido — assinatura não validada (configure no Railway)"
    );
    return { ok: true, skipped: true, reason: "no_app_secret" };
  }

  if (!signatureHeader) {
    return { ok: true, skipped: true, reason: "no_signature_header" };
  }

  const rawBody = req.rawBody;
  if (typeof rawBody !== "string" || !rawBody.length) {
    logger.warn("[WABA Webhook] rawBody ausente — assinatura não validada");
    return { ok: true, skipped: true, reason: "no_raw_body" };
  }

  const expected =
    "sha256=" +
    crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");

  try {
    const expectedBuf = Buffer.from(expected);
    const receivedBuf = Buffer.from(signatureHeader);
    if (
      expectedBuf.length !== receivedBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, receivedBuf)
    ) {
      const strict = process.env.META_WEBHOOK_STRICT_SIGNATURE === "true";
      logger.error(
        `[WABA Webhook] Assinatura inválida (FACEBOOK_APP_SECRET incorreto?). strict=${strict}`
      );
      if (!strict) {
        return {
          ok: true,
          skipped: true,
          reason: "signature_mismatch_lenient"
        };
      }
      return { ok: false, skipped: false, reason: "signature_mismatch" };
    }
  } catch {
    return { ok: false, skipped: false, reason: "signature_compare_error" };
  }

  return { ok: true, skipped: false };
};
