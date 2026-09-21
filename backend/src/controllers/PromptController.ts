/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import CreatePromptService from "../services/PromptServices/CreatePromptService";
import DeletePromptService from "../services/PromptServices/DeletePromptService";
import ListPromptsService from "../services/PromptServices/ListPromptsService";
import ShowPromptService from "../services/PromptServices/ShowPromptService";
import UpdatePromptService from "../services/PromptServices/UpdatePromptService";
import sequelize from "../database";
import { verify } from "jsonwebtoken";
import authConfig from "../config/auth";
import { normalizePromptPayload } from "../helpers/normalizePromptRequestBody";
import { isPromptV2Payload, expandPromptV2ToLegacy } from "../helpers/promptV2Payload";
import { buildPromptV2ApiResponse } from "../helpers/formatPromptV2Response";
import syncPromptV2Relations from "../services/PromptServices/syncPromptV2Relations";
import { schedulePromptKnowledgeOpenAiIndexing } from "../services/PromptServices/AgentKnowledgeOpenAiIndexerService";
import AttendanceFlowDefinition from "../models/AttendanceFlowDefinition";
import Ticket from "../models/Ticket";
import PromptSmartAction from "../models/PromptSmartAction";
import Prompt from "../models/Prompt";
import { normalizeTicketDataWebhook } from "../services/AgentProactiveServices/agentProactiveTicketState";
import { ACTION_PRESET_DEFS } from "../services/PromptServices/ActionPresetDefs";
import logger from "../utils/logger";
import fs from "fs";
import path from "path";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import AppError from "../errors/AppError";
import { composerAssistTransform } from "../services/PromptServices/ComposerAssistOpenAiService";

interface TokenPayload {
  id: string;
  username: string;
  profile: string;
  companyId: number;
  iat: number;
  exp: number;
}

type IndexQuery = {
  searchParam?: string;
  pageNumber?: string | number;
};

const normalizePatternList = (value: unknown): string[] => {
  const source = Array.isArray(value) ? value : [];
  return source
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.findIndex((x) => x.toLowerCase() === item.toLowerCase()) === index);
};

const mergePatternLists = (...lists: unknown[]): string[] =>
  lists
    .flatMap((list) => normalizePatternList(list))
    .filter((item, index, arr) => arr.findIndex((x) => x.toLowerCase() === item.toLowerCase()) === index);

const findActionPresetForRow = (row: Record<string, any>) => {
  const slug = String(row.slug || "").toLowerCase();
  const type = String(row.type || "").toLowerCase();
  const name = String(row.name || "").toLowerCase();
  return (
    ACTION_PRESET_DEFS.find(
      (preset) =>
        preset.slug.toLowerCase() === slug ||
        preset.type.toLowerCase() === type ||
        preset.name.toLowerCase() === name
    ) || null
  );
};

const formatSmartActionRow = (row: Record<string, any>) => {
  const preset = findActionPresetForRow(row);
  const savedAgentPatterns = normalizePatternList(row.agentTriggerPatterns);
  const savedUserPatterns = normalizePatternList(row.userTriggerPatterns);
  const presetAgentPatterns = normalizePatternList(preset?.agentTriggerPatterns || []);
  const presetUserPatterns = normalizePatternList(preset?.userTriggerPatterns || []);
  const hasSavedAgentPatterns = Array.isArray(row.agentTriggerPatterns);
  const hasSavedUserPatterns = Array.isArray(row.userTriggerPatterns);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    description: row.description,
    enabled: row.enabled !== false,
    agentTriggerPatterns: hasSavedAgentPatterns ? savedAgentPatterns : presetAgentPatterns,
    userTriggerPatterns: hasSavedUserPatterns ? savedUserPatterns : presetUserPatterns,
    availableAgentTriggerPatterns: mergePatternLists(presetAgentPatterns, savedAgentPatterns),
    availableUserTriggerPatterns: mergePatternLists(presetUserPatterns, savedUserPatterns),
    intentSlotSchema: Array.isArray(row.intentSlotSchema)
      ? row.intentSlotSchema
      : preset?.intentSlotSchema || [],
    variables: row.variables && typeof row.variables === "object" ? row.variables : {},
    apiUrl: row.apiUrl,
    responseMessage: row.responseMessage,
    autoExecute: !!row.autoExecute
  };
};

