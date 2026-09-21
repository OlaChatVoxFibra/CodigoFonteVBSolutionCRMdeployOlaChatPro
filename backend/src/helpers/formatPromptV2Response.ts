/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Prompt from "../models/Prompt";
import PromptFaqItem from "../models/PromptFaqItem";
import PromptSmartAction from "../models/PromptSmartAction";
import PromptAgentMedia from "../models/PromptAgentMedia";
import PromptKnowledgeSource from "../models/PromptKnowledgeSource";
import type { PromptV2Body } from "./promptV2Payload";
import { normalizeAgentInventoryConfig } from "./agentInventoryDefaults";

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "object") return value as T;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export async function buildPromptV2ApiResponse(
  prompt: Prompt,
  companyId: number
): Promise<Record<string, unknown>> {
  const plain = prompt.get({ plain: true }) as Record<string, unknown>;
  const id = Number(plain.id);
  const cargo = parseJson(plain.cargo, {} as Record<string, unknown>);
  const cerebro = parseJson(plain.cerebro, {} as Record<string, unknown>);
  const prod = parseJson(plain.produtividade, {} as Record<string, unknown>);
  const guimoAgent = (cargo as any)?.guimoV2?.agent || {};
  const guimoMessages = (cargo as any)?.guimoV2?.messages || (guimoAgent as any)?.messages;

  const [faqRows, actionRows, mediaRows, knRows] = await Promise.all([
    PromptFaqItem.findAll({
      where: { promptId: id, companyId },
      order: [
        ["priority", "DESC"],
        ["id", "ASC"]
      ]
    }),
    PromptSmartAction.findAll({ where: { promptId: id, companyId }, order: [["id", "ASC"]] }),
    PromptAgentMedia.findAll({ where: { promptId: id, companyId }, order: [["id", "ASC"]] }),
    PromptKnowledgeSource.findAll({ where: { promptId: id, companyId }, order: [["id", "ASC"]] })
  ]);

  let faq =
    faqRows.length > 0
      ? faqRows.map((r) => ({
          id: String(r.id),
          question: r.question,
          answer: r.answer,
          category: r.category || "",
          priority: r.priority ?? 0
        }))
      : Array.isArray((cerebro as any).qna)
        ? (cerebro as any).qna.map((q: any, i: number) => ({
            id: `legacy_${i}`,
            question: String(q.pergunta || ""),
            answer: String(q.resposta || ""),
            category: String(q.categoria || ""),
            priority: typeof q.prioridade === "number" ? q.prioridade : 0
          }))
        : [];

  const storedActions = (prod as any)?.actions?.guimoSmartActions;
  let smartActions =
    actionRows.length > 0
        ? actionRows.map((r) => ({
          id: String(r.id),
          name: r.name,
          slug: r.slug || "",
          type: r.type,
          description: r.description || "",
          triggerType: r.triggerType || "",
          triggerValue: r.triggerValue || "",
          condition: r.conditionExpr || "",
          variables:
            r.variables && typeof r.variables === "object" && !Array.isArray(r.variables)
              ? (r.variables as Record<string, unknown>)
              : {},
          apiUrl: r.apiUrl || "",
          workflowId: r.workflowId,
          confirm: !!r.confirm,
          autoExecute: !!r.autoExecute,
          responseMessage: r.responseMessage || "",
          enabled: (r as any).enabled !== false,
          agentTriggerPatterns: Array.isArray((r as any).agentTriggerPatterns)
            ? (r as any).agentTriggerPatterns
            : [],
          userTriggerPatterns: Array.isArray((r as any).userTriggerPatterns)
            ? (r as any).userTriggerPatterns
            : [],
          intentSlotSchema: Array.isArray((r as any).intentSlotSchema)
            ? (r as any).intentSlotSchema
            : []
        }))
      : Array.isArray(storedActions)
        ? storedActions
        : [];

  const storedMedia = (plain.midias as any)?.guimoMediaLibrary;
  let mediaLibrary =
    mediaRows.length > 0
      ? mediaRows.map((r) => ({
          id: String(r.id),
          slug: r.slug,
          name: r.name,
          fileUrl: r.fileUrl || "",
          fileType: r.fileType || "",
          caption: r.caption || ""
        }))
      : Array.isArray(storedMedia)
        ? storedMedia
        : [];

  const qnaWebsites = Array.isArray((cerebro as any).websites) ? (cerebro as any).websites : [];
  const websitesFromKn = knRows
    .filter((k) => k.sourceType === "website")
    .map((k) => ({
      url: k.fileUrl || String(k.title || ""),
      ...(parseJson(k.metadata, {}) as object)
    }));

  const knowledgeSources = knRows
    .filter((k) => k.sourceType !== "website" && k.sourceType !== "manual_text")
    .map((k) => {
      let meta: unknown = k.metadata;
      if (meta != null && typeof meta === "object") {
        try {
          JSON.stringify(meta);
        } catch {
          meta = {};
        }
      } else if (meta != null && typeof meta !== "object") {
        meta = parseJson(meta, {});
      }
      return {
        id: String(k.id),
        sourceType: k.sourceType,
        title: k.title,
        content: k.content,
        fileUrl: k.fileUrl,
        metadata: (meta && typeof meta === "object" ? meta : {}) as Record<string, unknown>,
        indexStatus: (k as any).indexStatus ?? null,
        indexError: (k as any).indexError ?? null,
        openAiVectorStoreId: (k as any).openAiVectorStoreId ?? null
      };
    });

  const manualFromKn = knRows.find((k) => k.sourceType === "manual_text");
  const manualText =
    String((cerebro as any).manualContext || "") ||
    (manualFromKn?.content != null ? String(manualFromKn.content) : "");

  const attendanceSteps = Array.isArray((plain as any).attendanceFlowSteps)
    ? (plain as any).attendanceFlowSteps
    : [];
  const firstStep = attendanceSteps[0] || {};
  const script =
    (plain.attendanceScript as string) ||
    String(firstStep.agentPrompt || firstStep.agent_prompt || "");

  const attendanceSettings = (cargo as any)?.guimoV2Attendance || (plain as any).attendanceSettings || {};

  const agent: PromptV2Body["agent"] = {
    name: String(plain.name || guimoAgent.name || ""),
    description: (plain.description as string) || String(guimoAgent.description || cargo.empresaContexto || ""),
    role: (plain.role as string) || String(guimoAgent.role || cargo.funcao || ""),
    objective: String(guimoAgent.objective || cargo.objetivoAgente || ""),
    language: (plain.language as string) || String(guimoAgent.language || cargo.idioma || "pt-BR"),
    emojisEnabled:
      plain.emojisEnabled !== undefined
        ? !!plain.emojisEnabled
        : String(cargo.emojis || "").toLowerCase() !== "não",
    responseDelay:
      plain.responseDelay != null ? Number(plain.responseDelay) : Number(guimoAgent.responseDelay) || 0,
    formality: String(guimoAgent.formality || cargo.formalidade || ""),
    writingStyle: String((cargo as any)?.guimoV2?.writingStyle || ""),
    businessHours: String((cargo as any)?.guimoV2?.businessHours || ""),
    agentColor: (plain.agentColor as string) || (cargo as any).roleColor || null,
    messages: {
      initial: String(guimoMessages?.initial || cargo.saudacao || ""),
      fallback: String(guimoMessages?.fallback || ""),
      afterHours: String(guimoMessages?.afterHours || ""),
      transferHuman: String(guimoMessages?.transferHuman || "")
    }
  };

  const v2: PromptV2Body = {
    schemaVersion: 2,
    integration: {
      apiKey: String(plain.apiKey || ""),
      model: String(plain.model || ""),
      queueId: plain.queueId != null ? Number(plain.queueId) : null,
      maxMessages: Number(plain.maxMessages ?? 10),
      maxTokens: Number(plain.maxTokens ?? 100),
      temperature: Number(plain.temperature ?? 1),
      voice: String(plain.voice || "texto"),
      voiceKey: String(plain.voiceKey || ""),
      voiceRegion: String(plain.voiceRegion || "")
    },
    agent,
    generalRules: String(plain.generalRules || cargo.instrucoes || ""),
    attendance: {
      script,
      settings: attendanceSettings
    },
    faq,
    faqEnabled: plain.faqEnabled !== undefined ? !!plain.faqEnabled : (cerebro as any).includeQnaInPrompt !== false,
    knowledge: {
      enabled: (cerebro as any).includeKnowledgeInPrompt !== false,
      manualText: String((cerebro as any).manualContext || manualText || ""),
      fileListId: (cerebro as any).fileListId != null ? Number((cerebro as any).fileListId) : null,
      websites:
        websitesFromKn.length > 0
          ? websitesFromKn.map((u: any) => (typeof u === "string" ? { url: u } : u))
          : qnaWebsites.map((u: string) => ({ url: u })),
      sources: knowledgeSources
    },
    knowledgeEnabled:
      plain.knowledgeEnabled !== undefined
        ? !!plain.knowledgeEnabled
        : (cerebro as any).includeKnowledgeInPrompt !== false,
    smartActions,
    mediaLibrary,
    proactive: (prod as any).proactive && typeof (prod as any).proactive === "object" ? (prod as any).proactive : {},
    transferChamado: (prod as any)?.actions?.transferChamado || {
      queueId: null,
      userId: null,
      queueIntegrationId: null
    },
    inventory: normalizeAgentInventoryConfig(
      (cerebro as any)?.guimoV2Inventory || null
    )
  };

  /**
   * Não espalhar associações Sequelize no JSON: Prompt↔Queue (Queue tem HasMany Prompt)
   * gera ciclo e `res.json` lança → 500 no GET /prompt/:id.
   */
  const {
    queue: _omitQueue,
    company: _omitCompany,
    attendanceFlowSteps: _omitSteps,
    ...promptScalars
  } = plain as Record<string, unknown>;

  return {
    ...promptScalars,
    id: Number(plain.id),
    schemaVersion: 2,
    v2
  };
}
