/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import axios from "axios";
import AppError from "../../errors/AppError";
import { brainUploadBinaryToGoogleDrive } from "../GoogleAuthServices/googleDriveStub";
import FigmaContextAgent from "./FigmaContextAgent";
import { createFigmaServiceForCompany, FigmaService } from "./FigmaService";
import { parseFigmaFileKey } from "./figmaUrlUtils";
import { renderHtmlToPngBuffer } from "./figmaPrototypeRenderService";
import {
  buildNavigablePrototypeHtml,
  NavigableFlowLink,
  NavigableScreen
} from "./figmaInteractivePrototypeBuilder";
import {
  buildPrototypeExportItems,
  PrototypeExportFormat,
  PrototypeExportItem
} from "./figmaPrototypeExportService";

export type FigmaBrainFileRef = {
  key: string;
  name: string;
  lastModified?: string;
  thumbnailUrl?: string;
  projectId?: string;
  projectName?: string;
  teamId?: string;
  teamName?: string;
};

async function requireFigma(companyId: number): Promise<{
  service: FigmaService;
  flags: NonNullable<Awaited<ReturnType<typeof createFigmaServiceForCompany>>>["flags"];
}> {
  const ctx = await createFigmaServiceForCompany(companyId);
  if (!ctx) {
    throw new AppError(
      "Figma não conectado ou Brain AI sem permissão. Conecte em Integrações → Figma e ative acesso ao Brain.",
      422
    );
  }
  if (!ctx.flags.enableBrainAi) {
    throw new AppError("Acesso do Brain AI ao Figma está desativado nas configurações.", 422);
  }
  return ctx;
}

function resolveFileKey(fileKeyOrUrl: string): string {
  const key = parseFigmaFileKey(fileKeyOrUrl);
  if (!key) {
    throw new AppError(
      "fileKey inválido. Use a URL do arquivo (figma.com/file/...) ou o ID do arquivo.",
      422
    );
  }
  return key;
}

/** Lista times, projetos e arquivos acessíveis pelo token. */
export async function brainListFigmaProjectsAndFiles(companyId: number): Promise<{
  account: { email?: string; handle?: string };
  teams: Array<{
    id: string;
    name: string;
    projects: Array<{
      id: string;
      name: string;
      files: FigmaBrainFileRef[];
    }>;
  }>;
  totalFiles: number;
}> {
  const { service } = await requireFigma(companyId);
  const workspace = await service.listWorkspaceFiles();
  return {
    account: workspace.account,
    teams: workspace.teams,
    totalFiles: workspace.totalFiles
  };
}

export async function brainGetFigmaDesignLanguage(
  companyId: number,
  fileKeyOrUrl: string
): Promise<Record<string, unknown>> {
  await requireFigma(companyId);
  const fileKey = resolveFileKey(fileKeyOrUrl);
  const agent = new FigmaContextAgent(companyId);
  return agent.getDesignLanguage(fileKey);
}

export type FigmaPrototypePngFile = {
  type: "png";
  title: string;
  content: string;
  width: number;
  height: number;
  referenceFileKey?: string;
};

export type FigmaNavigableHtmlFile = {
  type: "prototype_html";
  title: string;
  content: string;
  width: number;
  height: number;
  screenCount: number;
  referenceFileKey?: string;
};

/** Preview navegável + exportações PNG/PDF/SVG para download. */
export type FigmaPrototypePackageFile = {
  type: "prototype_package";
  title: string;
  content: string;
  width: number;
  height: number;
  screenCount: number;
  exports: PrototypeExportItem[];
  exportWarnings?: string[];
  referenceFileKey?: string;
};

export type FigmaEmbedPrototypeFile = {
  type: "figma_prototype";
  title: string;
  content: string;
  prototypeUrl: string;
  embedUrl: string;
  fileKey: string;
};

export async function brainOpenFigmaNavigablePrototype(
  companyId: number,
  fileKeyOrUrl: string
): Promise<{
  success: boolean;
  fileData?: FigmaEmbedPrototypeFile;
  flows?: Record<string, unknown>;
  error?: string;
}> {
  const ctx = await requireFigma(companyId);
  if (!ctx.flags.enablePrototypeAnalysis) {
    return {
      success: false,
      error: "Análise de protótipos desativada em Integrações → Figma."
    };
  }
  const fileKey = resolveFileKey(fileKeyOrUrl);
  const proto = await ctx.service.getPrototypeLinks(fileKey);
  const summary = await ctx.service.getFileSummary(fileKey);

  const fileData: FigmaEmbedPrototypeFile = {
    type: "figma_prototype",
    title: String(summary.name || "Protótipo Figma"),
    content: "",
    prototypeUrl: proto.prototypeUrl || `https://www.figma.com/file/${fileKey}`,
    embedUrl: proto.embedUrl || "",
    fileKey
  };

  return {
    success: true,
    fileData,
    flows: {
      pages: proto.pages,
      flowStartingPoints: proto.flowStartingPoints,
      interactions: proto.interactions,
      instruction:
        "Entregue ao usuário o link prototypeUrl (navegável no Figma) e o preview embutido no painel do Brain."
    }
  };
}

