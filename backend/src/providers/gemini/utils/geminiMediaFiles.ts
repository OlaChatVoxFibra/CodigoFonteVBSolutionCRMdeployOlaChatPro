/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import fs from "fs";
import path from "path";
import { Part } from "@google/generative-ai";

const PUBLIC_ROOT = path.resolve(__dirname, "..", "..", "..", "..", "public");

export function companyPublicDir(companyId: number): string {
  return path.join(PUBLIC_ROOT, `company${companyId}`);
}

export function resolveRelativeMediaPath(
  companyId: number,
  mediaUrl: string | null | undefined
): string | null {
  const raw = String(mediaUrl || "").trim();
  if (!raw) return null;
  let rel = raw;
  if (rel.includes("/public/company")) {
    rel = rel.split("/public/company")[1] || rel;
    rel = rel.replace(/^[^/]+\//, "");
  }
  rel = rel.replace(/^\/+/, "");
  if (rel.startsWith(`company${companyId}/`)) {
    rel = rel.slice(`company${companyId}/`.length);
  }
  const full = path.join(companyPublicDir(companyId), rel);
  return fs.existsSync(full) ? full : null;
}

export function readFileAsInlinePart(
  filePath: string,
  mimeType?: string
): Part | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const buf = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const mime =
      mimeType ||
      (ext === ".png"
        ? "image/png"
        : ext === ".webp"
          ? "image/webp"
          : ext === ".gif"
            ? "image/gif"
            : ext === ".pdf"
              ? "application/pdf"
              : ext === ".mp4"
                ? "video/mp4"
                : ext === ".mp3" || ext === ".ogg"
                  ? "audio/mpeg"
                  : "image/jpeg");
    return {
      inlineData: {
        mimeType: mime,
        data: buf.toString("base64")
      }
    };
  } catch {
    return null;
  }
}

export type BrainAttachmentInput = {
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
};

/** Anexos do Brain (multer em public/company{id}/). */
export function brainAttachmentsToParts(
  companyId: number,
  attachments?: BrainAttachmentInput[]
): Part[] {
  if (!attachments?.length) return [];
  const parts: Part[] = [];
  const dir = companyPublicDir(companyId);
  for (const att of attachments) {
    const name = String(att.filename || "").trim();
    if (!name) continue;
    const full = path.join(dir, name);
    const part = readFileAsInlinePart(full, att.mimetype);
    if (part) parts.push(part);
  }
  return parts;
}

export function saveGeminiImageBase64(params: {
  companyId: number;
  subfolder: string;
  base64: string;
  mimeType?: string;
  prefix?: string;
}): { relativePath: string; absolutePath: string } {
  const ext =
    (params.mimeType || "image/png").includes("jpeg") ||
    (params.mimeType || "").includes("jpg")
      ? ".jpg"
      : (params.mimeType || "").includes("webp")
        ? ".webp"
        : ".png";
  const dir = path.join(companyPublicDir(params.companyId), params.subfolder);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    fs.chmodSync(dir, 0o777);
  }
  const fileName = `${params.prefix || "gemini"}_${Date.now()}${ext}`;
  const absolutePath = path.join(dir, fileName);
  const buf = Buffer.from(params.base64, "base64");
  fs.writeFileSync(absolutePath, buf);
  const relativePath = `${params.subfolder}/${fileName}`.replace(/\\/g, "/");
  return { relativePath, absolutePath };
}

export function buildPublicMediaUrl(companyId: number, relativePath: string): string {
  const base = process.env.BACKEND_URL || "";
  const port = process.env.PROXY_PORT ? `:${process.env.PROXY_PORT}` : "";
  return `${base}${port}/public/company${companyId}/${relativePath.replace(/^\/+/, "")}`;
}
