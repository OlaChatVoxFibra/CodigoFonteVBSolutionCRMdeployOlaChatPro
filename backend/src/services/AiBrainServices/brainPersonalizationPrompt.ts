/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export interface BrainPersonalizationPayload {
  toneStyle?: string;
  verbosity?: string;
  proactivity?: string;
  conversationStyle?: string;
  emojiUsage?: string;
  askClarifyingQuestions?: boolean;
  useBulletPoints?: boolean;
  customInstructions?: string;
}

const TONE_PROMPTS: Record<string, string> = {
  formal: "Use tom formal e profissional.",
  balanced: "Use tom equilibrado: cordial e claro.",
  casual: "Use tom descontraído e conversacional.",
  direct: "Seja direto e vá ao ponto."
};

const VERBOSITY_PROMPTS: Record<string, string> = {
  concise: "Prefira respostas curtas; evite texto desnecessário.",
  balanced: "Equilibre brevidade e contexto útil.",
  detailed: "Pode detalhar mais quando isso ajudar o usuário."
};

const PROACTIVITY_PROMPTS: Record<string, string> = {
  reactive: "Responda estritamente ao pedido; não sugira extras sem necessidade.",
  balanced: "Sugira próximo passo apenas quando agregar valor claro.",
  proactive: "Antecipe necessidades e proponha ações úteis relacionadas ao pedido."
};

const STYLE_PROMPTS: Record<string, string> = {
  collaborative: "Atue como parceiro de trabalho do usuário.",
  instructional: "Explique passo a passo quando o tema for complexo.",
  executive: "Priorize decisões, impacto e clareza executiva.",
  analytical: "Estruture raciocínio com dados, comparações e conclusões."
};

const EMOJI_PROMPTS: Record<string, string> = {
  never: "Não use emojis.",
  sparingly: "Use emojis com moderação, no máximo um por resposta quando couber.",
  often: "Pode usar emojis com frequência para um tom mais expressivo."
};

export function parseBrainPersonalization(raw: unknown): BrainPersonalizationPayload | null {
  if (!raw) return null;
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;
  const customInstructions = String(obj.customInstructions || "").trim().slice(0, 2000);
  return {
    toneStyle: String(obj.toneStyle || "balanced"),
    verbosity: String(obj.verbosity || "balanced"),
    proactivity: String(obj.proactivity || "balanced"),
    conversationStyle: String(obj.conversationStyle || "collaborative"),
    emojiUsage: String(obj.emojiUsage || "sparingly"),
    askClarifyingQuestions: obj.askClarifyingQuestions !== false,
    useBulletPoints: obj.useBulletPoints !== false,
    customInstructions
  };
}

export function buildBrainPersonalizationBlock(
  personalization?: BrainPersonalizationPayload | null
): string {
  if (!personalization) return "";

  const lines: string[] = [];
  const tone = TONE_PROMPTS[personalization.toneStyle || ""] || TONE_PROMPTS.balanced;
  const verbosity = VERBOSITY_PROMPTS[personalization.verbosity || ""] || VERBOSITY_PROMPTS.balanced;
  const proactivity =
    PROACTIVITY_PROMPTS[personalization.proactivity || ""] || PROACTIVITY_PROMPTS.balanced;
  const style =
    STYLE_PROMPTS[personalization.conversationStyle || ""] || STYLE_PROMPTS.collaborative;
  const emoji = EMOJI_PROMPTS[personalization.emojiUsage || ""] || EMOJI_PROMPTS.sparingly;

  lines.push(tone, verbosity, proactivity, style, emoji);
  lines.push(
    personalization.askClarifyingQuestions !== false
      ? "Faça perguntas de esclarecimento quando faltar informação essencial."
      : "Evite perguntas extras; assuma o contexto disponível e siga em frente."
  );
  lines.push(
    personalization.useBulletPoints !== false
      ? "Use listas e tópicos quando organizar várias ideias."
      : "Prefira parágrafos corridos em vez de listas longas."
  );

  if (personalization.customInstructions?.trim()) {
    lines.push(`Instruções adicionais do usuário: ${personalization.customInstructions.trim()}`);
  }

  return `\n\n**PERSONALIZAÇÃO DO USUÁRIO (Brain.AI):**\n${lines.map((l) => `- ${l}`).join("\n")}`;
}
