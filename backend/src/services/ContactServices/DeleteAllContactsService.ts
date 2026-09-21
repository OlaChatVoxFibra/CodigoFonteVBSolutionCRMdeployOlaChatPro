/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

// Criar arquivo: DeleteAllContactsService.ts

import { Transaction } from "sequelize";
import sequelize from "../../database";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";
import ContactWallet from "../../models/ContactWallet";
import ContactTag from "../../models/ContactTag";
import AppError from "../../errors/AppError";
import { Op } from "sequelize";

interface Request {
  companyId: number;
  excludeIds?: number[];
}

const DeleteAllContactsService = async ({
  companyId,
  excludeIds = []
}: Request): Promise<number> => {
  const transaction: Transaction = await sequelize.transaction();

  try {
    // Construir condição WHERE
    const whereCondition: any = { companyId };
    
    if (excludeIds.length > 0) {
      whereCondition.id = {
        [Op.notIn]: excludeIds
      };
    }

    // Buscar todos os IDs dos contatos que serão excluídos
    const contactsToDelete = await Contact.findAll({
      where: whereCondition,
      attributes: ["id"],
      transaction
    });

    if (contactsToDelete.length === 0) {
      throw new AppError("No contacts found for deletion", 404);
    }

    const contactIds = contactsToDelete.map(contact => contact.id);

    // Excluir relacionamentos em ordem (FK constraints)
    await ContactCustomField.destroy({
      where: {
        contactId: {
          [Op.in]: contactIds
        }
      },
      transaction
    });

    await ContactWallet.destroy({
      where: {
        contactId: {
          [Op.in]: contactIds
        },
        companyId
      },
      transaction
    });

    await ContactTag.destroy({
      where: {
        contactId: {
          [Op.in]: contactIds
        }
      },
      transaction
    });

    // Excluir contatos
    const deletedCount = await Contact.destroy({
      where: whereCondition,
      transaction
    });

    await transaction.commit();
    return deletedCount;

  } catch (error) {
    await transaction.rollback();
    console.error("Error in DeleteAllContactsService:", error);
    
    if (error instanceof AppError) {
      throw error;
    }
    
    throw new AppError("Failed to delete all contacts", 500);
  }
};

export default DeleteAllContactsService;