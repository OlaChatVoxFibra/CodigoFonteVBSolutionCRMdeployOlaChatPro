/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * HookTriggerBus (PR 2 — fluxo agente IA senior revamp).
 *
 * Ponto único de disparo de Smart Actions a partir de momentos bem definidos do fluxo:
 *  - `on_present`     : passo está sendo apresentado ao cliente
 *  - `after_reply`    : cliente acabou de responder a etapa (drain de adiadas)
 *  - `on_enter`       : motor entrou na etapa
 *  - `on_exit`        : motor está saindo da etapa
 *  - `on_transition`  : transição entre duas etapas (`from -> to`)
 *  - `on_correction`  : motor detectou correção de uma resposta anterior
 *  - `on_flow_complete` : fluxo terminou (etapa terminal alcançada)
 *
 * Compatibilidade:
 *  - O comportamento atual de `/comando` inline em `presentStepWithScriptCommands`
 *    continua intacto. Esse arquivo NÃO substitui aquele fluxo; ele é um trilho
 *    adicional para os novos momentos. PR 5 (engine v2) plugará chamadas a este bus
 *    nos pontos certos sem alterar o caminho legado.
 *  - O bus delega a execução real para `executeSmartAction` (mesmo executor usado hoje),
 *    preservando dedup interno, logs e estado.
 *  - Dedup persistente: usa `AttendanceFlowMemory.firedHookKeys` para evitar redisparo
 *    do mesmo hook quando o cliente reenviar a mesma mensagem (ex.: notificação dupla).
 *
 * Auditoria: cada execução retorna um `HookExecutionResult` com chave única, motivo de
 * skip (se houver) e sucesso/erro — pronto para alimentar a timeline (entrega 9).
 */

import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Prompt from "../../models/Prompt";
import logger from "../../utils/logger";
import {
  executeSmartAction
} from "./PromptSmartActionExecutorService";
import type { StepCommandIR } from "../../helpers/compileAttendanceFlowIR";
import type { AttendanceFlowMemory } from "../../helpers/agentAttendanceFlowMemory";

export type HookMoment =
  | "on_present"
  | "after_reply"
  | "on_enter"
  | "on_exit"
  | "on_transition"
  | "on_correction"
  | "on_flow_complete";

/**
 * Hook global de transição cadastrado em `AttendanceFlowDefinition.transitionHooks[]`
 * (UI vai expor esta config na entrega 8). `from`/`to` aceitam `"*"` como curinga.
 */
export type TransitionHook = {
  /** Origem; "*" = qualquer etapa. */
  from: string;
  /** Destino; "end" = término do fluxo; "*" = qualquer etapa. */
  to: string;
  /** Ação a executar — slug e/ou id direto da smart action. */
  action: {
    slug?: string;
    smartActionId?: number;
    /** Variáveis adicionais a passar para a smart action. */
    variables?: Record<string, unknown>;
  };
  /**
   * Quando este hook deve disparar:
   *  - `always`        : sempre que a transição acontecer
   *  - `on_match`      : somente se o cliente bateu um branch (matched=true)
   *  - `on_correction` : somente em correção
   */
  condition?: "always" | "on_match" | "on_correction";
  /** Label opcional para UI/timeline. */
  label?: string;
};

export type HookTriggerContext = {
  prompt: Prompt;
  ticket: Ticket;
  contact: Contact;
  /** Variáveis adicionais — mescladas sobre `action.variables` por hook. */
  variables?: Record<string, unknown>;
};

export type HookExecutionResult = {
  hookKey: string;
  moment: HookMoment;
  slug: string;
  smartActionId: number | null;
  success: boolean;
  message: string;
  data?: unknown;
  skipped?: "already_fired" | "no_action_found" | "condition_failed" | "missing_slug";
  error?: string;
};

export type StepLikeForHook = {
  stepNumber: number;
  stepId?: string | null;
  commandsIR?: StepCommandIR[] | null;
};