function normalizeActionVariables(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const input = value as Record<string, unknown>;
  const out: Record<string, unknown> = { ...input };
  for (const key of ["queueId", "userId", "whatsappId", "inventoryId", "responsibleId"]) {
    if (out[key] === "" || out[key] === null || out[key] === undefined) {
      delete out[key];
      continue;
    }
    const parsed = Number(out[key]);
    if (Number.isFinite(parsed) && parsed > 0) {
      out[key] = parsed;
    } else {
      delete out[key];
    }
  }
  return out;
}

const jsonColumnCast = (
  columns: Record<string, any> | null,
  columnName: string
): "json" | "jsonb" => {
  const type = String(columns?.[columnName]?.type || "").toUpperCase();
  return type.includes("JSONB") ? "jsonb" : "json";
};

async function syncPromptV2RelationsBestEffort(params: {
  promptId: number;
  companyId: number;
  v2: any;
}): Promise<string | null> {
  try {
    await syncPromptV2Relations(params as any);
    return null;
  } catch (e: any) {
    const message = e?.parent?.message || e?.original?.message || e?.message || String(e);
    logger.error("[PROMPT] Agente base salvo, mas relações V2 falharam", {
      promptId: params.promptId,
      companyId: params.companyId,
      message,
      stack: e?.stack
    });
    return message;
  }
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { pageNumber, searchParam } = req.query as IndexQuery;
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;
  const { prompts, count, hasMore } = await ListPromptsService({ searchParam, pageNumber, companyId });

  return res.status(200).json({ prompts, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;
  const raw = { ...(req.body as Record<string, unknown>) };

  if (isPromptV2Payload(raw)) {
    const expanded = normalizePromptPayload(
      expandPromptV2ToLegacy(raw, { promptId: null }) as Record<string, unknown>
    ) as any;
    delete expanded.companyId;
    const promptTable = await CreatePromptService({ ...expanded, companyId } as any);
    const relationSyncWarning = await syncPromptV2RelationsBestEffort({
      promptId: Number(promptTable.id),
      companyId,
      v2: raw
    });
    if (!relationSyncWarning) {
      schedulePromptKnowledgeOpenAiIndexing({ promptId: Number(promptTable.id), companyId });
    }
    const out = await buildPromptV2ApiResponse(promptTable, companyId);
    const io = getIO();
    io.of(String(companyId)).emit(`company-${companyId}-prompt`, {
      action: "update",
      prompt: out
    });
    return res.status(200).json({
      ...out,
      id: Number(promptTable.id),
      saved: true,
      relationSyncWarning
    });
  }

  const body = normalizePromptPayload(raw);
  delete body.companyId;
  const promptTable = await CreatePromptService({ ...body, companyId } as any);
  const out = await buildPromptV2ApiResponse(promptTable, companyId);

  const io = getIO();
  io.of(String(companyId))
    .emit(`company-${companyId}-prompt`, {
      action: "update",
      prompt: out
    });

  return res.status(200).json({ ...out, id: Number(promptTable.id) });
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { promptId } = req.params;
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;
  const prompt = await ShowPromptService({ promptId, companyId });
  const out = await buildPromptV2ApiResponse(prompt, companyId);
  return res.status(200).json({ ...out, id: Number(prompt.id) });
};

/**
 * GET /prompt/:promptId/flow-understanding
 * Devolve a pré-compreensão estruturada do fluxo (FlowUnderstanding) — usada no
 * painel admin do agente para conferir o que o agente "entendeu" antes de executar.
 */
export const showFlowUnderstanding = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { promptId } = req.params;
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;
  const def = await AttendanceFlowDefinition.findOne({
    where: { promptId: Number(promptId), companyId }
  });
  if (!def) {
    return res.status(200).json({
      promptId: Number(promptId),
      flowUnderstanding: null,
      flowUnderstandingVersion: 0,
      lastCompiledAt: null
    });
  }
  return res.status(200).json({
    promptId: Number(promptId),
    flowUnderstanding: def.getDataValue("flowUnderstanding"),
    flowUnderstandingVersion: def.getDataValue("flowUnderstandingVersion"),
    compilerVersion: def.getDataValue("compilerVersion"),
    lastCompiledAt: def.getDataValue("lastCompiledAt"),
    transitionHooks: def.getDataValue("transitionHooks")
  });
};

/**
 * GET /prompt/:promptId/flow-timeline?ticketId=NN
 * Devolve a timeline de decisões do motor v2 persistida no `ticket.dataWebhook`.
 * Bound em 50 eventos.
 */
export const showFlowTimeline = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { promptId } = req.params;
  const ticketId = Number(req.query.ticketId);
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;
  if (!Number.isFinite(ticketId)) {
    return res.status(400).json({ error: "ticketId requerido (query)" });
  }
  const ticket = await Ticket.findOne({
    where: { id: ticketId, companyId }
  });
  if (!ticket) {
    return res.status(404).json({ error: "Ticket não encontrado" });
  }
  const dw = normalizeTicketDataWebhook(ticket.dataWebhook) as Record<string, any>;
  const timeline = Array.isArray(dw.attendanceFlowTimeline) ? dw.attendanceFlowTimeline : [];
  const memory = dw.attendanceFlow || null;
  /** Filtra para o promptId solicitado para evitar vazar timeline de outro agente. */
  const filtered = timeline.filter(
    (t: any) => Number(t?.promptId) === Number(promptId)
  );
  return res.status(200).json({
    promptId: Number(promptId),
    ticketId,
    memory,
    timeline: filtered
  });
};

