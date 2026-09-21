/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import fs from "fs";
import {
  aiBrainChat,
  listConversations,
  getConversation,
  deleteConversation,
  renameConversation
} from "../services/AiBrainServices/AiBrainChatService";
import { transcribeBrainAudio } from "../services/AiBrainServices/TranscribeBrainAudioService";
import { synthesizeBrainSpeech } from "../services/AiBrainServices/SynthesizeBrainSpeechService";
import { syncBrainCodeWorkspace } from "../services/AiBrainServices/brainCodeWorkspaceService";
import {
  execBrainCodeTerminal,
  type BrainTerminalShell
} from "../services/AiBrainServices/brainCodeTerminalService";
import { publishBrainProjectToGithub } from "../services/AiBrainServices/brainGithubPublishService";
import {
  createBrainProject,
  deleteBrainProject,
  ensureDefaultBrainProject,
  getBrainProject,
  listBrainProjects,
  projectCodePayload,
  saveBrainProjectCode,
  updateBrainProject
} from "../services/AiBrainServices/AiBrainProjectService";
import {
  codeWorkspacePayload,
  createCodeWorkspace,
  deleteCodeWorkspace,
  getCodeWorkspace,
  listCodeWorkspaces,
  saveCodeWorkspace
} from "../services/AiBrainServices/AiBrainCodeWorkspaceService";
import AppError from "../errors/AppError";
import { BrainCreditsInsufficientError } from "../services/AiBrainServices/BrainCreditService";
import {
  brainDownloadGoogleDriveFileForAttach,
  brainLearnFromUrl,
  brainListGoogleDriveFiles
} from "../services/AiBrainServices/brainComposerContextService";

function parseProjectId(raw: unknown): number | undefined {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function rethrowBrainIdeError(err: unknown): never {
  if (err instanceof AppError) throw err;
  const message =
    err instanceof Error ? err.message : "Erro no IDE Build. Reinicie o backend após as migrações.";
  throw new AppError(message, 400);
}

export const chat = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const userId = Number(req.user.id);
  const { message, conversationId, model, language, voiceMode, mcpConnections, projectId, personalization } =
    req.body;

  let parsedMcpConnections: string[] = [];
  if (Array.isArray(mcpConnections)) {
    parsedMcpConnections = mcpConnections.map((id) => String(id || "").trim()).filter(Boolean);
  } else if (typeof mcpConnections === "string" && mcpConnections.trim()) {
    try {
      const json = JSON.parse(mcpConnections);
      if (Array.isArray(json)) {
        parsedMcpConnections = json.map((id) => String(id || "").trim()).filter(Boolean);
      }
    } catch {
      parsedMcpConnections = mcpConnections
        .split(",")
        .map((id: string) => id.trim())
        .filter(Boolean);
    }
  }

  if (!message || !String(message).trim()) {
    throw new AppError("ERR_AI_BRAIN_EMPTY_MESSAGE", 400);
  }

  const files = req.files as Express.Multer.File[] | undefined;
  const attachments = files?.map(f => ({
    originalName: f.originalname,
    filename: f.filename,
    mimetype: f.mimetype,
    size: f.size
  })) || [];

  try {
    const result = await aiBrainChat({
      companyId,
      userId,
      conversationId: conversationId || undefined,
      message: String(message).trim(),
      model: model || undefined,
      attachments,
      language: language || "pt-BR",
      voiceMode: voiceMode === true || voiceMode === "1" || voiceMode === "true",
      mcpConnections: parsedMcpConnections,
      projectId: parseProjectId(projectId),
      personalization
    });

    return res.json(result);
  } catch (err: any) {
    if (err instanceof BrainCreditsInsufficientError) {
      return res.status(402).json({
        error: err.message,
        code: err.code,
        balance: err.balance,
        required: err.required
      });
    }
    const msg = err?.message || "Erro interno ao processar mensagem.";
    return res.status(400).json({ error: msg });
  }
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const userId = Number(req.user.id);
  const projectId = parseProjectId(req.query.projectId);
  const conversations = await listConversations(companyId, userId, projectId);
  return res.json(conversations);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const userId = Number(req.user.id);
  const { id } = req.params;
  const conversation = await getConversation(Number(id), companyId, userId);
  return res.json(conversation);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const userId = Number(req.user.id);
  const { id } = req.params;
  await deleteConversation(Number(id), companyId, userId);
  return res.json({ message: "Conversa removida." });
};

export const rename = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const userId = Number(req.user.id);
  const { id } = req.params;
  const { title } = req.body;

  if (!title || !String(title).trim()) {
    throw new AppError("ERR_AI_BRAIN_EMPTY_TITLE", 400);
  }

  const conversation = await renameConversation(Number(id), companyId, userId, String(title).trim());
  return res.json(conversation);
};

