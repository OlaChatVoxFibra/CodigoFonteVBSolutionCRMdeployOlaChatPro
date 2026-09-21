/**
 * Prepara pasta de migrações .js (tsc + cópia dos .js-only em src)
 * e roda sequelize-cli db:migrate.
 *
 * Motivo: sequelize-cli 5 só carrega arquivos .js; a maioria das migrations está em .ts.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const srcDir = path.join(root, "src", "database", "migrations");
const distDir = path.join(root, "dist", "database", "migrations");

function ensureDistMigrations() {
  if (!fs.existsSync(distDir)) {
    console.log("[migrate] dist/database/migrations ausente — rodando build...");
    const build = spawnSync("npm", ["run", "build"], {
      cwd: root,
      stdio: "inherit",
      shell: true
    });
    if (build.status !== 0) {
      process.exit(build.status || 1);
    }
  }

  if (!fs.existsSync(distDir)) {
    console.error("[migrate] Falha: dist/database/migrations ainda não existe após build.");
    process.exit(1);
  }

  // Copia migrations .js-only de src que o tsc não emite
  const srcFiles = fs.readdirSync(srcDir).filter(f => f.endsWith(".js"));
  let copied = 0;
  for (const file of srcFiles) {
    const from = path.join(srcDir, file);
    const to = path.join(distDir, file);
    if (!fs.existsSync(to)) {
      fs.copyFileSync(from, to);
      copied += 1;
    }
  }
  if (copied > 0) {
    console.log(`[migrate] Copiadas ${copied} migrations .js de src → dist`);
  }

  const count = fs.readdirSync(distDir).filter(f => f.endsWith(".js")).length;
  console.log(`[migrate] ${count} arquivos .js prontos em dist/database/migrations`);
}

ensureDistMigrations();

const sequelizeBin = path.join(
  root,
  "node_modules",
  "sequelize-cli",
  "lib",
  "sequelize"
);

const result = spawnSync(
  process.execPath,
  [sequelizeBin, "db:migrate"],
  {
    cwd: root,
    stdio: "inherit",
    env: process.env
  }
);

process.exit(result.status == null ? 1 : result.status);
