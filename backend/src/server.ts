/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import "dotenv/config";
import dns from "dns";
import path from "path";
import fs from "fs";
import gracefulShutdown from "http-graceful-shutdown";

// =============================================================================
// BANNER server.ts (DEVE ser a 1a coisa impressa pós import app).
// Serve p/ validar nos Railway Deploy Logs se a inicialização do server passou
// do "require('./app')" — se não aparecer esse banner, app.ts crashou no import.
// =============================================================================
console.log("==================================================");
console.log("[server.ts:entry] server.js BEGIN (dist/server.js executou).");
console.log(`[server.ts:entry]   process.cwd = ${process.cwd()}`);
console.log(`[server.ts:entry]   __filename  = ${__filename}`);
console.log(`[server.ts:entry]   __dirname   = ${__dirname}`);
console.log(`[server.ts:entry]   package.json em cwd existe? ${fs.existsSync(path.join(process.cwd(), "package.json")) ? "SIM" : "NAO"}`);
console.log(`[server.ts:entry]   package.json em __dirname/.. existe? ${fs.existsSync(path.join(__dirname, "..", "package.json")) ? "SIM" : "NAO"}`);
console.log("==================================================");

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

// =============================================================================
// Catch ALL 100% — nada deixa o processo morrer sem LOGAR PRIMEIRO,
// exceto EADDRINUSE (porta ocupada, que já tem tratamento).
// Isso garante que se QUALQUER coisa (import, require, bootstrap) lançar,
// nós veremos o erro ANTES do Railway matar o container.
// =============================================================================
process.on("uncaughtException", err => {
  console.error("[server.ts:uncaughtException] STACK:", err?.stack || err?.message || String(err));
  try {
    logger.error({ msg: "uncaughtException", error: err?.message, stack: (err?.stack || "").split("\n")[0] });
  } catch { /* ignore */ }
  // Delay de 5s p/ Railway conseguir gravar o log do erro ANTES de morrer
  setTimeout(() => process.exit(1), 5000);
});

process.on("unhandledRejection", (reason: any, p: any) => {
  console.error("[server.ts:unhandledRejection] reason:", (reason && reason.stack) || String(reason), "| promise:", String(p));
  try {
    logger.error({ msg: "unhandledRejection", reason: String(reason), promise: String(p) });
  } catch { /* ignore */ }
  // Não fazemos exit — se for erro de Redis/DB a aplicação segue (filtro já no isIgnorableInfraError).
});

// Imports leves primeiro — HTTP sobe antes de Redis/Bull/WhatsApp
console.log("[server.ts:stage-1] importando app from './app'...");
import app from "./app";
console.log("[server.ts:stage-1] import app OK. (Se apareceu stage-13 no log do app, rotas montadas.)");

console.log("[server.ts:stage-2] importando socket, logger, redis...");
import { initIO } from "./libs/socket";
import logger from "./utils/logger";
import { REDIS_URI_MSG_CONN } from "./config/redis";
console.log("[server.ts:stage-2] imports socket/logger/redis OK.");

const preferredPort = Number(process.env.PORT) || 3000;
/** Railway / Docker: precisa bind em 0.0.0.0 — senão fica Online com 502 no edge. */
const listenHost = process.env.LISTEN_HOST || "0.0.0.0";

function isIgnorableInfraError(err: any): boolean {
  const msg = String(err?.message || err?.name || err || "");
  return /WRONGPASS|NOAUTH|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET|Redis|Connection is closed|MaxRetriesPerRequest|READONLY|OOM command not allowed/i.test(
    msg
  );
}

function startServer(portToUse: number) {
  console.log(`[server.ts:startServer] Chamando app.listen(${portToUse}, ${listenHost})`);
  const server = app.listen(portToUse, listenHost, () => {
    console.log(`[server.ts:listen-callback] ✅ app.listen OK. Servidor ouvindo em http://${listenHost}:${portToUse}`);
    logger.info(`Servidor iniciado em http://${listenHost}:${portToUse}`);
    try {
      initIO(server);
      console.log("[server.ts:listen-callback] initIO OK.");
    } catch (e: any) {
      console.error("[server.ts:listen-callback] initIO FALHOU. Erro:", e?.stack || e?.message || String(e));
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
          try {
            const { ensureAdminUser } = await import("./helpers/ensureAdminUser");
            await ensureAdminUser();
          } catch (seedErr: any) {
            logger.warn({
              msg: "ensureAdminUser (seed admin não bloqueante)",
              error: seedErr?.message || String(seedErr)
            });
          }
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
        const queuesMod = await import("./queues");
        const { startQueueProcess } = queuesMod;
        try {
          app.set("queues", {
            messageQueue: queuesMod.messageQueue,
            sendScheduledMessages: queuesMod.sendScheduledMessages
          });
        } catch {
          /* ignore */
        }
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
    console.error(`[server.ts:server.on(error)] code=${err?.code} msg=${err?.message || String(err)}`);
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
      setTimeout(() => process.exit(1), 5000);
    }
  });
}

console.log(`[server.ts:final] Boot: startServer(${preferredPort}) host=${listenHost}`);
logger.info(`Boot: startServer imediato porta=${preferredPort} host=${listenHost}`);
startServer(preferredPort);
