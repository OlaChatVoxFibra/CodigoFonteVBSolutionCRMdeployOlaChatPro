/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import sequelize from "../../database";
import PromptFaqItem from "../../models/PromptFaqItem";
import PromptSmartAction from "../../models/PromptSmartAction";
import PromptAgentMedia from "../../models/PromptAgentMedia";
import PromptKnowledgeSource from "../../models/PromptKnowledgeSource";
import type { PromptV2Body } from "../../helpers/promptV2Payload";
import { ACTION_PRESET_DEFS } from "./ActionPresetDefs";
import logger from "../../utils/logger";

function findActionPreset(action: Record<string, any>) {
  const slug = String(action.slug || "").toLowerCase();
  const type = String(action.type || "").toLowerCase();
  const name = String(action.name || "").toLowerCase();
  return (
    ACTION_PRESET_DEFS.find(
      (preset) =>
        preset.slug.toLowerCase() === slug ||
        preset.type.toLowerCase() === type ||
        preset.name.toLowerCase() === name
    ) || null
  );
}

function normalizeStringArray(value: unknown): string[] {
  const source = Array.isArray(value) ? value : [];
  return source
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.findIndex((x) => x.toLowerCase() === item.toLowerCase()) === index);
}

function parseObject(value: unknown): Record<string, any> | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return typeof value === "object" && !Array.isArray(value) ? (value as Record<string, any>) : null;
}

function hasMeaningfulObjectValue(value: unknown): boolean {
  const obj = parseObject(value);
  if (!obj) return false;
  return Object.values(obj).some((item) => item !== "" && item !== null && item !== undefined);
}

function sameActionIdentity(a: Record<string, any>, b: Record<string, any>): boolean {
  const aSlug = String(a.slug || "").toLowerCase();
  const bSlug = String(b.slug || "").toLowerCase();
  if (aSlug && bSlug && aSlug === bSlug) return true;
  const aType = String(a.type || "").toLowerCase();
  const bType = String(b.type || "").toLowerCase();
  if (aType && bType && aType === bType) return true;
  const aName = String(a.name || "").toLowerCase();
  const bName = String(b.name || "").toLowerCase();
  return !!aName && !!bName && aName === bName;
}

function pickPersistedPatterns(
  incoming: unknown,
  existing: unknown,
  fallback: string[] = []
): string[] {
  const incomingPatterns = normalizeStringArray(incoming);
  if (incomingPatterns.length) return incomingPatterns;
  const existingPatterns = normalizeStringArray(existing);
  if (existingPatterns.length || Array.isArray(existing)) return existingPatterns;
  return normalizeStringArray(fallback);
}

async function describeTableSafe(tableName: string): Promise<Record<string, unknown> | null> {
  try {
    return (await sequelize.getQueryInterface().describeTable(tableName)) as Record<string, unknown>;
  } catch (e: any) {
    logger.warn(`[PROMPT_V2_SYNC] Tabela ${tableName} indisponível; pulando relação. ${e?.message || e}`);
    return null;
  }
}

function pickExistingColumns(
  payload: Record<string, any>,
  columns: Record<string, unknown> | null
): Record<string, any> | null {
  if (!columns) return null;
  return Object.keys(payload).reduce((acc, key) => {
    if (columns[key]) acc[key] = payload[key];
    return acc;
  }, {} as Record<string, any>);
}

async function destroyIfTableExists(model: any, tableName: string, where: Record<string, any>, transaction: any) {
  const columns = await describeTableSafe(tableName);
  if (!columns) return null;
  await model.destroy({ where, transaction });
  return columns;
}

async function createWithExistingColumns(
  model: any,
  tableName: string,
  columns: Record<string, unknown> | null,
  payload: Record<string, any>,
  transaction: any
) {
  const safePayload = pickExistingColumns(payload, columns);
  if (!safePayload) return;
  await model.create(safePayload, { transaction });
}

/**
 * Persiste relações 1:N do agente v2 em tabelas satélite (transação única).
 *
 * | Origem no payload v2 | Destino |
 * |----------------------|---------|
 * | faq[] | PromptFaqItem |
 * | smartActions[] | PromptSmartAction |
 * | mediaLibrary[] | PromptAgentMedia |
 * | knowledge.sources[], websites[], manualText | PromptKnowledgeSource |
 *
 * Campos só na linha `Prompts` / JSON (cargo, cerebro, produtividade) são gravados
 * por `expandPromptV2ToLegacy` em Create/UpdatePromptService, não aqui.
 */
