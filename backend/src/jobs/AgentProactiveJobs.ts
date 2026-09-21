/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import logger from "../utils/logger";
import {
  runFollowUpJob,
  runHotLeadJob,
  runReengagementJob
} from "../services/AgentProactiveServices/runProactiveJobs";

const CronJob = require("cron").CronJob;

const TZ = "America/Sao_Paulo";

export function initializeAgentProactiveJobs(): void {
  new CronJob(
    "0 0 9 * * *",
    () => {
      void runFollowUpJob().catch(e => logger.error("[FOLLOW-UP] Cron erro:", e));
    },
    null,
    true,
    TZ
  );

  new CronJob(
    "0 */30 * * * *",
    async () => {
      try {
        await runHotLeadJob();
      } catch (e) {
        logger.error("[HOT LEAD] Cron erro:", e);
      }
    },
    null,
    true,
    TZ
  );

  new CronJob(
    "0 0 10 * * 1",
    () => {
      void runReengagementJob().catch(e => logger.error("[REENGAGEMENT] Cron erro:", e));
    },
    null,
    true,
    TZ
  );

  logger.info("[AgentProactive] Crons registrados: follow-up 9h, hot lead /30min, reengagement seg 10h");
}
