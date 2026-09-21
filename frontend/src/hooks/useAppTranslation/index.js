/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ui } from "../../translate/ui";
import { applyAppLanguage } from "../../translate/i18n";

export default function useAppTranslation() {
  const { t, i18n } = useTranslation();

  const changeLanguage = useCallback(async (language) => {
    await applyAppLanguage(language);
  }, []);

  const translateUi = useCallback(
    (text) => ui(text, i18n.language),
    [i18n.language]
  );

  return {
    t,
    i18n,
    ui: translateUi,
    changeLanguage,
    language: i18n.language,
  };
}
