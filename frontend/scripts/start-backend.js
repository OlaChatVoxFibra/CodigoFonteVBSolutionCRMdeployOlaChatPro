/**
 * Inicia o backend com cwd = pasta backend (PORT=3000 por defeito).
 * Usa "npm run dev:server" no backend (ts-node/register/transpile-only — precisa de npm install na pasta backend).
 */
const path = require("path");
const { spawn } = require("child_process");

const backendDir = path.resolve(__dirname, "..", "..", "backend");

const child = spawn("npm", ["run", "dev:server"], {
  cwd: backendDir,
  stdio: "inherit",
  env: { ...process.env, PORT: "3000", NODE_ENV: process.env.NODE_ENV || "development" },
  shell: true,
});

child.on("error", (err) => {
  console.error("Erro ao iniciar backend:", err);
  process.exit(1);
});
child.on("exit", (code) => {
  process.exit(code ?? 1);
});
