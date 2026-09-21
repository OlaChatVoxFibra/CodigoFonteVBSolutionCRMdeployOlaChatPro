/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { getIO } from "../../libs/socket";
import { ensureDefaultCodeWorkspace, saveCodeWorkspace } from "./AiBrainCodeWorkspaceService";

export type BrainCodeStreamPayload =
  | {
      type: "file_start";
      path: string;
      brainProjectId: number;
      projectTitle?: string;
    }
  | {
      type: "file_chunk";
      path: string;
      chunk: string;
      brainProjectId: number;
    }
  | {
      type: "file_complete";
      path: string;
      content: string;
      brainProjectId: number;
      workspaceId?: number;
      projectTitle?: string;
    }
  | {
      type: "workspace_saved";
      brainProjectId: number;
      workspaceId: number;
      fileCount: number;
    };

export function emitBrainCodeStream(
  userId: number,
  companyId: number,
  payload: BrainCodeStreamPayload
): void {
  try {
    const io = getIO();
    io.of(String(companyId)).emit(`brain-code-${userId}`, payload);
  } catch {
    /* socket opcional */
  }
}

export async function persistBrainCodeFiles(params: {
  companyId: number;
  userId: number;
  brainProjectId: number;
  files: Array<{ path: string; content: string }>;
  title?: string;
}): Promise<{ workspaceId: number; files: Record<string, string> }> {
  const ws = await ensureDefaultCodeWorkspace(
    params.brainProjectId,
    params.companyId,
    params.userId
  );
  const existing =
    ws.codeFiles && typeof ws.codeFiles === "object"
      ? (ws.codeFiles as Record<string, string>)
      : {};
  const merged = { ...existing };
  for (const f of params.files) {
    if (f.path) merged[f.path] = f.content;
  }
  const activePath =
    merged["index.html"] !== undefined
      ? "index.html"
      : params.files[0]?.path || ws.activePath || "index.html";
  await saveCodeWorkspace(ws.id, params.brainProjectId, params.companyId, params.userId, {
    files: merged,
    activePath,
    title: params.title?.trim() || ws.title
  });
  return { workspaceId: ws.id, files: merged };
}

const CHUNK_SIZE = 48;
const CHUNK_DELAY_MS = 14;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function streamAndPersistCodeFiles(params: {
  companyId: number;
  userId: number;
  brainProjectId: number;
  files: Array<{ path: string; content: string }>;
  title?: string;
}): Promise<{ workspaceId: number }> {
  for (const file of params.files) {
    emitBrainCodeStream(params.userId, params.companyId, {
      type: "file_start",
      path: file.path,
      brainProjectId: params.brainProjectId,
      projectTitle: params.title
    });
    if (CHUNK_DELAY_MS > 0) await sleep(CHUNK_DELAY_MS * 2);

    for (let i = 0; i < file.content.length; i += CHUNK_SIZE) {
      emitBrainCodeStream(params.userId, params.companyId, {
        type: "file_chunk",
        path: file.path,
        chunk: file.content.slice(i, i + CHUNK_SIZE),
        brainProjectId: params.brainProjectId
      });
      if (CHUNK_DELAY_MS > 0) await sleep(CHUNK_DELAY_MS);
    }

    emitBrainCodeStream(params.userId, params.companyId, {
      type: "file_complete",
      path: file.path,
      content: file.content,
      brainProjectId: params.brainProjectId,
      projectTitle: params.title
    });
  }

  const saved = await persistBrainCodeFiles(params);
  emitBrainCodeStream(params.userId, params.companyId, {
    type: "workspace_saved",
    brainProjectId: params.brainProjectId,
    workspaceId: saved.workspaceId,
    fileCount: params.files.length
  });
  return { workspaceId: saved.workspaceId };
}
