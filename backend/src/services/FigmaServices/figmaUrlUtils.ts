/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** Extrai fileKey de URL Figma ou retorna o valor se já for a chave. */
export function parseFigmaFileKey(input: string): string | null {
  const raw = String(input || "").trim();
  if (!raw) return null;
  if (/^[a-zA-Z0-9]{10,128}$/.test(raw) && !raw.includes("/")) {
    return raw;
  }
  const patterns = [
    /figma\.com\/(?:file|design|proto)\/([a-zA-Z0-9]+)/i,
    /figma\.com\/board\/([a-zA-Z0-9]+)/i
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}
