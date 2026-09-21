/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import ContactTag from "../../models/ContactTag";
import Tag from "../../models/Tag";
import Contact from "../../models/Contact";
import logger from "../../utils/logger";

interface RemoveTagRequest {
  contactId: number;
  tagId: number;
  companyId: number;
}

interface RemoveTagsRequest {
  contactId: number;
  tags: Tag[];
  companyId: number;
}

const RemoveTagsService = async ({
  contactId,
  tags,
  companyId
}: RemoveTagsRequest): Promise<void> => {
  try {
    // Verificar se o contato existe e pertence à empresa
    const contact = await Contact.findOne({
      where: { 
        id: contactId, 
        companyId 
      }
    });

    if (!contact) {
      throw new Error(`Contato com ID ${contactId} não encontrado ou não pertence à empresa ${companyId}`);
    }

    // Remover as tags especificadas
    for (const tag of tags) {
      await ContactTag.destroy({
        where: {
          contactId,
          tagId: tag.id
        }
      });

      logger.info(`[REMOVE TAG SERVICE] Tag ${tag.name} removida do contato ${contactId} da empresa ${companyId}`);
    }

    logger.info(`[REMOVE TAG SERVICE] Processo de remoção de ${tags.length} tag(s) concluído para contato ${contactId}`);

  } catch (error) {
    logger.error(`[REMOVE TAG SERVICE] Erro ao remover tags do contato ${contactId}:`, error);
    throw error;
  }
};

const RemoveTagService = async ({
  contactId,
  tagId,
  companyId
}: RemoveTagRequest): Promise<void> => {
  try {
    // Verificar se o contato existe e pertence à empresa
    const contact = await Contact.findOne({
      where: { 
        id: contactId, 
        companyId 
      }
    });

    if (!contact) {
      throw new Error(`Contato com ID ${contactId} não encontrado ou não pertence à empresa ${companyId}`);
    }

    // Buscar a tag para logs
    const tag = await Tag.findByPk(tagId);
    
    if (!tag) {
      throw new Error(`Tag com ID ${tagId} não encontrada`);
    }

    // Remover a associação entre contato e tag
    const removed = await ContactTag.destroy({
      where: {
        contactId,
        tagId
      }
    });

    if (removed > 0) {
      logger.info(`[REMOVE TAG SERVICE] Tag ${tag.name} removida do contato ${contactId} da empresa ${companyId}`);
    } else {
      logger.warn(`[REMOVE TAG SERVICE] Tag ${tag.name} não estava associada ao contato ${contactId}`);
    }

  } catch (error) {
    logger.error(`[REMOVE TAG SERVICE] Erro ao remover tag ${tagId} do contato ${contactId}:`, error);
    throw error;
  }
};

export { RemoveTagsService, RemoveTagService };