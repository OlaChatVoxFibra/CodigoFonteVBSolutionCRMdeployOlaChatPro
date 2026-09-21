/**
 * Inicia backend (3000) e frontend (5181) em paralelo, sem depender de concurrently.
 */
const path = require("path");
const { spawn } = require("child_process");

const rootDir = path.resolve(__dirname, "..", "..");
const backendDir = path.join(rootDir, "backend");
const frontendDir = path.join(rootDir, "frontend");

function run(cmd, args, opts) {
  const p = spawn(cmd, args, {
    stdio: "inherit",
    shell: true,
    ...opts,
  });
  p.on("error", (err) => {
    console.error("Erro:", err);
    process.exit(1);
  });
  p.on("exit", (code) => {
    if (code != null && code !== 0) process.exit(code);
  });
  return p;
}

console.log("Iniciando Backend (porta 3000) e Frontend (porta 5181)...\n");

const backendNodeModules = path.join(backendDir, "node_modules");
run("npx", ["tsx", "watch", "src/server.ts"], {
  cwd: backendDir,
  env: { ...process.env, PORT: "3000", NODE_PATH: backendNodeModules },
});

const reactScriptsPath = path.join(frontendDir, "node_modules", "react-scripts", "bin", "react-scripts.js");
run("node", [reactScriptsPath, "start"], {
  cwd: frontendDir,
  env: { ...process.env, PORT: "5181", BROWSER: "none" },
});
