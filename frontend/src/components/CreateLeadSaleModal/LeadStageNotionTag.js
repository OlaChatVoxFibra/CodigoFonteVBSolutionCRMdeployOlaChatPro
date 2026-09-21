/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import Typography from "@material-ui/core/Typography";
import { ChevronDown } from "lucide-react";
import NotionTag from "../ui/NotionTag";

const DEFAULT_STAGE_COLORS = {
  novo: "#6366F1",
  qualificacao: "#8B5CF6",
  proposta: "#F59E0B",
  negociacao: "#F97316",
  fechado: "#10B981"
};

const useStyles = makeStyles((theme) => ({
  row: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6
  },
  label: {
    fontSize: 11,
    fontWeight: 500,
    color: theme.palette.text.secondary
  },
  trigger: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    cursor: "pointer",
    borderRadius: 4,
    padding: "2px 4px 2px 0",
    "&:hover": {
      background: theme.palette.type === "dark" ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"
    }
  },
  menuTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: theme.palette.text.secondary,
    padding: "4px 16px 8px",
    pointerEvents: "none"
  },
  menuItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    flexShrink: 0
  }
}));

export function resolveStageColor(stageKey, stageOptions) {
  const opt = Array.isArray(stageOptions)
    ? stageOptions.find((o) => String(o.value) === String(stageKey))
    : null;
  if (opt?.color) return opt.color;
  return DEFAULT_STAGE_COLORS[String(stageKey || "").toLowerCase()] || "#6366F1";
}

export default function LeadStageNotionTag({
  status,
  stageOptions,
  onSelectStage,
  viewOnly
}) {
  const classes = useStyles();
  const [anchorEl, setAnchorEl] = useState(null);

  if (!Array.isArray(stageOptions) || !stageOptions.length) return null;

  const current = stageOptions.find((o) => String(o.value) === String(status)) || stageOptions[0];
  const color = resolveStageColor(current?.value, stageOptions);

  const handleClose = () => setAnchorEl(null);

  return (
    <div className={classes.row}>
      <span className={classes.label}>Etapa</span>
      {viewOnly ? (
        <NotionTag label={current?.label || "—"} color={color} />
      ) : (
        <>
          <div
            className={classes.trigger}
            role="button"
            tabIndex={0}
            onClick={(e) => setAnchorEl(e.currentTarget)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setAnchorEl(e.currentTarget);
              }
            }}
          >
            <NotionTag label={current?.label || "—"} color={color} />
            <ChevronDown size={12} color="#94a3b8" strokeWidth={2} />
          </div>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            getContentAnchorEl={null}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
            PaperProps={{ style: { minWidth: 160, marginTop: 4 } }}
          >
            <Typography className={classes.menuTitle}>Alterar etapa</Typography>
            {stageOptions.map((opt) => (
              <MenuItem
                key={opt.value}
                className={classes.menuItem}
                selected={String(opt.value) === String(status)}
                onClick={() => {
                  onSelectStage?.(opt.value);
                  handleClose();
                }}
              >
                <span
                  className={classes.dot}
                  style={{ backgroundColor: resolveStageColor(opt.value, stageOptions) }}
                />
                {opt.label}
              </MenuItem>
            ))}
          </Menu>
        </>
      )}
    </div>
  );
}
