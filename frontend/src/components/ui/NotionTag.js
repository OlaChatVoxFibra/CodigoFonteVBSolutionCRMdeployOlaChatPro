/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import clsx from "clsx";
import { getNotionTagAppearance, getNotionNeutralTagAppearance } from "../../utils/notionTagStyle";

const useStyles = makeStyles({
  root: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    flexShrink: 0,
    maxWidth: 72,
    height: 15,
    padding: "0 5px",
    borderRadius: 3,
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSize: 9,
    fontWeight: 400,
    letterSpacing: "0",
    lineHeight: "15px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    boxSizing: "border-box",
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
  },
  rootFull: {
    maxWidth: "none",
    height: "auto",
    minHeight: 15,
    whiteSpace: "normal",
    overflow: "visible",
    textOverflow: "clip",
    flexShrink: 1,
  },
});

/** Tag compacta opaca — visual alinhado às tags do Notion */
const NotionTag = ({ label, color, icon, title, className, neutral, accentColor, fullLabel }) => {
  const classes = useStyles();
  const theme = useTheme();
  const isDark = theme.palette.type === "dark";
  const appearance = neutral
    ? getNotionNeutralTagAppearance(isDark, accentColor)
    : getNotionTagAppearance(color, isDark);

  return (
    <span
      className={clsx(classes.root, fullLabel && classes.rootFull, className)}
      style={appearance}
      title={title || label}
    >
      {icon}
      {label}
    </span>
  );
};

export default NotionTag;