/**
 * GET /prompt/action-presets
 * Devolve os presets de ações (com gatilhos default) — usado pela aba "Ações".
 */
export const getAvailableActionPresets = async (
  _req: Request,
  res: Response
): Promise<Response> => {
  return res.status(200).json({ presets: ACTION_PRESET_DEFS });
};

/**
 * POST /prompt/:promptId/smart-actions
 * Adiciona uma smart-action a partir de um preset (slug), se ainda não existir para o agente.
 */
export const createPromptSmartActionFromPreset = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { promptId } = req.params;
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;
  const slugRaw = String((req.body || {}).slug || "")
    .trim()
    .toLowerCase();
  if (!slugRaw) {
    return res.status(400).json({ error: "slug do preset é obrigatório" });
  }
  const preset = ACTION_PRESET_DEFS.find((p) => p.slug.toLowerCase() === slugRaw);
  if (!preset) {
    return res.status(400).json({ error: "preset não encontrado" });
  }
  try {
    const prompt = await Prompt.findOne({
      where: { id: Number(promptId), companyId }
    });
    if (!prompt) {
      return res.status(404).json({ error: "agente não encontrado" });
    }
    const existing = await PromptSmartAction.findOne({
      where: { promptId: Number(promptId), companyId, slug: preset.slug }
    });
    if (existing) {
      return res.status(200).json({
        action: formatSmartActionRow(existing.toJSON() as any),
        created: false
      });
    }
    const defaultVars =
      preset.agentSpeechPrompt && String(preset.agentSpeechPrompt).trim()
        ? { agentSpeechPrompt: String(preset.agentSpeechPrompt).trim() }
        : null;
    const row = await PromptSmartAction.create({
      companyId,
      promptId: Number(promptId),
      name: preset.name,
      slug: preset.slug,
      type: preset.type,
      description: preset.description || null,
      enabled: true,
      agentTriggerPatterns: preset.agentTriggerPatterns,
      userTriggerPatterns: preset.userTriggerPatterns,
      intentSlotSchema: preset.intentSlotSchema || [],
      variables: defaultVars,
      confirm: false,
      autoExecute: false,
      responseMessage: null
    } as any);
    return res.status(201).json({
      action: formatSmartActionRow(row.toJSON() as any),
      created: true
    });
  } catch (e: any) {
    logger.error("[createPromptSmartActionFromPreset]", e);
    return res.status(500).json({ error: e?.message || "create failed" });
  }
};

/**
 * GET /prompt/:promptId/smart-actions
 * Lista as smart-actions do agente, com flags semânticos (enabled/triggers).
 */
export const listPromptSmartActions = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { promptId } = req.params;
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;
  try {
    const actions = await PromptSmartAction.findAll({
      where: { promptId: Number(promptId), companyId },
      order: [["id", "ASC"]]
    });
    const safe = actions.map((a) => formatSmartActionRow(a.toJSON() as any));
    return res.status(200).json({ actions: safe });
  } catch (e: any) {
    return res.status(200).json({ actions: [], error: e?.message || "lookup failed" });
  }
};

