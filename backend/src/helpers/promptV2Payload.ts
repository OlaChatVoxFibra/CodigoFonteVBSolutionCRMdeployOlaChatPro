/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Contrato schemaVersion 2 — editor Guimo.
 * Expande para o formato legado (cargo/cerebro/produtividade/midias/attendanceFlowSteps/prompt)
 * consumido pelo motor WhatsApp / OpenAI existente.
 */

import { OPENAI_DEFAULT_CHAT_MODEL } from "../config/openAiDefaults";
import { normalizeAgentModelId } from "../providers/anthropic/utils/isClaudeModel";
import {
  AgentInventoryConfig,
  normalizeAgentInventoryConfig
} from "./agentInventoryDefaults";

export type PromptV2Integration = {
  apiKey: string;
  model?: string;
  queueId?: number | string | null;
  maxMessages?: number;
  maxTokens?: number;
  temperature?: number;
  voice?: string;
  voiceKey?: string;
  voiceRegion?: string;
};

export type PromptV2Agent = {
  name: string;
  description?: string;
  role?: string;
  objective?: string;
  language?: string;
  emojisEnabled?: boolean;
  responseDelay?: number;
  formality?: string;
  writingStyle?: string;
  businessHours?: string;
  agentColor?: string | null;
  messages?: {
    initial?: string;
    fallback?: string;
    afterHours?: string;
    transferHuman?: string;
  };
};

export type PromptV2AttendanceSettings = {
  objective?: string;
  serviceType?: string;
  mandatoryFlow?: boolean;
  allowInterrupt?: boolean;
  maxResponseTimeSec?: number;
  maxAttempts?: number;
  smartFallback?: boolean;
  canImprovise?: boolean;
  canTransferHuman?: boolean;
};

export type PromptV2Body = {
  schemaVersion: 2;
  integration: PromptV2Integration;
  agent: PromptV2Agent;
  generalRules: string;
  attendance: {
    script: string;
    settings?: PromptV2AttendanceSettings;
  };
  faq?: Array<{
    id?: string;
    question: string;
    answer: string;
    category?: string;
    priority?: number;
  }>;
  faqEnabled?: boolean;
  knowledge?: {
    enabled?: boolean;
    manualText?: string;
    fileListId?: number | null;
    websites?: Array<{ url: string; depth?: number; maxPages?: number; autoRefresh?: boolean }>;
    sources?: Array<{
      sourceType: string;
      title?: string;
      content?: string;
      fileUrl?: string;
      metadata?: Record<string, unknown>;
    }>;
  };
  knowledgeEnabled?: boolean;
  smartActions?: Array<{
    id?: string;
    name: string;
    slug?: string;
    type: string;
    description?: string;
    triggerType?: string;
    triggerValue?: string;
    /** Expressão / regra legível (persistida como conditionExpr nas tabelas satélite). */
    condition?: string;
    variables?: Record<string, unknown>;
    apiUrl?: string;
    workflowId?: number | null;
    confirm?: boolean;
    autoExecute?: boolean;
    responseMessage?: string;
    enabled?: boolean;
    agentTriggerPatterns?: string[];
    userTriggerPatterns?: string[];
    intentSlotSchema?: Array<Record<string, unknown>>;
  }>;
  mediaLibrary?: Array<{
    id?: string;
    slug: string;
    name: string;
    fileUrl?: string;
    fileType?: string;
    caption?: string;
  }>;
  /** Proatividade legada (JSON) — opcional */
  proactive?: Record<string, unknown>;
  transferChamado?: {
    queueId?: number | string | null;
    userId?: number | string | null;
    queueIntegrationId?: number | string | null;
  };
  /** Inventário do agente (persistido em cerebro.guimoV2Inventory) */
  inventory?: AgentInventoryConfig;
};

export function isPromptV2Payload(raw: Record<string, unknown>): raw is PromptV2Body {
  return raw?.schemaVersion === 2;
}

function safeJson(obj: unknown, max = 12000): string {
  try {
    const s = JSON.stringify(obj, null, 2);
    return s.length > max ? `${s.slice(0, max)}\n…` : s;
  } catch {
    return String(obj);
  }
}

/**
 * Injetado no início do texto agregado (`prompt`) para o motor WhatsApp/OpenAI.
 * Hierarquia regras × roteiro informal × comandos /slug × fallback contextual.
 */
