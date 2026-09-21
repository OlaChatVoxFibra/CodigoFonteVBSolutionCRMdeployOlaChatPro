/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  applyGoogleTranslate,
  scheduleTranslationPasses,
  suppressGoogleTranslateUi,
  toGoogleTargetLanguage,
} from "../../translate/googleTranslate";
import { normalizeLanguage } from "../../translate/languageUtils";

/**
 * Google Tradutor: troca de idioma + re-tradução em rotas/modais (SPA React).
 */
export default function GoogleTranslateBridge() {
  const { i18n } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    const onLanguageChanged = (lng) => {
      applyGoogleTranslate(lng).catch(() => {});
    };

    i18n.on("languageChanged", onLanguageChanged);

    if (toGoogleTargetLanguage(i18n.language)) {
      applyGoogleTranslate(i18n.language)
        .then(() => scheduleTranslationPasses())
        .catch(() => {});
    }

    suppressGoogleTranslateUi();
    const uiTimer = setInterval(suppressGoogleTranslateUi, 3000);

    return () => {
      i18n.off("languageChanged", onLanguageChanged);
      clearInterval(uiTimer);
    };
  }, [i18n]);

  // Nova página (ex.: /prompts/create) — conteúdo monta depois do 1º translate.
  useEffect(() => {
    if (!toGoogleTargetLanguage(i18n.language)) return;
    scheduleTranslationPasses();
  }, [location.pathname, location.search, i18n.language]);

  // Modais/drawers (MUI portal) — re-traduz ao abrir.
  useEffect(() => {
    if (!toGoogleTargetLanguage(i18n.language)) return;

    const observer = new MutationObserver((mutations) => {
      const overlayAdded = mutations.some((m) =>
        [...m.addedNodes].some((node) => {
          if (node.nodeType !== 1) return false;
          const el = node;
          return (
            el.classList?.contains("MuiDialog-root") ||
            el.classList?.contains("MuiDrawer-root") ||
            el.classList?.contains("MuiModal-root") ||
            el.classList?.contains("MuiPopover-root") ||
            el.querySelector?.(".MuiDialog-root, .MuiDrawer-root, .MuiModal-root, .MuiPopover-root")
          );
        })
      );
      if (overlayAdded) {
        scheduleTranslationPasses();
      }
    });

    const onClassOpen = (mutations) => {
      const opened = mutations.some((m) => {
        if (m.type !== "attributes" || m.attributeName !== "class") return false;
        const el = m.target;
        return (
          el.classList?.contains("MuiDrawer-open") ||
          el.classList?.contains("MuiDialog-root") ||
          (el.classList?.contains("MuiModal-root") && !el.getAttribute("aria-hidden"))
        );
      });
      if (opened) scheduleTranslationPasses();
    };

    const attrObserver = new MutationObserver(onClassOpen);

    observer.observe(document.body, { childList: true, subtree: true });
    attrObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "aria-hidden"],
      subtree: true,
    });

    return () => {
      observer.disconnect();
      attrObserver.disconnect();
    };
  }, [i18n.language]);

  useEffect(() => {
    document.body.classList.toggle(
      "app-lang-pt",
      normalizeLanguage(i18n.language) === "pt"
    );
  }, [i18n.language]);

  return null;
}
