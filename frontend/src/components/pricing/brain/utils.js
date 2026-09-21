/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

export function formatBrainPrice(value) {
  const main = `R$${Number.isInteger(value) ? value : value.toFixed(2).replace(".", ",")}`;
  return { main, suffix: "/mês" };
}

export function getBrainTogglePillOffset(cycle, cycles, toggleWidth, pillWidth) {
  const cycleIndex = cycles.indexOf(cycle);
  const slotWidth = toggleWidth / cycles.length;
  return cycleIndex * slotWidth + (slotWidth - pillWidth) / 2;
}