export type TriggerHookParams = {
  moment: HookMoment;
  /** Etapa "ativa" para hooks de step-level (on_present/after_reply/on_enter/on_exit). */
  step?: StepLikeForHook | null;
  /** Etapa de origem para hooks `on_transition` e `on_exit`. */
  fromStep?: StepLikeForHook | null;
  /** Etapa de destino para hooks `on_transition` e `on_enter`. */
  toStep?: StepLikeForHook | null;
  /** Hooks globais cadastrados na Definition. */
  transitionHooks?: TransitionHook[] | null;
  /** Indica se o passo anterior bateu por matcher semântico/regex (afeta `on_match`). */
  matched?: boolean;
  /** Indica se o motor detectou correção (afeta `on_correction`). */
  isCorrection?: boolean;
  context: HookTriggerContext;
  /**
   * Snapshot da memória do fluxo (read+write). Quando passado, o bus consulta/atualiza
   * `firedHookKeys` para dedup persistente. Se ausente, dedup só vale para o snapshot
   * recebido (não persiste). O caller é responsável por gravar a memória atualizada.
   */
  memory?: AttendanceFlowMemory;
  /** Modo seco: lista o que seria disparado sem chamar `executeSmartAction`. */
  dryRun?: boolean;
};

export type TriggerHookOutcome = {
  results: HookExecutionResult[];
  /** Memória atualizada (com novos `firedHookKeys`) — apenas quando `memory` foi passada. */
  memoryPatch?: { firedHookKeys: Record<string, string[]> };
};

/** Indexa step.commandsIR pelo momento solicitado, gerando hooks "step-level". */
function collectStepLevelHooks(
  moment: HookMoment,
  step: StepLikeForHook | null | undefined
): Array<{ source: "step"; slug: string; smartActionId: number | null; kind?: string }> {
  if (!step || !Array.isArray(step.commandsIR)) return [];
  const out: Array<{ source: "step"; slug: string; smartActionId: number | null; kind?: string }> = [];
  for (const cmd of step.commandsIR) {
    if (!cmd || cmd.when !== moment) continue;
    const slug = String(cmd.slug || "").trim();
    if (!slug) continue;
    out.push({
      source: "step",
      slug,
      smartActionId: cmd.smartActionId != null ? Number(cmd.smartActionId) : null,
      kind: cmd.kind
    });
  }
  return out;
}

function transitionMatchesIds(
  pattern: string | undefined | null,
  candidates: Array<string | number | null | undefined>
): boolean {
  const p = String(pattern || "").trim();
  if (!p || p === "*") return true;
  const norm = p.toLowerCase();
  for (const c of candidates) {
    if (c == null) continue;
    const cs = String(c).trim().toLowerCase();
    if (cs && cs === norm) return true;
  }
  return false;
}

