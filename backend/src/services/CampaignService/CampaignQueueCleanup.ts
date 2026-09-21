/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { campaignQueue } from "../../queues";

/**
 * Remove jobs ProcessCampaign / PrepareContact / DispatchCampaign ainda não executados
 * para uma campanha (waiting/delayed).
 */
export async function removePendingCampaignQueueJobs(campaignId: number): Promise<void> {
  try {
    const waiting = await campaignQueue.getWaiting();
    const delayed = await campaignQueue.getDelayed();
    const all = [...waiting, ...delayed];
    for (const job of all) {
      const name = job.name;
      const d = job.data || {};
      const match =
        (name === "ProcessCampaign" && Number(d.id) === campaignId) ||
        (name === "PrepareContact" && Number(d.campaignId) === campaignId) ||
        (name === "DispatchCampaign" && Number(d.campaignId) === campaignId);
      if (!match) continue;
      const state = await job.getState();
      if (state === "waiting" || state === "delayed") {
        await job.remove();
      }
    }
  } catch (e: any) {
    console.error(
      `[CampaignQueueCleanup] Erro ao limpar fila para campanha ${campaignId}:`,
      e?.message || e
    );
  }
}