export async function brainRenderFigmaNavigablePrototype(params: {
  companyId: number;
  title: string;
  screens: NavigableScreen[];
  startScreenId?: string;
  flowLinks?: NavigableFlowLink[];
  width?: number;
  height?: number;
  referenceFileKeyOrUrl?: string;
  uploadToGoogleDrive?: boolean;
  exportFormats?: PrototypeExportFormat[];
}): Promise<{
  success: boolean;
  fileData?: FigmaPrototypePackageFile | FigmaNavigableHtmlFile;
  driveLinks?: Array<{ name: string; webViewLink: string }>;
  exportWarnings?: string[];
  error?: string;
}> {
  await requireFigma(params.companyId);
  const title = String(params.title || "Protótipo navegável").trim();
  const width = params.width || 390;
  const height = params.height || 844;

  const html = buildNavigablePrototypeHtml({
    title: params.title,
    screens: params.screens,
    startScreenId: params.startScreenId,
    flowLinks: params.flowLinks,
    width,
    height
  });

  const refKey = params.referenceFileKeyOrUrl
    ? parseFigmaFileKey(params.referenceFileKeyOrUrl)
    : null;

  const formats = params.exportFormats?.length
    ? params.exportFormats
    : (["html", "png", "pdf"] as PrototypeExportFormat[]);

  const wantExports =
    formats.includes("png") || formats.includes("pdf") || formats.includes("svg");

  let exports: PrototypeExportItem[] = [];
  const exportWarnings: string[] = [];
  if (wantExports) {
    try {
      const built = await buildPrototypeExportItems({
        screens: params.screens,
        title,
        width,
        height,
        formats: formats.filter(f => f !== "html")
      });
      exports = built.exports;
      exportWarnings.push(...built.warnings);
    } catch (e: any) {
      exportWarnings.push(String(e?.message || e).slice(0, 400));
    }
  }

  const fileData: FigmaPrototypePackageFile = {
    type: "prototype_package",
    title,
    content: html,
    width,
    height,
    screenCount: params.screens.length,
    exports,
    referenceFileKey: refKey || undefined,
    exportWarnings: exportWarnings.length ? exportWarnings : undefined
  };

  const driveLinks: Array<{ name: string; webViewLink: string }> = [];
  if (params.uploadToGoogleDrive) {
    const safeName = title.replace(/[^\w\s-]/g, "").slice(0, 80) || "prototipo";

    const htmlUp = await brainUploadBinaryToGoogleDrive({
      companyId: params.companyId,
      fileName: `${safeName}.html`,
      mimeType: "text/html",
      buffer: Buffer.from(html, "utf8")
    });
    if (htmlUp.success && htmlUp.webViewLink) {
      driveLinks.push({ name: htmlUp.name || `${safeName}.html`, webViewLink: htmlUp.webViewLink });
    }

    for (const exp of exports) {
      if (exp.format === "png" && exp.content.startsWith("data:image/png;base64,")) {
        const b64 = exp.content.replace(/^data:image\/png;base64,/, "");
        const up = await brainUploadBinaryToGoogleDrive({
          companyId: params.companyId,
          fileName: exp.fileName,
          mimeType: "image/png",
          buffer: Buffer.from(b64, "base64")
        });
        if (up.success && up.webViewLink) {
          driveLinks.push({ name: up.name || exp.fileName, webViewLink: up.webViewLink });
        }
      }
      if (exp.format === "pdf" && exp.content.startsWith("data:application/pdf;base64,")) {
        const b64 = exp.content.replace(/^data:application\/pdf;base64,/, "");
        const up = await brainUploadBinaryToGoogleDrive({
          companyId: params.companyId,
          fileName: exp.fileName,
          mimeType: "application/pdf",
          buffer: Buffer.from(b64, "base64")
        });
        if (up.success && up.webViewLink) {
          driveLinks.push({ name: up.name || exp.fileName, webViewLink: up.webViewLink });
        }
      }
    }
  }

  return {
    success: true,
    fileData,
    driveLinks,
    exportWarnings: exportWarnings.length ? exportWarnings : undefined
  };
}

export async function brainRenderFigmaPrototypeScreen(params: {
  companyId: number;
  title: string;
  html: string;
  width?: number;
  height?: number;
  referenceFileKeyOrUrl?: string;
  uploadToGoogleDrive?: boolean;
}): Promise<{
  success: boolean;
  fileData?: FigmaPrototypePngFile;
  driveLinks?: Array<{ name: string; webViewLink: string }>;
  error?: string;
}> {
  await requireFigma(params.companyId);
  const title = String(params.title || "Protótipo de tela").trim();
  const width = params.width || 390;
  const height = params.height || 844;

  const buffer = await renderHtmlToPngBuffer({
    html: params.html,
    title,
    width,
    height
  });

  const base64 = buffer.toString("base64");
  const refKey = params.referenceFileKeyOrUrl
    ? parseFigmaFileKey(params.referenceFileKeyOrUrl)
    : null;

  const fileData: FigmaPrototypePngFile = {
    type: "png",
    title,
    content: `data:image/png;base64,${base64}`,
    width,
    height,
    referenceFileKey: refKey || undefined
  };

  const driveLinks: Array<{ name: string; webViewLink: string }> = [];
  if (params.uploadToGoogleDrive) {
    const safeName = title.replace(/[^\w\s-]/g, "").slice(0, 80) || "prototipo";
    const up = await brainUploadBinaryToGoogleDrive({
      companyId: params.companyId,
      fileName: `${safeName}.png`,
      mimeType: "image/png",
      buffer
    });
    if (up.success && up.webViewLink) {
      driveLinks.push({ name: up.name || `${safeName}.png`, webViewLink: up.webViewLink });
    }
  }

  return { success: true, fileData, driveLinks };
}

