const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

let root = path.resolve(__dirname, "..");
if (!fs.existsSync(path.join(root, "dist", "server.js")) && fs.existsSync(path.join("/app/backend", "dist", "server.js"))) {
  root = "/app/backend";
} else if (!fs.existsSync(path.join(root, "dist", "server.js")) && fs.existsSync(path.join("/app", "dist", "server.js"))) {
  root = "/app";
}

const serverJs = path.join(root, "dist", "server.js");

console.log("==================================================");
console.log("[start] START PRODUCTION (REAL EXPRESS SERVER)");
console.log(`[start]   cwd ......... ${process.cwd()}`);
console.log(`[start]   root ........ ${root}`);
console.log(`[start]   serverJs .... ${serverJs} (${fs.existsSync(serverJs) ? "SIM" : "NAO"})`);
console.log(`[start]   PORT ........ ${process.env.PORT || 8080}`);
console.log("==================================================");

if (!fs.existsSync(serverJs)) {
  console.error(`[start] ERRO CRÍTICO: ${serverJs} não existe!`);
  process.exit(1);
}

try {
  console.log("[start] Rodando migrações se necessário...");
  spawnSync(process.execPath, [path.join(root, "scripts", "prepare-and-migrate.js")], {
    cwd: root,
    stdio: "inherit",
    env: process.env
  });
} catch (e) {
  console.warn("[start] Aviso nas migrações:", e.message);
}

console.log("[start] Carregando e iniciando servidor principal (dist/server.js)...");
require(serverJs);

