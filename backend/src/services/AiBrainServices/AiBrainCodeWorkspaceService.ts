/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AiBrainCodeWorkspace from "../../models/AiBrainCodeWorkspace";
import AiBrainProject from "../../models/AiBrainProject";
import { defaultCodeFiles } from "./brainCodeDefaults";

async function assertBrainProject(
  brainProjectId: number,
  companyId: number,
  userId: number
): Promise<AiBrainProject> {
  const project = await AiBrainProject.findOne({
    where: { id: brainProjectId, companyId, userId }
  });
  if (!project) throw new Error("Projeto não encontrado.");
  return project;
}

export function codeWorkspacePayload(ws: AiBrainCodeWorkspace) {
  const files =
    ws.codeFiles && typeof ws.codeFiles === "object" ? ws.codeFiles : defaultCodeFiles();
  return {
    id: ws.id,
    brainProjectId: ws.brainProjectId,
    title: ws.title,
    activePath: ws.activePath || "index.html",
    files,
    sortOrder: ws.sortOrder,
    createdAt: ws.createdAt,
    updatedAt: ws.updatedAt
  };
}

export async function ensureDefaultCodeWorkspace(
  brainProjectId: number,
  companyId: number,
  userId: number
): Promise<AiBrainCodeWorkspace> {
  await assertBrainProject(brainProjectId, companyId, userId);
  let ws = await AiBrainCodeWorkspace.findOne({
    where: { brainProjectId, companyId, userId },
    order: [["sortOrder", "ASC"], ["id", "ASC"]]
  });
  if (ws) return ws;

  const project = await AiBrainProject.findOne({
    where: { id: brainProjectId, companyId, userId }
  });
  const legacyFiles =
    project?.codeFiles && typeof project.codeFiles === "object"
      ? project.codeFiles
      : defaultCodeFiles();

  ws = await AiBrainCodeWorkspace.create({
    brainProjectId,
    title: "Projeto principal",
    codeFiles: legacyFiles,
    activePath: project?.activePath || "index.html",
    sortOrder: 0,
    companyId,
    userId
  } as any);

  return ws;
}

export async function listCodeWorkspaces(
  brainProjectId: number,
  companyId: number,
  userId: number
) {
  await ensureDefaultCodeWorkspace(brainProjectId, companyId, userId);
  const rows = await AiBrainCodeWorkspace.findAll({
    where: { brainProjectId, companyId, userId },
    order: [
      ["sortOrder", "ASC"],
      ["id", "ASC"]
    ]
  });
  return rows.map(codeWorkspacePayload);
}

export async function getCodeWorkspace(
  workspaceId: number,
  brainProjectId: number,
  companyId: number,
  userId: number
) {
  const ws = await AiBrainCodeWorkspace.findOne({
    where: { id: workspaceId, brainProjectId, companyId, userId }
  });
  if (!ws) throw new Error("Workspace IDE não encontrado.");
  return ws;
}

export async function createCodeWorkspace(
  brainProjectId: number,
  companyId: number,
  userId: number,
  params: { title?: string }
) {
  await assertBrainProject(brainProjectId, companyId, userId);
  const count = await AiBrainCodeWorkspace.count({
    where: { brainProjectId, companyId, userId }
  });
  const title = String(params.title || "").trim() || `Projeto ${count + 1}`;

  const ws = await AiBrainCodeWorkspace.create({
    brainProjectId,
    title,
    codeFiles: defaultCodeFiles(),
    activePath: "index.html",
    sortOrder: count,
    companyId,
    userId
  } as any);

  return ws;
}

export async function saveCodeWorkspace(
  workspaceId: number,
  brainProjectId: number,
  companyId: number,
  userId: number,
  payload: { files: Record<string, string>; activePath?: string; title?: string }
) {
  const ws = await getCodeWorkspace(workspaceId, brainProjectId, companyId, userId);
  ws.codeFiles = payload.files || ws.codeFiles || defaultCodeFiles();
  if (payload.activePath) ws.activePath = payload.activePath;
  if (payload.title) ws.title = String(payload.title).trim() || ws.title;
  await ws.save();
  return ws;
}

export async function deleteCodeWorkspace(
  workspaceId: number,
  brainProjectId: number,
  companyId: number,
  userId: number
) {
  const rows = await AiBrainCodeWorkspace.findAll({
    where: { brainProjectId, companyId, userId },
    attributes: ["id"]
  });
  if (rows.length <= 1) {
    throw new Error("Não é possível excluir o único projeto IDE deste projeto Brain.");
  }
  const ws = await getCodeWorkspace(workspaceId, brainProjectId, companyId, userId);
  await ws.destroy();
  return { success: true };
}

export async function deleteCodeWorkspacesForBrainProject(brainProjectId: number) {
  await AiBrainCodeWorkspace.destroy({ where: { brainProjectId } });
}
