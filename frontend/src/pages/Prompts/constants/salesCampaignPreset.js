/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Preset alinhado ao runbook: backend/docs/runbook-fluxo-vendas-agente.md
 * Aplica na UI; o usuário deve clicar em "Salvar proatividade" para persistir.
 */

const EXTRA_HOT_KEYWORDS = [
  "material",
  "pdf",
  "demo",
  "reunião",
  "reuniao",
  "agendar",
  "catálogo",
  "catalogo"
];

function mergeHotKeywords(prevStr) {
  const existing = String(prevStr || "")
    .split(/[,;\n]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const set = new Set([...existing, ...EXTRA_HOT_KEYWORDS]);
  return Array.from(set).join(", ");
}

export function applySalesCampaignPreset(prev) {
  return {
    ...prev,
    followUpAfterDays: 1,
    minHoursBetweenFollowUps: "24",
    maxFollowUpAttempts: 5,
    maxReengagementAttempts: "3",
    proactiveMission: "sales",
    playbook: "prospeccao",
    applySegmentFilters: false,
    hotLeadKeywords: mergeHotKeywords(prev.hotLeadKeywords),
    objectives: {
      ...(prev.objectives || {}),
      follow_up:
        "Reativar a conversa, lembrar proposta de reunião ou demo e avançar para próximo passo comercial sem pressão agressiva.",
      hot_lead:
        "Capitalizar intenção forte: esclarecer dúvidas, reforçar valor e convidar a agendar ou receber material.",
      reengagement:
        "Novo ângulo de valor; retomar com leveza quem ficou inativo após follow-ups.",
      cold_outreach:
        "Primeira abordagem pós-campanha: curiosidade genuína, curta, sem preço na primeira linha.",
      inbound:
        "No chat: qualificar necessidade, alinhar expectativa e conduzir para demo, link ou pagamento."
    },
    inboundConversationBrief:
      prev.inboundConversationBrief ||
      "1) Contexto em uma frase 2) Pergunta de qualificação 3) CTA único (agendar / link / material)",
    hintFollowUp:
      "Retome com tom humano. Se já enviou material ou propôs reunião, cite isso em uma frase. Ofereça 2 opções de horário ou pergunte o melhor dia. Evite repetir o mesmo texto das tentativas anteriores.",
    hintHotLead:
      "Seja objetivo e profissional. Confirme o interesse, alinhe expectativa e convide a próxima ação (material, call ou agendamento).",
    hintReengagement:
      "Mudança de ângulo: novidade, case ou conteúdo útil. Sem culpar o silêncio.",
    hintColdOutreach:
      "Mensagem curta pós-campanha: gancho sobre contexto do negócio do lead; convite a responder uma pergunta simples.",
    sequenceSteps: [
      {
        delayHours: 24,
        hint:
          "Cliente não respondeu ao primeiro disparo: retome com leveza, referência à campanha e convite curto à conversa (sem cobrança)."
      },
      {
        delayHours: 48,
        hint:
          "Segundo toque: reforce benefício concreto ou prova social leve; proponha um próximo passo claro (15 min)."
      }
    ],
    maxProactivePerContactPerDay: prev.maxProactivePerContactPerDay || "2"
  };
}
