/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { useEffect } from "react";
import { scheduleTranslationPasses } from "../../translate/googleTranslate";

/** Re-traduz após modais/drawers montarem conteúdo tardio (Brain.AI, etc.). */
export default function useScheduleTranslateWhen(active) {
  useEffect(() => {
    if (active) scheduleTranslationPasses();
  }, [active]);
}
