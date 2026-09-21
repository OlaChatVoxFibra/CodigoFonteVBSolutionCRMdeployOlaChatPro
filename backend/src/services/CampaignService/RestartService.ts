/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Campaign from "../../models/Campaign";
import CampaignSetting from "../../models/CampaignSetting";
import CampaignShipping from "../../models/CampaignShipping";
import { campaignQueue } from "../../queues";
import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import { getIO } from "../../libs/socket";
import { removePendingCampaignQueueJobs } from "./CampaignQueueCleanup";

export async function RestartService(id: number) {
  const campaign = await Campaign.findByPk(id);
  if (!campaign) {
    throw new AppError("ERR_NO_CAMPAIGN_FOUND", 404);
  }

  await removePendingCampaignQueueJobs(id);

  await campaign.update({ status: "EM_ANDAMENTO" });

  const settings = await CampaignSetting.findAll({
    where: { companyId: campaign.companyId },
    attributes: ["key", "value"]
  });

  let messageInterval: number = 20;
  let longerIntervalAfter: number = 20;
  let greaterInterval: number = 60;

  settings.forEach(setting => {
    if (setting.key === "messageInterval") {
      messageInterval = JSON.parse(setting.value);
    }
    if (setting.key === "longerIntervalAfter") {
      longerIntervalAfter = JSON.parse(setting.value);
    }
    if (setting.key === "greaterInterval") {
      greaterInterval = JSON.parse(setting.value);
    }
  });

  const processedCount = await CampaignShipping.count({
    where: {
      campaignId: campaign.id,
      deliveredAt: { [Op.ne]: null }
    }
  });

  console.log(
    `[RESTART] Campanha ${campaign.id} reiniciada — ${processedCount} envios já entregues; intervalo ${messageInterval}s / após ${longerIntervalAfter} → ${greaterInterval}s`
  );

  /** Delay inicial do job ProcessCampaign (Bull): deve ir nas opções do job, não em job.data */
  const initialDelay = Math.min(Math.max(messageInterval * 1000, 3000), 120000);

  await campaignQueue.add(
    "ProcessCampaign",
    {
      id: campaign.id,
      restartMode: true,
      messageInterval,
      longerIntervalAfter,
      greaterInterval
    },
    {
      priority: 3,
      delay: initialDelay,
      removeOnComplete: { age: 60 * 60, count: 10 },
      removeOnFail: { age: 60 * 60, count: 10 }
    }
  );

  const io = getIO();
  const companyId = campaign.companyId;
  await campaign.reload();
  io.of(`/${companyId}`).emit(`company-${companyId}-campaign`, {
    action: "update",
    record: campaign
  });
}
