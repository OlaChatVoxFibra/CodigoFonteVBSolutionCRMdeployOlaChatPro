/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState } from "react";
import { Box, Button, Menu, MenuItem, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const border = isDark ? "rgba(255,255,255,0.11)" : "rgba(15,23,42,0.1)";
  return {
    wrap: { width: "100%", marginBottom: theme.spacing(1.5) },
    label: {
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: theme.palette.text.secondary,
      marginBottom: 6
    },
    trigger: {
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      textTransform: "none",
      borderRadius: 10,
      padding: "10px 14px",
      border: `1px solid ${border}`,
      background: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)",
      color: theme.palette.text.primary,
      fontWeight: 500,
      fontSize: 12,
      letterSpacing: "0.02em",
      boxShadow: "none",
      transition: "border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease",
      "&:hover": {
        background: isDark ? "rgba(255,255,255,0.055)" : "rgba(15,23,42,0.035)",
        borderColor: isDark ? "rgba(255,255,255,0.16)" : "rgba(15,23,42,0.14)"
      }
    },
    triggerOpen: {
      borderColor: "rgba(99, 102, 241, 0.42)",
      boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.1)"
    },
    triggerLeft: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      minWidth: 0,
      textAlign: "left",
      flex: 1
    },
    iconCell: {
      width: 28,
      height: 28,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    },
    menuPaper: {
      borderRadius: 10,
      marginTop: 4,
      minWidth: 168,
      maxWidth: "min(260px, calc(100vw - 24px))",
      maxHeight: 220,
      boxShadow: isDark
        ? "0 20px 50px rgba(0,0,0,0.5), 0 0 1px rgba(255,255,255,0.08)"
        : "0 20px 50px rgba(15,23,42,0.1), 0 0 1px rgba(15,23,42,0.06)",
      border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.07)"}`,
      overflow: "hidden"
    },
    menuList: {
      padding: "4px 0",
      maxHeight: 208,
      overflowY: "auto"
    },
    menuItem: {
      borderRadius: 6,
      margin: "1px 6px",
      padding: "4px 8px",
      minHeight: 32,
      display: "flex",
      alignItems: "center"
    },
    menuItemActive: {
      background: isDark ? "rgba(99,102,241,0.16)" : "rgba(99,102,241,0.09)"
    },
    menuIconCell: {
      width: 22,
      height: 22,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      marginRight: 8
    },
    menuText: {
      flex: 1,
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center"
    },
    sub: { fontSize: 10, opacity: 0.62, marginTop: 1, lineHeight: 1.35 }
  };
});

/**
 * Campo estilo Notion/Apple: clique abre menu minimalista com opções e ícones alinhados.
 */
export function AgentEditorChoicePicker({ label, options, value, onChange, emptyLabel = "Escolher…" }) {
  const classes = useStyles();
  const [anchor, setAnchor] = useState(null);
  const open = Boolean(anchor);
  const selected = options.find((o) => o.value === value);

  const SelIcon = selected && selected.Icon ? selected.Icon : null;

  return (
    <Box className={classes.wrap}>
      {label ? (
        <Typography component="div" className={classes.label}>
          {label}
        </Typography>
      ) : null}
      <Button
        disableRipple
        className={clsx(classes.trigger, open && classes.triggerOpen)}
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        <Box className={classes.triggerLeft}>
          {SelIcon ? (
            <Box className={classes.iconCell}>
              <SelIcon size={16} strokeWidth={1.65} />
            </Box>
          ) : null}
          {selected ? (
            <Box minWidth={0}>
              <Typography variant="body2" style={{ fontWeight: 500, fontSize: 12, lineHeight: 1.35 }}>
                {selected.label}
              </Typography>
              {selected.sub ? (
                <Typography component="div" variant="caption" className={classes.sub}>
                  {selected.sub}
                </Typography>
              ) : null}
            </Box>
          ) : (
            <Typography variant="body2" style={{ fontSize: 12, opacity: 0.5 }}>
              {emptyLabel}
            </Typography>
          )}
        </Box>
        <ChevronDown size={17} strokeWidth={1.75} style={{ opacity: 0.4, flexShrink: 0, marginLeft: 8 }} />
      </Button>
      <Menu
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        getContentAnchorEl={null}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        classes={{ paper: classes.menuPaper }}
        elevation={0}
        MenuListProps={{ dense: true, className: classes.menuList }}
      >
        {options.map((opt) => {
          const active = Object.is(opt.value, value);
          const OptIcon = opt.Icon || null;
          return (
            <MenuItem
              key={String(opt.value)}
              className={clsx(classes.menuItem, active && classes.menuItemActive)}
              onClick={() => {
                onChange(opt.value);
                setAnchor(null);
              }}
            >
              {OptIcon ? (
                <Box className={classes.menuIconCell}>
                  <OptIcon size={13} strokeWidth={1.65} />
                </Box>
              ) : (
                <Box className={classes.menuIconCell} />
              )}
              <Box className={classes.menuText}>
                <Typography
                  variant="body2"
                  style={{ fontWeight: active ? 600 : 500, fontSize: 12, lineHeight: 1.35 }}
                >
                  {opt.label}
                </Typography>
                {opt.sub ? (
                  <Typography variant="caption" className={classes.sub}>
                    {opt.sub}
                  </Typography>
                ) : null}
              </Box>
            </MenuItem>
          );
        })}
      </Menu>
    </Box>
  );
}
