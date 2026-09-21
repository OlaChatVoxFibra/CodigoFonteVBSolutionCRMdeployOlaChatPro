#!/usr/bin/env node
/**
 * Limpa node_modules/.cache sem abortar o dev (Windows: EPERM, ENOTEMPTY, EBUSY).
 */
const fs = require("fs");
const path = require("path");

const cacheDir = path.join(__dirname, "..", "node_modules", ".cache");

const SKIPPABLE = new Set(["EPERM", "EBUSY", "ENOENT", "ENOTEMPTY", "EACCES"]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function removeEntry(target) {
  try {
    fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
    return true;
  } catch (err) {
    if (SKIPPABLE.has(err.code)) return false;
    throw err;
  }
}

function removeDirDeep(dir) {
  if (!fs.existsSync(dir)) return true;

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!removeDirDeep(full)) return false;
      } else if (!removeEntry(full)) {
        return false;
      }
    }
    return removeEntry(dir);
  } catch (err) {
    if (SKIPPABLE.has(err.code)) return false;
    throw err;
  }
}

async function main() {
  if (!fs.existsSync(cacheDir)) {
    console.log("[clean:cache] Nada para limpar.");
    return;
  }

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    if (removeDirDeep(cacheDir)) {
      console.log("[clean:cache] Cache webpack/babel removido.");
      return;
    }
    await sleep(400 * attempt);
  }

  console.warn(
    "[clean:cache] Não foi possível limpar o cache (arquivo em uso). " +
      "O dev vai continuar — feche instâncias antigas de npm run dev se precisar."
  );
}

main()
  .catch((err) => {
    console.warn(`[clean:cache] Ignorando erro: ${err.code || err.message}`);
  })
  .finally(() => process.exit(0));
