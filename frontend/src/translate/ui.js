import { i18n } from "./i18n";
import reverseMap from "./reverseMap.generated.json";
import UI_LITERALS from "./uiLiterals";
import { normalizeLanguage } from "./languageUtils";

export function ui(text, language) {
  if (text == null) return "";
  const source = String(text).trim();
  if (!source) return text;

  const lang = normalizeLanguage(language || i18n.language);
  if (lang === "pt") return text;

  const literal = UI_LITERALS[source];
  if (literal?.[lang]) return literal[lang];

  const key = reverseMap[source];
  if (key) {
    const translated = i18n.t(key, { defaultValue: source });
    if (translated && translated !== key) return translated;
  }

  return text;
}

export function uiContains(text) {
  if (!text) return false;
  const source = String(text).trim();
  return Boolean(UI_LITERALS[source] || reverseMap[source]);
}
