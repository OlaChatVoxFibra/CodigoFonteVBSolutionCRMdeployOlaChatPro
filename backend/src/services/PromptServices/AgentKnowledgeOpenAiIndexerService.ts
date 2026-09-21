/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
import fsp from "fs/promises";
import path from "path";
import Prompt from "../../models/Prompt";
import PromptKnowledgeSource from "../../models/PromptKnowledgeSource";
import logger from "../../utils/logger";

const OPENAI_V1 = "https://api.openai.com/v1";

function indexingEnabled(): boolean {
  const raw = String(process.env.AGENT_OPENAI_KNOWLEDGE_INDEXING || "").trim().toLowerCase();
  if (!raw) return true;
  return !["0", "false", "off", "no"].includes(raw);
}

function openAiHeaders(apiKey: string, includeJsonContentType = true): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "OpenAI-Beta": "assistants=v2"
  };
  if (includeJsonContentType) h["Content-Type"] = "application/json";
  return h;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function openaiDeleteVectorStore(apiKey: string, vectorStoreId: string): Promise<void> {
  if (!vectorStoreId || !String(vectorStoreId).startsWith("vs_")) return;
  try {
    await axios.delete(`${OPENAI_V1}/vector_stores/${encodeURIComponent(vectorStoreId)}`, {
      headers: openAiHeaders(apiKey, false),
      timeout: 60000
    });
  } catch {
    /* best-effort */
  }
}

async function openaiUploadFile(apiKey: string, buffer: Buffer, filename: string): Promise<string> {
  const form = new FormData();
  form.append("file", buffer, { filename: filename || "knowledge.txt" });
  form.append("purpose", "assistants");
  const { data } = await axios.post(`${OPENAI_V1}/files`, form, {
    headers: { Authorization: `Bearer ${apiKey}`, ...form.getHeaders() },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 180000
  });
  const id = String(data?.id || "").trim();
  if (!id) throw new Error("openai_file_upload_no_id");
  return id;
}

async function openaiCreateVectorStoreEmpty(apiKey: string, name: string): Promise<string> {
  const { data } = await axios.post(
    `${OPENAI_V1}/vector_stores`,
    { name: name.slice(0, 120) },
    { headers: openAiHeaders(apiKey), timeout: 120000 }
  );
  const id = String(data?.id || "").trim();
  if (!id) throw new Error("openai_vector_store_no_id");
  return id;
}

async function openaiAttachFileToVectorStore(apiKey: string, vectorStoreId: string, fileId: string): Promise<void> {
  await axios.post(
    `${OPENAI_V1}/vector_stores/${encodeURIComponent(vectorStoreId)}/files`,
    { file_id: fileId },
    { headers: openAiHeaders(apiKey), timeout: 120000 }
  );
}

async function openaiWaitVectorStoreFileReady(
  apiKey: string,
  vectorStoreId: string,
  fileId: string,
  maxWaitMs: number
): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const { data } = await axios.get(
      `${OPENAI_V1}/vector_stores/${encodeURIComponent(vectorStoreId)}/files/${encodeURIComponent(fileId)}`,
      { headers: openAiHeaders(apiKey, false), timeout: 60000 }
    );
    const st = String(data?.status || "").toLowerCase();
    if (st === "completed") return;
    if (st === "failed" || st === "cancelled") {
      const err = data?.last_error?.message || data?.last_error || st;
      throw new Error(String(err || "vector_store_file_failed"));
    }
    await sleep(1200);
  }
  throw new Error("openai_vector_store_index_timeout");
}

function fingerprintForRow(row: PromptKnowledgeSource): string {
  const parts = [
    String(row.sourceType || ""),
    String(row.title || ""),
    String(row.content || ""),
    String(row.fileUrl || "")
  ];
  return crypto.createHash("md5").update(parts.join("\u0001")).digest("hex");
}

