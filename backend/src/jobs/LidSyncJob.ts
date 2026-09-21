/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op } from "sequelize";
import Contact from "../models/Contact";
import WhatsappLidMap from "../models/WhatsapplidMap";
import logger from "../utils/logger";
const CronJob = require("cron").CronJob;

const lidSyncQueueJob = {
  key: `${process.env.DB_NAME}-lidSync`,
  
  async handle({ data }) {
    try {
      const { batchSize = 10 } = data || {};
      const result = await syncContactLids(batchSize);
      return result;
    } catch (error) {
      logger.error("[RDS-LID-SYNC] Erro no processamento da fila:", error);
      throw error;
    }
  }
};

export default lidSyncQueueJob;

/**
 * Job para sincronizar os LIDs dos contatos
 * Busca contatos que já têm LID na tabela WhatsappLidMaps mas não na tabela Contacts
 */
export const startLidSyncJob = () => {
  const lidSyncJob = new CronJob(
    "0 */5 * * * *",
    async () => {
      logger.info("[RDS-LID-SYNC] Iniciando job de sincronização de LIDs...");
      
      try {
        const result = await syncContactLids();
        if (result.processed === 0) {
          logger.info("[RDS-LID-SYNC] Todos contatos já foram sincronizados!");
        } else {
          logger.info(`[RDS-LID-SYNC] Job concluído: ${result.updated}/${result.processed} contatos sincronizados com sucesso`);
        }
      } catch (error) {
        logger.error("[RDS-LID-SYNC] Erro no job de sincronização de LIDs:", error);
      }
    },
    null, 
    true,
    "America/Sao_Paulo"
  );

  logger.info("[RDS-LID-SYNC] Job de sincronização de LIDs iniciado - rodará a cada 5 minutos");

  return lidSyncJob;
};

/**
 * Sincroniza os LIDs dos contatos
 * Busca contatos que têm LID na tabela WhatsappLidMaps mas não na tabela Contacts
 * Atualiza 10 contatos por vez para não sobrecarregar o banco
 * @returns Objeto com informações sobre o processo de sincronização
 */
export const syncContactLids = async (batchSize = 10) => {
  try {
    // Buscar mapeamentos onde o contato tem lid null
    const lidMappings = await WhatsappLidMap.findAll({
      include: [
        {
          model: Contact,
          as: "contact",
          required: true,
          where: {
            [Op.or]: [
              { lid: null },
              { lid: "" }
            ]
          }
        }
      ],
      limit: batchSize
    });

    if (lidMappings.length === 0) {
      logger.info(`[RDS-LID-SYNC] Não foram encontrados contatos para sincronizar`);
      return { processed: 0, updated: 0, hasMore: false };
    }
    
    logger.info(`[RDS-LID-SYNC] Encontrados ${lidMappings.length} contatos para sincronizar`);

    let updatedCount = 0;

    for (const mapping of lidMappings) {
      try {
        await mapping.contact.update({
          lid: mapping.lid
        });
        updatedCount++;
        logger.info(`[RDS-LID-SYNC] Contato ID ${mapping.contactId} atualizado com LID ${mapping.lid}`);
      } catch (error) {
        logger.error(`[RDS-LID-SYNC] Erro ao atualizar contato ID ${mapping.contactId}:`, error);
      }
    }

    logger.info(`[RDS-LID-SYNC] ${updatedCount}/${lidMappings.length} contatos atualizados com sucesso`);
    
    return { 
      processed: lidMappings.length, 
      updated: updatedCount, 
      hasMore: lidMappings.length >= batchSize 
    };
  } catch (error) {
    logger.error("[RDS-LID-SYNC] Erro ao sincronizar LIDs:", error);
    throw error;
  }
};

/**
 * Executa a sincronização de LIDs manualmente para todos os contatos
 * Continua executando em batches até que não haja mais contatos para atualizar
 */
export const syncAllContactLids = async (batchSize = 10) => {
  logger.info("[RDS-LID-SYNC] Iniciando sincronização manual de todos os LIDs...");
  
  try {
    let hasMore = true;
    let totalProcessed = 0;
    let totalUpdated = 0;
    let batchCount = 0;
    
    while (hasMore) {
      batchCount++;
      logger.info(`[RDS-LID-SYNC] Processando lote #${batchCount}...`);
      
      const result = await syncContactLids(batchSize);
      totalProcessed += result.processed;
      totalUpdated += result.updated;
      hasMore = result.hasMore;
      
      if (hasMore) {
        logger.info(`[RDS-LID-SYNC] Aguardando 1 segundo antes do próximo lote...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (totalProcessed === 0) {
      logger.info(`[RDS-LID-SYNC] Sincronização manual concluída. Todos os contatos já estavam sincronizados.`);
    } else {
      logger.info(`[RDS-LID-SYNC] Sincronização manual concluída. Total de contatos processados: ${totalProcessed}, atualizados: ${totalUpdated}`);
    }
  } catch (error) {
    logger.error("[RDS-LID-SYNC] Erro na sincronização manual de LIDs:", error);
    throw error;
  }
};