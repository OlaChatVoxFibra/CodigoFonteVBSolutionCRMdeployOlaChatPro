export const SUPPORTED_LANGUAGES = ["pt", "pt-BR", "en", "es", "ar", "tr"];

export function normalizeLanguage(language) {
  if (!language) return "pt";
  const code = String(language).toLowerCase().split("-")[0];
  if (code === "pt") return "pt";
  if (code === "en") return "en";
  if (code === "es") return "es";
  if (code === "ar") return "ar";
  if (code === "tr") return "tr";
  return "pt";
}

export function toI18nLanguage(language) {
  const normalized = normalizeLanguage(language);
  if (normalized === "pt") return "pt";
  return normalized;
}

export function resolveInitialLanguage({ userLanguage, storedLanguage } = {}) {
  return toI18nLanguage(userLanguage || storedLanguage || "pt");
}