export const synthesizeSpeech = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { text, gender } = req.body;

  if (!text || !String(text).trim()) {
    throw new AppError("ERR_AI_BRAIN_EMPTY_SPEECH_TEXT", 400);
  }

  try {
    const audio = await synthesizeBrainSpeech(
      companyId,
      Number(req.user.id),
      String(text),
      gender
    );
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    return res.send(audio);
  } catch (err: unknown) {
    const message =
      err instanceof AppError
        ? err.message
        : (err as { message?: string })?.message || "Erro ao gerar áudio.";
    return res.status(400).json({ error: message });
  }
};

export const transcribeAudio = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const file = req.file;

  if (!file?.path) {
    throw new AppError("ERR_AI_BRAIN_NO_AUDIO", 400);
  }

  try {
    const text = await transcribeBrainAudio(
      companyId,
      Number(req.user.id),
      file.path,
      req.body?.language
    );
    return res.json({ text });
  } finally {
    fs.unlink(file.path, () => {});
  }
};

export const codeTerminalInfo = async (_req: Request, res: Response): Promise<Response> => {
  const localBridgeUrl =
    process.env.BRAIN_LOCAL_TERMINAL_URL || "http://127.0.0.1:9333";
  return res.json({
    mode: "local-only",
    localBridgeUrl,
    remoteEnabled: false,
    message:
      "O terminal roda na sua máquina. Execute npm run brain:terminal no PC e deixe aberto."
  });
};

export const codeWorkspaceSync = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const userId = Number(req.user.id);
  const { files, projectId } = req.body;

  if (!files || typeof files !== "object") {
    throw new AppError("ERR_AI_BRAIN_CODE_FILES", 400);
  }

  const pid = parseProjectId(projectId);
  const result = await syncBrainCodeWorkspace(
    companyId,
    userId,
    files as Record<string, string>,
    pid
  );
  return res.json({ success: true, ...result });
};

export const codeTerminalExec = async (_req: Request, res: Response): Promise<Response> => {
  const allowRemote = String(process.env.BRAIN_ALLOW_REMOTE_TERMINAL || "").toLowerCase() === "true";
  if (!allowRemote) {
    return res.status(403).json({
      success: false,
      error:
        "Terminal remoto desabilitado no servidor. Use o terminal local: npm run brain:terminal no seu PC.",
      remoteDisabled: true,
      localBridgeUrl: process.env.BRAIN_LOCAL_TERMINAL_URL || "http://127.0.0.1:9333"
    });
  }

  const { companyId } = _req.user;
  const userId = Number(_req.user.id);
  const { command, shell, files, projectId } = _req.body;

  if (!command || !String(command).trim()) {
    throw new AppError("ERR_AI_BRAIN_EMPTY_COMMAND", 400);
  }

  const allowed: BrainTerminalShell[] = ["powershell", "cmd", "bash"];
  const shellType = allowed.includes(shell) ? shell : undefined;

  const result = await execBrainCodeTerminal({
    companyId,
    userId,
    command: String(command).trim(),
    shell: shellType,
    files: files && typeof files === "object" ? (files as Record<string, string>) : undefined,
    projectId: parseProjectId(projectId)
  });

  return res.json(result);
};

export const codeGithubPublish = async (req: Request, res: Response): Promise<Response> => {
  const { token, repoName, repoFullName, mode, files, description, isPrivate } = req.body;
  const { companyId, id: userId } = req.user;

  if (!files || typeof files !== "object") {
    throw new AppError("ERR_AI_BRAIN_CODE_FILES", 400);
  }

  const result = await publishBrainProjectToGithub({
    token: token ? String(token) : undefined,
    companyId,
    userId: Number(userId),
    mode: mode === "existing" ? "existing" : "new",
    repoName: repoName ? String(repoName) : undefined,
    repoFullName: repoFullName ? String(repoFullName) : undefined,
    files: files as Record<string, string>,
    description: description ? String(description) : undefined,
    isPrivate: isPrivate !== false
  });

  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error });
  }

  return res.json({ success: true, ...result });
};

export const listProjects = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const userId = Number(req.user.id);
  const projects = await listBrainProjects(companyId, userId);
  return res.json(projects);
};

export const ensureProject = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { companyId } = req.user;
    const userId = Number(req.user.id);
    const project = await ensureDefaultBrainProject(companyId, userId);
    return res.json(await projectCodePayload(project));
  } catch (err) {
    rethrowBrainIdeError(err);
  }
};

export const createProject = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const userId = Number(req.user.id);
  const { title, description, accentColor } = req.body;
  if (!title || !String(title).trim()) {
    throw new AppError("ERR_AI_BRAIN_EMPTY_PROJECT_TITLE", 400);
  }
  const project = await createBrainProject({
    companyId,
    userId,
    title: String(title),
    description: description ? String(description) : undefined,
    accentColor: accentColor ? String(accentColor) : undefined
  });
  return res.status(201).json(await projectCodePayload(project));
};

