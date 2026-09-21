/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Gatilhos e contextos por ação (múltipla escolha).
 * IDs estáveis — o backend usa os mesmos para o prompt.
 */

export const TRIGGER_OPTIONS = [
  { id: "meeting_intent", label: "Fala em reunião, agenda, data ou horário" },
  { id: "price_intent", label: "Pergunta preço, valor, orçamento ou plano" },
  { id: "human_request", label: "Pedido explícito de atendente ou humano" },
  { id: "order_intent", label: "Pedido, status de compra ou entrega" },
  { id: "lead_intent", label: "Quer ser contato, cadastro ou proposta" },
  { id: "company_intent", label: "Dados de empresa, CNPJ ou razão social" },
  { id: "qualify_signal", label: "Sinais de interesse (fit, necessidade, prazo)" },
  { id: "silence_followup", label: "Cliente sumiu ou não respondeu" },
  { id: "objection", label: "Objeção ou dúvida bloqueando avanço" },
  { id: "upsell_signal", label: "Momento para add-on, upgrade ou pacote" }
];

export const CONTEXT_OPTIONS = [
  { id: "ctx_sales", label: "Contexto comercial / vendas" },
  { id: "ctx_support", label: "Suporte técnico ou dúvida de uso" },
  { id: "ctx_post_sale", label: "Pós-venda / relacionamento" },
  { id: "ctx_new_lead", label: "Lead novo / primeiro contato" },
  { id: "ctx_existing", label: "Cliente já ativo ou recorrente" },
  { id: "ctx_urgent", label: "Urgência ou prazo curto" },
  { id: "ctx_neutral", label: "Neutro / a definir na conversa" }
];

export const STANDARD_ACTION_NAMES = [
  "Agendamento",
  "Criar Lead",
  "Criar Empresa",
  "Consultar Pedidos",
  "Transferir Chamado",
  "Resumo p/ handoff",
  "Qualificar interesse",
  "Follow-up suave",
  "Oferta contextual"
];

/**
 * Campos de vínculo por ação (UI).
 * - responsibleOnly: só responsável (usuário) opcional — CRM, agenda, conversação.
 * - transferBlock: destino de transferência só no bloco dedicado (fila e/ou usuário + integração opcional).
 */
export const DEST_FIELD_MODE_BY_ACTION = {
  Agendamento: "responsibleOnly",
  "Criar Lead": "responsibleOnly",
  "Criar Empresa": "responsibleOnly",
  "Consultar Pedidos": "responsibleOnly",
  "Transferir Chamado": "transferBlock",
  "Resumo p/ handoff": "responsibleOnly",
  "Qualificar interesse": "responsibleOnly",
  "Follow-up suave": "responsibleOnly",
  "Oferta contextual": "responsibleOnly"
};

/**
 * Necessidade de dados por ação (espelha regras de negócio / validação).
 * - responsibleOptional: responsável ajuda o modelo; não bloqueia salvamento.
 * - queueOrUserRequired: encaminhar exige fila OU usuário (integração opcional).
 */
export const ACTION_DEST_REQUIREMENTS = {
  Agendamento: "responsibleOptional",
  "Criar Lead": "responsibleOptional",
  "Criar Empresa": "responsibleOptional",
  "Consultar Pedidos": "responsibleOptional",
  "Transferir Chamado": "queueOrUserRequired",
  "Resumo p/ handoff": "responsibleOptional",
  "Qualificar interesse": "responsibleOptional",
  "Follow-up suave": "responsibleOptional",
  "Oferta contextual": "responsibleOptional"
};

/** Defaults ao habilitar uma ação (intenção principal daquela ação). */
export const DEFAULT_TRIGGERS_BY_ACTION = {
  Agendamento: ["meeting_intent"],
  "Criar Lead": ["lead_intent", "qualify_signal"],
  "Criar Empresa": ["company_intent"],
  "Consultar Pedidos": ["order_intent"],
  "Transferir Chamado": ["human_request"],
  "Resumo p/ handoff": ["human_request", "qualify_signal"],
  "Qualificar interesse": ["qualify_signal", "price_intent"],
  "Follow-up suave": ["silence_followup"],
  "Oferta contextual": ["upsell_signal", "price_intent"]
};

export const DEFAULT_CONTEXTS_BY_ACTION = {
  Agendamento: ["ctx_neutral", "ctx_sales"],
  "Criar Lead": ["ctx_new_lead", "ctx_sales"],
  "Criar Empresa": ["ctx_neutral"],
  "Consultar Pedidos": ["ctx_existing", "ctx_support"],
  "Transferir Chamado": ["ctx_urgent", "ctx_support"],
  "Resumo p/ handoff": ["ctx_support", "ctx_neutral"],
  "Qualificar interesse": ["ctx_sales", "ctx_new_lead"],
  "Follow-up suave": ["ctx_neutral", "ctx_post_sale"],
  "Oferta contextual": ["ctx_sales", "ctx_existing"]
};