/** Indexa transitionHooks aplicáveis (para `on_transition`/`on_enter`/`on_exit`/`on_correction`/`on_flow_complete`). */
function collectTransitionHooks(
  moment: HookMoment,
  hooks: TransitionHook[] | null | undefined,
  params: {
    fromStep?: StepLikeForHook | null;
    toStep?: StepLikeForHook | null;
    matched?: boolean;
    isCorrection?: boolean;
  }
): Array<{
  source: "transition";
  slug: string;
  smartActionId: number | null;
  variables?: Record<string, unknown>;
  label?: string;
  from: string;
  to: string;
}> {
  if (!Array.isArray(hooks) || !hooks.length) return [];
  const out: Array<{
    source: "transition";
    slug: string;
    smartActionId: number | null;
    variables?: Record<string, unknown>;
    label?: string;
    from: string;
    to: string;
  }> = [];

  const fromCandidates = [
    params.fromStep?.stepId,
    params.fromStep?.stepNumber,
    params.fromStep?.stepNumber != null ? `s${params.fromStep.stepNumber}` : null
  ];
  const toCandidates = [
    params.toStep?.stepId,
    params.toStep?.stepNumber,
    params.toStep?.stepNumber != null ? `s${params.toStep.stepNumber}` : null
  ];

  /** Para on_flow_complete, "to" pode ser "end" — adiciona como candidato implícito. */
  if (moment === "on_flow_complete") toCandidates.push("end");

  for (const h of hooks) {
    if (!h || !h.action) continue;
    const cond = (h.condition || "always") as TransitionHook["condition"];

    /** Filtro por momento — esse bus é o gateway central, então só dispara o que casa. */
    const relevantToMoment =
      moment === "on_transition" ||
      moment === "on_enter" ||
      moment === "on_exit" ||
      moment === "on_correction" ||
      moment === "on_flow_complete";
    if (!relevantToMoment) continue;

    if (moment === "on_correction" && cond !== "on_correction") continue;
    if (cond === "on_correction" && moment !== "on_correction") continue;
    if (cond === "on_match" && !params.matched) continue;

    const fromOk = transitionMatchesIds(h.from, fromCandidates);
    const toOk = transitionMatchesIds(h.to, toCandidates);
    if (!fromOk || !toOk) continue;

    const slug = String(h.action.slug || "").trim();
    const smartActionId =
      h.action.smartActionId != null && Number.isFinite(Number(h.action.smartActionId))
        ? Number(h.action.smartActionId)
        : null;
    if (!slug && smartActionId == null) continue;

    out.push({
      source: "transition",
      slug,
      smartActionId,
      variables: h.action.variables && typeof h.action.variables === "object" ? h.action.variables : undefined,
      label: h.label,
      from: String(h.from || "*"),
      to: String(h.to || "*")
    });
  }
  return out;
}

function makeStepKey(step: StepLikeForHook | null | undefined): string {
  if (!step) return "0";
  if (step.stepNumber != null) return String(step.stepNumber);
  if (step.stepId) return String(step.stepId);
  return "0";
}

function makeHookKey(moment: HookMoment, slug: string, smartActionId: number | null, extra?: string): string {
  const idPart = smartActionId != null ? `#${smartActionId}` : "";
  const slugPart = slug ? `/${slug.toLowerCase()}` : "";
  return `${moment}:${slugPart}${idPart}${extra ? `:${extra}` : ""}`.slice(0, 240);
}

