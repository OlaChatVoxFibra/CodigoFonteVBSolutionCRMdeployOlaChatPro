/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import {
  BRAIN_CONVERSATION_STYLE_OPTIONS,
  BRAIN_EMOJI_OPTIONS,
  BRAIN_PROACTIVITY_OPTIONS,
  BRAIN_TONE_OPTIONS,
  BRAIN_VERBOSITY_OPTIONS,
  normalizeBrainPersonalization,
} from "../config/brainPersonalizationCatalog";

const TONE_PROMPTS = {
  formal: "Use tom formal e profissional.",
  balanced: "Use tom equilibrado: cordial e claro.",
  casual: "Use tom descontraído e conversacional.",
  direct: "Seja direto e vá ao ponto.",
};

const VERBOSITY_PROMPTS = {
  concise: "Prefira respostas curtas; evite texto desnecessário.",
  balanced: "Equilibre brevidade e contexto útil.",
  detailed: "Pode detalhar mais quando isso ajudar o usuário.",
};

const PROACTIVITY_PROMPTS = {
  reactive: "Responda estritamente ao pedido; não sugira extras sem necessidade.",
  balanced: "Sugira próximo passo apenas quando agregar valor claro.",
  proactive: "Antecipe necessidades e proponha ações úteis relacionadas ao pedido.",
};

const STYLE_PROMPTS = {
  collaborative: "Atue como parceiro de trabalho do usuário.",
  instructional: "Explique passo a passo quando o tema for complexo.",
  executive: "Priorize decisões, impacto e clareza executiva.",
  analytical: "Estruture raciocínio com dados, comparações e conclusões.",
};

const EMOJI_PROMPTS = {
  never: "Não use emojis.",
  sparingly: "Use emojis com moderação, no máximo um por resposta quando couber.",
  often: "Pode usar emojis com frequência para um tom mais expressivo.",
};

function labelFor(options, id) {
  return options.find((o) => o.id === id)?.label || id;
}

export function buildBrainPersonalizationPrompt(prefs) {
  const p = normalizeBrainPersonalization(prefs);
  const lines = [
    TONE_PROMPTS[p.toneStyle],
    VERBOSITY_PROMPTS[p.verbosity],
    PROACTIVITY_PROMPTS[p.proactivity],
    STYLE_PROMPTS[p.conversationStyle],
    EMOJI_PROMPTS[p.emojiUsage],
    p.askClarifyingQuestions
      ? "Faça perguntas de esclarecimento quando faltar informação essencial."
      : "Evite perguntas extras; assuma o contexto disponível e siga em frente.",
    p.useBulletPoints
      ? "Use listas e tópicos quando organizar várias ideias."
      : "Prefira parágrafos corridos em vez de listas longas.",
  ];

  if (p.customInstructions) {
    lines.push(`Instruções adicionais do usuário: ${p.customInstructions}`);
  }

  const summary = [
    labelFor(BRAIN_TONE_OPTIONS, p.toneStyle),
    labelFor(BRAIN_VERBOSITY_OPTIONS, p.verbosity),
    labelFor(BRAIN_PROACTIVITY_OPTIONS, p.proactivity),
    labelFor(BRAIN_CONVERSATION_STYLE_OPTIONS, p.conversationStyle),
  ].join(" · ");

  return {
    summary,
    promptBlock: `\n\n**PERSONALIZAÇÃO DO USUÁRIO (Brain.AI):**\n${lines.map((l) => `- ${l}`).join("\n")}`,
    prefs: p,
  };
}
