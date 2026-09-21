/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

// Criar arquivo: BulkDeleteContactsService.ts

import { Transaction } from "sequelize";
import sequelize from "../../database";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";
import ContactWallet from "../../models/ContactWallet";
import ContactTag from "../../models/ContactTag";
import AppError from "../../errors/AppError";
import { Op } from "sequelize";

interface Request {
  contactIds: number[];
  companyId: number;
}

const BulkDeleteContactsService = async ({
  contactIds,
  companyId
}: Request): Promise<number> => {
  const transaction: Transaction = await sequelize.transaction();

  try {
    // Verificar se todos os contatos existem e pertencem à empresa
    const existingContacts = await Contact.findAll({
      where: {
        id: {
          [Op.in]: contactIds
        },
        companyId
      },
      attributes: ["id"],
      transaction
    });

    if (existingContacts.length === 0) {
      throw new AppError("No contacts found for deletion", 404);
    }

    const existingContactIds = existingContacts.map(contact => contact.id);
    
    // Verificar se algum ID não foi encontrado
    const notFoundIds = contactIds.filter(id => !existingContactIds.includes(id));
    if (notFoundIds.length > 0) {
      console.warn(`Contacts not found or not belonging to company: ${notFoundIds.join(', ')}`);
    }

    // Excluir relacionamentos em ordem (FK constraints)
    await ContactCustomField.destroy({
      where: {
        contactId: {
          [Op.in]: existingContactIds
        }
      },
      transaction
    });

    await ContactWallet.destroy({
      where: {
        contactId: {
          [Op.in]: existingContactIds
        },
        companyId
      },
      transaction
    });

    await ContactTag.destroy({
      where: {
        contactId: {
          [Op.in]: existingContactIds
        }
      },
      transaction
    });

    // Excluir contatos
    const deletedCount = await Contact.destroy({
      where: {
        id: {
          [Op.in]: existingContactIds
        },
        companyId
      },
      transaction
    });

    await transaction.commit();
    return deletedCount;

  } catch (error) {
    await transaction.rollback();
    console.error("Error in BulkDeleteContactsService:", error);
    
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new AppError("Failed to delete contacts", 500);
  }
};

export default BulkDeleteContactsService;