/** Pública: dispara todos os hooks aplicáveis a um momento. */
export async function triggerHook(params: TriggerHookParams): Promise<TriggerHookOutcome> {
  const { moment, step, fromStep, toStep, transitionHooks, context, dryRun, memory } = params;
  const stepKey = makeStepKey(step ?? toStep ?? fromStep);
  const previouslyFired = new Set(memory?.firedHookKeys?.[stepKey] || []);
  const newlyFired = new Set<string>(previouslyFired);

  const stepLevel = collectStepLevelHooks(moment, step);
  const trans = collectTransitionHooks(moment, transitionHooks, {
    fromStep,
    toStep,
    matched: params.matched,
    isCorrection: params.isCorrection
  });

  /**
   * Ordem de execução: primeiro hooks step-level (mais próximos do roteiro do autor),
   * depois transitionHooks globais (overrides cadastrados pela UI).
   * Dedup por `hookKey` dentro do mesmo turno + persistente em `memory.firedHookKeys`.
   */
  const candidates: Array<{
    source: "step" | "transition";
    slug: string;
    smartActionId: number | null;
    variables?: Record<string, unknown>;
    extraKey?: string;
  }> = [];

  for (const c of stepLevel) {
    candidates.push({
      source: c.source,
      slug: c.slug,
      smartActionId: c.smartActionId,
      variables: undefined,
      extraKey: undefined
    });
  }
  for (const c of trans) {
    candidates.push({
      source: c.source,
      slug: c.slug,
      smartActionId: c.smartActionId,
      variables: c.variables,
      extraKey: `${c.from}->${c.to}`
    });
  }

  const results: HookExecutionResult[] = [];

  for (const cand of candidates) {
    if (!cand.slug && cand.smartActionId == null) {
      results.push({
        hookKey: makeHookKey(moment, cand.slug, cand.smartActionId, cand.extraKey),
        moment,
        slug: cand.slug,
        smartActionId: cand.smartActionId,
        success: false,
        message: "Hook sem slug nem smartActionId.",
        skipped: "missing_slug"
      });
      continue;
    }
    const hookKey = makeHookKey(moment, cand.slug, cand.smartActionId, cand.extraKey);
    if (newlyFired.has(hookKey)) {
      results.push({
        hookKey,
        moment,
        slug: cand.slug,
        smartActionId: cand.smartActionId,
        success: true,
        message: "",
        skipped: "already_fired"
      });
      continue;
    }

    if (dryRun) {
      newlyFired.add(hookKey);
      results.push({
        hookKey,
        moment,
        slug: cand.slug,
        smartActionId: cand.smartActionId,
        success: true,
        message: "[dryRun] hook seria executado"
      });
      continue;
    }

    const mergedVars: Record<string, unknown> = {
      ...(cand.variables || {}),
      ...(context.variables || {}),
      __hookMoment: moment,
      __hookSource: cand.source
    };
    if (params.fromStep?.stepNumber != null) mergedVars.__hookFromStep = params.fromStep.stepNumber;
    if (params.toStep?.stepNumber != null) mergedVars.__hookToStep = params.toStep.stepNumber;

    try {
      const r = await executeSmartAction(
        cand.slug || `smart_action_${cand.smartActionId}`,
        context.prompt,
        context.ticket,
        context.contact,
        mergedVars,
        {
          smartActionId: cand.smartActionId != null ? cand.smartActionId : undefined,
          scriptSlug: cand.slug || undefined,
          attendanceFlowStep: step?.stepNumber ?? toStep?.stepNumber ?? fromStep?.stepNumber
        }
      );
      if (r.success) newlyFired.add(hookKey);
      results.push({
        hookKey,
        moment,
        slug: cand.slug,
        smartActionId: cand.smartActionId,
        success: r.success,
        message: r.message || "",
        data: (r as any).data,
        skipped: !r.success && /n[ãa]o encontrad/i.test(String(r.message || "")) ? "no_action_found" : undefined
      });
      logger.info(
        JSON.stringify({
          evt: "attendance_flow_hook_fired",
          moment,
          stepNumber: step?.stepNumber ?? toStep?.stepNumber ?? null,
          fromStep: fromStep?.stepNumber ?? null,
          toStep: toStep?.stepNumber ?? null,
          slug: cand.slug || null,
          smartActionId: cand.smartActionId,
          success: r.success
        })
      );
    } catch (e: any) {
      const errMsg = e instanceof Error ? e.message : String(e);
      logger.error(`[HOOK-BUS] falha ao executar hook ${hookKey}: ${errMsg}`);
      results.push({
        hookKey,
        moment,
        slug: cand.slug,
        smartActionId: cand.smartActionId,
        success: false,
        message: errMsg,
        error: errMsg
      });
    }
  }

  /** Constrói patch só se houve mudança em relação ao snapshot original. */
  let memoryPatch: TriggerHookOutcome["memoryPatch"];
  if (memory && newlyFired.size !== previouslyFired.size) {
    const allFired = { ...(memory.firedHookKeys || {}) };
    allFired[stepKey] = [...newlyFired].slice(0, 200);
    memoryPatch = { firedHookKeys: allFired };
  }

  return { results, memoryPatch };
}

/**
 * Utilitário: cria a chave única usada para dedup. Exportado para testes e auditoria.
 */
export function computeHookKey(
  moment: HookMoment,
  slug: string,
  smartActionId: number | null,
  extra?: string
): string {
  return makeHookKey(moment, slug, smartActionId, extra);
}
