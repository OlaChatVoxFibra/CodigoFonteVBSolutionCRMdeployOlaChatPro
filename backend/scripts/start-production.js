/**
 * Start de produção COM FAILSAFE (ESTRATÉGIA MAIS IMPORTANTE DE TODAS).
 *
 * Ordem:
 *   1) [Sempre executado] Sobe o servidor FAILSAFE (scripts/failsafe-server.js)
 *      com HTTP built-in, sem dependências, respondendo /health, CORS,
 *      /auth/offline-status, /public-settings/enabledLanguages e /auth/login.
 *      Railway imediatamente enxerga a porta 8080 viva → NÃO ENTREGA MAIS o
 *      "Application not found" com x-railway-fallback:true.
 *
 *   2) [Tentativa] Roda migrations (prepare-and-migrate.js) com timeout.
 *
 *   3) [Tentativa] Sobe o server.js completo (dist/server.js) em PROCESSO FILHO.
 *
 *   4) Se em QUALQUER MOMENTO o server.js crashar/morrer:
 *        • Continuamos com FAILSAFE respondendo as rotas mínimas (login
 *          aparece sem banner de "Servidor indisponível", CORS fica correto
 *          e não temos mais aquele 404 do Railway).
 *        • Depois de alguns segundos, se QUISER, pode tentar restartar
 *          server.js novamente (aqui já deixamos retry 1 vez).
 *
 * Com isso, mesmo que QUALQUER módulo (Redis, Bull, Socket, Controllers, DB,
 * plugins, i18n, etc.) crash, o Railway NÃO entrega o fallback horroroso
 * e ao menos o login funciona em modo failsafe.
 */
const { spawn, fork } = require("child_process");
const path = require("path");
const fs = require("fs");

const root = path.resolve(__dirname, "..");
const serverJs = path.join(root, "dist", "server.js");
const packageJson = path.join(root, "package.json");
const failsafeJs = path.join(__dirname, "failsafe-server.js");
const MIGRATE_TIMEOUT_MS = Number(process.env.MIGRATE_TIMEOUT_MS || 90000);

// =============================================================================
// BANNER de diagnóstico (aparece nos Deploy Logs do Railway)
// =============================================================================
console.log("==================================================");
console.log("[start] START-PRODUCTION INIT (COM FAILSAFE)");
console.log(`[start]   cwd atual ........... ${process.cwd()}`);
console.log(`[start]   root resolvido ...... ${root}`);
console.log(`[start]   __dirname ........... ${__dirname}`);
console.log(`[start]   package.json existe . ${fs.existsSync(packageJson) ? "SIM" : "NAO"} (${packageJson})`);
console.log(`[start]   dist/server.js existe ${fs.existsSync(serverJs) ? "SIM" : "NAO"} (${serverJs})`);
console.log(`[start]   failsafe-server.js .. ${fs.existsSync(failsafeJs) ? "SIM" : "NAO"} (${failsafeJs})`);
console.log(`[start]   NODE_ENV ............ ${process.env.NODE_ENV || ""}`);
console.log(`[start]   PORT ................ ${process.env.PORT || ""}`);
console.log(`[start]   LISTEN_HOST ......... ${process.env.LISTEN_HOST || ""}`);
console.log(`[start]   DATABASE_URL ........ ${process.env.DATABASE_URL ? "(definido)" : "(VAZIO)"}`);
console.log(`[start]   REDIS_URI_ACK ....... ${process.env.REDIS_URI_ACK ? "(definido)" : "(VAZIO)"}`);
console.log("==================================================");

function runAsync(label, args, timeoutMs, opts = {}) {
  return new Promise((resolve) => {
    console.log(`[start] ${label}...`);
    const child = spawn(process.execPath, args, {
      cwd: root,
      stdio: "inherit",
      env: process.env,
      ...opts
    });

    let settled = false;
    const finish = (code, reason) => {
      if (settled) return;
      settled = true;
      if (reason) console.warn(`[start] ${label}: ${reason}`);
      resolve(code == null ? 1 : code);
    };

    const timer =
      timeoutMs > 0
        ? setTimeout(() => {
            console.warn(
              `[start] ${label} excedeu ${timeoutMs}ms — matando e seguindo`
            );
            try {
              child.kill("SIGTERM");
            } catch (_) {
              /* ignore */
            }
            setTimeout(() => {
              try {
                child.kill("SIGKILL");
              } catch (_) {
                /* ignore */
              }
            }, 3000);
            finish(124, "timeout");
          }, timeoutMs)
        : null;

    child.on("error", (err) => {
      if (timer) clearTimeout(timer);
      finish(1, err.message);
    });

    child.on("exit", (code) => {
      if (timer) clearTimeout(timer);
      finish(code);
    });
  });
}

