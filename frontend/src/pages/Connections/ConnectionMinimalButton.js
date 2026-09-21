/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Button, makeStyles } from "@material-ui/core";
import { CONNECTIONS_FONT } from "./connectionsTypography";
import { getConnectionsBorder } from "./connectionsTheme";

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  return {
    root: {
      fontFamily: CONNECTIONS_FONT,
      fontWeight: 400,
      fontSize: "0.6875rem",
      letterSpacing: "-0.01em",
      lineHeight: 1.2,
      textTransform: "none",
      minWidth: 0,
      minHeight: 26,
      padding: theme.spacing(0.4, 1),
      borderRadius: 7,
      boxShadow: "none",
      border: `1px solid ${getConnectionsBorder(theme)}`,
      backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
      color: theme.palette.text.primary,
      "&:hover": {
        boxShadow: "none",
        backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#f4f4f5",
        borderColor: isDark ? "rgba(255,255,255,0.16)" : "#d4d4d8",
      },
      "&.Mui-disabled": {
        opacity: 0.45,
      },
    },
    primary: {
      borderColor: isDark ? "rgba(255,255,255,0.2)" : theme.palette.primary.main,
      color: isDark ? "#ffffff" : theme.palette.primary.main,
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(37,99,235,0.06)",
      "&:hover": {
        backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(37,99,235,0.1)",
      },
    },
    accent: {
      borderColor: isDark ? "rgba(52,199,89,0.35)" : "rgba(22,163,74,0.35)",
      color: isDark ? "#86efac" : "#15803d",
      backgroundColor: isDark ? "rgba(52,199,89,0.12)" : "rgba(22,163,74,0.06)",
      "&:hover": {
        backgroundColor: isDark ? "rgba(52,199,89,0.18)" : "rgba(22,163,74,0.1)",
      },
    },
    muted: {
      color: theme.palette.text.secondary,
      backgroundColor: "transparent",
      "&:hover": {
        color: theme.palette.text.primary,
      },
    },
  };
});

export default function ConnectionMinimalButton({
  children,
  onClick,
  disabled,
  variant = "default",
  className,
  ...rest
}) {
  const classes = useStyles();
  const variantClass =
    variant === "primary"
      ? classes.primary
      : variant === "accent"
        ? classes.accent
        : variant === "muted"
          ? classes.muted
          : "";

  return (
    <Button
      size="small"
      disableElevation
      disableRipple
      className={`${classes.root} ${variantClass} ${className || ""}`}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      {children}
    </Button>
  );
}