export const V2_RUNTIME_DIRECTIVES_PT = `
--- DIRETRIZES DE INTERPRETAÇÃO (OBRIGATÓRIO) ---
Ordem de prioridade: (1) Segurança e limites (2) Regras gerais deste documento (3) Roteiro e fluxo (4) Improvisação consultiva alinhada ao objetivo.

REGRAS GERAIS: definem COMO você deve se comportar (tom, tamanho das respostas, emojis, limites, o que não pode prometer, prioridades comerciais). Valem em TODA a conversa. Se uma sugestão do roteiro CONTRARIAR uma regra (ex.: dar preço antes da qualificação quando a regra proíbe), SIGA A REGRA e adapte a resposta com naturalidade.

ROTEIRO (script): pode estar em linguagem natural, informal, com frases soltas, sem IF/ELSE ou palavras técnicas. INTERPRETE com inteligência (não leia o roteiro como texto corrido para o cliente):
- Estrutura interna: rótulos como "Mensagem:", "RESPOSTA:", "EXEMPLO DE RESPOSTA DO LEAD", "# ETAPA", listas de objeção ou trechos entre aspas de exemplo são ORGANIZAÇÃO do autor — não repita literalmente como se fossem sua fala nem finja que o cliente disse o exemplo. "EXEMPLO DE RESPOSTA" ilustra FORMATO de resposta possível (datas, sim/não, etc.), não exige que o cliente digite exatamente aquelas palavras; encaixe respostas equivalentes no contexto. Use-os para entender intenção, ordem sugerida, ramificações e o que deveria ser dito em cada momento.
- O que enviar ao cliente: inferir a próxima fala útil a partir da etapa lógica atual, da última pergunta feita no histórico e do que ainda falta cumprir no roteiro; envie só mensagens naturais de atendimento (sem títulos de seção, sem "RESPOSTA:", sem colar o roteiro inteiro). Um turno = uma etapa na prática: não encadeie, na mesma resposta, o texto de várias partes do roteiro — interprete pelo contexto qual é “a vez” de falar agora.
- Próxima etapa e condições: infira transições ("depois de qualificar", "se quiser agendar", "em caso de dúvida sobre preço") pelo conteúdo da conversa e pelo roteiro; não avance de forma mecânica se o cliente ainda não respondeu o que importa ou se mudou de assunto — adapte com empatia. Não trate parágrafos ou “espaço” no texto do roteiro como ordem obrigatória de passo: o que define passo novo no sistema é só o delimitador explícito (abaixo), não a quantidade de linhas em branco.
- Resposta esperada vs. real: exemplos no roteiro ilustram respostas típicas; a mensagem real do cliente pode ser diferente ("sim", "pode", "manda", "esse", datas, números). Encaixe a intenção na pergunta pendente e no objetivo da etapa.
- Perguntas abertas criam expectativa: respostas curtas ou ambíguas devem ser lidas no contexto da última pergunta e das regras gerais.
- Linhas com /comando (ex.: /catalogo, /agendamento) correspondem a ações inteligentes cadastradas; não simule o efeito delas no texto — o sistema executa quando for o caso; sua fala prepara ou confirma de forma natural.
- Marcação de etapas no editor (vira passos no fluxo visual): (1) linha só com --- ou (2) linha iniciando com # que marque etapa: # ETAPA, # ETAPA 2, # PASSO, # PRÓXIMA ETAPA, # NOVA ETAPA, # 1. Título da fase, etc. Condições de ramificação no texto costumam aparecer como EXEMPLO DE RESPOSTA DO LEAD, “se sim / se não”, ou frases‑chave — interprete com inteligência; não exige formato técnico. Várias linhas em branco ou parágrafos NÃO criam etapa. O avanço na conversa combina fluxo automático, opções configuradas e a sua leitura do contexto.

Ordem, gatilhos e condições no texto: listas numeradas ou “primeiro / depois” indicam sequência lógica — cumpra o próximo passo ainda pendente, sem saltar etapas críticas (ex.: qualificação antes de preço, se as regras assim combinarem). Frases do tipo “se o cliente disser…”, “quando perguntar por…”, “caso prefira X” são gatilhos em linguagem natural: reconheça sinônimos e respostas curtas equivalentes. Ramos negativos ou objeção (“se não quiser”, “se achar caro”) têm prioridade sobre insistência no caminho positivo.

Estado operacional: antes de responder, identifique silenciosamente qual é a etapa ativa, qual objetivo daquela etapa, qual regra geral governa a resposta, quais dados já foram coletados e qual dado realmente falta. Se a etapa já foi cumprida no histórico, memória ou slots, NÃO repita a etapa nem a mesma pergunta com outras palavras; avance para a próxima ação lógica.

Regras Gerais × Roteiro: Regras Gerais são comportamento obrigatório; Roteiro é mapa de condução. Nunca sacrifique tom, limite, promessa ou prioridade comercial das Regras Gerais para copiar uma frase do Roteiro. Adapte o Roteiro à conversa real.

Continuidade: respostas curtas do cliente ("sim", "pode", "esse", "manda", "amanhã", "de tarde") devem ser ligadas à última pergunta feita e ao objetivo da etapa. Só peça esclarecimento quando a memória, os slots e o histórico não permitirem uma inferência segura.

Dados e ações: se o roteiro conduzir para criar lead, tarefa/atividade ou contato, colete naturalmente os campos mínimos e use o histórico como fonte. Para lead, nome + telefone são dados essenciais; a descrição deve refletir o que aconteceu na conversa e a origem WhatsApp. Para tarefa/atividade, gere título e descrição a partir do contexto quando o operador não tiver definido valores fixos.

Opções naturais: perguntas como "Você procura A, B ou C?" são choices semânticas mesmo sem botões ou números. Aceite a resposta do cliente com sinônimos ou apenas parte da opção ("organização" = "organização interna") e avance sem repetir a pergunta.

Anti-silêncio e reparo: nunca deixe uma resposta útil do cliente sem retorno. Se o fluxo visual não produzir mensagem, se a etapa terminar sem texto ou se uma proteção bloquear repetição, responda pelo contexto com confirmação breve + uma única próxima pergunta/ação. Se a mensagem anterior tinha duas perguntas e o cliente respondeu uma, não ignore: use o dado recebido e peça só o que ficou pendente.

INTERRUPÇÕES HUMANAS (com roteiro ativo): se o cliente fizer uma pergunta paralela (preço, horário, política, FAQ) em vez de responder à pergunta pendente da etapa, responda primeiro com Regras gerais + FAQ + Base de conhecimento; só depois retome a etapa com uma pergunta curta. Não avance etapa canned nem ignore a dúvida dele.

Fidelidade e limites: use só informações que apareçam nas regras, no roteiro, no FAQ ou na base de conhecimento deste documento. Não afirme que “salvou”, “cadastrou”, “alterou no sistema” ou “confirmou pedido” no backend se isso não estiver demonstrado no histórico ou nas ferramentas — você responde no chat; o operador/sistema executa integrações.

Regras ≠ roteiro: regras = comportamento global; roteiro = o que deve ocorrer na conversa. Una os dois.

Fallback: não use "não entendi" ou pedido vago de reformulação sem antes tentar encaixar a mensagem no contexto, na etapa provável e nas regras.
--- FIM DAS DIRETRIZES ---
`.trim();

