/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import fs from "fs";
import path from "path";
import { companyPublicDir } from "../../providers/gemini/utils/geminiMediaFiles";

export type BrainAttachmentInput = {
  originalName: string;
  filename: string;
  mimetype: string;
  size: number;
};

const MAX_CHARS_PER_FILE = 24000;
const TEXT_MIMES = /^text\//;
const TEXT_EXTS = new Set([
  ".txt",
  ".md",
  ".csv",
  ".json",
  ".xml",
  ".html",
  ".htm",
  ".log",
  ".rtf"
]);

function resolveAttachmentPath(companyId: number, att: BrainAttachmentInput): string | null {
  const dir = companyPublicDir(companyId);
  const candidates = [
    path.join(dir, String(att.filename || "").trim()),
    path.join(dir, String(att.originalName || "").trim().replace(/\//g, "-").replace(/ /g, "_"))
  ];
  for (const full of candidates) {
    if (full && fs.existsSync(full)) return full;
  }
  return null;
}

function isTextAttachment(att: BrainAttachmentInput): boolean {
  const mime = String(att.mimetype || "").toLowerCase();
  const ext = path.extname(att.originalName || att.filename || "").toLowerCase();
  return TEXT_MIMES.test(mime) || TEXT_EXTS.has(ext) || mime === "application/json";
}

export function enrichBrainMessageWithAttachments(
  message: string,
  companyId: number,
  attachments?: BrainAttachmentInput[]
): string {
  if (!attachments?.length) return message;

  const fileList = attachments
    .map(
      (a) =>
        `- ${a.originalName} (${a.mimetype}, ${Math.round(a.size / 1024)}KB)`
    )
    .join("\n");

  const chunks: string[] = [
    message,
    `\n\n[Arquivos anexados pelo usuário na mensagem — o conteúdo já está incluído abaixo. NÃO use read_google_drive_file nem list_google_drive_files para estes arquivos; leia o texto anexado diretamente.]\n${fileList}`
  ];

  for (const att of attachments) {
    if (!isTextAttachment(att)) continue;
    const full = resolveAttachmentPath(companyId, att);
    if (!full) continue;
    try {
      let content = fs.readFileSync(full, "utf8");
      if (!content.trim()) continue;
      if (content.length > MAX_CHARS_PER_FILE) {
        content = `${content.slice(0, MAX_CHARS_PER_FILE)}\n\n[… conteúdo truncado em ${MAX_CHARS_PER_FILE} caracteres]`;
      }
      chunks.push(
        `\n\n---\n[Conteúdo do arquivo anexado: ${att.originalName}]\n${content}\n---`
      );
    } catch {
      /* skip unreadable */
    }
  }

  return chunks.join("");
}
