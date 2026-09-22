import axios from "axios";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import Whatsapp from "../../models/Whatsapp";
import QuickMessageComponent from "../../models/QuickMessageComponent";
import { uploadMetaCloudMedia } from "./uploadMetaCloudMedia";

export type MetaHeaderMediaFormat = "IMAGE" | "VIDEO" | "DOCUMENT";

export type ResolvedHeaderMedia = {
  type: "image" | "video" | "document";
  link?: string;
  id?: string;
  filename?: string;
};

function parseExample(example: any): any {
  if (!example) return null;
  if (typeof example === "string") {
    try {
      return JSON.parse(example);
    } catch {
      return null;
    }
  }
  return example;
}

/**
 * Extrai URL(s) de amostra do HEADER do template Meta (example.header_handle / header_url).
 * A Meta costuma devolver HTTPS (cdn) no sync; handles opacos (4::...) não são usáveis como link.
 */
export function extractMetaTemplateHeaderMediaUrls(component: QuickMessageComponent | any): string[] {
  const example = parseExample(component?.example);
  if (!example) return [];

  const candidates: string[] = [];

  const push = (v: unknown) => {
    if (typeof v === "string" && v.trim()) candidates.push(v.trim());
    else if (Array.isArray(v)) v.forEach(push);
  };

  push(example.header_handle);
  push(example.header_url);
  push(example.header_urls);
  push(example.header);

  if (example.header_handle_url) push(example.header_handle_url);

  return candidates.filter(Boolean);
}

export function pickHttpsMediaUrl(urls: string[]): string | null {
  for (const u of urls) {
    if (/^https:\/\//i.test(u)) return u;
  }
  return null;
}

function formatToType(format: string): "image" | "video" | "document" {
  const f = String(format || "").toUpperCase();
  if (f === "VIDEO") return "video";
  if (f === "DOCUMENT") return "document";
  return "image";
}

/**
 * Resolve mídia do HEADER para envio:
 * 1) valor informado pelo usuário (URL ou media id)
 * 2) URL HTTPS do example do template Meta
 * 3) se houver WhatsApp Oficial, baixa a amostra e sobe via Graph (media id) — cobre CDN temporária
 */
export async function resolveMetaTemplateHeaderMedia(params: {
  format: MetaHeaderMediaFormat | string;
  userValue?: string | null;
  component?: QuickMessageComponent | any;
  whatsapp?: Whatsapp | null;
  filename?: string;
}): Promise<ResolvedHeaderMedia> {
  const type = formatToType(String(params.format || "IMAGE"));
  const userValue = String(params.userValue || "").trim();

  if (userValue) {
    // Media id da Graph (geralmente só dígitos / alfanumérico sem URL)
    if (!/^https?:\/\//i.test(userValue) && /^[A-Za-z0-9_-]{10,}$/.test(userValue)) {
      return { type, id: userValue, filename: params.filename };
    }
    return { type, link: userValue, filename: params.filename };
  }

  const urls = extractMetaTemplateHeaderMediaUrls(params.component);
  const httpsUrl = pickHttpsMediaUrl(urls);

  // Arquivo já cacheado no VB Solution (sync de templates)
  const example =
    typeof params.component?.example === "string"
      ? (() => {
          try {
            return JSON.parse(params.component.example);
          } catch {
            return null;
          }
        })()
      : params.component?.example;
  const cachedName =
    example && typeof example.vb_cached_media === "string"
      ? example.vb_cached_media
      : null;

  if (cachedName && params.whatsapp) {
    try {
      const companyId = (params.whatsapp as any).companyId;
      if (companyId) {
        const localPath = path.resolve(
          __dirname,
          "..",
          "..",
          "..",
          "public",
          `company${companyId}`,
          "templateMedia",
          cachedName
        );
        if (fs.existsSync(localPath)) {
          let mimeType = "application/octet-stream";
          if (type === "image") mimeType = "image/jpeg";
          else if (type === "video") mimeType = "video/mp4";
          else mimeType = "application/pdf";
          const ext = path.extname(localPath).toLowerCase();
          if (ext === ".png") mimeType = "image/png";
          if (ext === ".webp") mimeType = "image/webp";
          if (ext === ".mp4") mimeType = "video/mp4";
          if (ext === ".pdf") mimeType = "application/pdf";
          const uploaded = await uploadMetaCloudMedia(
            params.whatsapp,
            localPath,
            mimeType
          );
          return {
            type,
            id: uploaded.id,
            filename: params.filename || cachedName
          };
        }
      }
    } catch (err) {
      console.warn(
        "[resolveMetaTemplateHeaderMedia] Falha ao usar cache local:",
        (err as any)?.message || err
      );
    }
  }

  if (!httpsUrl) {
    throw new Error(
      "Template Meta com mídia no HEADER: informe a URL/ID da mídia ou sincronize o template novamente (a amostra da Meta não está disponível)."
    );
  }

  // Preferir re-upload para media id (links de CDN da Meta expiram / às vezes não aceitos no send)
  if (params.whatsapp) {
    try {
      const mediaId = await downloadAndUploadTemplateSample(httpsUrl, params.whatsapp, type);
      return { type, id: mediaId, filename: params.filename || guessFilename(httpsUrl, type) };
    } catch (err) {
      console.warn(
        "[resolveMetaTemplateHeaderMedia] Falha ao re-upar amostra Meta; usando link direto:",
        (err as any)?.message || err
      );
    }
  }

  return { type, link: httpsUrl, filename: params.filename || guessFilename(httpsUrl, type) };
}

function guessFilename(url: string, type: "image" | "video" | "document"): string {
  try {
    const u = new URL(url);
    const base = path.basename(u.pathname);
    if (base && base.includes(".")) return base.split("?")[0];
  } catch {
    /* ignore */
  }
  if (type === "video") return "template-video.mp4";
  if (type === "document") return "template-document.pdf";
  return "template-image.jpg";
}

async function downloadAndUploadTemplateSample(
  url: string,
  whatsapp: Whatsapp,
  type: "image" | "video" | "document"
): Promise<string> {
  const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
  const tmpDir = path.join(publicFolder, "temp");
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const filename = `${uuidv4()}-${guessFilename(url, type)}`;
  const filePath = path.join(tmpDir, filename);

  const response = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 60000,
    maxRedirects: 5,
    headers: {
      // Alguns CDNs da Meta exigem user-agent
      "User-Agent": "VBSolution-CRM/1.0",
      Accept: "*/*"
    },
    validateStatus: s => s >= 200 && s < 400
  });

  fs.writeFileSync(filePath, Buffer.from(response.data));

  let mimeType =
    String(response.headers["content-type"] || "")
      .split(";")[0]
      .trim() || "";

  if (!mimeType || mimeType === "application/octet-stream") {
    if (type === "image") mimeType = "image/jpeg";
    else if (type === "video") mimeType = "video/mp4";
    else mimeType = "application/pdf";
  }

  try {
    const uploaded = await uploadMetaCloudMedia(whatsapp, filePath, mimeType);
    return uploaded.id;
  } finally {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {
      /* ignore */
    }
  }
}

export function buildHeaderMediaParameter(resolved: ResolvedHeaderMedia): Record<string, any> {
  const mediaObj: Record<string, any> = {};
  if (resolved.id) mediaObj.id = resolved.id;
  else if (resolved.link) mediaObj.link = resolved.link;
  if (resolved.type === "document" && resolved.filename) {
    mediaObj.filename = resolved.filename;
  }

  return {
    type: resolved.type,
    [resolved.type]: mediaObj
  };
}