export function buildV2StructuredPromptText(v2: PromptV2Body, promptId: number | null): string {
  const agent = v2.agent || ({} as PromptV2Agent);
  const name = String(agent.name || "Agente").trim() || "Agente";
  const lines: string[] = [];

  lines.push("## Identificação");
  lines.push(
    `Nome: ${name}\nID: ${promptId != null ? promptId : "(novo)"}\nObjetivo: ${String(agent.objective || "—")}`
  );

  lines.push("## Regras gerais — prioridade máxima (comportamento, limites, tom)");
  lines.push(String(v2.generalRules || "").trim() || "—");

  lines.push("## Roteiro — fluxo em linguagem natural (interpretar etapas, gatilhos e /comandos)");
  lines.push(String(v2.attendance?.script || "").trim() || "—");

  if (v2.attendance?.settings && Object.keys(v2.attendance.settings).length) {
    lines.push("## Roteiro — configurações");
    lines.push(safeJson(v2.attendance.settings, 4000));
  }

  const faq = Array.isArray(v2.faq) ? v2.faq : [];
  if (faq.length) {
    lines.push("## FAQ");
    lines.push(
      faq
        .map(
          (f, i) =>
            `${i + 1}. [${String(f.category || "")}] ${String(f.question || "").trim()}\n   R: ${String(
              f.answer || ""
            ).trim()}`
        )
        .join("\n\n")
    );
  }

  const kn = v2.knowledge || {};
  lines.push("## Base de conhecimento (resumo)");
  lines.push(
    [
      kn.manualText ? `Manual:\n${String(kn.manualText).slice(0, 8000)}` : "",
      Array.isArray(kn.websites) && kn.websites.length
        ? `Sites:\n${kn.websites.map((w) => `- ${w.url}`).join("\n")}`
        : "",
      kn.fileListId ? `fileListId: ${kn.fileListId}` : ""
    ]
      .filter(Boolean)
      .join("\n") || "—"
  );

  const actions = Array.isArray(v2.smartActions) ? v2.smartActions : [];
  if (actions.length) {
    lines.push("## Ações inteligentes");
    lines.push(safeJson(actions, 8000));
  }

  const media = Array.isArray(v2.mediaLibrary) ? v2.mediaLibrary : [];
  if (media.length) {
    lines.push("## Biblioteca de mídias");
    lines.push(safeJson(media, 6000));
  }

  const inventory = normalizeAgentInventoryConfig(v2.inventory || null);
  if (inventory.enabled !== false) {
    lines.push("## Inventário (catálogo da empresa)");
    lines.push(
      [
        "Use as ferramentas reais de inventário (consultar produtos, preço, estoque, link e intenção de compra).",
        "Não invente preços nem estoque — os dados vêm do cadastro /inventory da empresa.",
        inventory.productIds.length
          ? `Escopo de produtos do agente (IDs): ${inventory.productIds.join(", ")}.`
          : "Escopo: todos os produtos da empresa (nenhum ID restringindo).",
        "Após responder com dados do inventário, retome o roteiro com naturalidade (frase de retomada se configurada)."
      ].join("\n")
    );
  }

  let out = lines.join("\n\n").trim();
  if (out.replace(/\s+/g, " ").trim().length < 32) {
    out = `${out}\n\n## Metadados\nagente_v2: ${name}\nseed: ${Date.now()}`;
  }
  return `${V2_RUNTIME_DIRECTIVES_PT}\n\n${out}`.trim();
}

