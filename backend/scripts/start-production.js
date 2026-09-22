/**
 * Start de produção: tenta migrar com timeout, mas SEMPRE sobe o servidor.
 * Evita 502 no Railway quando migrate falha, trava ou demora.
 *
 * Também detecta layout (pode rodar em /app OU /app/backend, graças ao
 * layout simbionte nos Dockerfiles) e printa caminhos resolvidos no início
 * para facilitar debug dos deploy logs do Railway.
 */
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const root = path.resolve(__dirname, "..");
const serverJs = path.join(root, "dist", "server.js");
const packageJson = path.join(root, "package.json");
const MIGRATE_TIMEOUT_MS = Number(process.env.MIGRATE_TIMEOUT_MS || 90000);

// =============================================================================
// BANNER de diagnóstico (aparece nos Deploy Logs do Railway — VERIFIQUE ISSO!)
// =============================================================================
console.log("==================================================");
console.log("[start] START-PRODUCTION INIT");
console.log(`[start]   cwd atual ........... ${process.cwd()}`);
console.log(`[start]   root resolvido ...... ${root}`);
console.log(`[start]   __dirname ........... ${__dirname}`);
console.log(`[start]   package.json existe . ${fs.existsSync(packageJson) ? "SIM" : "NAO"} (${packageJson})`);
console.log(`[start]   dist/server.js existe ${fs.existsSync(serverJs) ? "SIM" : "NAO"} (${serverJs})`);
console.log(`[start]   NODE_ENV ............ ${process.env.NODE_ENV || ""}`);
console.log(`[start]   PORT ................ ${process.env.PORT || ""}`);
console.log(`[start]   LISTEN_HOST ......... ${process.env.LISTEN_HOST || ""}`);
console.log(`[start]   DATABASE_URL ........ ${process.env.DATABASE_URL ? "(definido)" : "(VAZIO — causará crash no listen!)"}`);
console.log(`[start]   REDIS_URI_ACK ....... ${process.env.REDIS_URI_ACK ? "(definido)" : "(VAZIO — queues não iniciam, mas API sobe)"}`);
console.log("==================================================");

function runAsync(label, args, timeoutMs) {
  return new Promise((resolve) => {
    console.log(`[start] ${label}...`);
    const child = spawn(process.execPath, args, {
      cwd: root,
      stdio: "inherit",
      env: process.env
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
              `[start] ${label} excedeu ${timeoutMs}ms — matando e seguindo para o server`
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

(async () => {
  if (!fs.existsSync(serverJs)) {
    console.log("[start] dist/server.js ausente — rodando build...");
    const build = runSyncShell("npm run build");
    if (build.status !== 0 || !fs.existsSync(serverJs)) {
      console.error("[start] Build falhou — sem dist/server.js");
      process.exit(build.status || 1);
    }
  }

  const migrateStatus = await runAsync(
    "db:migrate",
    [path.join(root, "scripts", "prepare-and-migrate.js")],
    MIGRATE_TIMEOUT_MS
  );
  if (migrateStatus !== 0) {
    console.warn(
      `[start] Migrate saiu com código ${migrateStatus} — iniciando API mesmo assim`
    );
  }

  console.log("[start] === SPAWNING SERVER ===");
  console.log(`[start]   cmd: node ${serverJs}`);
  console.log(`[start]   cwd: ${root}`);
  console.log(`[start]   PORT=${process.env.PORT || "vazio"} LISTEN_HOST=${process.env.LISTEN_HOST || "vazio"}`);
  const server = spawn(process.execPath, [serverJs], {
    cwd: root,
    stdio: "inherit",
    env: process.env
  });

  server.on("exit", (code) => {
    console.error(`[start] server.js EXITOU com código ${code} — finalizando container`);
    process.exit(code == null ? 1 : code);
  });
  server.on("error", (err) => {
    console.error("[start] falha ao iniciar server.js (spawn error):", err.message);
    process.exit(1);
  });
})();
