/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op } from "sequelize";
import Campaign from "../../models/Campaign";
import CampaignShipping from "../../models/CampaignShipping";
import { campaignQueue } from "../../queues";
import { removePendingCampaignQueueJobs } from "./CampaignQueueCleanup";

export async function CancelService(id: number) {
  const campaign = await Campaign.findByPk(id);
  await campaign.update({ status: "CANCELADA" });

  console.log(`[CANCEL] Cancelando campanha ${id} (Tipo: ${campaign.tagListId && !campaign.contactListId ? 'TAG' : 'LISTA'})`);

  // 1. Cancelar jobs DispatchCampaign (jobs de envio efetivo)
  const recordsToCancel = await CampaignShipping.findAll({
    where: {
      campaignId: campaign.id,
      jobId: { [Op.not]: null },
      deliveredAt: null
    }
  });

  console.log(`[CANCEL] Encontrados ${recordsToCancel.length} registros CampaignShipping com jobs para cancelar`);

  const promises = [];

  for (let record of recordsToCancel) {
    try {
      const job = await campaignQueue.getJob(+record.jobId);
      if (job) {
        // Verificar se o job ainda existe antes de tentar remover
        const jobState = await job.getState();
        if (jobState === 'waiting' || jobState === 'delayed') {
          promises.push(job.remove());
          console.log(`[CANCEL] Job DispatchCampaign ${record.jobId} removido com sucesso`);
        } else {
          console.log(`[CANCEL] Job DispatchCampaign ${record.jobId} já processado (estado: ${jobState})`);
        }
      } else {
        console.log(`[CANCEL] Job DispatchCampaign ${record.jobId} não encontrado`);
      }
    } catch (error) {
      console.error(`[CANCEL] Erro ao remover job DispatchCampaign ${record.jobId}:`, error.message);
      // Continuar mesmo com erro
    }
  }

  // 2. Remover ProcessCampaign / PrepareContact / DispatchCampaign pendentes (lista ou tag)
  try {
    await removePendingCampaignQueueJobs(campaign.id);
    console.log(`[CANCEL] Jobs de fila genéricos removidos para campanha ${campaign.id}`);
  } catch (error: any) {
    console.error(`[CANCEL] Erro ao limpar fila genérica:`, error?.message || error);
  }

  // 3. Executar todas as remoções
  try {
    await Promise.all(promises);
    console.log(`[CANCEL] ${promises.length} jobs removidos com sucesso`);
  } catch (error) {
    console.error(`[CANCEL] Erro ao remover jobs:`, error.message);
    // Não falhar a operação por causa de jobs que não podem ser removidos
  }

  console.log(`[CANCEL] Campanha ${id} cancelada com sucesso`);
}
