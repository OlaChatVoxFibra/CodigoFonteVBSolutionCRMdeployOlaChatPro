/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * AttendanceFlowDecisionEngine (PR 5 — motor v2).
 *
 * Função PURA que recebe:
 *   - memory: AttendanceFlowMemory persistida no ticket
 *   - classifierResult: saída do AttendanceFlowClassifierService
 *   - steps: lista de CompiledStepIR (do compileAttendanceFlowIR)
 *   - definition: CompiledFlowDefinitionDraft
 *   - currentStepNumber: passo ativo (lastPresentedStep)
 *
 * Devolve uma `FlowDecision` declarando o que o adapter de runtime deve fazer.
 * Zero IO, zero DB, zero LLM → 100% testável.
 *
 * Comportamentos garantidos (cobrem os 9 pontos do pedido):
 *  - SINGLE STEP: nunca devolve `presentSteps` com mais de 1 elemento por turno.
 *  - SINGLE TURN: o caller envia 1 etapa por turno; never burst.
 *  - NO REPEAT: detecta `step==lastPresented && phase==active && awaitingUserReply==true`
 *    e devolve `noop` para evitar reapresentar etapa idêntica.
 *  - CORRECTION: aplica `intent=correction` → volta pra `correctionTarget` apagando answers
 *    posteriores do `answersByStep` (patch).
 *  - OFF_TOPIC / NOISE: devolve hint sem avançar.
 *  - REPEAT: devolve hint pedindo reformulação.
 *  - TERMINATE: marca `flowPhase=completed`.
 *  - HOOK MOMENTS: declara `hookMoments` que o adapter dispara via HookTriggerBus.
 */

import type {
  AttendanceFlowMemory,
  AttendanceFlowPhase
} from "../../helpers/agentAttendanceFlowMemory";
import type {
  CompiledStepIR,
  CompiledFlowDefinitionDraft
} from "../../helpers/compileAttendanceFlowIR";
import type {
  ClassifierResult,
  ClassifierFilledSlot
} from "./AttendanceFlowClassifierService";
import type {
  HookMoment
} from "./HookTriggerBus";

export type FlowDecisionAction =
  | "present_step"
  | "send_hint"
  | "defer_to_llm"
  | "complete_flow"
  | "noop";

export type HookFireRequest = {
  moment: HookMoment;
  step: CompiledStepIR;
  fromStepId?: string | null;
  toStepId?: string | null;
  matched?: boolean;
  corrected?: boolean;
};

export type FlowDecision = {
  action: FlowDecisionAction;
  /** Etapa a apresentar (UM step só, garantido). null se action != present_step. */
  presentStep: CompiledStepIR | null;
  /** Texto canned para hint quando action=send_hint. */
  hintText: string | null;
  /** Patch de memory a aplicar ANTES de present/send. */
  memoryPatch: Partial<AttendanceFlowMemory>;
  /** Hooks a disparar (na ordem fornecida). Adapter chama HookTriggerBus. */
  hookFires: HookFireRequest[];
  /** Telemetria estruturada para timeline/audit. */
  audit: {
    intent: ClassifierResult["intent"];
    fromStepId: string | null;
    toStepId: string | null;
    confidence: number;
    reasoning: string;
    source: ClassifierResult["source"];
    filledSlot?: ClassifierFilledSlot | null;
  };
  /** Mensagem inbound consumida (true → skip LLM clássico). */
  consumedReply: boolean;
};

export type FlowDecisionInput = {
  memory: AttendanceFlowMemory;
  classifier: ClassifierResult;
  steps: CompiledStepIR[];
  definition: CompiledFlowDefinitionDraft;
  /** stepNumber atual (lastPresentedStep). 0 quando flow ainda não começou. */
  currentStepNumber: number;
  /** Texto do cliente neste turno. */
  userText?: string;
};

function findStepByNumber(
  steps: CompiledStepIR[],
  n: number
): CompiledStepIR | null {
  return steps.find((s) => s.stepNumber === n) || null;
}

function findStepById(
  steps: CompiledStepIR[],
  id: string | null
): CompiledStepIR | null {
  if (!id) return null;
  return steps.find((s) => s.stepId === id) || null;
}

function nextLinearStep(
  steps: CompiledStepIR[],
  currentNumber: number
): CompiledStepIR | null {
  return steps.find((s) => s.stepNumber === currentNumber + 1) || null;
}

function nextUncompletedStep(
  steps: CompiledStepIR[],
  currentNumber: number,
  completed: number[] | undefined
): CompiledStepIR | null {
  const completedSet = new Set((completed || []).map((n) => Number(n)));
  return steps.find((s) => s.stepNumber > currentNumber && !completedSet.has(s.stepNumber)) || null;
}