export const showProject = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { companyId } = req.user;
    const userId = Number(req.user.id);
    const projectId = parseProjectId(req.params.id);
    if (!projectId) throw new AppError("Projeto Brain inválido.", 400);
    const project = await getBrainProject(projectId, companyId, userId);
    return res.json(await projectCodePayload(project));
  } catch (err) {
    rethrowBrainIdeError(err);
  }
};

export const updateProjectMeta = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const userId = Number(req.user.id);
  const project = await updateBrainProject(Number(req.params.id), companyId, userId, req.body || {});
  return res.json({
    id: project.id,
    title: project.title,
    description: project.description,
    accentColor: project.accentColor
  });
};

export const saveProjectCode = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const userId = Number(req.user.id);
  const { files, activePath, title, workspaceId } = req.body;
  if (!files || typeof files !== "object") {
    throw new AppError("ERR_AI_BRAIN_CODE_FILES", 400);
  }
  const projectId = Number(req.params.id);
  const wsId = parseProjectId(workspaceId);
  if (wsId) {
    const ws = await saveCodeWorkspace(wsId, projectId, companyId, userId, {
      files,
      activePath,
      title
    });
    return res.json(codeWorkspacePayload(ws));
  }
  const project = await saveBrainProjectCode(projectId, companyId, userId, {
    files,
    activePath,
    title,
    workspaceId: wsId
  });
  return res.json(await projectCodePayload(project));
};

export const listProjectCodeWorkspaces = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { companyId } = req.user;
    const userId = Number(req.user.id);
    const projectId = parseProjectId(req.params.id);
    if (!projectId) throw new AppError("Projeto Brain inválido.", 400);
    const items = await listCodeWorkspaces(projectId, companyId, userId);
    return res.json({ items });
  } catch (err) {
    rethrowBrainIdeError(err);
  }
};

export const createProjectCodeWorkspace = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { companyId } = req.user;
    const userId = Number(req.user.id);
    const projectId = parseProjectId(req.params.id);
    if (!projectId) throw new AppError("Projeto Brain inválido.", 400);
    const ws = await createCodeWorkspace(projectId, companyId, userId, {
      title: req.body?.title
    });
    return res.status(201).json(codeWorkspacePayload(ws));
  } catch (err) {
    rethrowBrainIdeError(err);
  }
};

export const showProjectCodeWorkspace = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { companyId } = req.user;
    const userId = Number(req.user.id);
    const projectId = parseProjectId(req.params.id);
    const workspaceId = parseProjectId(req.params.workspaceId);
    if (!projectId || !workspaceId) throw new AppError("Projeto IDE inválido.", 400);
    const ws = await getCodeWorkspace(workspaceId, projectId, companyId, userId);
    return res.json(codeWorkspacePayload(ws));
  } catch (err) {
    rethrowBrainIdeError(err);
  }
};

export const saveProjectCodeWorkspace = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { companyId } = req.user;
    const userId = Number(req.user.id);
    const { files, activePath, title } = req.body;
    if (!files || typeof files !== "object") {
      throw new AppError("ERR_AI_BRAIN_CODE_FILES", 400);
    }
    const projectId = parseProjectId(req.params.id);
    const workspaceId = parseProjectId(req.params.workspaceId);
    if (!projectId || !workspaceId) throw new AppError("Projeto IDE inválido.", 400);
    const ws = await saveCodeWorkspace(workspaceId, projectId, companyId, userId, {
      files,
      activePath,
      title
    });
    return res.json(codeWorkspacePayload(ws));
  } catch (err) {
    rethrowBrainIdeError(err);
  }
};

export const removeProjectCodeWorkspace = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { companyId } = req.user;
    const userId = Number(req.user.id);
    const projectId = parseProjectId(req.params.id);
    const workspaceId = parseProjectId(req.params.workspaceId);
    if (!projectId || !workspaceId) throw new AppError("Projeto IDE inválido.", 400);
    await deleteCodeWorkspace(workspaceId, projectId, companyId, userId);
    return res.json({ success: true });
  } catch (err) {
    rethrowBrainIdeError(err);
  }
};

export const removeProject = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const userId = Number(req.user.id);
  await deleteBrainProject(Number(req.params.id), companyId, userId);
  return res.json({ success: true });
};

export const listGoogleDriveFiles = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const query = String(req.query.q || req.query.query || "").trim();
  const maxResults = req.query.maxResults
    ? Number(req.query.maxResults)
    : undefined;
  const result = await brainListGoogleDriveFiles({
    companyId,
    query: query || undefined,
    maxResults
  });
  return res.json(result);
};

export const downloadGoogleDriveFile = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const fileId = String(req.params.fileId || "").trim();
  const result = await brainDownloadGoogleDriveFileForAttach({
    companyId,
    fileId
  });
  if (!result.connected) {
    throw new AppError(
      "Google Drive não conectado. Conecte em Integrações → Google Drive.",
      400
    );
  }
  return res.json(result);
};

export const learnFromUrl = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const url = String(req.body?.url || "").trim();
  const result = await brainLearnFromUrl({ url });
  return res.json(result);
};
