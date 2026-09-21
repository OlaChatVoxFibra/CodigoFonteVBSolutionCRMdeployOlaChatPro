/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import CampaignShipping from "../../models/CampaignShipping";
import ContactListItem from "../../models/ContactListItem";
import Campaign from "../../models/Campaign";
import ContactTag from "../../models/ContactTag";
import Contact from "../../models/Contact";
import AppError from "../../errors/AppError";
import { Op } from "sequelize";

interface ShippingParams {
  campaignId: string | number;
  page?: number;
  pageSize?: number;
  searchParam?: string;
  status?: 'delivered' | 'pending' | 'failed';
}

interface ShippingResponse {
  shipping: CampaignShipping[];
  count: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const ShippingService = async (params: ShippingParams): Promise<ShippingResponse> => {
  const { campaignId, page = 1, pageSize = 50, searchParam, status } = params;
  
  // Validar parâmetros
  if (pageSize > 1000) {
    throw new AppError("Page size cannot exceed 1000", 400);
  }

  const offset = (page - 1) * pageSize;
  
  // Construir condições de busca
  const whereClause: any = {
    campaignId: campaignId
  };

  // Filtro por status
  if (status) {
    switch (status) {
      case 'delivered':
        whereClause.deliveredAt = { [Op.ne]: null };
        break;
      case 'pending':
        whereClause.deliveredAt = null;
        break;
      case 'failed':
        // Implementar lógica de falha se necessário
        whereClause.deliveredAt = null;
        break;
    }
  }

  // Filtro por busca
  if (searchParam) {
    whereClause[Op.or] = [
      { number: { [Op.iLike]: `%${searchParam}%` } },
      { message: { [Op.iLike]: `%${searchParam}%` } }
    ];
  }

  try {
    // Buscar informações da campanha para determinar se é por TAG
    const campaign = await Campaign.findByPk(campaignId, {
      attributes: ["id", "tagListId", "contactListId", "companyId"]
    });

    if (!campaign) {
      throw new AppError("Campanha não encontrada", 404);
    }

    let shipping: any[] = [];
    let count = 0;

    // Se é campanha por TAG, incluir contatos pendentes
    if (campaign.tagListId && !campaign.contactListId) {
      console.log(`[SHIPPING-SERVICE] Campanha ${campaignId} é por TAG (tagListId: ${campaign.tagListId})`);
      
      // 1. Buscar registros CampaignShipping existentes
      const { rows: existingShipping, count: existingCount } = await CampaignShipping.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: ContactListItem,
            as: "contact",
            attributes: ["id", "name", "number", "email"]
          }
        ],
        order: [["createdAt", "DESC"]]
      });

      console.log(`[SHIPPING-SERVICE] Registros CampaignShipping existentes: ${existingCount}`);

      // 2. Buscar todos os contatos da tag
      const contactTags = await ContactTag.findAll({
        where: { tagId: campaign.tagListId },
        attributes: ["contactId"],
        include: [
          {
            model: Contact,
            as: "contact",
            where: {
              companyId: campaign.companyId,
              active: true
            },
            attributes: ["id", "name", "number", "email"]
          }
        ],
        group: ["ContactTag.contactId", "contact.id", "contact.name", "contact.number", "contact.email"]
      });

      console.log(`[SHIPPING-SERVICE] Total de contatos na tag: ${contactTags.length}`);

      // 3. Criar registros virtuais para contatos pendentes
      const existingNumbers = new Set(existingShipping.map(s => s.number));
      const pendingContacts = contactTags
        .filter(ct => !existingNumbers.has(ct.contact.number))
        .map(ct => ({
          id: null, // ID virtual negativo para contatos pendentes
          campaignId: campaignId,
          contactId: ct.contact.id,
          number: ct.contact.number,
          message: "Aguardando processamento...",
          deliveredAt: null,
          confirmationRequestedAt: null,
          confirmedAt: null,
          jobId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          contact: {
            id: ct.contact.id,
            name: ct.contact.name,
            number: ct.contact.number,
            email: ct.contact.email
          }
        }));

      // 4. Combinar registros existentes com contatos pendentes
      const allShipping = [...existingShipping, ...pendingContacts];
      
      // 5. Aplicar filtros se necessário
      let filteredShipping = allShipping;
      if (status) {
        switch (status) {
          case 'delivered':
            filteredShipping = allShipping.filter(s => s.deliveredAt !== null);
            break;
          case 'pending':
            filteredShipping = allShipping.filter(s => s.deliveredAt === null);
            break;
          case 'failed':
            filteredShipping = allShipping.filter(s => s.deliveredAt === null);
            break;
        }
      }

      if (searchParam) {
        filteredShipping = filteredShipping.filter(s => 
          s.number.includes(searchParam) || 
          s.message.toLowerCase().includes(searchParam.toLowerCase()) ||
          (s.contact && s.contact.name && s.contact.name.toLowerCase().includes(searchParam.toLowerCase()))
        );
      }

      // 6. Aplicar paginação
      count = filteredShipping.length;
      const startIndex = offset;
      const endIndex = offset + pageSize;
      shipping = filteredShipping.slice(startIndex, endIndex);

      console.log(`[SHIPPING-SERVICE] Total filtrado: ${count}, Página ${page}: ${shipping.length} registros`);
    } else {
      // Para campanhas por lista, incluir contatos pendentes também
      console.log(`[SHIPPING-SERVICE] Campanha ${campaignId} é por lista de contatos (contactListId: ${campaign.contactListId})`);
      
      // 1. Buscar registros CampaignShipping existentes
      const { rows: existingShipping, count: existingCount } = await CampaignShipping.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: ContactListItem,
            as: "contact",
            attributes: ["id", "name", "number", "email"]
          }
        ],
        order: [["createdAt", "DESC"]]
      });

      console.log(`[SHIPPING-SERVICE] Registros CampaignShipping existentes: ${existingCount}`);

      // 2. Buscar todos os contatos da lista
      const allContacts = await ContactListItem.findAll({
        where: { contactListId: campaign.contactListId },
        attributes: ["id", "name", "number", "email"]
      });

      console.log(`[SHIPPING-SERVICE] Total de contatos na lista: ${allContacts.length}`);

      // 3. Criar registros virtuais para contatos pendentes
      const existingNumbers = new Set(existingShipping.map(s => s.number));
      const pendingContacts = allContacts
        .filter(contact => !existingNumbers.has(contact.number))
        .map(contact => ({
          id: null, // ID será null para contatos pendentes
          campaignId: campaignId,
          contactId: contact.id,
          number: contact.number,
          message: null,
          deliveredAt: null,
          createdAt: null,
          contact: contact
        }));

      // 4. Combinar registros existentes com pendentes
      const allShipping = [...existingShipping, ...pendingContacts];
      
      // 5. Aplicar filtros de busca se necessário
      let filteredShipping = allShipping;
      if (searchParam) {
        filteredShipping = allShipping.filter(item => 
          item.number?.includes(searchParam) || 
          item.message?.toLowerCase().includes(searchParam.toLowerCase()) ||
          item.contact?.name?.toLowerCase().includes(searchParam.toLowerCase())
        );
      }

      count = filteredShipping.length;
      
      // 6. Aplicar paginação
      const startIndex = offset;
      const endIndex = startIndex + pageSize;
      shipping = filteredShipping.slice(startIndex, endIndex);

      console.log(`[SHIPPING-SERVICE] Total filtrado: ${count}, Página ${page}: ${shipping.length} registros`);
    }

    const totalPages = Math.ceil(count / pageSize);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      shipping,
      count,
      totalPages,
      currentPage: page,
      hasNextPage,
      hasPrevPage
    };
  } catch (error) {
    console.error("Erro ao buscar dados de shipping:", error);
    throw new AppError("Erro interno do servidor", 500);
  }
};

export default ShippingService;
