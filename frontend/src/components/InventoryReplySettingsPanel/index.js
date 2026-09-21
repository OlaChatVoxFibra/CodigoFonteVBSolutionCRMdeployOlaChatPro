/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Collapse,
  Switch,
  TextField,
  Typography
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import {
  INVENTORY_COMPACT_PRESET_IDS,
  INVENTORY_STRATEGY_PRESETS,
  normalizeInventoryReply,
  buildInventoryWhatsAppPreview
} from "../../helpers/inventoryReplyTemplates";
import WhatsAppIphonePreview from "../WhatsAppIphonePreview";

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const ink = isDark ? "rgba(255,255,255,0.92)" : "#1d1d1f";
  const muted = isDark ? "rgba(255,255,255,0.55)" : "#86868b";
  const hairline = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const surface = isDark ? "rgba(255,255,255,0.04)" : "#ffffff";
  const accent = isDark ? "#0a84ff" : "#0071e3";
  return {
    root: {
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, system-ui, sans-serif',
      color: ink,
      display: "flex",
      flexDirection: "column",
      gap: 14
    },
    sectionLabel: {
      fontSize: 12,
      fontWeight: 600,
      color: muted,
      letterSpacing: "-0.01em",
      marginBottom: 6
    },
    segmentRow: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6
    },
    segmentBtn: {
      textTransform: "none",
      borderRadius: 10,
      border: `1px solid ${hairline}`,
      background: surface,
      color: ink,
      fontSize: 12.5,
      fontWeight: 500,
      padding: "6px 12px",
      minWidth: 0,
      "&:hover": { background: isDark ? "rgba(255,255,255,0.06)" : "#f5f5f7" }
    },
    segmentBtnActive: {
      borderColor: accent,
      background: isDark ? "rgba(10,132,255,0.18)" : "rgba(0,113,227,0.08)",
      color: accent,
      fontWeight: 600
    },
    strategyGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8,
      [theme.breakpoints.down("xs")]: { gridTemplateColumns: "1fr" }
    },
    strategyCard: {
      borderRadius: 12,
      border: `1px solid ${hairline}`,
      padding: "10px 12px",
      cursor: "pointer",
      background: surface,
      transition: "border-color 0.15s ease, background 0.15s ease"
    },
    strategyCardActive: {
      borderColor: accent,
      background: isDark ? "rgba(10,132,255,0.14)" : "rgba(0,113,227,0.06)"
    },
    strategyTitle: { fontSize: 13, fontWeight: 600, color: ink },
    strategyHint: { fontSize: 11.5, color: muted, marginTop: 2 },
    toggleRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      padding: "6px 0"
    },
    toggleLabel: { fontSize: 13, fontWeight: 500, color: ink },
    toggleHint: { fontSize: 11.5, color: muted },
    iosSwitch: {
      "& .MuiSwitch-switchBase.Mui-checked": { color: accent },
      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
        backgroundColor: accent,
        opacity: 1
      }
    },
    moreBtn: {
      textTransform: "none",
      color: accent,
      fontWeight: 600,
      fontSize: 13,
      alignSelf: "flex-start",
      padding: "4px 0"
    },
    field: {
      "& .MuiOutlinedInput-root": { borderRadius: 10 },
      "& .MuiInputBase-input": { fontSize: 13 }
    }
  };
});

const TONES = [
  { id: "formal", label: "Formal" },
  { id: "consultivo", label: "Consultivo" },
  { id: "amigavel", label: "Amigável" },
  { id: "direto", label: "Direto" }
];

