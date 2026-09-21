/**
 * VB Solution CRM — Visão Business
 * Contexto do composer Brain (URL learn). Google Drive removido deste pacote.
 */
import axios from "axios";
import AppError from "../../errors/AppError";

function stripHtmlToText(html: string): string {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripHtmlToText(match[1]) : "";
}

export async function brainLearnFromUrl(params: {
  url: string;
  maxChars?: number;
}): Promise<{ url: string; title: string; content: string; truncated: boolean }> {
  const url = String(params.url || "").trim();
  if (!url) {
    throw new AppError("Informe uma URL válida.", 400);
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new AppError("URL inválida.", 400);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new AppError("Apenas URLs http/https são suportadas.", 400);
  }

  const maxChars = params.maxChars || 16000;

  let html = "";
  try {
    const { data } = await axios.get(url, {
      timeout: 20000,
      maxContentLength: 2 * 1024 * 1024,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; VBSolutionBrain/1.0; +https://vbsolution.com.br)",
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8"
      },
      responseType: "text",
      validateStatus: (s) => s >= 200 && s < 400
    });
    html = String(data || "");
  } catch (err: any) {
    const msg = err?.response?.status
      ? `Não foi possível acessar a URL (HTTP ${err.response.status}).`
      : "Não foi possível acessar a URL. Verifique o endereço e tente novamente.";
    throw new AppError(msg, 400);
  }

  const title = extractTitle(html) || parsed.hostname;
  let content = stripHtmlToText(html);
  if (!content) {
    content = `[Conteúdo não extraído automaticamente de ${url}]`;
  }

  const truncated = content.length > maxChars;
  if (truncated) {
    content = `${content.slice(0, maxChars)}\n\n[… conteúdo truncado em ${maxChars} caracteres]`;
  }

  return { url, title, content, truncated };
}

/** Google Drive removido — mantém assinatura para não quebrar callers. */
export async function brainListGoogleDriveFiles(_params?: any): Promise<any> {
  throw new AppError(
    "Google Drive não está disponível neste pacote do VB Solution CRM.",
    410
  );
}

export async function brainReadGoogleDriveFile(_params?: any): Promise<any> {
  throw new AppError(
    "Google Drive não está disponível neste pacote do VB Solution CRM.",
    410
  );
}

export async function brainDownloadGoogleDriveFileForAttach(_params: {
  companyId: number;
  fileId: string;
}): Promise<{
  connected: boolean;
  name: string;
  mimeType: string;
  contentBase64?: string;
  textContent?: string;
  webViewLink?: string;
}> {
  return { connected: false, name: "", mimeType: "" };
}
