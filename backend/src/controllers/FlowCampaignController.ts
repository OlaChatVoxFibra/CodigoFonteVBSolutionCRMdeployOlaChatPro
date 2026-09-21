/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Request, Response } from "express";
import CreateFlowCampaignService from "../services/FlowCampaignService/CreateFlowCampaignService";
import FlowsCampaignGetDataService from "../services/FlowCampaignService/FlowsCampaignGetDataService";
import GetFlowsCampaignDataService from "../services/FlowCampaignService/GetFlowsCampaignDataService";
import DeleteFlowCampaignService from "../services/FlowCampaignService/DeleteFlowCampaignService";
import UpdateFlowCampaignService from "../services/FlowCampaignService/UpdateFlowCampaignService";
import AppError from "../errors/AppError";

export const createFlowCampaign = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { name, flowId, phrases, whatsappIds, status } = req.body;
    const userId = parseInt(req.user.id);
    const { companyId } = req.user;

    // Validação básica dos dados recebidos
    if (!name?.trim()) {
      return res.status(400).json({
        error: "Nome da campanha é obrigatório"
      });
    }

    if (!flowId) {
      return res.status(400).json({
        error: "Fluxo é obrigatório"
      });
    }

    if (!phrases || !Array.isArray(phrases) || phrases.length === 0) {
      return res.status(400).json({
        error: "Pelo menos uma frase é obrigatória"
      });
    }

    // Validação para whatsappIds (aceita tanto array quanto ID único para compatibilidade)
    let normalizedWhatsappIds = [];
    if (whatsappIds) {
      if (Array.isArray(whatsappIds)) {
        normalizedWhatsappIds = whatsappIds;
      } else if (typeof whatsappIds === 'number' || typeof whatsappIds === 'string') {
        normalizedWhatsappIds = [Number(whatsappIds)];
      }
    }

    if (normalizedWhatsappIds.length === 0) {
      return res.status(400).json({
        error: "Pelo menos uma conexão WhatsApp deve ser selecionada"
      });
    }

    // Validar se todas as frases têm texto
    const validPhrases = phrases.filter(p => p && p.text && p.text.trim());
    if (validPhrases.length === 0) {
      return res.status(400).json({
        error: "Pelo menos uma frase válida é obrigatória"
      });
    }

    console.log(`[CREATE CAMPAIGN] Criando campanha: ${name.trim()} para ${normalizedWhatsappIds.length} conexão(ões): ${normalizedWhatsappIds.join(', ')}`);

    const flow = await CreateFlowCampaignService({
      userId,
      name: name.trim(),
      companyId,
      phrases: validPhrases,
      whatsappIds: normalizedWhatsappIds,
      flowId,
      status: status !== undefined ? status : true
    });

    return res.status(201).json({
      success: true,
      data: flow,
      message: `Campanha criada com sucesso para ${normalizedWhatsappIds.length} conexão(ões)`
    });

  } catch (error) {
    console.error("[CREATE CAMPAIGN] Erro ao criar campanha:", error);

    if (error instanceof AppError) {
      return res.status(error.statusCode || 400).json({
        error: error.message
      });
    }

    return res.status(500).json({
      error: "Erro interno do servidor"
    });
  }
};

export const flowCampaigns = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { companyId } = req.user;
    const { page, limit, searchTerm } = req.query;

    console.log(`[LIST CAMPAIGNS] Listando campanhas para empresa ${companyId}`);

    const result = await FlowsCampaignGetDataService({
      companyId,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      searchTerm: searchTerm as string
    });

    // Garantir que sempre retornamos um array, mesmo se o service retornar undefined
    const flow = Array.isArray(result?.flow) ? result.flow : 
                 Array.isArray(result) ? result : [];

    console.log(`[LIST CAMPAIGNS] Encontradas ${flow.length} campanhas`);

    return res.status(200).json({
      success: true,
      // Retornar diretamente os dados que o frontend espera
      flow,
      count: result?.count || flow.length,
      hasMore: result?.hasMore || false,
      message: "Campanhas listadas com sucesso"
    });

  } catch (error) {
    console.error("[LIST CAMPAIGNS] Erro ao listar campanhas:", error);

    if (error instanceof AppError) {
      return res.status(error.statusCode || 400).json({
        error: error.message
      });
    }

    return res.status(500).json({
      error: "Erro interno do servidor"
    });
  }
};

