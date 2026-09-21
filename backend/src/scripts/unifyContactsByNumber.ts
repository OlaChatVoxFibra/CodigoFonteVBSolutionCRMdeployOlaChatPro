/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Contact from "../models/Contact";
import Ticket from "../models/Ticket";
import Message from "../models/Message";
import logger from "../utils/logger";
import WhatsappLidMap from "../models/WhatsapplidMap";
import { Op } from "sequelize";

const unifyContactsByNumber = async (companyId?: number) => {
  try {
    logger.info("Iniciando unificação de contatos duplicados...");

    const whereCondition = companyId ? { companyId } : {};

    const contacts = await Contact.findAll({
      where: whereCondition,
      include: [{
        model: WhatsappLidMap,
        required: false
      }],
      order: [
        ["number", "ASC"],
        ["createdAt", "ASC"]
      ]
    });

    const contactsByNumber = new Map<string, Contact[]>();
    const contactsByLid = new Map<string, Contact[]>();

    contacts.forEach(contact => {
      if (!contactsByNumber.has(contact.number)) {
        contactsByNumber.set(contact.number, []);
      }
      contactsByNumber.get(contact.number)!.push(contact);

      if (contact.lid) {
        if (!contactsByLid.has(contact.lid)) {
          contactsByLid.set(contact.lid, []);
        }
        contactsByLid.get(contact.lid)!.push(contact);
      }

      if (contact.whatsappLidMap?.lid) {
        const lidFromMap = contact.whatsappLidMap.lid;
        if (!contactsByLid.has(lidFromMap)) {
          contactsByLid.set(lidFromMap, []);
        }
        contactsByLid.get(lidFromMap)!.push(contact);
      }
    });

    let unifiedCount = 0;
    let deletedCount = 0;

    for (const [lid, contactList] of contactsByLid) {
      if (contactList.length > 1) {
        logger.info(
          `Unificando ${contactList.length} contatos para o LID ${lid}`
        );

        const mainContact = contactList.sort((a, b) => {
          return a.createdAt.getTime() - b.createdAt.getTime();
        })[0];

        if (!mainContact.lid) {
          mainContact.lid = lid;
          await mainContact.save();
          logger.info(
            `Atualizado LID do contato principal ${mainContact.id} para ${lid}`
          );
        }

        const duplicateContacts = contactList.filter(
          c => c.id !== mainContact.id
        );

        for (const duplicateContact of duplicateContacts) {
          // Transferir tickets (em vez de fechar)
          const ticketsToUpdate = await Ticket.findAll({
            where: { contactId: duplicateContact.id }
          });

          await Ticket.update(
            { contactId: mainContact.id },
            {
              where: { contactId: duplicateContact.id }
            }
          );

          if (ticketsToUpdate.length > 0) {
            logger.info(
              `${ticketsToUpdate.length} tickets transferidos do contato ${duplicateContact.id} para ${mainContact.id}`
            );
          }

          // Transferir mensagens
          const messageCount = await Message.count({
            where: { contactId: duplicateContact.id }
          });

          await Message.update(
            { contactId: mainContact.id },
            {
              where: { contactId: duplicateContact.id }
            }
          );

          if (messageCount > 0) {
            logger.info(
              `${messageCount} mensagens transferidas do contato ${duplicateContact.id} para ${mainContact.id}`
            );
          }

          // Remover mapeamentos de LID do contato duplicado
          await WhatsappLidMap.destroy({
            where: { contactId: duplicateContact.id }
          });

          // Remover o contato duplicado
          await duplicateContact.destroy();
          deletedCount++;
        }

        unifiedCount++;
        logger.info(`Unificação por LID concluída para ${lid}`);
      }
    }

    logger.info("Iniciando unificação por número...");
    for (const [number, contactList] of contactsByNumber) {
      const remainingContacts = await Contact.findAll({
        where: {
          number,
          ...whereCondition
        }
      });

      if (remainingContacts.length > 1) {
        logger.info(
          `Unificando ${remainingContacts.length} contatos para o número ${number}`
        );

        let mainContact = remainingContacts.find(c => !!c.lid) || remainingContacts[0];
        const duplicateContacts = remainingContacts.filter(
          c => c.id !== mainContact.id
        );

        if (!mainContact.lid) {
          const lidContact = remainingContacts.find(c => !!c.lid);
          if (lidContact) {
            mainContact.lid = lidContact.lid;
            await mainContact.save();
            logger.info(
              `Atualizado LID do contato principal ${mainContact.id} para ${lidContact.lid}`
            );
          }
        }

        for (const duplicateContact of duplicateContacts) {
          const ticketsToUpdate = await Ticket.findAll({
            where: { contactId: duplicateContact.id }
          });

          await Ticket.update(
            { contactId: mainContact.id },
            {
              where: { contactId: duplicateContact.id }
            }
          );

          if (ticketsToUpdate.length > 0) {
            logger.info(
              `${ticketsToUpdate.length} tickets transferidos do contato ${duplicateContact.id} para ${mainContact.id}`
            );
          }

          const messageCount = await Message.count({
            where: { contactId: duplicateContact.id }
          });

          await Message.update(
            { contactId: mainContact.id },
            {
              where: { contactId: duplicateContact.id }
            }
          );

          if (messageCount > 0) {
            logger.info(
              `${messageCount} mensagens transferidas do contato ${duplicateContact.id} para ${mainContact.id}`
            );
          }

          await WhatsappLidMap.destroy({
            where: { contactId: duplicateContact.id }
          });

          await duplicateContact.destroy();
          deletedCount++;
        }

        unifiedCount++;
        logger.info(`Unificação por número concluída para ${number}`);
      }
    }

    logger.info("Verificando e criando mapeamentos de LID faltantes...");
    const contactsWithLid = await Contact.findAll({
      where: {
        lid: {
          [Op.not]: null,
          [Op.ne]: ""
        },
        ...whereCondition
      },
      include: [{
        model: WhatsappLidMap,
        required: false
      }]
    });

    let mappingsCreated = 0;
    for (const contact of contactsWithLid) {
      if (!contact.whatsappLidMap && contact.lid) {
        await WhatsappLidMap.create({
          lid: contact.lid,
          contactId: contact.id,
          companyId: contact.companyId
        });
        mappingsCreated++;
      }
    }

    logger.info(
      `Unificação concluída! ${unifiedCount} grupos unificados, ${deletedCount} contatos removidos, ${mappingsCreated} mapeamentos de LID criados`
    );
  } catch (error) {
    logger.error("Erro durante a unificação de contatos:", error);
    throw error;
  }
};

if (require.main === module) {
  const companyId = process.argv[2] ? parseInt(process.argv[2]) : undefined;

  unifyContactsByNumber(companyId)
    .then(() => {
      logger.info("Script de unificação executado com sucesso!");
      process.exit(0);
    })
    .catch(error => {
      logger.error("Erro ao executar script de unificação:", error);
      process.exit(1);
    });
}

export default unifyContactsByNumber;
