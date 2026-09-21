import { normalizeLanguage } from "./languageUtils";

const SOURCE_LANG = "pt";
const SUPPORTED_TARGETS = new Set(["en", "es", "ar", "tr"]);
const ELEMENT_ID = "google_translate_element";

let loadPromise = null;
let currentTarget = null;
let isApplying = false;

function syncTargetFromCookie() {
  const match = document.cookie.match(/googtrans=\/pt\/(en|es|ar|tr)/);
  currentTarget = match ? match[1] : null;
  return currentTarget;
}

syncTargetFromCookie();

function clearGoogTransCookies() {
  const expires = "Thu, 01 Jan 1970 00:00:00 GMT";
  const hostname = window.location.hostname;
  document.cookie = `googtrans=; expires=${expires}; path=/`;
  document.cookie = `googtrans=; expires=${expires}; path=/; domain=${hostname}`;
  document.cookie = `googtrans=; expires=${expires}; path=/; domain=.${hostname}`;
}

function setGoogTransCookie(targetLang) {
  const value = `/${SOURCE_LANG}/${targetLang}`;
  document.cookie = `googtrans=${value}; path=/`;
}

export function toGoogleTargetLanguage(language) {
  const code = normalizeLanguage(language);
  if (code === "pt") return null;
  if (SUPPORTED_TARGETS.has(code)) return code;
  return null;
}

function getTranslateSelect() {
  return document.querySelector(".goog-te-combo");
}

function triggerTranslateSelect(targetLang) {
  const select = getTranslateSelect();
  if (!select || !targetLang) return false;
  if (select.value !== targetLang) {
    select.value = targetLang;
  }
  select.dispatchEvent(new Event("change"));
  return true;
}

/** Esconde a barra azul "Google Traduzido para..." e iframes do widget. */
export function suppressGoogleTranslateUi() {
  document.body.style.setProperty("top", "0", "important");
  document.body.style.setProperty("position", "static", "important");

  document.querySelectorAll("iframe").forEach((frame) => {
    const src = frame.getAttribute("src") || "";
    if (
      frame.classList.contains("goog-te-banner-frame") ||
      src.includes("translate.google") ||
      src.includes("goog-te")
    ) {
      frame.style.setProperty("display", "none", "important");
      frame.style.setProperty("visibility", "hidden", "important");
      frame.style.setProperty("height", "0", "important");
      frame.style.setProperty("width", "0", "important");
      frame.style.setProperty("border", "none", "important");
    }
  });

  document
    .querySelectorAll(
      ".goog-te-banner-frame, .goog-te-balloon-frame, #goog-gt-tt, .goog-te-gadget, .goog-te-menu-value span"
    )
    .forEach((el) => {
      if (el.closest("#root")) return;
      el.style.setProperty("display", "none", "important");
    });

  document.querySelectorAll("body > .skiptranslate").forEach((el) => {
    if (el.id === "root" || el.querySelector?.("#root")) return;
    el.style.setProperty("display", "none", "important");
  });
}

export function ensureGoogleTranslateLoaded() {
  if (window.google?.translate?.TranslateElement) {
    return Promise.resolve();
  }
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (!document.getElementById(ELEMENT_ID)) {
      const holder = document.createElement("div");
      holder.id = ELEMENT_ID;
      holder.setAttribute("aria-hidden", "true");
      holder.style.cssText =
        "position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;";
      document.body.appendChild(holder);
    }

    window.googleTranslateElementInit = () => {
      try {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: SOURCE_LANG,
            includedLanguages: "pt,en,es,ar,tr",
            autoDisplay: false,
            multilanguagePage: true,
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          },
          ELEMENT_ID
        );
        suppressGoogleTranslateUi();
        resolve();
      } catch (err) {
        reject(err);
      }
    };

    const script = document.createElement("script");
    script.src =
      "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    script.onerror = () => reject(new Error("Google Translate script failed"));
    document.body.appendChild(script);
  });

  return loadPromise;
}

function waitForSelect(maxMs = 8000) {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      if (getTranslateSelect()) {
        resolve(true);
        return;
      }
      if (Date.now() - started >= maxMs) {
        resolve(false);
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function scheduleUiSuppression() {
  suppressGoogleTranslateUi();
  [50, 200, 600, 1200, 2500].forEach((ms) => {
    setTimeout(suppressGoogleTranslateUi, ms);
  });
}

let refreshDebounceTimer = null;

/** Reaplica tradução sem reload (SPA: novas rotas, modais, conteúdo tardio). */
export function refreshGoogleTranslate() {
  const target = currentTarget || syncTargetFromCookie();
  if (!target) return Promise.resolve();

  return ensureGoogleTranslateLoaded()
    .then(() => waitForSelect(3000))
    .then(() => {
      triggerTranslateSelect(target);
      scheduleUiSuppression();
    })
    .catch(() => {});
}

export function refreshGoogleTranslateDebounced(delayMs = 500) {
  if (refreshDebounceTimer) clearTimeout(refreshDebounceTimer);
  refreshDebounceTimer = setTimeout(() => {
    refreshDebounceTimer = null;
    refreshGoogleTranslate();
  }, delayMs);
}

/** Várias passagens após navegação/modal — cobre páginas pesadas (Agente IA, etc.). */
export function scheduleTranslationPasses() {
  if (!currentTarget) syncTargetFromCookie();
  if (!currentTarget) return;
  [150, 500, 1200, 2500, 4500, 7000].forEach((ms) => {
    setTimeout(() => refreshGoogleTranslate(), ms);
  });
}

/**
 * Ativa o Google Tradutor — chamar apenas ao trocar idioma no botão do sistema.
 */
export async function applyGoogleTranslate(language, { reloadOnPortuguese = true } = {}) {
  if (isApplying) return;
  isApplying = true;

  try {
    const target = toGoogleTargetLanguage(language);

    if (!target) {
      const hadTranslation =
        /googtrans=\/pt\/(en|es|ar|tr)/.test(document.cookie) || currentTarget != null;
      currentTarget = null;
      clearGoogTransCookies();
      document.documentElement.lang = SOURCE_LANG;
      document.documentElement.classList.remove("gt-active");
      if (hadTranslation && reloadOnPortuguese) {
        window.location.reload();
      }
      return;
    }

    syncTargetFromCookie();

    // Sempre recarrega ao escolher idioma novo — evita mistura EN+ES+PT no DOM.
    if (currentTarget !== target) {
      currentTarget = target;
      setGoogTransCookie(target);
      document.documentElement.lang = target;
      document.documentElement.classList.add("gt-active");
      window.location.reload();
      return;
    }

    scheduleUiSuppression();
    await ensureGoogleTranslateLoaded();
    await waitForSelect();
    triggerTranslateSelect(target);
    scheduleUiSuppression();
    scheduleTranslationPasses();
  } finally {
    isApplying = false;
  }
}

export function getActiveGoogleTarget() {
  return currentTarget;
}
