/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Contact from "../models/Contact";
import WhatsappLidMap from "../models/WhatsapplidMap";
import Whatsapp from "../models/Whatsapp";
import { getWbot } from "../libs/wbot";
import logger from "../utils/logger";
import { Op } from "sequelize";


const populateContactLids = async (companyId?: number) => {
  try {
    logger.info("RDS - Iniciando população de LIDs para contatos existentes...");

    const whereCondition = companyId ? { companyId } : {};

    const whatsapps = await Whatsapp.findAll({
      where: {
        status: "CONNECTED",
        ...whereCondition
      }
    });

    if (!whatsapps.length) {
      logger.error("RDS - Nenhum WhatsApp conectado encontrado. O script não pode continuar.");
      return;
    }

    logger.info(`RDS - Encontrados ${whatsapps.length} conexões WhatsApp para processar.`);

    for (const whatsapp of whatsapps) {
      try {
        const wbot = await getWbot(whatsapp.id);
        if (!wbot) {
          logger.error(`WhatsApp ID ${whatsapp.id} não encontrado no wbot. Pulando...`);
          continue;
        }

        logger.info(`RDS - Processando contatos da empresa ${whatsapp.companyId} com WhatsApp ID ${whatsapp.id}...`);

        const contacts = await Contact.findAll({
          where: {
            companyId: whatsapp.companyId,
            isGroup: false,
            [Op.or]: [
              { lid: null },
              { lid: "" }
            ]
          },
          include: [
            {
              model: WhatsappLidMap,
              required: false
            }
          ]
        });

        logger.info(`RDS - Encontrados ${contacts.length} contatos sem LID para processar na empresa ${whatsapp.companyId}`);

        let successCount = 0;
        let errorCount = 0;
        let existingCount = 0;

        const batchSize = 10;
        for (let i = 0; i < contacts.length; i += batchSize) {
          const batch = contacts.slice(i, i + batchSize);

          const promises = batch.map(async (contact) => {
            try {
              const existingMap = await WhatsappLidMap.findOne({
                where: {
                  contactId: contact.id,
                  companyId: contact.companyId
                }
              });

              if (existingMap) {
                existingCount++;
                return;
              }

              const formattedNumber = contact.number.includes("@")
                ? contact.number
                : `${contact.number}@s.whatsapp.net`;

              const result = await wbot.onWhatsApp(formattedNumber);

              if (result && result.length > 0 && result[0].exists && result[0].lid) {
                const lid = result[0].lid as string;

                await contact.update({ lid });

                await WhatsappLidMap.create({
                  lid,
                  contactId: contact.id,
                  companyId: contact.companyId
                });

                logger.info(`RDS - Mapeado LID ${lid} para contato ${contact.id} (${contact.name || contact.number})`);
                successCount++;
              } else {
                logger.warn(`RDS - Contato ${contact.id} (${contact.name || contact.number}) não existe no WhatsApp ou não retornou LID`);
                errorCount++;
              }
            } catch (error) {
              logger.error(`RDS - Erro ao processar contato ${contact.id}: ${error.message}`);
              errorCount++;
            }
          });

          // Aguardar o lote atual
          await Promise.all(promises);

          // Pausa para evitar sobrecarga na API do WhatsApp
          await new Promise(resolve => setTimeout(resolve, 1000));

          logger.info(`RDS - Progresso: ${Math.min(i + batchSize, contacts.length)}/${contacts.length} contatos processados`);
        }

        logger.info(`RDS - Empresa ${whatsapp.companyId}: ${successCount} contatos mapeados com sucesso, ${errorCount} falhas, ${existingCount} já existentes.`);
      } catch (error) {
        logger.error(`RDS - Erro ao processar WhatsApp ${whatsapp.id}: ${error.message}`);
      }
    }

    logger.info("RDS - Processo de população de LIDs concluído!");
  } catch (error) {
    logger.error("RDS - Erro durante a execução do script de população de LIDs:", error);
    throw error;
  }
};

// Executar como script autônomo ou exportar como função
if (require.main === module) {
  const companyId = process.argv[2] ? parseInt(process.argv[2]) : undefined;

  populateContactLids(companyId)
    .then(() => {
      logger.info("RDS - Script de população de LIDs executado com sucesso!");
      process.exit(0);
    })
    .catch(error => {
      logger.error("RDS - Erro ao executar script de população de LIDs:", error);
      process.exit(1);
    });
}

export default populateContactLids;
