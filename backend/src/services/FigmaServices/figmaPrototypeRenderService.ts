/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import puppeteer from "puppeteer-core";
import AppError from "../../errors/AppError";
import { chromeRequiredMessage, resolveChromeExecutable } from "./chromeExecutable";

const DEFAULT_WIDTH = 390;
const DEFAULT_HEIGHT = 844;

function wrapHtmlDocument(html: string, title: string): string {
  const body = String(html || "").trim();
  if (/<html[\s>]/i.test(body)) return body;
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title || "Protótipo"}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; }
  </style>
</head>
<body>${body}</body>
</html>`;
}

async function launchBrowser() {
  const executablePath = resolveChromeExecutable();
  if (!executablePath) {
    throw new AppError(chromeRequiredMessage(), 503);
  }
  return puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu"
    ]
  });
}

export async function renderHtmlToPngBuffer(params: {
  html: string;
  title?: string;
  width?: number;
  height?: number;
}): Promise<Buffer> {
  const width = Math.min(Math.max(params.width || DEFAULT_WIDTH, 320), 1920);
  const height = Math.min(Math.max(params.height || DEFAULT_HEIGHT, 400), 2400);
  const html = wrapHtmlDocument(params.html, params.title || "Protótipo");

  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 2 });
    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: 45000
    });
    await page.evaluate(() => document.fonts?.ready).catch(() => undefined);
    await new Promise(r => setTimeout(r, 400));
    const buffer = await page.screenshot({
      type: "png",
      fullPage: false
    });
    return Buffer.from(buffer);
  } catch (e: any) {
    if (e instanceof AppError) throw e;
    const msg = String(e?.message || e);
    if (/ENOENT|executable|chrome|browser|Could not find/i.test(msg)) {
      throw new AppError(chromeRequiredMessage(), 503);
    }
    throw new AppError(`Falha ao renderizar PNG: ${msg.slice(0, 280)}`, 502);
  } finally {
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }
}
