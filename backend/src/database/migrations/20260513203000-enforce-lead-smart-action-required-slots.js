"use strict";
/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */


const LEAD_SLOTS = [
  { name: "name", type: "string", required: true, label: "Nome" },
  { name: "email", type: "string", required: false, label: "E-mail" },
  { name: "phone", type: "string", required: true, label: "Telefone" },
  { name: "company", type: "string", required: false, label: "Empresa" },
  { name: "city", type: "string", required: false, label: "Cidade" },
  { name: "interest", type: "string", required: false, label: "Interesse" },
  { name: "responsibleId", type: "number", required: false, label: "Responsável" },
  { name: "description", type: "string", required: false, label: "Observações" }
];

module.exports = {
  up: async (queryInterface) => {
    const table = await queryInterface.describeTable("PromptSmartActions").catch(() => null);
    if (!table || !table.intentSlotSchema) return;

    await queryInterface.sequelize.query(
      `
        UPDATE "PromptSmartActions"
        SET
          "intentSlotSchema" = CAST(:slots AS jsonb),
          "updatedAt" = NOW()
        WHERE (
          LOWER(COALESCE("slug", '')) IN ('criarlead', 'criar_lead')
          OR LOWER(COALESCE("type", '')) = 'criar_lead'
        )
        AND (
          "intentSlotSchema" IS NULL
          OR jsonb_typeof("intentSlotSchema") <> 'array'
          OR NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements("intentSlotSchema") AS slot
            WHERE slot->>'name' = 'name'
              AND COALESCE((slot->>'required')::boolean, false) = true
          )
          OR NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements("intentSlotSchema") AS slot
            WHERE slot->>'name' = 'phone'
              AND COALESCE((slot->>'required')::boolean, false) = true
          )
        )
      `,
      {
        replacements: {
          slots: JSON.stringify(LEAD_SLOTS)
        }
      }
    );
  },

  down: async () => {
    // No-op: não rebaixa campos obrigatórios porque a action pode ter sido editada.
  }
};
