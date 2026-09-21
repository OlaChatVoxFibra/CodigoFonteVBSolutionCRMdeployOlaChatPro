/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** Tags opacas estilo Notion — fundo pastel sólido, texto saturado, sem transparência */

const DEFAULT_RGB = { r: 145, g: 145, b: 142 };

const NOTION_NEUTRAL_LIGHT = { bg: "#e9e9e7", text: "#37352f" };
const NOTION_NEUTRAL_DARK = { bg: "#454545", text: "#ebebea" };

export function hexToRgb(hex) {
  if (!hex || typeof hex !== "string") return DEFAULT_RGB;
  const raw = hex.replace("#", "").trim();
  if (raw.length !== 3 && raw.length !== 6) return DEFAULT_RGB;
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return DEFAULT_RGB;
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
}

function mix(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function toHex(r, g, b) {
  const h = (n) => {
    const s = Math.max(0, Math.min(255, n)).toString(16);
    return s.length === 1 ? `0${s}` : s;
  };
  return `#${h(r)}${h(g)}${h(b)}`;
}

function luminance(r, g, b) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/**
 * Paleta Notion: fundo = cor misturada com branco (opaco), texto = tom mais escuro da mesma cor.
 */
export function getNotionTagAppearance(hexColor, isDark = false) {
  const { r, g, b } = hexToRgb(hexColor);
  const lum = luminance(r, g, b);

  if (lum < 0.18) {
    const neutral = isDark ? NOTION_NEUTRAL_DARK : NOTION_NEUTRAL_LIGHT;
    return {
      backgroundColor: neutral.bg,
      color: neutral.text,
      border: "none",
    };
  }

  if (isDark) {
    const bgR = mix(r, 55, 0.32);
    const bgG = mix(g, 55, 0.32);
    const bgB = mix(b, 55, 0.32);
    const textR = mix(r, 255, 0.55);
    const textG = mix(g, 255, 0.55);
    const textB = mix(b, 255, 0.55);
    return {
      backgroundColor: toHex(bgR, bgG, bgB),
      color: toHex(textR, textG, textB),
      border: "none",
    };
  }

  // Claro: ~88% branco no fundo (pastel Notion), texto ~42% cor original
  const bgR = mix(r, 255, 0.86);
  const bgG = mix(g, 255, 0.86);
  const bgB = mix(b, 255, 0.86);
  const textR = mix(r, 55, 0.48);
  const textG = mix(g, 55, 0.48);
  const textB = mix(b, 55, 0.48);

  return {
    backgroundColor: toHex(bgR, bgG, bgB),
    color: toHex(textR, textG, textB),
    border: "none",
  };
}

/** Tags neutras (ex.: Agente IA) — cinza Notion padrão */
export function getNotionNeutralTagAppearance(isDark, accent = "#0ea5e9") {
  if (isDark) {
    const { r, g, b } = hexToRgb(accent);
    const bgR = mix(r, 55, 0.28);
    const bgG = mix(g, 55, 0.28);
    const bgB = mix(b, 55, 0.28);
    const textR = mix(r, 255, 0.5);
    const textG = mix(g, 255, 0.5);
    const textB = mix(b, 255, 0.5);
    return {
      backgroundColor: toHex(bgR, bgG, bgB),
      color: toHex(textR, textG, textB),
      border: "none",
    };
  }
  const { r, g, b } = hexToRgb(accent);
  return {
    backgroundColor: toHex(mix(r, 255, 0.84), mix(g, 255, 0.84), mix(b, 255, 0.84)),
    color: toHex(mix(r, 40, 0.5), mix(g, 40, 0.5), mix(b, 40, 0.5)),
    border: "none",
  };
}
