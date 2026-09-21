/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import axios from "axios";
import logger from "./logger";

const MAX_LEN = 4000;

/**
 * GET público e extrai texto simples (sem parser HTML pesado).
 * Falhas silenciosas — usado só para enriquecer prompt.
 */
export async function fetchPageTextSnippet(urlStr: string): Promise<string | null> {
  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  try {
    const res = await axios.get(urlStr, {
      timeout: 8000,
      maxContentLength: 500000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; VBAgent/1.0; +https://example.invalid)"
      },
      responseType: "text",
      transformResponse: [(d) => d]
    });
    const html = String(res.data || "");
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.length > MAX_LEN ? `${text.slice(0, MAX_LEN)}…` : text;
  } catch (e) {
    try {
      logger.warn(`[fetchPageTextSnippet] ${urlStr}: ${e}`);
    } catch {
      /* ignore */
    }
    return null;
  }
}
