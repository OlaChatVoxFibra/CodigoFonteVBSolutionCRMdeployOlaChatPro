"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


const PRESETS = [
  {
    slugs: ["criarlead", "criar_lead"],
    types: ["criar_lead"],
    agent: [
      "me passe seu nome",
      "me passa seu e-mail",
      "qual seu telefone",
      "me informe seus dados",
      "me diga seu contato",
      "qual seu melhor e-mail",
      "qual número para contato",
      "vou registrar seu cadastro",
      "me envie nome e telefone",
      "preciso dos seus dados"
    ],
    user: [
      "@",
      "nome:",
      "telefone:",
      "whats:",
      "email",
      "e-mail",
      "meu nome",
      "meu telefone",
      "contato",
      "celular",
      "gmail.com",
      "hotmail.com"
    ],
    slots: [
      { name: "name", type: "string", required: true, label: "Nome" },
      { name: "email", type: "string", required: false, label: "E-mail" },
      { name: "phone", type: "string", required: true, label: "Telefone" },
      { name: "company", type: "string", required: false, label: "Empresa" },
      { name: "city", type: "string", required: false, label: "Cidade" },
      { name: "interest", type: "string", required: false, label: "Interesse" },
      { name: "responsibleId", type: "number", required: false, label: "Responsável" },
      { name: "description", type: "string", required: false, label: "Observações" }
    ]
  },
  {
    slugs: ["criaratividade", "criar_atividade"],
    types: ["criar_atividade", "ticket"],
    agent: [
      "vou registrar uma atividade",
      "vou criar uma atividade",
      "vou deixar essa tarefa registrada",
      "vou anotar para o responsável",
      "vou criar um lembrete",
      "vou abrir uma tarefa",
      "vou registrar esse acompanhamento",
      "vou deixar isso como pendência"
    ],
    user: [
      "cria uma atividade",
      "registra isso",
      "anota aí",
      "deixa registrado",
      "cria uma tarefa",
      "faz um lembrete",
      "me lembra",
      "acompanhar depois"
    ],
    slots: [
      { name: "title", type: "string", required: false, label: "Título" },
      { name: "description", type: "string", required: false, label: "Descrição" },
      { name: "date", type: "datetime", required: false, label: "Data" },
      { name: "userId", type: "number", required: false, label: "Responsável" }
    ]
  },
  {
    slugs: ["criarcontato", "criar_contato"],
    types: ["criar_contato"],
    agent: [
      "vou registrar seu contato",
      "vou criar seu contato",
      "vou atualizar seu contato",
      "me passe nome e telefone",
      "me informe seus dados de contato",
      "vou salvar seus dados de contato",
      "vou deixar seu contato cadastrado",
      "qual nome e telefone para contato"
    ],
    user: [
      "meu nome",
      "telefone",
      "whatsapp",
      "contato",
      "celular",
      "email",
      "e-mail",
      "@",
      "pode cadastrar",
      "salva meu contato"
    ],
    slots: [
      { name: "name", type: "string", required: true, label: "Nome" },
      { name: "phone", type: "string", required: true, label: "Telefone" },
      { name: "email", type: "string", required: false, label: "E-mail" },
      { name: "company", type: "string", required: false, label: "Empresa" },
      { name: "city", type: "string", required: false, label: "Cidade" }
    ]
  }
];

function arrayIsEmptySql(column) {
  return `(${column} IS NULL OR jsonb_typeof(${column}) <> 'array' OR jsonb_array_length(${column}) = 0)`;
}

module.exports = {
  up: async (queryInterface) => {
    const table = await queryInterface.describeTable("PromptSmartActions").catch(() => null);
    if (!table || !table.agentTriggerPatterns || !table.userTriggerPatterns || !table.intentSlotSchema) {
      return;
    }

    for (const preset of PRESETS) {
      await queryInterface.sequelize.query(
        `
          UPDATE "PromptSmartActions"
          SET
            "enabled" = COALESCE("enabled", TRUE),
            "agentTriggerPatterns" = CASE
              WHEN ${arrayIsEmptySql('"agentTriggerPatterns"')} THEN CAST(:agent AS jsonb)
              ELSE "agentTriggerPatterns"
            END,
            "userTriggerPatterns" = CASE
              WHEN ${arrayIsEmptySql('"userTriggerPatterns"')} THEN CAST(:user AS jsonb)
              ELSE "userTriggerPatterns"
            END,
            "intentSlotSchema" = CASE
              WHEN ${arrayIsEmptySql('"intentSlotSchema"')} THEN CAST(:slots AS jsonb)
              ELSE "intentSlotSchema"
            END,
            "updatedAt" = NOW()
          WHERE LOWER(COALESCE("slug", '')) IN (:slugs)
             OR LOWER(COALESCE("type", '')) IN (:types)
        `,
        {
          replacements: {
            slugs: preset.slugs,
            types: preset.types,
            agent: JSON.stringify(preset.agent),
            user: JSON.stringify(preset.user),
            slots: JSON.stringify(preset.slots)
          }
        }
      );
    }
  },

  down: async () => {
    // No-op: gatilhos e slots podem ter sido editados pelo usuário após o backfill.
  }
};
