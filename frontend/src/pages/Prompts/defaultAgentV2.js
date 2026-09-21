/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { normalizeAgentInventory } from "../../helpers/inventoryReplyTemplates";

export function buildDefaultAgentV2(integrationState) {
  const apiKey = String(integrationState?.apiKey || "").trim();
  const model = integrationState?.model || "gpt-5.5";
  return {
    schemaVersion: 2,
    integration: {
      apiKey,
      model,
      responderGrupo: false,
      queueId: null,
      maxMessages: 10,
      maxTokens: 2200,
      temperature: 1,
      voice: "texto",
      voiceKey: "",
      voiceRegion: ""
    },
    agent: {
      name: "Novo agente",
      description: "",
      role: "",
      objective: "",
      language: "pt-BR",
      emojisEnabled: true,
      responseDelay: 0,
      formality: "profissional",
      writingStyle: "claro e direto",
      businessHours: "Seg–Sex 9h–18h",
      agentColor: null,
      messages: {
        initial: "",
        fallback: "Desculpe, não consegui concluir. Pode reformular?",
        afterHours: "Estamos fora do horário de atendimento. Retornamos em breve.",
        transferHuman: "Vou transferir você para um atendente humano."
      }
    },
    generalRules: "",
    attendance: {
      script: "",
      settings: {
        objective: "",
        serviceType: "consultivo",
        mandatoryFlow: false,
        allowInterrupt: true,
        maxResponseTimeSec: 120,
        maxAttempts: 5,
        smartFallback: true,
        canImprovise: true,
        canTransferHuman: true
      }
    },
    inventory: {
      enabled: true,
      productIds: [],
      productReplies: {},
      useSameMessage: false,
      reply: {
        tone: "consultivo",
        strategyPreset: "price_first",
        template: "O *{{nome}}* custa {{preco}}{{estoque_frase}}.{{link_frase}}",
        includePrice: true,
        includeStock: true,
        includeLink: true,
        includeDescription: false,
        includeSku: false,
        sendImages: false,
        imageMode: "none",
        imageCount: 3,
        sendDocument: false,
        documentUrl: "",
        documentName: "",
        resumeHint: true,
        resumeHintText: "Quando quiser, seguimos de onde paramos."
      }
    },
    faq: [],
    faqEnabled: true,
    knowledge: {
      enabled: true,
      manualText: "",
      fileListId: null,
      websites: [],
      sources: []
    },
    knowledgeEnabled: true,
    smartActions: [],
    mediaLibrary: [],
    proactive: {},
    transferChamado: {
      queueId: null,
      userId: null,
      queueIntegrationId: null
    }
  };
}

export function normalizeApiResponseToV2(data) {
  if (!data || typeof data !== "object") return null;
  if (data.v2 && typeof data.v2 === "object") {
    const rootSv = Number(data.schemaVersion);
    const innerSv = Number(data.v2.schemaVersion);
    if (rootSv === 2 || innerSv === 2) {
      const inner = JSON.parse(JSON.stringify(data.v2));
      inner.schemaVersion = 2;
      inner.inventory = normalizeAgentInventory(inner.inventory);
      return inner;
    }
  }
  const extracted = extractV2FromImportedJson(data);
  if (extracted) {
    extracted.inventory = normalizeAgentInventory(extracted.inventory);
  }
  return extracted;
}

/**
 * Extrai o objeto v2 de um arquivo exportado ({ v2, schemaVersion }) ou de um payload v2 na raiz.
 */
export function extractV2FromImportedJson(parsed) {
  if (!parsed || typeof parsed !== "object") return null;
  if (parsed.v2 && Number(parsed.v2.schemaVersion) === 2) {
    return JSON.parse(JSON.stringify(parsed.v2));
  }
  if (Number(parsed.schemaVersion) === 2 && parsed.integration && parsed.agent) {
    return JSON.parse(JSON.stringify(parsed));
  }
  return null;
}

/**
 * Mescla JSON importado com defaults da integração atual (API key / modelo da empresa).
 */
export function mergeImportedAgentJson(parsed, integrationDefaults) {
  const src = extractV2FromImportedJson(parsed);
  if (!src) {
    throw new Error("JSON inválido: use a exportação do agente (schemaVersion 2) ou um objeto v2 completo.");
  }
  const base = buildDefaultAgentV2(integrationDefaults || {});
  return {
    schemaVersion: 2,
    integration: { ...base.integration, ...src.integration },
    agent: {
      ...base.agent,
      ...src.agent,
      agentColor: src.agent?.agentColor || base.agent.agentColor,
      messages: { ...base.agent.messages, ...(src.agent?.messages || {}) }
    },
    generalRules: src.generalRules != null ? String(src.generalRules) : base.generalRules,
    attendance: {
      ...base.attendance,
      ...src.attendance,
      settings: { ...base.attendance.settings, ...(src.attendance?.settings || {}) },
      script: src.attendance?.script != null ? String(src.attendance.script) : base.attendance.script
    },
    faq: Array.isArray(src.faq) ? src.faq : base.faq,
    faqEnabled: typeof src.faqEnabled === "boolean" ? src.faqEnabled : base.faqEnabled,
    knowledge: {
      ...base.knowledge,
      ...src.knowledge,
      websites: Array.isArray(src.knowledge?.websites) ? src.knowledge.websites : base.knowledge.websites,
      sources: Array.isArray(src.knowledge?.sources) ? src.knowledge.sources : base.knowledge.sources
    },
    knowledgeEnabled: typeof src.knowledgeEnabled === "boolean" ? src.knowledgeEnabled : base.knowledgeEnabled,
    smartActions: Array.isArray(src.smartActions) ? src.smartActions : base.smartActions,
    mediaLibrary: Array.isArray(src.mediaLibrary) ? src.mediaLibrary : base.mediaLibrary,
    proactive:
      src.proactive && typeof src.proactive === "object"
        ? { ...base.proactive, ...src.proactive }
        : base.proactive,
    inventory: normalizeAgentInventory(src.inventory || base.inventory),
    transferChamado: { ...base.transferChamado, ...(src.transferChamado || {}) }
  };
}
