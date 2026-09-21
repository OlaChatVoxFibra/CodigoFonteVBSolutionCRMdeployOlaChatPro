/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { ProactiveBusinessHours } from "../../types/agentProactiveSettings";

const TZ = "America/Sao_Paulo";

function currentHourInSaoPaulo(): number {
  const s = new Date().toLocaleString("en-US", { timeZone: TZ, hour: "numeric", hour12: false });
  return parseInt(s, 10);
}

/** Se businessHours desligado ou ausente, sempre true. Horas em 0–23, intervalo [start, end) no mesmo dia. */
export function isWithinProactiveBusinessHours(bh?: ProactiveBusinessHours): boolean {
  if (!bh || !bh.enabled) return true;
  const start = Math.max(0, Math.min(23, bh.startHour ?? 9));
  const end = Math.max(0, Math.min(24, bh.endHour ?? 18));
  const h = currentHourInSaoPaulo();
  if (start < end) {
    return h >= start && h < end;
  }
  if (start > end) {
    return h >= start || h < end;
  }
  return true;
}