async function resolveBufferForRow(row: PromptKnowledgeSource): Promise<{ buffer: Buffer; filename: string } | null> {
  const content = String(row.content || "").trim();
  const fileUrl = String(row.fileUrl || "").trim();

  if (row.sourceType === "website") {
    return null;
  }

  if (fileUrl && /^https?:\/\//i.test(fileUrl)) {
    const { data } = await axios.get<ArrayBuffer>(fileUrl, {
      responseType: "arraybuffer",
      timeout: 120000,
      maxContentLength: 25 * 1024 * 1024
    });
    const buf = Buffer.from(data);
    try {
      const u = new URL(fileUrl);
      const base = path.basename(u.pathname) || "source.bin";
      return { buffer: buf, filename: base.slice(0, 180) };
    } catch {
      return { buffer: buf, filename: "source.bin" };
    }
  }

  if (content) {
    return { buffer: Buffer.from(content, "utf8"), filename: `knowledge-${row.id}.txt` };
  }

  if (fileUrl) {
    const localPath = path.isAbsolute(fileUrl) ? fileUrl : path.join(process.cwd(), "public", fileUrl.replace(/^\//, ""));
    try {
      const buf = await fsp.readFile(localPath);
      return { buffer: buf, filename: path.basename(localPath).slice(0, 180) || `knowledge-${row.id}.bin` };
    } catch {
      return null;
    }
  }

  return null;
}

export async function indexPromptKnowledgeSourceRow(row: PromptKnowledgeSource, apiKey: string): Promise<void> {
  const key = String(apiKey || "").trim();
  if (!key) {
    await row.update({ indexStatus: "failed", indexError: "missing_openai_api_key", indexedAt: null });
    return;
  }

  if (row.sourceType === "website") {
    await row.update({
      indexStatus: "skipped",
      indexError: "website_sources_require_manual_file_upload",
      indexedAt: new Date()
    });
    return;
  }

  const resolved = await resolveBufferForRow(row);
  if (!resolved || !resolved.buffer.length) {
    await row.update({
      indexStatus: "failed",
      indexError: "empty_knowledge_payload",
      indexedAt: new Date()
    });
    return;
  }

  const fp = fingerprintForRow(row);
  const meta = { ...(typeof row.metadata === "object" && row.metadata ? (row.metadata as object) : {}) } as Record<
    string,
    unknown
  >;
  if (
    String(row.indexStatus || "").toLowerCase() === "ready" &&
    meta.openAiIndexFingerprint === fp &&
    row.openAiVectorStoreId
  ) {
    return;
  }

  await row.update({
    indexStatus: "indexing",
    indexError: null,
    indexedAt: null
  });

  let fileId = "";
  let vectorStoreId = "";
  try {
    if (row.openAiVectorStoreId) {
      await openaiDeleteVectorStore(key, String(row.openAiVectorStoreId));
    }
    fileId = await openaiUploadFile(key, resolved.buffer, resolved.filename);
    vectorStoreId = await openaiCreateVectorStoreEmpty(key, `prompt-${row.promptId}-kn-${row.id}`);
    await openaiAttachFileToVectorStore(key, vectorStoreId, fileId);
    await openaiWaitVectorStoreFileReady(key, vectorStoreId, fileId, 180000);
    meta.openAiIndexFingerprint = fp;
    await row.update({
      openAiFileId: fileId,
      openAiVectorStoreId: vectorStoreId,
      indexStatus: "ready",
      indexError: null,
      indexedAt: new Date(),
      metadata: meta as any
    });
  } catch (error: any) {
    const msg = String(error?.response?.data?.error?.message || error?.message || error).slice(0, 900);
    logger.warn(`[KN-OPENAI] index falhou source=${row.id} prompt=${row.promptId}: ${msg}`);
    await row.update({
      indexStatus: "failed",
      indexError: msg,
      indexedAt: new Date(),
      openAiFileId: fileId || null,
      openAiVectorStoreId: vectorStoreId || null,
      metadata: meta as any
    });
  }
}

export async function indexAllPromptKnowledgeSourcesForOpenAi(params: {
  promptId: number;
  companyId: number;
}): Promise<void> {
  if (!indexingEnabled()) return;

  const prompt = await Prompt.findOne({
    where: { id: params.promptId, companyId: params.companyId }
  });
  if (!prompt) return;
  const apiKey = String((prompt as any).apiKey || "").trim();
  if (!apiKey) {
    logger.warn(`[KN-OPENAI] sem apiKey no prompt=${params.promptId}; indexação ignorada`);
    return;
  }

  const rows = await PromptKnowledgeSource.findAll({
    where: { promptId: params.promptId, companyId: params.companyId },
    order: [["id", "ASC"]]
  });

  for (const row of rows) {
    await indexPromptKnowledgeSourceRow(row, apiKey);
  }
}

export function schedulePromptKnowledgeOpenAiIndexing(params: { promptId: number; companyId: number }): void {
  setImmediate(() => {
    void indexAllPromptKnowledgeSourcesForOpenAi(params).catch((e: any) => {
      logger.warn(
        `[KN-OPENAI] job assíncrono falhou prompt=${params.promptId} company=${params.companyId}: ${
          e?.message || e
        }`
      );
    });
  });
}
