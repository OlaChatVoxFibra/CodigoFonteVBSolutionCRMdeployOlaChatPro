/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { scriptHasExplicitStepMarkers } from "./promptV2Payload";

function parsePromptCargo(prompt: any): Record<string, unknown> {
  const raw = prompt?.cargo;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      /* ignore */
    }
  }
  return {};
}

/** Conta caracteres úteis (letras/dígitos) ignorando marcadores de roteiro. */
function countUsefulChars(text: string): number {
  return String(text || "")
    .replace(/[#\-_*`]/g, " ")
    .replace(/\b(?:etapa|passo|mensagem|resposta|exemplo|roteiro)\b/gi, " ")
    .replace(/\s+/g, "")
    .replace(/[^0-9a-zà-ÿ]/gi, "")
    .length;
}

export function isAgentFluxoEnabled(prompt: any): boolean {
  const cargo = parsePromptCargo(prompt);
  const sectionFlags = (cargo.sectionFlags || {}) as Record<string, unknown>;
  return sectionFlags.fluxoEnabled !== false;
}

export function hasMeaningfulAgentRoteiroContent(prompt: any): boolean {
  const steps = Array.isArray(prompt?.attendanceFlowSteps) ? prompt.attendanceFlowSteps : [];
  for (const step of steps) {
    const text = String(step?.customerVisibleText || step?.agentPrompt || "").trim();
    if (countUsefulChars(text) >= 20) return true;
  }

  const scriptBlob = `${String(prompt?.attendanceScript || "")}\n${String(prompt?.prompt || "")}`.trim();
  if (countUsefulChars(scriptBlob) < 20) return false;

  if (steps.length > 0) return true;
  if (scriptHasExplicitStepMarkers(scriptBlob)) return true;
  if (/(?:^|\r?\n)\s*#?\s*(?:ETAPA|PASSO)\s*\d+/im.test(scriptBlob)) return true;
  if (/(?:^|\r?\n)\s*---\s*(?:\r?\n|$)/.test(scriptBlob)) return true;

  return countUsefulChars(scriptBlob) >= 20;
}

export function isAgentRoteiroRuntimeActive(prompt: any): boolean {
  return isAgentFluxoEnabled(prompt) && hasMeaningfulAgentRoteiroContent(prompt);
}

export const AGENT_CONSULTIVE_MODE_DIRECTIVE_PT = `
--- Modo consultivo (sem roteiro visual ativo) ---
Prioridade de resposta: (1) Regras gerais (2) FAQ (3) Base de conhecimento (4) Ações inteligentes (5) Histórico e memória do ticket.
Não force sequência de etapas nem envie blocos canned de onboarding. Responda o que o cliente perguntou ou pediu, de forma natural.
Use file_search / base de conhecimento quando a resposta depender de documentação ou políticas da empresa.
Ações (/agendamento, transferência, lead etc.) só quando o contexto da conversa justificar — não por ordem de script.
--- Fim modo consultivo ---
`.trim();
