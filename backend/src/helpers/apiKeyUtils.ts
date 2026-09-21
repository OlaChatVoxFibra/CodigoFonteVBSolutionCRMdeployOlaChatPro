/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import crypto from "crypto";
import { hash, compare } from "bcryptjs";

export const API_KEY_PREFIX = "vb_live_";

export function generateApiKey(): { key: string; keyPrefix: string } {
  const randomPart = crypto.randomBytes(4).toString("hex");
  const secretPart = crypto.randomBytes(24).toString("hex");
  const keyPrefix = `${API_KEY_PREFIX}${randomPart}`;
  const key = `${keyPrefix}_${secretPart}`;
  return { key, keyPrefix };
}

export async function hashApiKey(key: string): Promise<string> {
  return hash(key, 8);
}

export async function verifyApiKey(key: string, keyHash: string): Promise<boolean> {
  return compare(key, keyHash);
}

export function extractApiKeyFromRequest(
  authorization?: string,
  xApiKey?: string
): string | null {
  if (xApiKey && String(xApiKey).trim()) {
    return String(xApiKey).trim();
  }
  if (!authorization) return null;
  const [scheme, token] = authorization.split(" ");
  if (scheme?.toLowerCase() === "bearer" && token?.trim()) {
    return token.trim();
  }
  return null;
}

export function extractApiKeyPrefix(rawKey: string): string | null {
  const match = String(rawKey || "").match(/^(vb_live_[a-f0-9]{8})_/i);
  return match ? match[1].toLowerCase() : null;
}