export default function InventoryReplySettingsPanel({
  value,
  onChange,
  compact = false,
  showPreview = true,
  hideTemplate = false,
  previewProduct = null
}) {
  const classes = useStyles();
  const reply = useMemo(() => normalizeInventoryReply(value), [value]);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const patch = (partial) => {
    if (typeof onChange === "function") {
      onChange(normalizeInventoryReply({ ...reply, ...partial }));
    }
  };

  const presets = compact
    ? INVENTORY_STRATEGY_PRESETS.filter((p) => INVENTORY_COMPACT_PRESET_IDS.includes(p.id))
    : INVENTORY_STRATEGY_PRESETS;

  const toggle = (key) => (
    <Box className={classes.toggleRow} key={key}>
      <Box>
        <Typography className={classes.toggleLabel}>
          {key === "includePrice"
            ? "Preço"
            : key === "includeStock"
              ? "Estoque"
              : key === "includeLink"
                ? "Link"
                : key === "resumeHint"
                  ? "Retomar roteiro"
                  : key === "includeDescription"
                    ? "Descrição"
                    : key === "includeSku"
                      ? "SKU"
                      : key === "sendDocument"
                        ? "Anexar documento"
                        : key}
        </Typography>
        {key === "sendImages" ? (
          <Typography className={classes.toggleHint}>Capa ou galeria</Typography>
        ) : null}
      </Box>
      <Switch
        size="small"
        className={classes.iosSwitch}
        checked={!!reply[key]}
        onChange={(e) => {
          const checked = e.target.checked;
          if (key === "sendImages") {
            patch({
              sendImages: checked,
              imageMode: checked
                ? reply.imageMode === "none"
                  ? "cover"
                  : reply.imageMode
                : "none"
            });
          } else {
            patch({ [key]: checked });
          }
        }}
        color="primary"
      />
    </Box>
  );

  return (
    <Box className={classes.root}>
      <Box>
        <Typography className={classes.sectionLabel}>Tom</Typography>
        <Box className={classes.segmentRow}>
          {TONES.map((t) => (
            <Button
              key={t.id}
              disableElevation
              className={`${classes.segmentBtn} ${
                reply.tone === t.id ? classes.segmentBtnActive : ""
              }`}
              onClick={() => patch({ tone: t.id })}
            >
              {t.label}
            </Button>
          ))}
        </Box>
      </Box>

      <Box>
        <Typography className={classes.sectionLabel}>Estratégia</Typography>
        <Box className={classes.strategyGrid}>
          {presets.map((p) => (
            <Box
              key={p.id}
              className={`${classes.strategyCard} ${
                reply.strategyPreset === p.id ? classes.strategyCardActive : ""
              }`}
              onClick={() => {
                const next = { strategyPreset: p.id };
                if (p.id !== "custom" && p.template) next.template = p.template;
                patch(next);
              }}
            >
              <Typography className={classes.strategyTitle}>{p.label}</Typography>
              <Typography className={classes.strategyHint}>{p.hint}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {!hideTemplate ? (
        <TextField
          className={classes.field}
          variant="outlined"
          size="small"
          fullWidth
          multiline
          minRows={3}
          label="Template"
          value={reply.template}
          onChange={(e) =>
            patch({ template: e.target.value, strategyPreset: "custom" })
          }
        />
      ) : null}

      {toggle("includePrice")}
      {toggle("includeStock")}
      {toggle("includeLink")}
      {toggle("resumeHint")}

      {reply.resumeHint ? (
        <TextField
          className={classes.field}
          variant="outlined"
          size="small"
          fullWidth
          label="Frase de retomada"
          value={reply.resumeHintText}
          onChange={(e) => patch({ resumeHintText: e.target.value })}
        />
      ) : null}

      <Box className={classes.toggleRow}>
        <Box>
          <Typography className={classes.toggleLabel}>Enviar imagens</Typography>
          <Typography className={classes.toggleHint}>Capa ou galeria</Typography>
        </Box>
        <Switch
          size="small"
          className={classes.iosSwitch}
          checked={!!reply.sendImages}
          onChange={(e) => {
            const checked = e.target.checked;
            patch({
              sendImages: checked,
              imageMode: checked
                ? reply.imageMode === "none"
                  ? "cover"
                  : reply.imageMode
                : "none"
            });
          }}
          color="primary"
        />
      </Box>

      {reply.sendImages ? (
        <Box>
          <Box className={classes.segmentRow}>
            {[
              { id: "cover", label: "Só capa" },
              { id: "gallery", label: "Galeria" },
              { id: "first_n", label: "Primeiras N" }
            ].map((m) => (
              <Button
                key={m.id}
                disableElevation
                className={`${classes.segmentBtn} ${
                  reply.imageMode === m.id ? classes.segmentBtnActive : ""
                }`}
                onClick={() => patch({ imageMode: m.id })}
              >
                {m.label}
              </Button>
            ))}
          </Box>
          {reply.imageMode === "first_n" ? (
            <TextField
              className={classes.field}
              style={{ marginTop: 8, maxWidth: 120 }}
              variant="outlined"
              size="small"
              type="number"
              label="Qtd"
              value={reply.imageCount}
              inputProps={{ min: 1, max: 6 }}
              onChange={(e) => {
                let n = Number(e.target.value) || 1;
                if (n < 1) n = 1;
                if (n > 6) n = 6;
                patch({ imageCount: n });
              }}
            />
          ) : null}
        </Box>
      ) : null}

      <Button
        className={classes.moreBtn}
        onClick={() => setAdvancedOpen((v) => !v)}
      >
        {advancedOpen ? "Menos opções" : "Mais opções"}
      </Button>

      <Collapse in={advancedOpen}>
        <Box display="flex" flexDirection="column" style={{ gap: 8 }}>
          {toggle("includeDescription")}
          {toggle("includeSku")}
          {toggle("sendDocument")}
          {reply.sendDocument ? (
            <>
              <TextField
                className={classes.field}
                variant="outlined"
                size="small"
                fullWidth
                label="URL do documento"
                value={reply.documentUrl}
                onChange={(e) => patch({ documentUrl: e.target.value })}
              />
              <TextField
                className={classes.field}
                variant="outlined"
                size="small"
                fullWidth
                label="Nome do arquivo"
                value={reply.documentName}
                onChange={(e) => patch({ documentName: e.target.value })}
              />
            </>
          ) : null}
        </Box>
      </Collapse>

      {showPreview ? (
        <WhatsAppIphonePreview
          message={buildInventoryWhatsAppPreview(reply, previewProduct)}
          agentName="Seu agente"
          contactName="Cliente"
          avatarUrl={previewProduct?.image || ""}
          showImages={!!reply.sendImages}
          showDocument={!!reply.sendDocument}
          label={
            previewProduct?.name
              ? `Como fica · ${previewProduct.name}`
              : "Como a mensagem aparece"
          }
        />
      ) : null}
    </Box>
  );
}
