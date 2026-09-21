/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** Tamanho único para todos os ícones da topbar principal (px). */
export const TOPBAR_ICON_SIZE = 20;

export const topbarSvgIconStyle = (color) => ({
  fontSize: TOPBAR_ICON_SIZE,
  width: TOPBAR_ICON_SIZE,
  height: TOPBAR_ICON_SIZE,
  color,
});

/** Caixa de clique — mesma medida em todos os botões da topbar. */
export const topbarActionButtonStyle = {
  width: 32,
  height: 32,
  minWidth: 32,
  minHeight: 32,
  padding: 0,
  margin: "0 3px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
};
