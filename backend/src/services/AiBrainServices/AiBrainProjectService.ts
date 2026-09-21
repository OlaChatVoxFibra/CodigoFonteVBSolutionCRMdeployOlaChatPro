/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AiBrainProject from "../../models/AiBrainProject";
import AiBrainConversation from "../../models/AiBrainConversation";
import AiBrainMessage from "../../models/AiBrainMessage";
import AiBrainCodeWorkspace from "../../models/AiBrainCodeWorkspace";
import { defaultCodeFiles } from "./brainCodeDefaults";
import {
  codeWorkspacePayload,
  ensureDefaultCodeWorkspace
} from "./AiBrainCodeWorkspaceService";

const ACCENT_PALETTE = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#6366f1"];

export { defaultCodeFiles };

export async function listBrainProjects(companyId: number, userId: number) {
  await repairOrphanBrainConversations(companyId, userId);

  const projects = await AiBrainProject.findAll({
    where: { companyId, userId },
    order: [["updatedAt", "DESC"]]
  });

  const withCounts = await Promise.all(
    projects.map(async p => ({
      id: p.id,
      title: p.title,
      description: p.description,
      accentColor: p.accentColor,
      activePath: p.activePath,
      conversationCount: await AiBrainConversation.count({
        where: { companyId, userId, projectId: p.id }
      }),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }))
  );

  return withCounts;
}

export async function getBrainProject(projectId: number, companyId: number, userId: number) {
  const project = await AiBrainProject.findOne({
    where: { id: projectId, companyId, userId }
  });
  if (!project) throw new Error("Projeto não encontrado.");
  return project;
}

export async function createBrainProject(params: {
  companyId: number;
  userId: number;
  title: string;
  description?: string;
  accentColor?: string;
}) {
  const title = String(params.title || "").trim() || "Novo projeto";
  const existing = await AiBrainProject.count({ where: { companyId: params.companyId, userId: params.userId } });
  const accentColor =
    params.accentColor || ACCENT_PALETTE[existing % ACCENT_PALETTE.length];

  const project = await AiBrainProject.create({
    title,
    description: params.description || "",
    accentColor,
    codeFiles: defaultCodeFiles(),
    activePath: "index.html",
    companyId: params.companyId,
    userId: params.userId
  } as any);

  await AiBrainCodeWorkspace.create({
    brainProjectId: project.id,
    title: "Projeto principal",
    codeFiles: defaultCodeFiles(),
    activePath: "index.html",
    sortOrder: 0,
    companyId: params.companyId,
    userId: params.userId
  } as any);

  return project;
}

export async function updateBrainProject(
  projectId: number,
  companyId: number,
  userId: number,
  data: { title?: string; description?: string; accentColor?: string }
) {
  const project = await getBrainProject(projectId, companyId, userId);
  if (data.title !== undefined) project.title = String(data.title).trim() || project.title;
  if (data.description !== undefined) project.description = data.description;
  if (data.accentColor !== undefined) project.accentColor = data.accentColor;
  await project.save();
  return project;
}

export async function saveBrainProjectCode(
  projectId: number,
  companyId: number,
  userId: number,
  payload: { files: Record<string, string>; activePath?: string; title?: string; workspaceId?: number }
) {
  const project = await getBrainProject(projectId, companyId, userId);
  let ws: AiBrainCodeWorkspace;
  if (payload.workspaceId) {
    ws = await AiBrainCodeWorkspace.findOne({
      where: { id: payload.workspaceId, brainProjectId: projectId, companyId, userId }
    });
    if (!ws) throw new Error("Workspace IDE não encontrado.");
  } else {
    ws = await ensureDefaultCodeWorkspace(projectId, companyId, userId);
  }
  ws.codeFiles = payload.files || ws.codeFiles || defaultCodeFiles();
  if (payload.activePath) ws.activePath = payload.activePath;
  if (payload.title) ws.title = String(payload.title).trim() || ws.title;
  await ws.save();

  project.codeFiles = ws.codeFiles;
  if (payload.activePath) project.activePath = payload.activePath;
  await project.save();

  return project;
}

export async function deleteBrainProject(projectId: number, companyId: number, userId: number) {
  const project = await getBrainProject(projectId, companyId, userId);
  const convs = await AiBrainConversation.findAll({
    where: { projectId: project.id, companyId, userId },
    attributes: ["id"]
  });
  for (const c of convs) {
    await AiBrainMessage.destroy({ where: { conversationId: c.id } });
  }
  await AiBrainConversation.destroy({ where: { projectId: project.id, companyId, userId } });
  await AiBrainCodeWorkspace.destroy({ where: { brainProjectId: project.id } });
  await project.destroy();
  return { success: true };
}

export async function ensureDefaultBrainProject(companyId: number, userId: number) {
  const existing = await AiBrainProject.findOne({
    where: { companyId, userId },
    order: [["createdAt", "ASC"]]
  });
  if (existing) return existing;
  return createBrainProject({
    companyId,
    userId,
    title: "Meu primeiro projeto",
    description: "Projeto Brain.AI"
  });
}

async function repairOrphanBrainConversations(companyId: number, userId: number) {
  const orphanCount = await AiBrainConversation.count({
    where: { companyId, userId, projectId: null as any }
  });
  if (!orphanCount) return;
  const project = await ensureDefaultBrainProject(companyId, userId);
  await AiBrainConversation.update(
    { projectId: project.id },
    { where: { companyId, userId, projectId: null as any } }
  );
}

export async function projectCodePayload(project: AiBrainProject) {
  const ws = await ensureDefaultCodeWorkspace(project.id, project.companyId, project.userId);
  const payload = codeWorkspacePayload(ws);
  return {
    id: project.id,
    title: project.title,
    description: project.description,
    accentColor: project.accentColor,
    activePath: payload.activePath,
    files: payload.files,
    activeWorkspaceId: ws.id,
    workspace: payload
  };
}
