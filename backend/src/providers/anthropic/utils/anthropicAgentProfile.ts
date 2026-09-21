/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export type AnthropicAgentProfileV2 = {
  schemaVersion?: number;
  generalRules?: string;
  attendance?: { script?: string; settings?: Record<string, unknown> };
  faq?: Array<{ question?: string; answer?: string }>;
  knowledge?: { manualText?: string; websites?: Array<{ url?: string }>; sources?: unknown[] };
  agent?: {
    name?: string;
    role?: string;
    objective?: string;
    language?: string;
    formality?: string;
    writingStyle?: string;
    emojisEnabled?: boolean;
    responseDelay?: number;
    description?: string;
  };
  integration?: { model?: string; temperature?: number; topP?: number };
};

function parseProfile(raw: unknown): AnthropicAgentProfileV2 | null {
  if (!raw || typeof raw !== "object") return null;
  if (Number((raw as any).schemaVersion) !== 2) return null;
  return raw as AnthropicAgentProfileV2;
}

function formatFaqBlock(faq: AnthropicAgentProfileV2["faq"]): string {
  if (!Array.isArray(faq) || faq.length === 0) return "";
  const lines = faq
    .filter((row) => String(row?.question || "").trim() || String(row?.answer || "").trim())
    .map(
      (row, i) =>
        `${i + 1}. P: ${String(row.question || "").trim()}\n   R: ${String(row.answer || "").trim()}`
    );
  return lines.length ? `FAQ:\n${lines.join("\n")}` : "";
}

function formatKnowledgeBlock(knowledge: AnthropicAgentProfileV2["knowledge"]): string {
  if (!knowledge || typeof knowledge !== "object") return "";
  const parts: string[] = [];
  const manual = String(knowledge.manualText || "").trim();
  if (manual) parts.push(`TEXTO MANUAL:\n${manual}`);
  const sites = Array.isArray(knowledge.websites)
    ? knowledge.websites.map((w) => String(w?.url || "").trim()).filter(Boolean)
    : [];
  if (sites.length) parts.push(`SITES:\n${sites.join("\n")}`);
  const sources = Array.isArray(knowledge.sources) ? knowledge.sources : [];
  if (sources.length) {
    const srcLines = sources
      .map((s: any) => {
        const title = String(s?.title || s?.sourceType || "Documento").trim();
        const content = String(s?.content || "").trim().slice(0, 8000);
        return content ? `- ${title}:\n${content}` : "";
      })
      .filter(Boolean);
    if (srcLines.length) parts.push(`DOCUMENTOS:\n${srcLines.join("\n\n")}`);
  }
  return parts.length ? `BASE DE CONHECIMENTO:\n${parts.join("\n\n")}` : "";
}

/** Compila systemPrompt legado + campos usados pelo orquestrador a partir do profile v2. */
export function compileAnthropicAgentFromProfile(
  profileRaw: unknown,
  legacy: { name: string; systemPrompt: string; model: string; temperature: number; topP: number }
) {
  const profile = parseProfile(profileRaw);
  if (!profile) {
    return {
      name: legacy.name,
      systemPrompt: legacy.systemPrompt || "",
      prompt: legacy.systemPrompt || "",
      attendanceScript: "",
      role: "",
      description: "",
      cerebro: null,
      model: legacy.model,
      temperature: legacy.temperature,
      topP: legacy.topP
    };
  }

  const generalRules = String(profile.generalRules || "").trim();
  const attendanceScript = String(profile.attendance?.script || "").trim();
  const faqBlock = formatFaqBlock(profile.faq);
  const knowBlock = formatKnowledgeBlock(profile.knowledge);

  const systemParts = [generalRules, attendanceScript && `ROTEIRO:\n${attendanceScript}`, faqBlock, knowBlock].filter(
    Boolean
  );
  const compiledSystem =
    systemParts.join("\n\n").trim() || String(legacy.systemPrompt || "").trim();

  return {
    name: String(profile.agent?.name || legacy.name).trim() || legacy.name,
    systemPrompt: compiledSystem,
    prompt: generalRules || compiledSystem,
    attendanceScript,
    role: String(profile.agent?.role || "").trim(),
    description: String(profile.agent?.objective || profile.agent?.description || "").trim(),
    cerebro: {
      faq: profile.faq || [],
      knowledge: profile.knowledge || {},
      agentMeta: profile.agent || {}
    },
    model: String(profile.integration?.model || legacy.model).trim() || legacy.model,
    temperature:
      profile.integration?.temperature != null
        ? Number(profile.integration.temperature)
        : legacy.temperature,
    topP: profile.integration?.topP != null ? Number(profile.integration.topP) : legacy.topP
  };
}
