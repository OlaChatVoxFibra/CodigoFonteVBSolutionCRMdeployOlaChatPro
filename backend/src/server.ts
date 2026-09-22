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

process.on("warning", (warning) => {
  if (warning.name === "DeprecationWarning") return;
  if (warning.message && warning.message.includes("WRONGPASS")) return;
});

const originalEmit = process.emit;
process.emit = function (event, ...args) {
  if (event === "unhandledRejection" || event === "uncaughtException") {
    const err = args[0];
    if (err && err.message && err.message.includes("WRONGPASS")) {
      return true;
    }
  }
  return originalEmit.apply(this, [event, ...args]);
};

// Imports leves primeiro — HTTP sobe antes de Redis/Bull/WhatsApp
import app from "./app";
import { initIO } from "./libs/socket";
import logger from "./utils/logger";
import { REDIS_URI_MSG_CONN } from "./config/redis";

const preferredPort = Number(process.env.PORT) || 3000;
/** Railway / Docker: precisa bind em 0.0.0.0 — senão fica Online com 502 no edge. */
const listenHost = process.env.LISTEN_HOST || "0.0.0.0";

function isIgnorableInfraError(err: any): boolean {
  const msg = String(err?.message || err?.name || err || "");
  return /WRONGPASS|NOAUTH|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET|Redis|Connection is closed|MaxRetriesPerRequest|READONLY|OOM command not allowed/i.test(
    msg
  );
}

process.on("uncaughtException", err => {
  if (isIgnorableInfraError(err)) {
    logger.warn({
      msg: "uncaughtException (infra — processo mantido)",
      error: err.message
    });
    return;
  }
  logger.error({ msg: "uncaughtException", error: err.message, stack: err.stack?.split("\n")[0] });
  process.exit(1);
});

process.on("unhandledRejection", (reason: any, p: any) => {
  const msg = String(reason?.name || reason || "");
  try {
    const { isDevNoDb } = require("./helpers/devNoDbAuth");
    if (
      isDevNoDb() &&
      /SequelizeConnectionRefusedError|ECONNREFUSED|ConnectionRefused/i.test(msg)
    ) {
      logger.warn("DEV_NO_DB: ignorando tentativa de conexão Postgres (esperado sem banco)");
      return;
    }
  } catch {
    /* ignore */
  }
  if (isIgnorableInfraError(reason)) {
    logger.warn({
      msg: "unhandledRejection (infra — processo mantido)",
      reason: String(reason)
    });
    return;
  }
  logger.error({ msg: "unhandledRejection", reason: String(reason), promise: String(p) });
});

function startServer(portToUse: number) {
  const server = app.listen(portToUse, listenHost, () => {
    logger.info(`Servidor iniciado em http://${listenHost}:${portToUse}`);
    try {
      initIO(server);
    } catch (e: any) {
      logger.error({ msg: "initIO falhou (API segue)", error: e?.message || String(e) });
    }
    gracefulShutdown(server);

    (async () => {
      try {
        const { isDevNoDb } = await import("./helpers/devNoDbAuth");
        if (isDevNoDb()) {
          logger.info("DEV_NO_DB ativo — pulando sessões WhatsApp/filas/Telegram (sem banco)");
          return;
        }

        const { ensureDatabase } = await import("./utils/ensureDatabase");
        const { alignCompanyModelToDatabase } = await import(
          "./helpers/alignCompanyModelToDatabase"
        );
        try {
          await ensureDatabase();
          await alignCompanyModelToDatabase();
        } catch (e: any) {
          logger.error({
            msg: "ensureDatabase pós-listen",
            error: e?.message || String(e)
          });
        }

        await import("./emailQueues");

        const Company = (await import("./models/Company")).default;
        const { StartAllWhatsAppsSessions } = await import(
          "./services/WbotServices/StartAllWhatsAppsSessions"
        );
        const { startAllTelegramPollingSessions } = await import(
          "./services/TelegramServices/telegramPollingService"
        );
        const { startAllTelegramUserSessions } = await import(
          "./services/TelegramUserServices/StartAllTelegramUserSessions"
        );
        const BullQueue = (await import("./libs/queue")).default;
        const { startQueueProcess } = await import("./queues");
        const { startLidSyncJob } = await import("./jobs/LidSyncJob");
        const {
          repairStuckWhatsAppOficialConnections,
          repairWhatsAppOficialWebhookUrls
        } = await import(
          "./services/WhatsAppOficial/FinalizeWhatsAppOficialConnection"
        );

        const companies = await Company.findAll({
          where: { status: true },
          attributes: ["id"]
        });

        const allPromises: any[] = [];
        companies.forEach(c => {
          allPromises.push(StartAllWhatsAppsSessions(c.id));
        });

        Promise.all(allPromises)
          .then(async () => {
            logger.info("Fila de processamento iniciando após sessões do WhatsApp");
            await startQueueProcess();
            await startAllTelegramPollingSessions();
            await startAllTelegramUserSessions();
          })
          .catch((err: any) => {
            logger.error({
              msg: "Falha ao iniciar sessões/filas",
              error: err?.message || String(err)
            });
          });

        if (REDIS_URI_MSG_CONN && REDIS_URI_MSG_CONN !== "") {
          BullQueue.process();
        }

        startLidSyncJob();
        await repairStuckWhatsAppOficialConnections();
        await repairWhatsAppOficialWebhookUrls();
      } catch (err: any) {
        logger.error({
          msg: "Erro na inicialização assíncrona",
          error: err?.message || String(err)
        });
      }
    })();
  });

  server.on("error", (err: any) => {
    if (err?.code === "EADDRINUSE") {
      try {
        const { isDevNoDb } = require("./helpers/devNoDbAuth");
        if (isDevNoDb()) {
          logger.error(
            `Porta ${portToUse} em uso. Pare o outro processo e reinicie. Frontend espera ${preferredPort}.`
          );
          process.exit(1);
          return;
        }
      } catch {
        /* segue */
      }

      const nextPort = portToUse === 3000 ? 8080 : portToUse === 8080 ? 0 : 0;
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
      logger.error({
        msg: "Erro ao iniciar o servidor",
        error: err?.message || String(err)
      });
      process.exit(1);
    }
  });
}

logger.info(`Boot: startServer imediato porta=${preferredPort} host=${listenHost}`);
startServer(preferredPort);
