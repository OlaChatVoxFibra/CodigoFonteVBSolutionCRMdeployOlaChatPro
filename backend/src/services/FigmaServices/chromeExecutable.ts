/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import fs from "fs";
import path from "path";

const WINDOWS_CHROME_PATHS = [
  process.env.CHROME_PATH,
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  path.join(
    process.env.LOCALAPPDATA || "",
    "Google\\Chrome\\Application\\chrome.exe"
  ),
  path.join(
    process.env.PROGRAMFILES || "C:\\Program Files",
    "Google\\Chrome\\Application\\chrome.exe"
  ),
  path.join(
    process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)",
    "Google\\Chrome\\Application\\chrome.exe"
  ),
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
].filter(Boolean) as string[];

let cachedPath: string | null | undefined;

/** Resolve Chrome/Chromium para Puppeteer (PNG/PDF). */
export function resolveChromeExecutable(): string | null {
  if (cachedPath !== undefined) return cachedPath;

  for (const candidate of WINDOWS_CHROME_PATHS) {
    const p = String(candidate).trim();
    if (!p) continue;
    try {
      if (fs.existsSync(p)) {
        cachedPath = p;
        return p;
      }
    } catch {
      /* ignore */
    }
  }

  cachedPath = null;
  return null;
}

export function chromeRequiredMessage(): string {
  return (
    "Exportação PNG/PDF requer Google Chrome no servidor. " +
    "Defina CHROME_PATH no .env do backend (ex.: C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe) e reinicie o backend."
  );
}
