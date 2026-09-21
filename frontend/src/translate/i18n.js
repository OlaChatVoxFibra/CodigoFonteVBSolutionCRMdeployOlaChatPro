import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import { messages } from "./languages";
import { normalizeLanguage, toI18nLanguage } from "./languageUtils";

const detectionOrder = ["localStorage", "navigator"];
const detectionOptions = {
  order: detectionOrder,
  lookupLocalStorage: "language",
  caches: ["localStorage"],
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    debug: false,
    defaultNS: "translations",
    fallbackLng: "pt",
    ns: ["translations"],
    resources: messages,
    detection: detectionOptions,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    returnEmptyString: false,
  });

const storedLanguage = localStorage.getItem("language");
if (storedLanguage) {
  i18n.changeLanguage(toI18nLanguage(storedLanguage));
}

export async function applyAppLanguage(language) {
  const normalized = toI18nLanguage(language);
  localStorage.setItem("language", language || normalized);
  await i18n.changeLanguage(normalized);
  return normalized;
}

export function getCurrentLanguage() {
  return normalizeLanguage(i18n.language);
}

export { i18n };
