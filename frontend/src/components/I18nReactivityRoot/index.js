/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useState } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import { i18n } from "../../translate/i18n";

function LanguageWatcher({ children }) {
  const { i18n: i18nInstance } = useTranslation();
  const [, setTick] = useState(0);

  useEffect(() => {
    const onLanguageChanged = () => setTick((value) => value + 1);
    i18nInstance.on("languageChanged", onLanguageChanged);
    return () => i18nInstance.off("languageChanged", onLanguageChanged);
  }, [i18nInstance]);

  return children;
}

export default function I18nReactivityRoot({ children }) {
  return (
    <I18nextProvider i18n={i18n}>
      <LanguageWatcher>{children}</LanguageWatcher>
    </I18nextProvider>
  );
}