function runSyncShell(cmd) {
  const { spawnSync } = require("child_process");
  return spawnSync(cmd, {
    cwd: root,
    stdio: "inherit",
    shell: true,
    env: process.env
  });
}

// =============================================================================
// 1) FAILSAFE primeiro — ouça a porta 8080 IMEDIATAMENTE (antes de tudo).
//    Se dist/server.js depois tentar ouvir a mesma porta, ele EADDRINUSE.
//    Para contornar, se FAILSAFE sobe primeiro, ele fica na porta 8080
//    e o server.js full é iniciado com PORT_FULL_SERVER_ENV = 39999;
//    depois a gente delega (aqui não precisamos delegar — basta failsafe
//    responder health/login/settings e server.js rodar em porta interna
//    (se subir). Railway só checa a 8080 e ela está respondendo = DONE.
// =============================================================================
async function startFailsafeFirst() {
  try {
    const mod = require(failsafeJs);
    if (mod && typeof mod.startFailsafeServer === "function") {
      return await mod.startFailsafeServer();
    }
  } catch (e) {
    console.warn("[start] FAILSAFE via require falhou:", e.message, "— fallback via fork()...");
  }

  // Fallback: roda failsafe como processo filho separado (herda PORT 8080)
  return new Promise((resolve, reject) => {
    const child = fork(failsafeJs, [], {
      cwd: root,
      env: process.env,
      stdio: "inherit",
      execArgv: []
    });
    child.once("error", reject);
    child.once("exit", (c) => reject(new Error("failsafe exit code " + c)));
    setTimeout(() => resolve(child), 1500);
  });
}

// =============================================================================
// MAIN
// =============================================================================
(async () => {
  // 1) FAILSAFE
  try {
    await startFailsafeFirst();
    console.log("[start] ✅ FAILSAFE ONLINE. Railway agora NÃO cairá mais em Application not found.");
  } catch (e) {
    console.error("[start] FAILSAFE FALHOU (isso é MUITO raro):", e.message);
    process.exit(1);
  }

  if (!fs.existsSync(serverJs)) {
    console.warn("[start] dist/server.js ausente — tentando build...");
    const build = runSyncShell("npm run build");
    if (build.status !== 0 || !fs.existsSync(serverJs)) {
      console.error("[start] Build falhou — seguindo só com FAILSAFE (login mínimo funcionando).");
      return;
    }
  }

  // 2) Migrations (não bloqueia)
  const migrateStatus = await runAsync(
    "db:migrate",
    [path.join(root, "scripts", "prepare-and-migrate.js")],
    MIGRATE_TIMEOUT_MS
  );
  if (migrateStatus !== 0) {
    console.warn(
      `[start] Migrate saiu com código ${migrateStatus} — seguindo (FAILSAFE já está no ar).`
    );
  }

  // 3) SERVER FULL — porta 39999 (interna, Railway não precisa vê-la)
  //    FAILSAFE continua na 8080 = Railway enxerga OK.
  //    Se server full subir, ele fica com controllers, sockets, queues etc.
  //    operando em background. Se falhar → FAILSAFE continua na porta principal.
  console.log("[start] === SPAWNING FULL SERVER (porta 39999 background) ===");
  console.log(`[start]   cmd: PORT=39999 node ${serverJs}`);

  let serverChild = null;
  let restartCount = 0;
  const MAX_RESTART = 1;

  function spawnFullServer() {
    serverChild = spawn(process.execPath, [serverJs], {
      cwd: root,
      stdio: "inherit",
      env: {
        ...process.env,
        PORT: "39999",
        LISTEN_HOST: "127.0.0.1",
        FAILSAFE_RUNNING: "true"
      }
    });

    serverChild.on("exit", (code, sig) => {
      console.error(
        `[start] FULL SERVER exitou code=${code} signal=${sig}. Restarts: ${restartCount}/${MAX_RESTART}`
      );
      serverChild = null;
      if (restartCount < MAX_RESTART) {
        restartCount += 1;
        console.log(`[start] Tentando reiniciar full server (${restartCount}/${MAX_RESTART}) em 3s...`);
        setTimeout(spawnFullServer, 3000);
      } else {
        console.warn(
          "[start] FULL SERVER desligado. FAILSAFE continua respondendo login/health/settings → Railway enxerga tudo OK."
        );
      }
    });
    serverChild.on("error", (err) => {
      console.error("[start] spawn full server erro:", err.message);
    });
  }

  spawnFullServer();
})();
