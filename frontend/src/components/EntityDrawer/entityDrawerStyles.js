/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { makeStyles } from "@material-ui/core/styles";

/** Estilos compartilhados entre modais de criar e detalhe (Activities / Projects). */
export const useEntityDrawerStyles = makeStyles((theme) => ({
  drawerPaper: {
    width: 480,
    maxWidth: "100%",
    padding: 0,
    borderRadius: 12,
    height: "calc(100% - 32px)",
    marginTop: 16,
    marginBottom: 16,
    marginRight: 16,
    overflow: "hidden",
    backgroundColor: theme.palette.type === "dark" ? "#1c1c1e" : "#ffffff",
    boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
    display: "flex",
    flexDirection: "column",
  },
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.5)",
    backdropFilter: "blur(3px)",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 20px",
    borderBottom:
      theme.palette.type === "dark"
        ? "1px solid rgba(255,255,255,0.06)"
        : "1px solid #f0f0f0",
  },
  topBarLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  topBarMeta: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    fontWeight: 500,
    minWidth: 0,
  },
  mainContent: {
    flex: 1,
    overflowY: "auto",
    padding: "24px 24px 16px",
    display: "flex",
    flexDirection: "column",
    "&::-webkit-scrollbar": { width: 5 },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor:
        theme.palette.type === "dark"
          ? "rgba(255,255,255,0.4)"
          : "rgba(0,0,0,0.08)",
      borderRadius: 3,
    },
  },
  titleRead: {
    fontSize: 20,
    fontWeight: 500,
    letterSpacing: "-0.01em",
    lineHeight: 1.3,
    color: theme.palette.text.primary,
    marginBottom: 16,
    paddingRight: 28,
  },
  titleInput: {
    "& .MuiInputBase-root": {
      fontSize: 20,
      fontWeight: 500,
      padding: 0,
      letterSpacing: "-0.01em",
    },
    "& .MuiInput-underline:before": { border: "none" },
    "& .MuiInput-underline:after": { border: "none" },
    "& .MuiInput-underline:hover:before": { border: "none" },
    marginBottom: 16,
  },
  descriptionRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 20,
    padding: "8px 0",
  },
  descIcon: {
    color: theme.palette.text.secondary,
    fontSize: 18,
    opacity: 0.6,
    marginTop: 2,
  },
  descriptionRead: {
    fontSize: 13,
    color: theme.palette.text.primary,
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
    flex: 1,
    paddingRight: 28,
    opacity: theme.palette.type === "dark" ? 0.92 : 0.88,
  },
  descriptionInput: {
    flex: 1,
    "& .MuiInputBase-root": { fontSize: 13, padding: 0 },
    "& .MuiInput-underline:before": { border: "none" },
    "& .MuiInput-underline:after": { border: "none" },
    "& .MuiInput-underline:hover:before": { border: "none" },
  },
  statusBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 12px",
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    marginBottom: 16,
  },
  quickActions: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
  },
  actionChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    minHeight: 30,
    padding: "0 10px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    border:
      theme.palette.type === "dark"
        ? "1px solid rgba(255,255,255,0.1)"
        : "1px solid #e5e7eb",
    color: theme.palette.text.secondary,
    backgroundColor: "transparent",
    position: "relative",
    paddingRight: 26,
  },
  fieldsSection: {
    borderTop:
      theme.palette.type === "dark"
        ? "1px solid rgba(255,255,255,0.06)"
        : "1px solid #f0f0f0",
    paddingTop: 16,
    marginTop: 8,
  },
  fieldsSectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: theme.palette.text.secondary,
    letterSpacing: "0.02em",
    marginBottom: 12,
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 20px",
    borderTop:
      theme.palette.type === "dark"
        ? "1px solid rgba(255,255,255,0.06)"
        : "1px solid #f0f0f0",
  },
  pencilBtn: {
    padding: 3,
    width: 22,
    height: 22,
    opacity: 0.5,
    color: theme.palette.text.secondary,
    "&:hover": {
      opacity: 1,
      backgroundColor:
        theme.palette.type === "dark"
          ? "rgba(255,255,255,0.06)"
          : "rgba(0,0,0,0.04)",
    },
  },
  pencilBtnOverlay: {
    position: "absolute",
    right: 2,
    top: "50%",
    transform: "translateY(-50%)",
  },
  editActions: {
    display: "inline-flex",
    alignItems: "center",
    gap: 2,
    marginLeft: 4,
  },
  metaMuted: {
    opacity: 0.6,
    fontSize: 12,
  },
  attachmentChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 6,
    border:
      theme.palette.type === "dark"
        ? "1px solid rgba(255,255,255,0.08)"
        : "1px solid #e5e7eb",
    background:
      theme.palette.type === "dark" ? "rgba(255,255,255,0.03)" : "#f9fafb",
    marginRight: 6,
    marginBottom: 6,
    cursor: "pointer",
  },
}));