export async function brainGetFigmaFileSummary(
  companyId: number,
  fileKeyOrUrl: string
): Promise<Record<string, unknown>> {
  const { service } = await requireFigma(companyId);
  const fileKey = resolveFileKey(fileKeyOrUrl);
  return service.getFileSummary(fileKey);
}

export async function brainExportFigmaAssetsToGoogleDrive(params: {
  companyId: number;
  fileKeyOrUrl: string;
  nodeIds?: string[];
  format?: "png" | "jpg" | "svg" | "pdf";
  scale?: number;
  driveFileNamePrefix?: string;
  includeJsonManifest?: boolean;
}): Promise<{
  success: boolean;
  accountEmail?: string;
  uploaded: Array<{ name: string; webViewLink: string; fileId: string; nodeId?: string }>;
  prototypeUrl?: string | null;
  error?: string;
}> {
  const { service, flags } = await requireFigma(params.companyId);
  const fileKey = resolveFileKey(params.fileKeyOrUrl);
  const format = params.format || "png";
  const scale = params.scale && params.scale > 0 ? params.scale : 2;
  const prefix =
    String(params.driveFileNamePrefix || "figma-export").trim() || "figma-export";

  let nodeIds = Array.isArray(params.nodeIds)
    ? params.nodeIds.map(String).filter(Boolean)
    : [];

  if (!nodeIds.length) {
    const frames = await service.getFrames(fileKey);
    nodeIds = frames.slice(0, 8).map(f => f.id);
  }
  if (!nodeIds.length) {
    return { success: false, uploaded: [], error: "Nenhum frame encontrado para exportar." };
  }

  const images = await service.getRenderedImages(fileKey, nodeIds, format, scale);
  const uploaded: Array<{
    name: string;
    webViewLink: string;
    fileId: string;
    nodeId?: string;
  }> = [];
  let driveAccountEmail: string | undefined;

  for (const [nodeId, imageUrl] of Object.entries(images.images || {})) {
    if (!imageUrl) continue;
    const res = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      timeout: 60000
    });
    const mime =
      format === "svg"
        ? "image/svg+xml"
        : format === "jpg"
          ? "image/jpeg"
          : format === "pdf"
            ? "application/pdf"
            : "image/png";
    const ext = format === "jpg" ? "jpg" : format;
    const safeNode = nodeId.replace(/:/g, "-");
    const fileName = `${prefix}-${safeNode}.${ext}`;
    const up = await brainUploadBinaryToGoogleDrive({
      companyId: params.companyId,
      fileName,
      mimeType: mime,
      buffer: Buffer.from(res.data)
    });
    if (up.success) {
      driveAccountEmail = up.accountEmail || driveAccountEmail;
      uploaded.push({
        name: up.name || fileName,
        webViewLink: up.webViewLink || "",
        fileId: up.fileId || "",
        nodeId
      });
    }
  }

  if (params.includeJsonManifest !== false) {
    const summary = await service.getFileSummary(fileKey);
    const manifest = JSON.stringify(
      {
        fileKey,
        exportedAt: new Date().toISOString(),
        format,
        nodeIds,
        summary
      },
      null,
      2
    );
    const manifestUp = await brainUploadBinaryToGoogleDrive({
      companyId: params.companyId,
      fileName: `${prefix}-manifest.json`,
      mimeType: "application/json",
      buffer: Buffer.from(manifest, "utf8")
    });
    if (manifestUp.success) {
      driveAccountEmail = manifestUp.accountEmail || driveAccountEmail;
      uploaded.push({
        name: manifestUp.name || `${prefix}-manifest.json`,
        webViewLink: manifestUp.webViewLink || "",
        fileId: manifestUp.fileId || ""
      });
    }
  }

  let prototypeUrl: string | null = null;
  if (flags.enablePrototypeAnalysis) {
    try {
      const proto = await service.getPrototypeLinks(fileKey);
      prototypeUrl = proto.prototypeUrl;
    } catch {
      prototypeUrl = null;
    }
  }

  if (!uploaded.length) {
    return {
      success: false,
      uploaded: [],
      error:
        "Não foi possível enviar ao Google Drive. Conecte Google Drive em Integrações e ative o MCP google_drive no Brain."
    };
  }

  return {
    success: true,
    accountEmail: driveAccountEmail,
    uploaded,
    prototypeUrl
  };
}