function mergeAnswers(
  prev: Record<string, string> | undefined,
  stepNumber: number,
  rawText: string | null
): Record<string, string> {
  if (rawText == null) return { ...(prev || {}) };
  return { ...(prev || {}), [String(stepNumber)]: String(rawText).slice(0, 600) };
}

/** Apaga answers de etapas a partir de `fromStepNumber` (correção retroativa). */
function dropAnswersFrom(
  prev: Record<string, string> | undefined,
  fromStepNumber: number
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(prev || {})) {
    const n = Number(k);
    if (!Number.isFinite(n) || n < fromStepNumber) {
      out[k] = v;
    }
  }
  return out;
}

function dropCompletedFrom(
  prev: number[] | undefined,
  fromStepNumber: number
): number[] {
  return (prev || []).filter((n) => Number(n) < fromStepNumber);
}

/* -------------------------------------------------------------------------- */
/*                              Decision engine                               */
/* -------------------------------------------------------------------------- */

export function decideAttendanceFlowTurn(input: FlowDecisionInput): FlowDecision {
  const { memory, classifier, steps, definition, currentStepNumber } = input;
  const fromStep = findStepByNumber(steps, currentStepNumber);
  const fromStepId = fromStep?.stepId || null;
  const phase = (memory.flowPhase as AttendanceFlowPhase) || "active";

  /** Fluxo encerrado → tudo é noop. */
  if (phase === "completed") {
    return {
      action: "noop",
      presentStep: null,
      hintText: null,
      memoryPatch: {},
      hookFires: [],
      audit: {
        intent: classifier.intent,
        fromStepId,
        toStepId: null,
        confidence: classifier.confidence,
        reasoning: "Flow já completado — ignorando turno.",
        source: classifier.source
      },
      consumedReply: false
    };
  }

  /** Onboarding: nenhuma etapa apresentada ainda → apresentar entry. */
  if (currentStepNumber <= 0) {
    const entry = findStepById(steps, definition.entryStepId) || steps[0] || null;
    if (!entry) {
      return {
        action: "noop",
        presentStep: null,
        hintText: null,
        memoryPatch: {},
        hookFires: [],
        audit: {
          intent: classifier.intent,
          fromStepId: null,
          toStepId: null,
          confidence: 0,
          reasoning: "Fluxo sem etapas compiladas.",
          source: classifier.source
        },
        consumedReply: false
      };
    }
    return {
      action: "present_step",
      presentStep: entry,
      hintText: null,
      memoryPatch: {
        lastPresentedStep: entry.stepNumber,
        flowPhase: "active",
        awaitingUserReply: true,
        lastStepPresentedAt: new Date().toISOString()
      },
      hookFires: [
        {
          moment: "on_enter",
          step: entry,
          fromStepId: null,
          toStepId: entry.stepId
        },
        {
          moment: "on_present",
          step: entry,
          fromStepId: null,
          toStepId: entry.stepId
        }
      ],
      audit: {
        intent: classifier.intent,
        fromStepId: null,
        toStepId: entry.stepId,
        confidence: classifier.confidence,
        reasoning: "Onboarding: apresentando etapa de entrada.",
        source: classifier.source
      },
      consumedReply: true
    };
  }

  if (!fromStep) {
    /** Etapa atual sumiu (autor reordenou roteiro) → cair pra fallback. */
    const fallback = findStepById(steps, definition.fallbackStepId) || steps[0];
    if (fallback) {
      return {
        action: "present_step",
        presentStep: fallback,
        hintText: null,
        memoryPatch: {
          lastPresentedStep: fallback.stepNumber,
          flowPhase: "active",
          awaitingUserReply: true
        },
        hookFires: [
          { moment: "on_enter", step: fallback, fromStepId, toStepId: fallback.stepId }
        ],
        audit: {
          intent: classifier.intent,
          fromStepId,
          toStepId: fallback.stepId,
          confidence: 0.5,
          reasoning: "Step ativo não existe mais — fallback.",
          source: classifier.source
        },
        consumedReply: true
      };
    }
  }

  switch (classifier.intent) {
    case "noise":
      return {
        action: "noop",
        presentStep: null,
        hintText: null,
        memoryPatch: {},
        hookFires: [],
        audit: {
          intent: "noise",
          fromStepId,
          toStepId: fromStepId,
          confidence: classifier.confidence,
          reasoning: classifier.reasoning,
          source: classifier.source
        },
        consumedReply: false
      };

    case "repeat":
      return {
        action: "send_hint",
        presentStep: null,
        hintText:
          (fromStep?.customerVisibleText || "").slice(0, 800) ||
          "Posso explicar de outro jeito — me confirma sua dúvida em uma frase?",
        memoryPatch: {},
        hookFires: [],
        audit: {
          intent: "repeat",
          fromStepId,
          toStepId: fromStepId,
          confidence: classifier.confidence,
          reasoning: classifier.reasoning,
          source: classifier.source
        },
        consumedReply: true
      };

    case "off_topic":
      return {
        action: "defer_to_llm",
        presentStep: null,
        hintText: null,
        memoryPatch: {},
        hookFires: [],
        audit: {
          intent: "off_topic",
          fromStepId,
          toStepId: fromStepId,
          confidence: classifier.confidence,
          reasoning: classifier.reasoning,
          source: classifier.source
        },
        consumedReply: false
      };

    case "terminate":
      return {
        action: "complete_flow",
        presentStep: null,
        hintText: null,
        memoryPatch: {
          flowPhase: "completed" as AttendanceFlowPhase,
          awaitingUserReply: false
        },
        hookFires: fromStep
          ? [
              {
                moment: "on_exit",
                step: fromStep,
                fromStepId,
                toStepId: "end"
              },
              {
                moment: "on_flow_complete",
                step: fromStep,
                fromStepId,
                toStepId: "end"
              }
            ]
          : [],
        audit: {
          intent: "terminate",
          fromStepId,
          toStepId: "end",
          confidence: classifier.confidence,
          reasoning: classifier.reasoning,
          source: classifier.source
        },
        consumedReply: true
      };

    case "correction": {
      const targetStep =
        findStepById(steps, classifier.correctionTarget) ||
        (fromStep && findStepByNumber(steps, fromStep.stepNumber - 1)) ||
        null;
      if (!targetStep || !fromStep) {
        return {
          action: "send_hint",
          presentStep: null,
          hintText:
            "Claro, ajusto isso. Qual informação você quer corrigir: data, quantidade, contato ou outra coisa?",
          memoryPatch: {},
          hookFires: [],
          audit: {
            intent: "correction",
            fromStepId,
            toStepId: null,
            confidence: classifier.confidence,
            reasoning: "Correção sem alvo identificável.",
            source: classifier.source
          },
          consumedReply: true
        };
      }
      const cleanedAnswers = dropAnswersFrom(memory.answersByStep, targetStep.stepNumber);
      const cleanedCompleted = dropCompletedFrom(memory.completedSteps, targetStep.stepNumber);
      return {
        action: "present_step",
        presentStep: targetStep,
        hintText: null,
        memoryPatch: {
          lastPresentedStep: targetStep.stepNumber,
          awaitingUserReply: true,
          answersByStep: cleanedAnswers,
          completedSteps: cleanedCompleted,
          flowPhase: "active"
        },
        hookFires: [
          {
            moment: "on_correction",
            step: targetStep,
            fromStepId,
            toStepId: targetStep.stepId,
            corrected: true
          },
          {
            moment: "on_enter",
            step: targetStep,
            fromStepId,
            toStepId: targetStep.stepId
          },
          {
            moment: "on_present",
            step: targetStep,
            fromStepId,
            toStepId: targetStep.stepId
          }
        ],
        audit: {
          intent: "correction",
          fromStepId,
          toStepId: targetStep.stepId,
          confidence: classifier.confidence,
          reasoning: `Voltando para ${targetStep.stepId} a pedido do cliente.`,
          source: classifier.source,
          filledSlot: classifier.filledSlot
        },
        consumedReply: true
      };
    }

    case "advance":
    default: {
      if (!fromStep) {
        return {
          action: "noop",
          presentStep: null,
          hintText: null,
          memoryPatch: {},
          hookFires: [],
          audit: {
            intent: classifier.intent,
            fromStepId,
            toStepId: null,
            confidence: classifier.confidence,
            reasoning: "Sem step ativo para avançar.",
            source: classifier.source
          },
          consumedReply: false
        };
      }
      /** Decide próximo: branch match > linear fallback. */
      let nextId: string | null = null;
      if (classifier.matchedBranch?.nextStepId) {
        nextId = String(classifier.matchedBranch.nextStepId);
      } else {
        const linear = (fromStep.branchesIR || []).find((b) => b.matcher === "always");
        nextId = linear?.nextStepId || null;
      }

      /** answersByStep — sempre registra a resposta crua / slot. */
      const slotValue = classifier.filledSlot?.value;
      const recordedText =
        input.userText != null
          ? input.userText
          : classifier.filledSlot?.rawText ||
            (slotValue == null ? null : String(slotValue));

      const newAnswers = mergeAnswers(
        memory.answersByStep,
        fromStep.stepNumber,
        recordedText
      );
      const completedSet = new Set([...(memory.completedSteps || []), fromStep.stepNumber]);
      const newCompleted = [...completedSet].sort((a, b) => a - b);

      const afterReplyHooks: HookFireRequest[] = [
        {
          moment: "after_reply",
          step: fromStep,
          fromStepId,
          toStepId: nextId,
          matched: !!classifier.matchedBranch
        }
      ];

      /** Sem branch explícito: seguir linearmente antes de considerar o fluxo concluído. */
      const implicitNextStep = !nextId ? nextLinearStep(steps, fromStep.stepNumber) : null;

      /** Terminal (nextId='end' ou sem próximo linear) → completa. */
      if (nextId === "end" || (!nextId && !implicitNextStep)) {
        return {
          action: "complete_flow",
          presentStep: null,
          hintText: null,
          memoryPatch: {
            flowPhase: "completed" as AttendanceFlowPhase,
            awaitingUserReply: false,
            answersByStep: newAnswers,
            completedSteps: newCompleted
          },
          hookFires: [
            ...afterReplyHooks,
            { moment: "on_exit", step: fromStep, fromStepId, toStepId: "end" },
            { moment: "on_flow_complete", step: fromStep, fromStepId, toStepId: "end" }
          ],
          audit: {
            intent: classifier.intent,
            fromStepId,
            toStepId: "end",
            confidence: classifier.confidence,
            reasoning: classifier.reasoning,
            source: classifier.source,
            filledSlot: classifier.filledSlot
          },
          consumedReply: true
        };
      }

      let nextStep = implicitNextStep || findStepById(steps, nextId) || nextLinearStep(steps, fromStep.stepNumber);
      if (nextStep && (memory.completedSteps || []).includes(nextStep.stepNumber)) {
        nextStep = nextUncompletedStep(steps, fromStep.stepNumber, memory.completedSteps) || nextStep;
      }
      if (!nextStep) {
        return {
          action: "complete_flow",
          presentStep: null,
          hintText: null,
          memoryPatch: {
            flowPhase: "completed" as AttendanceFlowPhase,
            awaitingUserReply: false,
            answersByStep: newAnswers,
            completedSteps: newCompleted
          },
          hookFires: [
            ...afterReplyHooks,
            { moment: "on_exit", step: fromStep, fromStepId, toStepId: "end" },
            { moment: "on_flow_complete", step: fromStep, fromStepId, toStepId: "end" }
          ],
          audit: {
            intent: classifier.intent,
            fromStepId,
            toStepId: "end",
            confidence: classifier.confidence,
            reasoning: `Próximo step "${nextId}" não encontrado; encerrando.`,
            source: classifier.source,
            filledSlot: classifier.filledSlot
          },
          consumedReply: true
        };
      }

      /** NO REPEAT: se nextStep já foi a apresentada e está awaiting, devolve noop. */
      if (
        nextStep.stepNumber === currentStepNumber &&
        memory.awaitingUserReply === true
      ) {
        return {
          action: "noop",
          presentStep: null,
          hintText: null,
          memoryPatch: { answersByStep: newAnswers },
          hookFires: afterReplyHooks,
          audit: {
            intent: classifier.intent,
            fromStepId,
            toStepId: fromStepId,
            confidence: classifier.confidence,
            reasoning: "Próximo step é a etapa ativa — evitando reapresentar.",
            source: classifier.source
          },
          consumedReply: true
        };
      }

      return {
        action: "present_step",
        presentStep: nextStep,
        hintText: null,
        memoryPatch: {
          lastPresentedStep: nextStep.stepNumber,
          awaitingUserReply: true,
          answersByStep: newAnswers,
          completedSteps: newCompleted,
          flowPhase: "active"
        },
        hookFires: [
          ...afterReplyHooks,
          {
            moment: "on_transition",
            step: nextStep,
            fromStepId,
            toStepId: nextStep.stepId,
            matched: !!classifier.matchedBranch
          },
          {
            moment: "on_enter",
            step: nextStep,
            fromStepId,
            toStepId: nextStep.stepId
          },
          {
            moment: "on_present",
            step: nextStep,
            fromStepId,
            toStepId: nextStep.stepId
          }
        ],
        audit: {
          intent: classifier.intent,
          fromStepId,
          toStepId: nextStep.stepId,
          confidence: classifier.confidence,
          reasoning: classifier.reasoning,
          source: classifier.source,
          filledSlot: classifier.filledSlot
        },
        consumedReply: true
      };
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                                Feature flag                                */
/* -------------------------------------------------------------------------- */

export function isFlowEngineV2Enabled(): boolean {
  const v = String(process.env.ATTENDANCE_FLOW_ENGINE_V2_ENABLED || "").toLowerCase().trim();
  return v === "1" || v === "true" || v === "on" || v === "yes";
}
