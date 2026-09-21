/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AppError from "../../errors/AppError";
import type { NavigableScreen } from "./figmaInteractivePrototypeBuilder";
import { chromeRequiredMessage, resolveChromeExecutable } from "./chromeExecutable";
import { renderHtmlToPngBuffer } from "./figmaPrototypeRenderService";

export type PrototypeExportFormat = "html" | "png" | "pdf" | "svg";

export type PrototypeExportItem = {
  format: PrototypeExportFormat;
  fileName: string;
  label: string;
  content: string;
  screenId?: string;
};

function safeBaseName(name: string, fallback = "prototipo"): string {
  return (
    String(name || fallback)
      .replace(/[^\w\s-]/g, "")
      .trim()
      .slice(0, 60) || fallback
  );
}

function safeFileName(name: string, ext: string): string {
  const base = safeBaseName(name, "tela");
  return base.endsWith(`.${ext}`) ? base : `${base}.${ext}`;
}

/** Uma PNG por tela (conteúdo HTML isolado). */
export async function renderScreensToPngItems(
  screens: NavigableScreen[],
  opts: { title: string; width?: number; height?: number }
): Promise<Array<{ screenId: string; fileName: string; label: string; buffer: Buffer }>> {
  const prefix = safeBaseName(opts.title);
  const out: Array<{ screenId: string; fileName: string; label: string; buffer: Buffer }> = [];

  for (const screen of screens) {
    const buffer = await renderHtmlToPngBuffer({
      html: screen.html,
      title: screen.title || screen.id,
      width: opts.width,
      height: opts.height
    });
    const label = screen.title || screen.id;
    out.push({
      screenId: screen.id,
      fileName: safeFileName(`${prefix}-${screen.id}`, "png"),
      label,
      buffer
    });
  }
  return out;
}

/** PDF multipágina a partir das PNGs das telas. */
export async function renderPngBuffersToPdfBuffer(
  pages: Array<{ label: string; buffer: Buffer }>,
  width: number,
  height: number
): Promise<Buffer> {
  if (!pages.length) {
    throw new AppError("Nenhuma tela para gerar PDF.", 422);
  }

  const puppeteer = await import("puppeteer-core");
  const executablePath = resolveChromeExecutable();
  if (!executablePath) {
    throw new AppError(chromeRequiredMessage(), 503);
  }

  const imgs = pages
    .map(
      p =>
        `<div class="vb-page" style="width:${width}px;height:${height}px;page-break-after:always;display:flex;align-items:center;justify-content:center;background:#f4f4f5;">
<img src="data:image/png;base64,${p.buffer.toString("base64")}" alt="" style="max-width:100%;max-height:100%;border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,0.15);" />
</div>`
    )
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
@page { margin: 12px; size: ${width + 24}px ${height + 24}px; }
body { margin: 0; padding: 0; }
.vb-page:last-child { page-break-after: auto; }
</style></head><body>${imgs}</body></html>`;

  let browser;
  try {
    browser = await puppeteer.default.launch({
      headless: true,
      executablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 45000 });
    const pdf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "8px", right: "8px", bottom: "8px", left: "8px" }
    });
    return Buffer.from(pdf);
  } catch (e: any) {
    if (e instanceof AppError) throw e;
    const msg = String(e?.message || e);
    if (/ENOENT|executable|chrome/i.test(msg)) {
      throw new AppError(chromeRequiredMessage(), 503);
    }
    throw new AppError(`Falha ao gerar PDF: ${msg.slice(0, 280)}`, 502);
  } finally {
    if (browser) await browser.close().catch(() => undefined);
  }
}

export async function buildPrototypeExportItems(params: {
  screens: NavigableScreen[];
  title: string;
  width?: number;
  height?: number;
  formats: PrototypeExportFormat[];
}): Promise<{ exports: PrototypeExportItem[]; warnings: string[] }> {
  const formats = new Set(
    (params.formats?.length ? params.formats : ["png", "pdf"]).map(f =>
      String(f).toLowerCase()
    ) as PrototypeExportFormat[]
  );

  const exports: PrototypeExportItem[] = [];
  const warnings: string[] = [];
  const prefix = safeBaseName(params.title);
  const width = params.width || 390;
  const height = params.height || 844;

  if (!resolveChromeExecutable() && (formats.has("png") || formats.has("pdf"))) {
    warnings.push(chromeRequiredMessage());
    return { exports, warnings };
  }

  let pngPages: Array<{ screenId: string; fileName: string; label: string; buffer: Buffer }> =
    [];

  if (formats.has("png") || formats.has("pdf")) {
    try {
      pngPages = await renderScreensToPngItems(params.screens, {
        title: params.title,
        width,
        height
      });
    } catch (e: any) {
      warnings.push(String(e?.message || e).slice(0, 400));
      pngPages = [];
    }
  }

  if (formats.has("png")) {
    for (const p of pngPages) {
      exports.push({
        format: "png",
        fileName: p.fileName,
        label: `PNG — ${p.label}`,
        content: `data:image/png;base64,${p.buffer.toString("base64")}`,
        screenId: p.screenId
      });
    }
    if (!pngPages.length && formats.has("png") && !warnings.length) {
      warnings.push("Não foi possível gerar PNG das telas.");
    }
  }

  if (formats.has("pdf")) {
    try {
      if (!pngPages.length) {
        throw new AppError("PDF exige PNG das telas; geração PNG falhou.", 422);
      }
      const pdfBuffer = await renderPngBuffersToPdfBuffer(
        pngPages.map(p => ({ label: p.label, buffer: p.buffer })),
        width,
        height
      );
      exports.push({
        format: "pdf",
        fileName: safeFileName(`${prefix}-fluxo`, "pdf"),
        label: "PDF — todas as telas",
        content: `data:application/pdf;base64,${pdfBuffer.toString("base64")}`
      });
    } catch (e: any) {
      warnings.push(`PDF: ${String(e?.message || e).slice(0, 300)}`);
    }
  }

  if (formats.has("svg")) {
    for (const screen of params.screens) {
      const wrapped = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
<foreignObject width="100%" height="100%">${screen.html}</foreignObject>
</svg>`;
      exports.push({
        format: "svg",
        fileName: safeFileName(`${prefix}-${screen.id}`, "svg"),
        label: `SVG — ${screen.title || screen.id}`,
        content: wrapped,
        screenId: screen.id
      });
    }
  }

  return { exports, warnings };
}