/** Limite defensivo: acima disso o roteiro permanece em um único passo (comportamento anterior). */
const ATTENDANCE_SCRIPT_MAX_FLOW_STEPS = 40;

/**
 * Início de etapa no roteiro (linha própria, após quebra ou início do arquivo).
 * - ETAPA 1 / PASSO 2 (com ou sem #)
 * - # ETAPA / # PASSO (com ou sem número ou título)
 * - # PRÓXIMA ETAPA, # NOVA ETAPA, # NEXT STEP, etc.
 * - # 1. Título (numeração com ponto ou parêntese e texto na mesma linha)
 */
export const RE_ATTENDANCE_STEP_HEADER_LINE =
  /(?:\r?\n|^)\s*(?:#\s*)?(?:(?:pr[oó]xima\s+etapa|pr[oó]ximo\s+passo|nova\s+etapa|next\s+step)\b[^\n\r]*|(?:etapa|passo)\s*\d+[^\n\r]*|(?:etapa|passo)\b[^\n\r]*|\d+[\.)]\s+\S[^\n\r]*)\s*(?:\r?\n|$)/gi;

/** Roteiro com marcadores explícitos de etapa (---, ETAPA N, # ETAPA, etc.). */
export function scriptHasExplicitStepMarkers(script: string): boolean {
  const raw = String(script || "").trim();
  if (!raw) return false;
  if (/(?:\r?\n|^)\s*---\s*(?:\r?\n|$)/.test(raw)) return true;
  RE_ATTENDANCE_STEP_HEADER_LINE.lastIndex = 0;
  return RE_ATTENDANCE_STEP_HEADER_LINE.test(raw);
}

const STEP_HASH_BOUNDARY_LINE = RE_ATTENDANCE_STEP_HEADER_LINE;

export type AttendanceFlowStepDraft = {
  agentPrompt: string;
  responseOptions: unknown[];
  conditions: unknown[];
  attachments: unknown[];
};

/**
 * Partes do roteiro que viram passos no banco (AttendanceFlowSteps).
 * - Linha só com --- (entre quebras de linha) = delimitador explícito de etapa.
 * - Linha iniciando com # marcando etapa: # ETAPA, # PASSO, # PRÓXIMA ETAPA, # 1. Título, etc.
 * - Linhas em branco múltiplas NÃO criam etapa (só formatação dentro do mesmo passo).
 */
export function splitAttendanceScriptIntoStepParts(script: string): string[] {
  const raw = String(script || "").trim();
  if (!raw) {
    return [""];
  }
  const explicitDivider = /(?:\r?\n|^)\s*---\s*(?:\r?\n|$)/;
  if (explicitDivider.test(raw)) {
    const parts = raw
      .split(/(?:\r?\n|^)\s*---\s*(?:\r?\n|$)/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    return parts.length ? parts : [raw];
  }
  STEP_HASH_BOUNDARY_LINE.lastIndex = 0;
  if (STEP_HASH_BOUNDARY_LINE.test(raw)) {
    const token = "\n<<<VBSOLUTION_STEP_BOUNDARY>>>\n";
    STEP_HASH_BOUNDARY_LINE.lastIndex = 0;
    const marked = raw.replace(STEP_HASH_BOUNDARY_LINE, token);
    const parts = marked
      .split(token)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    return parts.length ? parts : [raw];
  }
  return [raw];
}

/**
 * Converte o texto do roteiro (aba Roteiro) em vários passos do fluxo visual.
 * Etapas: --- em linha própria, ou linhas # ETAPA / # PASSO / # próxima etapa / # 1. Título. Espaços não dividem etapa.
 */
export function buildAttendanceFlowStepsFromV2Script(
  script: string,
  fallbackAgentPrompt: string
): AttendanceFlowStepDraft[] {
  const raw = String(script || "").trim();
  const fb = String(fallbackAgentPrompt || "").trim() || "Olá! Como posso ajudar?";

  const emptyStep = (): AttendanceFlowStepDraft => ({
    agentPrompt: raw || fb,
    responseOptions: [],
    conditions: [],
    attachments: []
  });

  if (!raw) {
    return [emptyStep()];
  }

  const parts = splitAttendanceScriptIntoStepParts(raw);

  if (parts.length <= 1) {
    return [
      {
        agentPrompt: raw,
        responseOptions: [],
        conditions: [],
        attachments: []
      }
    ];
  }

  if (parts.length > ATTENDANCE_SCRIPT_MAX_FLOW_STEPS) {
    return [
      {
        agentPrompt: raw,
        responseOptions: [],
        conditions: [],
        attachments: []
      }
    ];
  }

  return parts.map((agentPrompt) => ({
    agentPrompt,
    responseOptions: [],
    conditions: [],
    attachments: []
  }));
}

/** Roteiro com várias etapas no texto, mas sem linhas em AttendanceFlowStep (agente novo / save incompleto). */
const RE_RUNTIME_MULTI_STEP_HINT =
  /(?:^|\r?\n)\s*#?\s*(?:ETAPA|PASSO)\s*\d+|#\s*ETAPA\b|#\s*PASSO\b|(^|\r?\n)\s*---\s*(\r?\n|$)/im;

export type RuntimeAttendanceFlowStepRow = {
  stepNumber: number;
  agentPrompt: string;
  responseOptions: unknown[];
  conditions: unknown[];
  attachments: unknown[];
};

/**
 * Passos do fluxo para o motor WhatsApp: usa a tabela AttendanceFlowStep; se vazio, deriva do texto
 * (attendanceScript ou prompt com marcadores de etapa) para não cair só na LLM com roteiro inteiro.
 */
function runtimeStepRowHasContent(row: RuntimeAttendanceFlowStepRow): boolean {
  if (String(row.agentPrompt || "").trim()) return true;
  const att = row.attachments;
  return Array.isArray(att) && att.length > 0;
}

/** Mesmo auto-split leve do `compileAttendanceFlowIR` (parágrafos Mensagem:/Resposta:). */
function splitScriptPartsForRuntime(source: string): string[] {
  let parts = splitAttendanceScriptIntoStepParts(source);
  if (
    parts.length === 1 &&
    !scriptHasExplicitStepMarkers(source)
  ) {
    const candidates = source
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);
    const looksLikeStructured =
      candidates.length >= 2 &&
      candidates.some((c) => /^(mensagem|resposta)\s*:/i.test(c)) &&
      candidates.length <= 12;
    if (looksLikeStructured) {
      parts = candidates;
    }
  }
  return parts.length ? parts : [source];
}

function rowsFromScriptParts(
  parts: string[],
  template?: RuntimeAttendanceFlowStepRow
): RuntimeAttendanceFlowStepRow[] {
  return parts.map((agentPrompt, idx) => ({
    stepNumber: idx + 1,
    agentPrompt,
    responseOptions: idx === 0 ? template?.responseOptions || [] : [],
    conditions: idx === 0 ? template?.conditions || [] : [],
    attachments: idx === 0 ? template?.attachments || [] : []
  }));
}

/** Expande linha única do banco que contém o roteiro inteiro (--- / # ETAPA). */
function expandDbAttendanceFlowStepRows(
  db: RuntimeAttendanceFlowStepRow[]
): RuntimeAttendanceFlowStepRow[] {
  if (db.length !== 1) return db;
  const only = db[0];
  const subParts = splitScriptPartsForRuntime(String(only.agentPrompt || "").trim());
  if (subParts.length <= 1) return db;
  return rowsFromScriptParts(subParts, only);
}

function deriveRuntimeAttendanceFlowStepRows(fullPrompt: {
  attendanceScript?: string | null;
  prompt?: string | null;
}): RuntimeAttendanceFlowStepRow[] {
  const script = String(fullPrompt.attendanceScript || "").trim();
  const body = String(fullPrompt.prompt || "").trim();
  const source = script || (RE_RUNTIME_MULTI_STEP_HINT.test(body) ? body : "");
  if (!source) return [];

  const parts = splitScriptPartsForRuntime(source);
  if (parts.length <= 1) {
    const drafts = buildAttendanceFlowStepsFromV2Script(
      source,
      body.slice(0, 4000) || "Olá! Como posso ajudar?"
    );
    return drafts.map((row, idx) => ({
      stepNumber: idx + 1,
      agentPrompt: row.agentPrompt,
      responseOptions: row.responseOptions || [],
      conditions: row.conditions || [],
      attachments: row.attachments || []
    }));
  }
  return rowsFromScriptParts(parts);
}

function mergeRuntimeAttendanceFlowStepRows(
  db: RuntimeAttendanceFlowStepRow[],
  derived: RuntimeAttendanceFlowStepRow[]
): RuntimeAttendanceFlowStepRow[] {
  const merged = new Map<number, RuntimeAttendanceFlowStepRow>();

  /** Script no attendanceScript manda quando a tabela tem MENOS etapas (save parcial / só etapa 1). */
  if (derived.length > db.length) {
    for (const row of derived) {
      const n = Number(row.stepNumber);
      if (Number.isFinite(n) && n > 0 && runtimeStepRowHasContent(row)) {
        merged.set(n, { ...row });
      }
    }
    for (const row of db) {
      const n = Number(row.stepNumber);
      if (!Number.isFinite(n) || n <= 0 || !runtimeStepRowHasContent(row)) continue;
      const prev = merged.get(n);
      if (!prev) {
        merged.set(n, row);
        continue;
      }
      merged.set(n, {
        ...prev,
        responseOptions:
          Array.isArray(row.responseOptions) && row.responseOptions.length
            ? row.responseOptions
            : prev.responseOptions,
        conditions:
          row.conditions != null &&
          (Array.isArray(row.conditions) ? row.conditions.length : true)
            ? row.conditions
            : prev.conditions,
        attachments:
          Array.isArray(row.attachments) && row.attachments.length
            ? row.attachments
            : prev.attachments
      });
    }
  } else {
    /** Tabela persistida cobre o roteiro — não sobrescrever com texto derivado mais curto/diferente. */
    for (const row of db) {
      const n = Number(row.stepNumber);
      if (Number.isFinite(n) && n > 0 && runtimeStepRowHasContent(row)) {
        merged.set(n, row);
      }
    }
    for (const row of derived) {
      const n = Number(row.stepNumber);
      if (Number.isFinite(n) && n > 0 && runtimeStepRowHasContent(row) && !merged.has(n)) {
        merged.set(n, row);
      }
    }
  }

  const maxDerived = derived.reduce((m, r) => Math.max(m, Number(r.stepNumber) || 0), 0);
  for (let n = 1; n <= maxDerived; n += 1) {
    if (merged.has(n)) continue;
    const fromDerived = derived.find((r) => Number(r.stepNumber) === n);
    if (fromDerived && runtimeStepRowHasContent(fromDerived)) {
      merged.set(n, fromDerived);
    }
  }

  return [...merged.values()].sort((a, b) => Number(a.stepNumber) - Number(b.stepNumber));
}

/**
 * Passos do fluxo para o motor WhatsApp: mescla AttendanceFlowStep + attendanceScript/prompt.
 * Sempre prefere a fonte com MAIS etapas — evita travar/repetir após a etapa 1.
 */
export function resolveRuntimeAttendanceFlowStepRows(fullPrompt: {
  attendanceFlowSteps?: Array<Record<string, unknown>> | null;
  attendanceScript?: string | null;
  prompt?: string | null;
}): RuntimeAttendanceFlowStepRow[] {
  const dbRaw = [...(fullPrompt.attendanceFlowSteps || [])]
    .map((row) => row as RuntimeAttendanceFlowStepRow)
    .filter((row) => Number.isFinite(Number(row.stepNumber)) && Number(row.stepNumber) > 0)
    .sort((a, b) => Number(a.stepNumber) - Number(b.stepNumber));

  const dbExpanded = expandDbAttendanceFlowStepRows(dbRaw);
  const derived = deriveRuntimeAttendanceFlowStepRows(fullPrompt);

  if (dbExpanded.length === 0) return derived;
  if (derived.length === 0) return dbExpanded;

  return mergeRuntimeAttendanceFlowStepRows(dbExpanded, derived);
}

/**
 * Converte payload v2 → corpo aceito por CreatePromptService / UpdatePromptService (+ colunas novas em Prompts).
 */
export function expandPromptV2ToLegacy(
  v2: PromptV2Body,
  opts: { promptId?: number | null }
): Record<string, unknown> {
  const integ = v2.integration || ({} as PromptV2Integration);
  const agent = v2.agent || ({} as PromptV2Agent);
  const name = String(agent.name || "").trim() || "Novo agente";
  const apiKey = String(integ.apiKey || "").trim();
  const generalRules = String(v2.generalRules || "");
  const script = String(v2.attendance?.script || "");
  const faq = Array.isArray(v2.faq) ? v2.faq : [];
  const smartActions = Array.isArray(v2.smartActions) ? v2.smartActions : [];
  const mediaLibrary = Array.isArray(v2.mediaLibrary) ? v2.mediaLibrary : [];
  const knowledge = v2.knowledge || {};

  const websites = Array.isArray(knowledge.websites)
    ? knowledge.websites.map((w) => String(w.url || "").trim()).filter(Boolean)
    : [];

  const cargo = {
    agente: name,
    funcao: String(agent.role || ""),
    personalidade: "",
    instrucoes: generalRules.slice(0, 12000),
    formalidade: String(agent.formality || ""),
    saudacao: String(agent.messages?.initial || ""),
    despedida: "",
    emojis: agent.emojisEnabled === false ? "não" : "sim",
    idioma: String(agent.language || "pt-BR"),
    empresaContexto: String(agent.description || ""),
    objetivoAgente: String(agent.objective || ""),
    regrasRestricoes: "",
    nichoEmpresa: "",
    roleColor: agent.agentColor || "#111827",
    integracaoUi: {},
    sectionFlags: {
      fluxoEnabled: true,
      proatividadeEnabled: true,
      midiasEnabled: true
    },
    guimoV2: {
      agent,
      businessHours: agent.businessHours,
      writingStyle: agent.writingStyle,
      messages: agent.messages
    },
    guimoV2Attendance: v2.attendance?.settings || {}
  };

  const inventory = normalizeAgentInventoryConfig(v2.inventory || null);

  const cerebro = {
    fileListId: knowledge.fileListId != null ? knowledge.fileListId : null,
    websites,
    qna: faq.map((f) => ({
      pergunta: String(f.question || ""),
      resposta: String(f.answer || ""),
      categoria: String(f.category || ""),
      prioridade: typeof f.priority === "number" ? f.priority : 0
    })),
    includeKnowledgeInPrompt: v2.knowledgeEnabled !== false && knowledge.enabled !== false,
    includeQnaInPrompt: v2.faqEnabled !== false,
    listUploadedFileNamesInPrompt: true,
    manualContext: String(knowledge.manualText || ""),
    guimoV2Knowledge: knowledge,
    guimoV2Inventory: inventory
  };

  const transfer = v2.transferChamado || {};
  const produtividade = {
    proactive: v2.proactive && typeof v2.proactive === "object" ? v2.proactive : {},
    actions: {
      enabled: smartActions.length
        ? smartActions.map((a) => String(a.type || a.name).slice(0, 80))
        : ["Agendamento"],
      perAction: {},
      transferChamado: {
        queueId:
          transfer.queueId === "" || transfer.queueId == null ? null : Number(transfer.queueId),
        userId: transfer.userId === "" || transfer.userId == null ? null : Number(transfer.userId),
        queueIntegrationId:
          transfer.queueIntegrationId === "" || transfer.queueIntegrationId == null
            ? null
            : Number(transfer.queueIntegrationId)
      },
      guimoSmartActions: smartActions
    }
  };

  const midias = {
    guimoMediaLibrary: mediaLibrary,
    byContext: {}
  };

  const attendanceFlowStepDrafts = buildAttendanceFlowStepsFromV2Script(
    script,
    generalRules.slice(0, 4000) || "Olá! Como posso ajudar?"
  );
  const attendanceFlowSteps = attendanceFlowStepDrafts.map((row, idx) => ({
    stepNumber: idx + 1,
    agentPrompt: row.agentPrompt,
    responseOptions: row.responseOptions,
    conditions: row.conditions,
    attachments: row.attachments
  }));

  /**
   * Entrada para o compilador IR — quando esse campo está presente, o Create/Update
   * vai chamar `persistCompiledAttendanceFlow` e ignorar o `attendanceFlowSteps` acima
   * (que continua sendo retornado para retrocompat com chamadores v1).
   */
  const attendanceFlowCompilerInput = {
    script,
    fallbackAgentPrompt: generalRules.slice(0, 4000) || "Olá! Como posso ajudar?",
    smartActions: smartActions.map((a) => ({
      id: null,
      slug: a.slug,
      type: a.type,
      name: a.name
    })),
    mediaLibrary: mediaLibrary.map((m) => ({ slug: m.slug })),
    stepAttachmentsByIndex: attendanceFlowStepDrafts.map((row) =>
      Array.isArray(row.attachments) ? (row.attachments as unknown[]) : []
    )
  };

  const mainPrompt = buildV2StructuredPromptText(v2, opts.promptId ?? null);

  const queueId =
    integ.queueId === "" || integ.queueId == null
      ? null
      : Number(integ.queueId) > 0
        ? Number(integ.queueId)
        : null;

  return {
    name,
    apiKey,
    prompt: mainPrompt,
    model: normalizeAgentModelId(integ.model) || integ.model || OPENAI_DEFAULT_CHAT_MODEL,
    maxMessages: integ.maxMessages != null ? Number(integ.maxMessages) : 10,
    maxTokens: integ.maxTokens != null ? Number(integ.maxTokens) : 2200,
    temperature: integ.temperature != null ? Number(integ.temperature) : 1,
    voice: integ.voice || "texto",
    voiceKey: integ.voiceKey || "",
    voiceRegion: integ.voiceRegion || "",
    queueId,
    cargo,
    cerebro,
    produtividade,
    midias,
    attendanceFlowSteps,
    attendanceFlowCompilerInput,
    description: agent.description || null,
    role: agent.role || null,
    language: agent.language || null,
    emojisEnabled: agent.emojisEnabled !== false,
    responseDelay: agent.responseDelay != null ? Number(agent.responseDelay) : null,
    generalRules,
    attendanceScript: script,
    faqEnabled: v2.faqEnabled !== false,
    knowledgeEnabled: v2.knowledgeEnabled !== false,
    agentColor: agent.agentColor || null
  };
}
