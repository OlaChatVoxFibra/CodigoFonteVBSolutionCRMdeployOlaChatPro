/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { FlowBuilderModel } from "../../models/FlowBuilder";
import { FlowCampaignModel, PhraseCondition } from "../../models/FlowCampaign";
import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";

interface Request {
  userId: number;
  name: string;
  companyId: number;
  flowId: number;
  phrases: PhraseCondition[];
  whatsappIds: number[]; // ALTERAÇÃO: Array de IDs
  status: boolean;
}

const CreateFlowCampaignService = async ({
  userId,
  name,
  companyId,
  phrases,
  whatsappIds,
  flowId,
  status
}: Request): Promise<FlowCampaignModel> => {
  try {
    // Validações básicas
    if (!name?.trim()) {
      throw new AppError("Nome da campanha é obrigatório", 400);
    }

    if (!flowId || isNaN(Number(flowId))) {
      throw new AppError("Fluxo é obrigatório e deve ser um ID válido", 400);
    }

    if (!phrases || !Array.isArray(phrases) || phrases.length === 0) {
      throw new AppError("Pelo menos uma frase é obrigatória", 400);
    }

    // NOVA VALIDAÇÃO: Verificar whatsappIds
    if (!whatsappIds || !Array.isArray(whatsappIds) || whatsappIds.length === 0) {
      throw new AppError("Pelo menos uma conexão WhatsApp deve ser selecionada", 400);
    }

    // Validar se todas as frases têm conteúdo
    const validPhrases = phrases.filter(phrase => phrase.text?.trim());
    if (validPhrases.length === 0) {
      throw new AppError("Pelo menos uma frase deve ter conteúdo", 400);
    }

    // Verificar se o fluxo existe
    const flowExists = await FlowBuilderModel.findOne({
      where: {
        id: Number(flowId),
        company_id: companyId
      }
    });

    if (!flowExists) {
      throw new AppError("Fluxo não encontrado", 404);
    }

    // NOVA VALIDAÇÃO: Verificar se todas as conexões existem e pertencem à empresa
    const whatsappConnections = await Whatsapp.findAll({
      where: {
        id: whatsappIds,
        companyId: companyId
      }
    });

    if (whatsappConnections.length !== whatsappIds.length) {
      const foundIds = whatsappConnections.map(w => w.id);
      const missingIds = whatsappIds.filter(id => !foundIds.includes(id));
      throw new AppError(`Conexões não encontradas ou não pertencem à empresa: ${missingIds.join(', ')}`, 400);
    }

    // Verificar se já existe campanha com o mesmo nome
    const existingCampaign = await FlowCampaignModel.findOne({
      where: {
        name: name.trim(),
        companyId
      }
    });

    if (existingCampaign) {
      throw new AppError("Já existe uma campanha com este nome", 400);
    }

    // Normalizar e validar frases
    const normalizedPhrases: PhraseCondition[] = validPhrases.map(phrase => ({
      text: phrase.text.trim(),
      type: phrase.type || 'exact'
    }));

    // Criar a campanha
    const flow = await FlowCampaignModel.create({
      userId,
      companyId,
      name: name.trim(),
      phrase: normalizedPhrases,
      flowId: Number(flowId),
      whatsappIds: whatsappIds, // ALTERAÇÃO: Usar array
      status: status
    });

    // Recarregar para obter dados completos com associações
    await flow.reload({
      include: [
        {
          model: FlowBuilderModel,
          as: 'flow',
          attributes: ['id', 'name']
        }
      ]
    });

    console.log(`✅ Campanha criada: ${flow.name} com ${whatsappIds.length} conexões: ${whatsappIds.join(', ')}`);

    return flow;

  } catch (error) {
    console.error("Erro ao criar campanha de fluxo:", error);
    
    if (error instanceof AppError) {
      throw error;
    }
    
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(err => err.message).join(', ');
      throw new AppError(`Erro de validação: ${messages}`, 400);
    }
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError("Já existe uma campanha com estes dados", 400);
    }
    
    throw new AppError("Erro interno ao criar campanha", 500);
  }
};

export default CreateFlowCampaignService;