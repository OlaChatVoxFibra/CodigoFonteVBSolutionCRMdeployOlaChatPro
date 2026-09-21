/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { QueryInterface } from "sequelize";

/**
 * Conexões Telegram ficaram em OPENING quando setWebhook falhou;
 * isso exibia spinner infinito na tela de Conexões.
 */
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      UPDATE "Whatsapps"
      SET status = 'CONNECTED', "updatedAt" = NOW()
      WHERE LOWER(channel) = 'telegram'
        AND status = 'OPENING'
        AND token IS NOT NULL
        AND TRIM(token) <> ''
    `);
  },

  down: async () => {
    /* irreversível com segurança — status OPENING era incorreto para Telegram */
  }
};
