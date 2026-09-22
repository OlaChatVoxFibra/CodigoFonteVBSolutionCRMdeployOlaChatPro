/**
 * Start de produção: tenta migrar com timeout, mas SEMPRE sobe o servidor.
 * Evita 502 no Railway quando migrate falha, trava ou demora.
 */
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const root = path.resolve(__dirname, "..");
const serverJs = path.join(root, "dist", "server.js");
const MIGRATE_TIMEOUT_MS = Number(process.env.MIGRATE_TIMEOUT_MS || 90000);

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

  console.log("[start] server...");
  const server = spawn(process.execPath, [serverJs], {
    cwd: root,
    stdio: "inherit",
    env: process.env
  });

  server.on("exit", (code) => process.exit(code == null ? 1 : code));
  server.on("error", (err) => {
    console.error("[start] falha ao iniciar server:", err.message);
    process.exit(1);
  });
})();
