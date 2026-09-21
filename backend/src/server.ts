/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import "dotenv/config";
import dns from "dns";
import gracefulShutdown from "http-graceful-shutdown";

if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning') return;
  if (warning.message && warning.message.includes('WRONGPASS')) return;
});

const originalEmit = process.emit;
process.emit = function (event, ...args) {
  if (event === 'unhandledRejection' || event === 'uncaughtException') {
    const err = args[0];
    if (err && err.message && err.message.includes('WRONGPASS')) {
      return true;
    }
  }
  return originalEmit.apply(this, [event, ...args]);
};
import app from "./app";
import { initIO } from "./libs/socket";
import logger from "./utils/logger";
import { StartAllWhatsAppsSessions } from "./services/WbotServices/StartAllWhatsAppsSessions";
import { startAllTelegramPollingSessions } from "./services/TelegramServices/telegramPollingService";
import { startAllTelegramUserSessions } from "./services/TelegramUserServices/StartAllTelegramUserSessions";
import Company from "./models/Company";
import BullQueue from "./libs/queue";
import { startQueueProcess } from "./queues";
import { startLidSyncJob } from "./jobs/LidSyncJob";
import { repairStuckWhatsAppOficialConnections, repairWhatsAppOficialWebhookUrls } from "./services/WhatsAppOficial/FinalizeWhatsAppOficialConnection";
import { REDIS_URI_MSG_CONN } from "./config/redis";
import { ensureDatabase } from "./utils/ensureDatabase";
import { alignCompanyModelToDatabase } from "./helpers/alignCompanyModelToDatabase";
import "./emailQueues";

const preferredPort = Number(process.env.PORT) || 3000;

function startServer(portToUse: number) {
  const server = app.listen(portToUse, () => {
    logger.info(`Servidor iniciado na porta ${portToUse}`);
    initIO(server);
    gracefulShutdown(server);

    (async () => {
      try {
        const { isDevNoDb } = await import("./helpers/devNoDbAuth");
        if (isDevNoDb()) {
          logger.info("DEV_NO_DB ativo — pulando sessões WhatsApp/filas/Telegram (sem banco)");
          return;
        }

        const companies = await Company.findAll({
          where: { status: true },
          attributes: ["id"],
        });

        const allPromises: any[] = [];
        companies.forEach((c) => {
          const p = StartAllWhatsAppsSessions(c.id);
          allPromises.push(p);
        });

        Promise.all(allPromises).then(async () => {
          logger.info("Fila de processamento iniciando após sessões do WhatsApp");
          await startQueueProcess();
          await startAllTelegramPollingSessions();
          await startAllTelegramUserSessions();
        });

        if (REDIS_URI_MSG_CONN && REDIS_URI_MSG_CONN !== "") {
          BullQueue.process();
        }

        startLidSyncJob();
        await repairStuckWhatsAppOficialConnections();
        await repairWhatsAppOficialWebhookUrls();
      } catch (err: any) {
        logger.error({ msg: "Erro na inicialização assíncrona", error: err?.message || String(err) });
      }
    })();
  });

  server.on("error", (err: any) => {
    if (err?.code === "EADDRINUSE") {
      // DEV_NO_DB: NÃO pular para 8080 — o frontend aponta para :3000 e parece que o backend "parou"
      try {
        const { isDevNoDb } = require("./helpers/devNoDbAuth");
        if (isDevNoDb()) {
          logger.error(
            `Porta ${portToUse} em uso. Pare o outro processo (ex.: outro npm run dev) e reinicie. ` +
              `Não vou usar 8080 no modo local — o frontend espera a porta ${preferredPort}.`
          );
          process.exit(1);
          return;
        }
      } catch {
        /* segue fallback abaixo */
      }

      const nextPort =
        portToUse === 3000 ? 8080 : portToUse === 8080 ? 0 : 0;
      if (portToUse !== nextPort) {
        logger.warn(`Porta ${portToUse} em uso. Tentando porta ${nextPort}...`);
        try {
          server.close(() => startServer(nextPort));
        } catch {
          startServer(nextPort);
        }
      } else {
        logger.warn(`Porta ${portToUse} em uso. Tentando porta aleatória...`);
        try {
          server.close(() => startServer(0));
        } catch {
          startServer(0);
        }
      }
    } else {
      logger.error({ msg: "Erro ao iniciar o servidor", error: err?.message || String(err) });
      process.exit(1);
    }
  });
}

(async () => {
  const { isDevNoDb } = await import("./helpers/devNoDbAuth");
  if (isDevNoDb()) {
    logger.info("DEV_NO_DB=true — boot sem PostgreSQL (login local ativo)");
  } else {
    logger.info("Boot: iniciando ensureDatabase");
    try {
      await ensureDatabase();
      logger.info("Boot: ensureDatabase finalizado");
      await alignCompanyModelToDatabase();
      logger.info("Boot: alignCompanyModelToDatabase finalizado");
    } catch (e: any) {
      logger.error({ msg: "ensureDatabase (pré-boot)", error: e?.message || String(e) });
    }
  }
  logger.info("Boot: iniciando startServer");
  startServer(preferredPort);
})();

process.on("uncaughtException", err => {
  logger.error({ msg: "uncaughtException", error: err.message, stack: err.stack?.split("\n")[0] });
  process.exit(1);
});

process.on("unhandledRejection", (reason: any, p: any) => {
  const msg = String(reason?.name || reason || "");
  const { isDevNoDb } = require("./helpers/devNoDbAuth");
  if (
    isDevNoDb() &&
    /SequelizeConnectionRefusedError|ECONNREFUSED|ConnectionRefused/i.test(msg)
  ) {
    logger.warn("DEV_NO_DB: ignorando tentativa de conexão Postgres (esperado sem banco)");
    return;
  }
  logger.error({ msg: "unhandledRejection", reason: String(reason), promise: String(p) });
});
