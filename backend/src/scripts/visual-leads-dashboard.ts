/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import puppeteer from "puppeteer-core";

async function run() {
  const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5174/leads-sales";
  const DASH_SELECTOR = 'button[title="Dashboard"],button:has(svg)';

  const executablePath =
    process.env.CHROME_PATH ||
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

  const browser = await puppeteer.launch({
    headless: true,
    executablePath
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(FRONTEND_URL, { waitUntil: "networkidle2" });

  await new Promise((r) => setTimeout(r, 2000));

  const buttons = await page.$$("button");
  for (const b of buttons) {
    const txt = await page.evaluate((el) => (el as HTMLButtonElement).innerText || "", b);
    if (txt.toLowerCase().includes("dashboard")) {
      await b.click();
      break;
    }
  }

  await new Promise((r) => setTimeout(r, 2000));

  await page.screenshot({ path: "leads-dashboard-1440x900.png", fullPage: true });

  const viewports = [
    { width: 320, height: 640, name: "320" },
    { width: 768, height: 800, name: "768" },
    { width: 1024, height: 800, name: "1024" },
    { width: 1920, height: 1080, name: "1920" }
  ];

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height, deviceScaleFactor: 1 });
    await new Promise((r) => setTimeout(r, 1000));
    await page.screenshot({ path: `leads-dashboard-${vp.name}.png`, fullPage: true });
  }

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

