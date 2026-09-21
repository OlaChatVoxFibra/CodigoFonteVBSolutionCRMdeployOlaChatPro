/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Contraste para textos sobre fundos hex arbitrários (ex.: menu lateral customizado).
 */

export function hexToRgb(hex) {
  if (!hex || typeof hex !== "string") {
    return { r: 128, g: 128, b: 128 };
  }
  let h = hex.replace("#", "").trim();
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (h.length === 8) {
    h = h.slice(0, 6);
  }
  if (h.length !== 6) {
    return { r: 128, g: 128, b: 128 };
  }
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function relativeLuminance(rgb) {
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((x) => {
    x /= 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** true se o fundo for suficientemente escuro para texto branco */
export function isDarkBackgroundHex(hex) {
  if (!hex || typeof hex !== "string") return false;
  return relativeLuminance(hexToRgb(hex)) < 0.5;
}

/**
 * Cor de texto/ícone legível sobre fundo hex (substitui getContrastText do MUI v4 neste bundle).
 */
export function getContrastTextForBackground(hex) {
  if (!hex || typeof hex !== "string") {
    return "#ffffff";
  }
  const normalized = hex.trim().startsWith("#") ? hex.trim() : `#${hex.trim()}`;
  const lum = relativeLuminance(hexToRgb(normalized));
  return lum > 0.5 ? "rgba(0, 0, 0, 0.87)" : "#ffffff";
}

/** Não existe em `@material-ui/core/styles/colorManipulator` neste bundle — use isto no lugar. */
export const getContrastText = getContrastTextForBackground;

export function getSidebarContrast(hexBackground) {
  const dark = isDarkBackgroundHex(hexBackground);
  return {
    isDark: dark,
    textPrimary: dark ? "#FFFFFF" : "rgba(0, 0, 0, 0.87)",
    textSecondary: dark ? "#E5E7EB" : "rgba(0, 0, 0, 0.65)",
    icon: dark ? "#FFFFFF" : "rgba(0, 0, 0, 0.87)",
    hoverBg: dark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
    activeBg: dark ? "rgba(255, 255, 255, 0.14)" : "#f3f4f6",
  };
}

/**
 * Duas URLs apontam para o mesmo arquivo (ex.: mesma upload para claro e escuro).
 * Nesse caso a "logo escura" não pode ser a mesma imagem da clara — o preview/menu devem cair no PNG branco padrão.
 */
export function logosLookSameUrl(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const strip = (u) =>
    String(u)
      .trim()
      .split("?")[0]
      .replace(/\/+$/, "");
  const sa = strip(a);
  const sb = strip(b);
  if (sa === sb) return true;
  try {
    const base =
      typeof window !== "undefined" ? window.location.origin : "http://localhost";
    const pa = new URL(sa, base).pathname.replace(/\/+$/, "");
    const pb = new URL(sb, base).pathname.replace(/\/+$/, "");
    return pa === pb;
  } catch {
    return false;
  }
}