/**
 * PATCH /prompt/:promptId/smart-actions/:actionId
 * Atualiza uma smart-action: enabled, agentTriggerPatterns, userTriggerPatterns.
 * Tolera colunas inexistentes (auto-migrator removeu) e ignora os campos correspondentes.
 */
export const updatePromptSmartAction = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { promptId, actionId } = req.params;
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;
  try {
    const action = await PromptSmartAction.findOne({
      where: { id: Number(actionId), promptId: Number(promptId), companyId }
    });
    if (!action) return res.status(404).json({ error: "ação não encontrada" });

    const body = (req.body || {}) as Record<string, any>;
    const setClauses: string[] = [];
    const replacements: Record<string, unknown> = {
      id: Number(actionId),
      promptId: Number(promptId),
      companyId
    };
    const queryInterface = sequelize.getQueryInterface();
    const columns = await queryInterface.describeTable("PromptSmartActions").catch(() => null);
    const qi = (name: string) => (queryInterface as any).quoteIdentifier(name);
    const tableName = (queryInterface as any).quoteTable("PromptSmartActions");
    const dialect = sequelize.getDialect();
    const hasColumn = (name: string) => !columns || !!(columns as Record<string, unknown>)[name];
    const addJsonUpdate = (name: string, value: unknown) => {
      if (!hasColumn(name)) return;
      if (dialect === "postgres") {
        setClauses.push(`${qi(name)} = CAST(:${name} AS ${jsonColumnCast(columns as Record<string, any> | null, name)})`);
      } else {
        setClauses.push(`${qi(name)} = :${name}`);
      }
      replacements[name] = JSON.stringify(value);
    };
    const addScalarUpdate = (name: string, value: unknown) => {
      if (!hasColumn(name)) return;
      setClauses.push(`${qi(name)} = :${name}`);
      replacements[name] = value;
    };

    if (body.enabled !== undefined) {
      addScalarUpdate("enabled", body.enabled !== false);
    }
    if (body.agentTriggerPatterns !== undefined) {
      addJsonUpdate("agentTriggerPatterns", normalizePatternList(body.agentTriggerPatterns));
    }
    if (body.userTriggerPatterns !== undefined) {
      addJsonUpdate("userTriggerPatterns", normalizePatternList(body.userTriggerPatterns));
    }
    if (body.intentSlotSchema !== undefined) {
      addJsonUpdate("intentSlotSchema", Array.isArray(body.intentSlotSchema) ? body.intentSlotSchema : []);
    }
    if (body.variables !== undefined) {
      addJsonUpdate("variables", normalizeActionVariables(body.variables));
    }
    if (body.apiUrl !== undefined) {
      addScalarUpdate("apiUrl", body.apiUrl != null ? String(body.apiUrl) : null);
    }
    if (body.responseMessage !== undefined) {
      addScalarUpdate("responseMessage", body.responseMessage != null ? String(body.responseMessage) : null);
    }

    if (setClauses.length) {
      setClauses.push(`${qi("updatedAt")} = CURRENT_TIMESTAMP`);
      await sequelize.query(
        `UPDATE ${tableName}
            SET ${setClauses.join(", ")}
          WHERE ${qi("id")} = :id
            AND ${qi("promptId")} = :promptId
            AND ${qi("companyId")} = :companyId`,
        { replacements }
      );
    }
    const fresh = await PromptSmartAction.findOne({
      where: { id: Number(actionId), promptId: Number(promptId), companyId }
    });
    return res.status(200).json({
      action: fresh ? formatSmartActionRow(fresh.toJSON() as any) : null
    });
  } catch (e: any) {
    return res.status(500).json({
      error: "Não foi possível salvar a ação inteligente.",
      details: e?.message || "update failed"
    });
  }
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { promptId } = req.params;
    const authHeader = req.headers.authorization;
    const [, token] = authHeader.split(" ");
    const decoded = verify(token, authConfig.secret);
    const { companyId } = decoded as TokenPayload;
    const raw = { ...(req.body as Record<string, unknown>) };

    let promptData: any;
    if (isPromptV2Payload(raw)) {
      promptData = normalizePromptPayload(
        expandPromptV2ToLegacy(raw, { promptId: Number(promptId) }) as Record<string, unknown>
      ) as any;
    } else {
      promptData = normalizePromptPayload(raw) as any;
    }

    await UpdatePromptService({ promptData, promptId: promptId, companyId });

    let relationSyncWarning: string | null = null;
    if (isPromptV2Payload(raw)) {
      relationSyncWarning = await syncPromptV2RelationsBestEffort({
        promptId: Number(promptId),
        companyId,
        v2: raw
      });
      if (!relationSyncWarning) {
        schedulePromptKnowledgeOpenAiIndexing({ promptId: Number(promptId), companyId });
      }
    }

    const full = await ShowPromptService({ promptId, companyId });
    const out = await buildPromptV2ApiResponse(full, companyId);

    const io = getIO();
    io.of(String(companyId))
      .emit(`company-${companyId}-prompt`, {
        action: "update",
        prompt: out
      });

    return res.status(200).json({
      ...out,
      id: Number(full.id),
      saved: true,
      relationSyncWarning
    });
  } catch (e: any) {
    logger.error("[PROMPT] Falha ao salvar agente", {
      promptId: req.params.promptId,
      message: e?.message,
      stack: e?.stack
    });
    const status = Number(e?.statusCode || e?.status || 500);
    return res.status(status >= 400 && status < 600 ? status : 500).json({
      error: e?.message || "Não foi possível salvar o agente.",
      details: e?.parent?.message || e?.original?.message || e?.detail || null
    });
  }
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { promptId } = req.params;
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;
  try {
    await DeletePromptService(promptId, companyId);

    const io = getIO();
    io.of(String(companyId))
      .emit(`company-${companyId}-prompt`, {
        action: "delete",
        promptId: +promptId
      });

    return res.status(200).json({ message: "Prompt deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Não foi possível excluir o agente de IA." });
  }
};

