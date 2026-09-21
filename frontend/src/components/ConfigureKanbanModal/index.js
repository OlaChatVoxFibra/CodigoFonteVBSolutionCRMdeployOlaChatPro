/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import {
  Box,
  Button,
  Drawer,
  IconButton,
  TextField,
  Typography
} from "@material-ui/core";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import {
  AddOutlined as AddIcon,
  Close as CloseIcon,
  DeleteOutline as DeleteIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowUp as ArrowUpIcon,
  ViewWeekOutlined as KanbanIcon
} from "@material-ui/icons";
import useAppTranslation from "../../hooks/useAppTranslation";

const slug = (txt) =>
  String(txt || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const border = isDark ? "rgba(255,255,255,0.08)" : "#e8eaed";
  const borderSoft = isDark ? "rgba(255,255,255,0.06)" : "#f0f1f3";
  const surface = isDark ? "rgba(255,255,255,0.03)" : "#fafbfc";

  return {
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
      backgroundColor: isDark ? "#1c1c1e" : "#ffffff",
      boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
      display: "flex",
      flexDirection: "column"
    },
    backdrop: {
      backgroundColor: "rgba(0,0,0,0.5)",
      backdropFilter: "blur(3px)"
    },
    topBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 20px",
      borderBottom: `1px solid ${borderSoft}`
    },
    topBarLeft: {
      display: "flex",
      alignItems: "center",
      gap: 8
    },
    topChip: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      height: 28,
      padding: "0 10px",
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 500,
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#f4f5f7",
      color: theme.palette.text.primary
    },
    topChipMuted: {
      display: "inline-flex",
      alignItems: "center",
      height: 28,
      padding: "0 10px",
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 500,
      backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#f4f5f7",
      color: theme.palette.text.secondary
    },
    mainContent: {
      flex: 1,
      overflowY: "auto",
      padding: "28px 28px 20px",
      "&::-webkit-scrollbar": { width: 5 },
      "&::-webkit-scrollbar-thumb": {
        backgroundColor: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.08)",
        borderRadius: 3
      }
    },
    heroTitle: {
      fontSize: 18,
      fontWeight: 500,
      letterSpacing: "-0.02em",
      color: theme.palette.text.primary,
      marginBottom: 8
    },
    heroSubtitle: {
      fontSize: 12.5,
      color: theme.palette.text.secondary,
      marginBottom: 28,
      lineHeight: 1.5,
      maxWidth: 360
    },
    fieldsSection: {
      borderTop: `1px solid ${borderSoft}`,
      paddingTop: 22,
      marginTop: 2
    },
    sectionTitle: {
      fontSize: 11,
      fontWeight: 600,
      color: theme.palette.text.secondary,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      marginBottom: 16
    },
    stageList: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    },
    stageCard: {
      display: "grid",
      gridTemplateColumns: "26px minmax(0, 1fr) auto",
      alignItems: "center",
      columnGap: 14,
      padding: "10px 14px",
      borderRadius: 10,
      border: `1px solid ${border}`,
      backgroundColor: surface,
      transition: "border-color 0.15s ease, box-shadow 0.15s ease",
      "&:hover": {
        borderColor: isDark ? "rgba(255,255,255,0.14)" : "#d8dce3",
        boxShadow: isDark ? "none" : "0 1px 4px rgba(15,23,42,0.04)"
      }
    },
    colorBadge: {
      position: "relative",
      width: 26,
      height: 26,
      borderRadius: 6,
      border: `1px solid ${border}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      transition: "transform 0.12s ease",
      "&:hover": { transform: "scale(1.05)" }
    },
    colorDot: {
      width: 8,
      height: 8,
      borderRadius: 2
    },
    hiddenColorInput: {
      position: "absolute",
      inset: 0,
      opacity: 0,
      width: "100%",
      height: "100%",
      cursor: "pointer",
      border: "none",
      padding: 0
    },
    stageNameInput: {
      minWidth: 0,
      "& .MuiInputBase-root": {
        fontSize: 13,
        fontWeight: 500,
        padding: 0,
        letterSpacing: "-0.01em",
        lineHeight: 1.3
      },
      "& .MuiInput-underline:before": { border: "none" },
      "& .MuiInput-underline:after": { border: "none" },
      "& .MuiInput-underline:hover:before": { border: "none" },
      "& .MuiInputBase-input::placeholder": {
        color: isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.28)",
        opacity: 1
      }
    },
    actionGroup: {
      display: "inline-flex",
      alignItems: "center",
      gap: 2,
      padding: 3,
      borderRadius: 8,
      border: `1px solid ${border}`,
      backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#fff"
    },
    iconActionBtn: {
      width: 26,
      height: 26,
      padding: 0,
      borderRadius: 5,
      color: theme.palette.text.secondary,
      "&:hover": {
        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#f3f4f6"
      },
      "&.Mui-disabled": { opacity: 0.3 }
    },
    deleteBtn: {
      width: 26,
      height: 26,
      padding: 0,
      borderRadius: 5,
      color: theme.palette.text.secondary,
      marginLeft: 2,
      "&:hover": {
        backgroundColor: isDark ? "rgba(239,68,68,0.14)" : "#fef2f2",
        color: "#ef4444"
      }
    },
    quickActions: {
      display: "flex",
      justifyContent: "center",
      marginTop: 20
    },
    addBtn: {
      height: 32,
      borderRadius: 8,
      fontSize: 12,
      fontWeight: 500,
      textTransform: "none",
      padding: "0 16px",
      border: `1px solid ${border}`,
      color: theme.palette.text.secondary,
      backgroundColor: "transparent",
      "&:hover": {
        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#f9fafb",
        borderColor: isDark ? "rgba(255,255,255,0.15)" : "#d1d5db"
      }
    },
    footer: {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 10,
      padding: "14px 20px",
      borderTop: `1px solid ${borderSoft}`,
      backgroundColor: isDark ? "#1c1c1e" : "#ffffff"
    },
    cancelBtn: {
      height: 34,
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 500,
      textTransform: "none",
      padding: "0 16px",
      border: `1px solid ${border}`,
      color: theme.palette.text.secondary,
      backgroundColor: "transparent",
      "&:hover": {
        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#f9fafb"
      }
    },
    submitBtn: {
      height: 34,
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 600,
      textTransform: "none",
      padding: "0 20px",
      backgroundColor: isDark ? "#1e3a5f" : "#1e40af",
      color: "#fff",
      boxShadow: "none",
      "&:hover": {
        backgroundColor: "#6d28d9",
        boxShadow: "0 2px 8px rgba(124,58,237,0.3)"
      }
    }
  };
});

function hexToRgba(hex, alpha) {
  const raw = String(hex || "#6b7280").replace("#", "");
  if (raw.length !== 6) return `rgba(107,114,128,${alpha})`;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function ConfigureKanbanModal({
  open,
  onClose,
  onSave,
  stages = [],
  onStagesChange,
  nameField = "label",
  idField = "key",
  title,
  sectionTitle,
  saving = false
}) {
  const classes = useStyles();
  const theme = useTheme();
  const isDark = theme.palette.type === "dark";
  const { t } = useAppTranslation();

  const modalTitle = title || t("modules.projects.configureKanban");
  const modalSection = sectionTitle || t("modules.projects.configureStages");

  const updateStage = (index, field, value) => {
    onStagesChange((prev) => {
      const next = prev.slice();
      if (field === nameField) {
        next[index] = {
          ...next[index],
          [nameField]: value,
          [idField]: slug(value)
        };
      } else {
        next[index] = { ...next[index], [field]: value };
      }
      return next;
    });
  };

  const removeStage = (stageId) => {
    onStagesChange((prev) => prev.filter((s) => s[idField] !== stageId));
  };

  const addStage = () => {
    const idx = (stages?.length || 0) + 1;
    const name = `${t("modules.projects.stageStep")} ${idx}`;
    onStagesChange((prev) => [
      ...prev,
      {
        [idField]: slug(name),
        [nameField]: name,
        color: theme.palette.type === "dark" ? "#6b7280" : "#4B5563"
      }
    ]);
  };

  const moveStageUp = (index) => {
    onStagesChange((prev) => {
      if (index <= 0) return prev;
      const next = prev.slice();
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  };

  const moveStageDown = (index) => {
    onStagesChange((prev) => {
      if (index >= prev.length - 1) return prev;
      const next = prev.slice();
      [next[index + 1], next[index]] = [next[index], next[index + 1]];
      return next;
    });
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ className: classes.drawerPaper }}
      BackdropProps={{ className: classes.backdrop }}
      ModalProps={{ keepMounted: true }}
    >
      <Box className={classes.topBar}>
        <Box className={classes.topBarLeft}>
          <span className={classes.topChip}>
            <KanbanIcon style={{ fontSize: 14, opacity: 0.7 }} />
            Kanban
          </span>
          <Typography style={{ opacity: 0.25, fontSize: 14 }}>·</Typography>
          <span className={classes.topChipMuted}>{modalSection}</span>
        </Box>
        <IconButton onClick={onClose} size="small" style={{ width: 28, height: 28 }}>
          <CloseIcon style={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      <Box className={classes.mainContent}>
        <Typography className={classes.heroTitle}>{modalTitle}</Typography>
        <Typography className={classes.heroSubtitle}>
          {t("modules.projects.configureKanbanHint")}
        </Typography>

        <Box className={classes.fieldsSection}>
          <Typography className={classes.sectionTitle}>{modalSection}</Typography>

          <Box className={classes.stageList}>
            {stages.map((stage, idx) => {
              const color = stage.color || "#6b7280";
              const name = stage[nameField] || "";
              return (
                <Box key={stage[idField] || idx} className={classes.stageCard}>
                  <Box
                    className={classes.colorBadge}
                    style={{ backgroundColor: hexToRgba(color, isDark ? 0.16 : 0.1) }}
                    title={t("modules.common.label")}
                  >
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => updateStage(idx, "color", e.target.value)}
                      aria-label={t("modules.common.label")}
                      className={classes.hiddenColorInput}
                    />
                    <span className={classes.colorDot} style={{ backgroundColor: color }} />
                  </Box>

                  <TextField
                    className={classes.stageNameInput}
                    placeholder={t("modules.projects.stageNamePlaceholder")}
                    value={name}
                    onChange={(e) => updateStage(idx, nameField, e.target.value)}
                    fullWidth
                    InputProps={{ disableUnderline: true }}
                  />

                  <Box className={classes.actionGroup}>
                    <IconButton
                      className={classes.iconActionBtn}
                      size="small"
                      onClick={() => moveStageUp(idx)}
                      disabled={idx === 0}
                      title={t("modules.projects.moveUp")}
                    >
                      <ArrowUpIcon style={{ fontSize: 15 }} />
                    </IconButton>
                    <IconButton
                      className={classes.iconActionBtn}
                      size="small"
                      onClick={() => moveStageDown(idx)}
                      disabled={idx >= stages.length - 1}
                      title={t("modules.projects.moveDown")}
                    >
                      <ArrowDownIcon style={{ fontSize: 15 }} />
                    </IconButton>
                    <IconButton
                      className={classes.deleteBtn}
                      size="small"
                      onClick={() => removeStage(stage[idField])}
                      title={t("modules.common.remove")}
                    >
                      <DeleteIcon style={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                </Box>
              );
            })}
          </Box>

          <Box className={classes.quickActions}>
            <Button
              className={classes.addBtn}
              startIcon={<AddIcon style={{ fontSize: 14 }} />}
              onClick={addStage}
            >
              {t("modules.projects.addStage")}
            </Button>
          </Box>
        </Box>
      </Box>

      <Box className={classes.footer}>
        <Button className={classes.cancelBtn} onClick={onClose} disabled={saving}>
          {t("modules.common.cancel")}
        </Button>
        <Button
          className={classes.submitBtn}
          onClick={onSave}
          disabled={saving}
          disableElevation
        >
          {t("modules.common.save")}
        </Button>
      </Box>
    </Drawer>
  );
}