export async function syncPromptV2Relations(params: {
  promptId: number;
  companyId: number;
  v2: PromptV2Body;
}): Promise<void> {
  const { promptId, companyId, v2 } = params;
  const faq = Array.isArray(v2.faq) ? v2.faq : [];
  const smartActions = Array.isArray(v2.smartActions) ? v2.smartActions : [];
  const mediaLibrary = Array.isArray(v2.mediaLibrary) ? v2.mediaLibrary : [];
  const knowledge = v2.knowledge || {};
  const sources = Array.isArray(knowledge.sources) ? knowledge.sources : [];

  const t = await sequelize.transaction();
  try {
    const where = { promptId, companyId };
    const actionColumns = await describeTableSafe("PromptSmartActions");
    const existingActions = actionColumns
      ? (await PromptSmartAction.findAll({ where, transaction: t })).map((action) => action.toJSON() as Record<string, any>)
      : [];
    const faqColumns = await destroyIfTableExists(PromptFaqItem, "PromptFaqItems", where, t);
    if (actionColumns) {
      await PromptSmartAction.destroy({ where, transaction: t });
    }
    const mediaColumns = await destroyIfTableExists(PromptAgentMedia, "PromptAgentMedias", where, t);
    const knowledgeColumns = await destroyIfTableExists(PromptKnowledgeSource, "PromptKnowledgeSources", where, t);

    for (const f of faq) {
      await createWithExistingColumns(
        PromptFaqItem,
        "PromptFaqItems",
        faqColumns,
        {
          companyId,
          promptId,
          question: String(f.question || ""),
          answer: String(f.answer || ""),
          category: f.category != null ? String(f.category).slice(0, 255) : null,
          priority: typeof f.priority === "number" ? f.priority : 0
        },
        t
      );
    }

    for (const a of smartActions) {
      const actionAny = a as Record<string, any>;
      const preset = findActionPreset(actionAny);
      const existingAction =
        existingActions.find((existing) => {
          if (actionAny.id != null && existing.id != null && Number(actionAny.id) === Number(existing.id)) return true;
          return sameActionIdentity(actionAny, existing);
        }) || null;
      const incomingVariables = parseObject(a.variables);
      const existingVariables = parseObject(existingAction?.variables);
      const persistedVariables = hasMeaningfulObjectValue(incomingVariables) ? incomingVariables : existingVariables;
      await createWithExistingColumns(
        PromptSmartAction,
        "PromptSmartActions",
        actionColumns,
        {
          companyId,
          promptId,
          name: String(a.name || ""),
          slug: a.slug != null ? String(a.slug).slice(0, 128) : null,
          type: String(a.type || "custom"),
          description: a.description != null ? String(a.description) : null,
          triggerType: a.triggerType != null ? String(a.triggerType) : null,
          triggerValue: a.triggerValue != null ? String(a.triggerValue) : null,
          conditionExpr: a.condition != null ? String(a.condition) : null,
          variables: persistedVariables || null,
          apiUrl: a.apiUrl != null && String(a.apiUrl).trim()
            ? String(a.apiUrl)
            : existingAction?.apiUrl != null
              ? String(existingAction.apiUrl)
              : null,
          workflowId:
            a.workflowId != null && Number.isFinite(Number(a.workflowId))
              ? Number(a.workflowId)
              : null,
          confirm: !!a.confirm,
          autoExecute: !!a.autoExecute,
          responseMessage: a.responseMessage != null && String(a.responseMessage).trim()
            ? String(a.responseMessage)
            : existingAction?.responseMessage != null
              ? String(existingAction.responseMessage)
              : null,
          enabled: actionAny.enabled !== false,
          agentTriggerPatterns: pickPersistedPatterns(
            actionAny.agentTriggerPatterns,
            existingAction?.agentTriggerPatterns,
            preset?.agentTriggerPatterns || []
          ),
          userTriggerPatterns: pickPersistedPatterns(
            actionAny.userTriggerPatterns,
            existingAction?.userTriggerPatterns,
            preset?.userTriggerPatterns || []
          ),
          intentSlotSchema: Array.isArray(actionAny.intentSlotSchema)
            ? actionAny.intentSlotSchema
            : Array.isArray(existingAction?.intentSlotSchema)
              ? existingAction.intentSlotSchema
              : preset?.intentSlotSchema || []
        },
        t
      );
    }

    for (const m of mediaLibrary) {
      await createWithExistingColumns(
        PromptAgentMedia,
        "PromptAgentMedias",
        mediaColumns,
        {
          companyId,
          promptId,
          slug: String(m.slug || "")
            .trim()
            .replace(/\s+/g, "_")
            .slice(0, 128),
          name: String(m.name || m.slug || "mídia"),
          fileUrl: m.fileUrl != null ? String(m.fileUrl) : null,
          fileType: m.fileType != null ? String(m.fileType).slice(0, 64) : null,
          caption: m.caption != null ? String(m.caption) : null
        },
        t
      );
    }

    for (const s of sources) {
      await createWithExistingColumns(
        PromptKnowledgeSource,
        "PromptKnowledgeSources",
        knowledgeColumns,
        {
          companyId,
          promptId,
          sourceType: String(s.sourceType || "manual"),
          title: s.title != null ? String(s.title).slice(0, 512) : null,
          content: s.content != null ? String(s.content) : null,
          fileUrl: s.fileUrl != null ? String(s.fileUrl) : null,
          metadata: s.metadata && typeof s.metadata === "object" ? s.metadata : null,
          embeddings: null
        },
        t
      );
    }

    for (const w of Array.isArray(knowledge.websites) ? knowledge.websites : []) {
      const url = String(w.url || "").trim();
      if (!url) continue;
      await createWithExistingColumns(
        PromptKnowledgeSource,
        "PromptKnowledgeSources",
        knowledgeColumns,
        {
          companyId,
          promptId,
          sourceType: "website",
          title: url.slice(0, 512),
          content: null,
          fileUrl: url,
          metadata: {
            depth: w.depth,
            maxPages: w.maxPages,
            autoRefresh: w.autoRefresh
          },
          embeddings: null
        },
        t
      );
    }

    if (knowledge.manualText && String(knowledge.manualText).trim()) {
      await createWithExistingColumns(
        PromptKnowledgeSource,
        "PromptKnowledgeSources",
        knowledgeColumns,
        {
          companyId,
          promptId,
          sourceType: "manual_text",
          title: "Contexto manual",
          content: String(knowledge.manualText),
          fileUrl: null,
          metadata: null,
          embeddings: null
        },
        t
      );
    }

    await t.commit();
  } catch (e) {
    await t.rollback();
    throw e;
  }
}

export default syncPromptV2Relations;
