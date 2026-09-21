"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


const PRESETS = [
  {
    slugs: ["agendamento", "agendar", "marcarhorario", "marcar_horario"],
    types: ["agendamento"],
    agent: [
      "gostaria de agendar",
      "quer agendar",
      "podemos marcar",
      "qual o melhor dia",
      "qual o melhor horário",
      "me passe o dia e horário"
    ],
    user: [
      "amanhã",
      "depois de amanhã",
      "semana que vem",
      "próxima semana",
      "dia 1",
      "às 10h",
      "horário"
    ],
    slots: [{ name: "date", type: "datetime", required: true, label: "Data e horário" }]
  },
  {
    slugs: ["transferirchamado", "transferiratendimento", "transferir_chamado"],
    types: ["transferir", "transfer"],
    agent: [
      "vou te transferir",
      "passar para um atendente",
      "encaminhar para um atendente",
      "atendente humano"
    ],
    user: ["sim", "pode transferir", "ok", "quero falar com atendente"],
    slots: []
  },
  {
    slugs: ["criarlead", "criar_lead"],
    types: ["criar_lead"],
    agent: ["me passe seu nome", "me passa seu e-mail", "qual seu telefone", "me informe seus dados"],
    user: ["@", "nome:", "telefone:", "whats:"],
    slots: [
      { name: "name", type: "string", required: false, label: "Nome" },
      { name: "email", type: "string", required: false, label: "E-mail" },
      { name: "phone", type: "string", required: false, label: "Telefone" }
    ]
  },
  {
    slugs: ["enviarlink", "enviar_link"],
    types: ["enviar_link"],
    agent: ["segue o link", "vou te enviar o link", "aqui está o link"],
    user: ["manda o link", "envia o link", "qual o link"],
    slots: []
  },
  {
    slugs: ["consultaragenda", "verificaragenda"],
    types: ["consultar_agenda"],
    agent: ["vou verificar a agenda", "deixa eu conferir a disponibilidade", "vou checar"],
    user: ["tem disponibilidade", "tem horário", "qual o próximo horário"],
    slots: []
  },
  {
    slugs: ["consultarprodutos"],
    types: ["consultar_produtos"],
    agent: ["temos os seguintes produtos", "vou te mostrar nosso catálogo"],
    user: ["quais produtos", "tem catálogo", "o que vocês vendem"],
    slots: []
  },
  {
    slugs: ["passarpreco", "preco"],
    types: ["preco"],
    agent: ["o valor é", "o preço fica", "o investimento é"],
    user: ["qual o preço", "quanto custa", "qual o valor"],
    slots: []
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
    // No-op: os gatilhos podem ter sido editados pelo usuário depois do backfill.
  }
};
