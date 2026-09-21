/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** Estilo Apple para modais — cores da top bar e menus/select compactos */

export const HELVETICA_NEUE =
  '"Helvetica Neue", Helvetica, Arial, sans-serif';

export const getTopbarMain = (theme) =>
  theme.palette.barraSuperior ||
  theme.palette.primary?.main ||
  "#1976d2";

export const getTopbarContrast = (theme) =>
  theme.palette.primary?.contrastText || "#ffffff";

export const getTopbarHover = (theme) =>
  theme.palette.primary?.dark || getTopbarMain(theme);

/** MenuProps para Select / Autocomplete dentro de modais Apple */
export const appleSelectMenuProps = (theme) => {
  const isDark = theme.palette.type === "dark";
  return {
    anchorOrigin: { vertical: "bottom", horizontal: "left" },
    transformOrigin: { vertical: "top", horizontal: "left" },
    getContentAnchorEl: null,
    PaperProps: {
      style: {
        maxHeight: 200,
        minWidth: 0,
        maxWidth: "min(320px, calc(100vw - 48px))",
        borderRadius: 12,
        marginTop: 4,
        fontFamily: HELVETICA_NEUE,
        fontWeight: 400,
        fontSize: 12,
        overflow: "hidden",
        boxShadow: isDark
          ? "0 12px 32px rgba(0,0,0,0.45), 0 0 0 0.5px rgba(255,255,255,0.1)"
          : "0 12px 32px rgba(15,23,42,0.14), 0 0 0 0.5px rgba(0,0,0,0.06)",
        backgroundColor: isDark
          ? "rgba(44,44,46,0.96)"
          : "rgba(255,255,255,0.98)",
        backdropFilter: "saturate(180%) blur(16px)",
        WebkitBackdropFilter: "saturate(180%) blur(16px)",
      },
    },
    MenuListProps: {
      dense: true,
      style: { padding: "4px 0", maxHeight: 192 },
    },
  };
};

/** MenuProps para listas longas (ex.: idiomas no modal IA) */
export const appleSelectMenuPropsTall = (theme) => {
  const base = appleSelectMenuProps(theme);
  return {
    ...base,
    PaperProps: {
      ...base.PaperProps,
      style: { ...base.PaperProps.style, maxHeight: 240 },
    },
    MenuListProps: {
      ...base.MenuListProps,
      style: { ...base.MenuListProps.style, maxHeight: 232 },
    },
  };
};

/** Estilo de item de menu compacto */
export const appleMenuItemProps = {
  style: {
    fontFamily: HELVETICA_NEUE,
    fontSize: 12,
    fontWeight: 400,
    minHeight: 32,
    paddingTop: 6,
    paddingBottom: 6,
    letterSpacing: "-0.01em",
  },
};

/** PaperProps para popover de escolha (ex.: lista de usuários) */
export const applePickerPaperStyle = (theme, widthPx) => {
  const isDark = theme.palette.type === "dark";
  const w = widthPx ? `${Math.round(widthPx)}px` : "100%";
  return {
    width: w,
    maxWidth: w,
    minWidth: w,
    borderRadius: 12,
    marginTop: 4,
    overflow: "hidden",
    fontFamily: HELVETICA_NEUE,
    boxShadow: isDark
      ? "0 12px 32px rgba(0,0,0,0.45), 0 0 0 0.5px rgba(255,255,255,0.1)"
      : "0 12px 32px rgba(15,23,42,0.14), 0 0 0 0.5px rgba(0,0,0,0.06)",
    backgroundColor: isDark
      ? "rgba(44,44,46,0.96)"
      : "rgba(255,255,255,0.98)",
    backdropFilter: "saturate(180%) blur(16px)",
    WebkitBackdropFilter: "saturate(180%) blur(16px)",
    color: theme.palette.text.primary,
  };
};