export const flowCampaign = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { idFlow } = req.params;
    const { companyId } = req.user;

    if (!idFlow) {
      return res.status(400).json({
        error: "ID da campanha é obrigatório"
      });
    }

    const id = parseInt(idFlow);

    if (isNaN(id)) {
      return res.status(400).json({
        error: "ID da campanha deve ser um número válido"
      });
    }

    console.log(`[GET CAMPAIGN] Buscando campanha ID: ${id} para empresa ${companyId}`);

    const result = await GetFlowsCampaignDataService({
      companyId,
      idFlow: id
    });

    console.log(`[GET CAMPAIGN] Campanha encontrada: ${result.details.name}`);

    // Retornar diretamente os dados da campanha
    // O frontend espera os dados no primeiro nível da resposta
    return res.status(200).json({
      success: true,
      // Retornar os dados da campanha diretamente, não aninhados em 'data'
      ...result.details,
      message: "Campanha encontrada com sucesso"
    });

  } catch (error) {
    console.error("[GET CAMPAIGN] Erro ao buscar campanha:", error);

    if (error instanceof AppError) {
      return res.status(error.statusCode || 400).json({
        error: error.message
      });
    }

    return res.status(500).json({
      error: "Erro interno do servidor"
    });
  }
};

export const updateFlowCampaign = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { companyId } = req.user;
    const { flowId, name, phrases, id, status, whatsappIds } = req.body;

    // Validação básica dos dados recebidos
    if (!id) {
      return res.status(400).json({
        error: "ID da campanha é obrigatório"
      });
    }

    if (!name?.trim()) {
      return res.status(400).json({
        error: "Nome da campanha é obrigatório"
      });
    }

    if (!flowId) {
      return res.status(400).json({
        error: "Fluxo é obrigatório"
      });
    }

    if (!phrases || !Array.isArray(phrases) || phrases.length === 0) {
      return res.status(400).json({
        error: "Pelo menos uma frase é obrigatória"
      });
    }

    // Validação para whatsappIds (aceita tanto array quanto ID único para compatibilidade)
    let normalizedWhatsappIds = [];
    if (whatsappIds) {
      if (Array.isArray(whatsappIds)) {
        normalizedWhatsappIds = whatsappIds;
      } else if (typeof whatsappIds === 'number' || typeof whatsappIds === 'string') {
        normalizedWhatsappIds = [Number(whatsappIds)];
      }
    }

    if (normalizedWhatsappIds.length === 0) {
      return res.status(400).json({
        error: "Pelo menos uma conexão WhatsApp deve ser selecionada"
      });
    }

    // Validar se todas as frases têm texto
    const validPhrases = phrases.filter(p => p && p.text && p.text.trim());
    if (validPhrases.length === 0) {
      return res.status(400).json({
        error: "Pelo menos uma frase válida é obrigatória"
      });
    }

    console.log(`[UPDATE CAMPAIGN] Atualizando campanha ID: ${id} - ${name.trim()} para ${normalizedWhatsappIds.length} conexão(ões): ${normalizedWhatsappIds.join(', ')}`);

    const flow = await UpdateFlowCampaignService({
      companyId,
      name: name.trim(),
      flowId,
      phrases: validPhrases,
      id,
      status: status !== undefined ? status : true,
      whatsappIds: normalizedWhatsappIds
    });

    return res.status(200).json({
      success: true,
      data: flow,
      message: `Campanha atualizada com sucesso para ${normalizedWhatsappIds.length} conexão(ões)`
    });

  } catch (error) {
    console.error("[UPDATE CAMPAIGN] Erro ao atualizar campanha:", error);

    if (error instanceof AppError) {
      return res.status(error.statusCode || 400).json({
        error: error.message
      });
    }

    return res.status(500).json({
      error: "Erro interno do servidor"
    });
  }
};

export const deleteFlowCampaign = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { idFlow } = req.params;

    if (!idFlow) {
      return res.status(400).json({
        error: "ID da campanha é obrigatório"
      });
    }

    const flowIdInt = parseInt(idFlow);

    if (isNaN(flowIdInt)) {
      return res.status(400).json({
        error: "ID da campanha deve ser um número válido"
      });
    }

    console.log(`[DELETE CAMPAIGN] Deletando campanha ID: ${flowIdInt}`);

    const flow = await DeleteFlowCampaignService(flowIdInt);

    console.log(`[DELETE CAMPAIGN] Campanha deletada: ${flow.name}`);

    return res.status(200).json({
      success: true,
      data: flow,
      message: "Campanha removida com sucesso"
    });

  } catch (error) {
    console.error("[DELETE CAMPAIGN] Erro ao remover campanha:", error);

    if (error instanceof AppError) {
      return res.status(error.statusCode || 400).json({
        error: error.message
      });
    }

    return res.status(500).json({
      error: "Erro interno do servidor"
    });
  }
};