const FLOW_KINDS = new Set(["image", "audio", "video", "document", "file"]);

export const composerAssist = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const systemPrompt = String((req.body as any)?.systemPrompt || "");
  const userPrompt = String((req.body as any)?.userPrompt || "");
  try {
    const text = await composerAssistTransform({ companyId, systemPrompt, userPrompt });
    return res.status(200).json({ text });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    logger.warn("[ComposerAssist] unexpected error", err);
    throw new AppError("Falha ao usar IA. Tente novamente.", 502);
  }
};

export const extractDocumentText = async (req: Request, res: Response): Promise<Response> => {
  const file = req.file as Express.Multer.File | undefined;
  if (!file?.path) {
    return res.status(400).json({ error: "Nenhum arquivo (campo file)" });
  }
  const ext = path.extname(file.originalname || "").toLowerCase();
  let text = "";
  try {
    if (ext === ".pdf") {
      const buf = await fs.promises.readFile(file.path);
      const parsed = await pdfParse(buf);
      text = String(parsed.text || "");
    } else if (ext === ".docx" || ext === ".doc") {
      const r = await mammoth.extractRawText({ path: file.path });
      text = String(r.value || "");
    } else if (
      ext === ".txt" ||
      ext === ".json" ||
      ext === ".csv" ||
      ext === ".md" ||
      ext === ".xml"
    ) {
      text = await fs.promises.readFile(file.path, "utf8");
    } else {
      await fs.promises.unlink(file.path).catch(() => {});
      return res.status(400).json({
        error: "Use PDF, DOCX, TXT, JSON, CSV, MD ou XML"
      });
    }
  } catch {
    await fs.promises.unlink(file.path).catch(() => {});
    return res.status(400).json({ error: "Não foi possível ler o arquivo" });
  }
  await fs.promises.unlink(file.path).catch(() => {});
  return res.status(200).json({ text: text.slice(0, 500000) });
};

export const uploadAttendanceFlowAttachment = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const file = req.file as Express.Multer.File | undefined;
  if (!file) {
    return res.status(400).json({ error: "Nenhum arquivo enviado (campo file)" });
  }
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;
  const kindRaw = String((req.body as any)?.kind || "file");
  const kind = FLOW_KINDS.has(kindRaw) ? kindRaw : "file";
  const rel = `/company${companyId}/attendance-flow/${file.filename}`;
  return res.status(200).json({
    url: rel,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    kind
  });
};
