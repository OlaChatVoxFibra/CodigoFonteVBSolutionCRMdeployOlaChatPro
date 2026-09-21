/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ui, uiContains } from "../../translate/ui";
import { normalizeLanguage } from "../../translate/languageUtils";

const SKIP_SELECTOR =
  "[data-no-translate], input, textarea, select, option, script, style, code, pre, .MuiInputBase-input, .message-content, .ticket-message, .chat-message, .message-body, .contact-name, .user-name";

function shouldSkipNode(node) {
  const parent = node.parentElement;
  if (!parent) return true;
  if (parent.closest(SKIP_SELECTOR)) return true;
  if (parent.isContentEditable) return true;
  return false;
}

function translateTextNode(node, lang) {
  if (shouldSkipNode(node)) return;

  if (!node.__i18nOriginal) {
    node.__i18nOriginal = node.textContent;
  }

  const original = node.__i18nOriginal;
  const trimmed = original.trim();
  if (!trimmed || trimmed.length < 2) return;

  if (lang === "pt") {
    if (node.textContent !== original) node.textContent = original;
    return;
  }

  const hasPortugueseChars = /[À-ÿ]/.test(trimmed);
  if (!hasPortugueseChars && !uiContains(trimmed)) return;

  const translated = ui(trimmed, lang);
  if (!translated || translated === trimmed) return;

  const leading = original.match(/^\s*/)?.[0] || "";
  const trailing = original.match(/\s*$/)?.[0] || "";
  const next = `${leading}${translated}${trailing}`;
  if (node.textContent !== next) node.textContent = next;
}

function walkAndTranslate(root, lang) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    translateTextNode(current, lang);
    current = walker.nextNode();
  }
}

export default function DomTextTranslator() {
  const { i18n } = useTranslation();

  useEffect(() => {
    let frame = null;
    let observer = null;

    const run = () => {
      const lang = normalizeLanguage(i18n.language);
      walkAndTranslate(document.body, lang);
    };

    const schedule = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(run);
    };

    schedule();
    i18n.on("languageChanged", schedule);

    observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      i18n.off("languageChanged", schedule);
      observer?.disconnect();
    };
  }, [i18n]);

  return null;
}
