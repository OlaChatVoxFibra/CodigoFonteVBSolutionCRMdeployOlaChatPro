/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useCallback } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Switch,
  TextField,
  Tooltip,
  Typography
} from "@material-ui/core";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import CloudUploadIcon from "@material-ui/icons/CloudUpload";
import InsertLinkIcon from "@material-ui/icons/InsertLink";
import SectionCard from "./shared/SectionCard";
import api from "../../../services/api";
import { toast } from "react-toastify";
import toastError from "../../../errors/toastError";
import { MEDIA_WHEN_PRESETS } from "../constants/mediaWhenPresets";

const MAX_SLOTS = 12;
const INBOUND_CTX = "inbound";

function parseUrlList(str) {
  return String(str || "")
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function shortPath(p) {
  if (!p) return "";
  const s = String(p);
  return s.length > 48 ? `…${s.slice(-44)}` : s;
}

function emptySlot() {
  return {
    id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: "",
    whenToUse: "",
    imageUrl: "",
    documentUrl: "",
    videoUrl: ""
  };
}

function deriveFlatUrlsFromSlots(slots) {
  const imageUrls = [];
  const documentUrls = [];
  const videoUrls = [];
  for (const s of slots) {
    const iu = String(s.imageUrl || "").trim();
    const du = String(s.documentUrl || "").trim();
    const vu = String(s.videoUrl || "").trim();
    if (iu) imageUrls.push(iu);
    else if (du) documentUrls.push(du);
    else if (vu) videoUrls.push(vu);
  }
  return { imageUrls, documentUrls, videoUrls };
}

function ensurePack(state, ctx) {
  const raw = state.mediaByContext?.[ctx];
  const defaults = {
    imageUrls: [],
    documentUrls: [],
    videoUrls: [],
    inboundMediaSlots: [],
    delayAfterTextSec: 0,
    skipIfRecentOutboundMedia: false,
    beforeMediaContext: ""
  };
  if (!raw || typeof raw !== "object") return { ...defaults };
  const slots = Array.isArray(raw.inboundMediaSlots) ? raw.inboundMediaSlots : [];
  const derived = deriveFlatUrlsFromSlots(slots);
  const hasSlots = slots.length > 0;
  return {
    ...defaults,
    ...raw,
    inboundMediaSlots: slots,
    imageUrls: hasSlots
      ? derived.imageUrls
      : (raw.imageUrls || []).map(String).map((s) => s.trim()).filter(Boolean),
    documentUrls: hasSlots
      ? derived.documentUrls
      : (raw.documentUrls || []).map(String).map((s) => s.trim()).filter(Boolean),
    videoUrls: hasSlots
      ? derived.videoUrls
      : (raw.videoUrls || []).map(String).map((s) => s.trim()).filter(Boolean)
  };
}

function slotKind(slot) {
  if (String(slot.imageUrl || "").trim()) return "image";
  if (String(slot.documentUrl || "").trim()) return "document";
  if (String(slot.videoUrl || "").trim()) return "video";
  return null;
}

const chipPreset = {
  borderColor: "#1976d2",
  color: "#1565c0",
  textTransform: "none",
  fontSize: 12
};

export default function MediaTab({
  classes,
  proactiveState,
  setProactiveState,
  onSaveMedia,
  canSaveSettings = true,
  showStepSaveButton = true
}) {
  const [busyKey, setBusyKey] = useState("");
  const [urlDraft, setUrlDraft] = useState({});
  const [focusedSlotIdx, setFocusedSlotIdx] = useState(0);

  const updatePack = useCallback(
    (ctx, updater) => {
      setProactiveState((prev) => {
        const prevPack = ensurePack(prev, ctx);
        const nextPack = typeof updater === "function" ? updater(prevPack) : { ...prevPack, ...updater };
        const slots = Array.isArray(nextPack.inboundMediaSlots) ? nextPack.inboundMediaSlots : [];
        const { imageUrls, documentUrls, videoUrls } = deriveFlatUrlsFromSlots(slots);
        const merged = {
          ...nextPack,
          inboundMediaSlots: slots,
          imageUrls,
          documentUrls,
          videoUrls
        };
        return {
          ...prev,
          mediaByContext: {
            ...(prev.mediaByContext || {}),
            [ctx]: merged
          }
        };
      });
    },
    [setProactiveState]
  );

  const addSlot = (ctx) => {
    let newIdx = null;
    updatePack(ctx, (pack) => {
      const slots = [...(pack.inboundMediaSlots || [])];
      if (slots.length >= MAX_SLOTS) return pack;
      newIdx = slots.length;
      slots.push(emptySlot());
      return { ...pack, inboundMediaSlots: slots };
    });
    if (newIdx !== null) setFocusedSlotIdx(newIdx);
  };

  const removeSlot = (ctx, idx) => {
    updatePack(ctx, (pack) => {
      const slots = [...(pack.inboundMediaSlots || [])];
      slots.splice(idx, 1);
      return { ...pack, inboundMediaSlots: slots };
    });
    setFocusedSlotIdx((prev) => {
      if (prev > idx) return prev - 1;
      if (prev === idx) return Math.max(0, prev - 1);
      return prev;
    });
  };

  const updateSlot = (ctx, idx, patch) => {
    updatePack(ctx, (pack) => {
      const slots = [...(pack.inboundMediaSlots || [])];
      if (!slots[idx]) return pack;
      slots[idx] = { ...slots[idx], ...patch };
      return { ...pack, inboundMediaSlots: slots };
    });
  };

  const setSlotFile = (ctx, idx, kind, webPath) => {
    updatePack(ctx, (pack) => {
      const slots = [...(pack.inboundMediaSlots || [])];
      if (!slots[idx]) return pack;
      const base = { ...slots[idx], imageUrl: "", documentUrl: "", videoUrl: "" };
      if (kind === "image") base.imageUrl = webPath;
      else if (kind === "document") base.documentUrl = webPath;
      else base.videoUrl = webPath;
      slots[idx] = base;
      return { ...pack, inboundMediaSlots: slots };
    });
  };

  const uploadFileToSlot = async (ctx, slotIdx, kind, file) => {
    if (!file) return;
    const key = `${ctx}:slot:${slotIdx}:${kind}`;
    setBusyKey(key);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/agent-proactive/upload-media", fd);
      const webPath = data.path;
      if (!webPath) throw new Error("Resposta sem path");
      setSlotFile(ctx, slotIdx, kind, webPath);
      toast.success("Arquivo vinculado ao cartão");
    } catch (e) {
      toastError(e);
    } finally {
      setBusyKey("");
    }
  };

  const appendWhenPreset = (ctx, slotIdx, text) => {
    updatePack(ctx, (pack) => {
      const slots = [...(pack.inboundMediaSlots || [])];
      if (!slots[slotIdx]) return pack;
      const cur = String(slots[slotIdx].whenToUse || "").trim();
      const next = cur ? `${cur}; ${text}` : text;
      slots[slotIdx] = { ...slots[slotIdx], whenToUse: next };
      return { ...pack, inboundMediaSlots: slots };
    });
  };

  const mergeUrlsIntoSlots = (ctx, field, urls) => {
    const kind = field === "imageUrls" ? "image" : field === "documentUrls" ? "document" : "video";
    const urlField = kind === "image" ? "imageUrl" : kind === "document" ? "documentUrl" : "videoUrl";
    updatePack(ctx, (pack) => {
      let slots = [...(pack.inboundMediaSlots || [])];
      for (const u of urls) {
        if (slots.length >= MAX_SLOTS) break;
        const slot = emptySlot();
        slot[urlField] = u;
        slots.push(slot);
      }
      return { ...pack, inboundMediaSlots: slots };
    });
    toast.success("URLs adicionadas como cartões");
  };

  const mergeUrlsFromDraft = (ctx, field) => {
    const key = `${ctx}:${field}`;
    const raw = urlDraft[key] || "";
    const urls = parseUrlList(raw);
    if (!urls.length) {
      toast.error("Cole pelo menos uma URL válida.");
      return;
    }
    mergeUrlsIntoSlots(ctx, field, urls);
    setUrlDraft((d) => ({ ...d, [key]: "" }));
  };

  const uploadInput = (ctx, slotIdx, kind, accept, label) => {
    const key = `${ctx}:${slotIdx}:${kind}`;
    const busy = busyKey === key;
    return (
      <Box display="flex" alignItems="center" flexWrap="wrap" style={{ gap: 8, marginTop: 4 }}>
        <input
          type="file"
          accept={accept}
          style={{ display: "none" }}
          id={`up-${key}`}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) uploadFileToSlot(ctx, slotIdx, kind, f);
          }}
        />
        <label htmlFor={`up-${key}`}>
          <Button
            variant="outlined"
            size="small"
            component="span"
            disabled={busy}
            startIcon={busy ? <CircularProgress size={14} /> : <CloudUploadIcon />}
          >
            {label}
          </Button>
        </label>
      </Box>
    );
  };

  const inboundPack = ensurePack(proactiveState, INBOUND_CTX);
  const inboundSlots = inboundPack.inboundMediaSlots || [];

  return (
    <div className={`${classes.mainPaper} ${classes.mainPaperTight}`}>
      <SectionCard className={classes.sectionCardSpacing}>
        <div className={classes.switchRow}>
          <span className={classes.labelSmall}>OpenAI Vision em imagens e figurinhas</span>
          <Switch
            checked={!!proactiveState.openAiVisionInbound}
            onChange={(e) =>
              setProactiveState((prev) => ({ ...prev, openAiVisionInbound: e.target.checked }))
            }
            color="primary"
            inputProps={{ "aria-label": "Vision em mídia recebida" }}
          />
        </div>
        <div className={classes.switchRow} style={{ marginTop: 8 }}>
          <span className={classes.labelSmall}>Mensagem curta ao receber mídia (fallback)</span>
          <Switch
            checked={proactiveState.acknowledgeMedia !== false}
            onChange={(e) =>
              setProactiveState((prev) => ({ ...prev, acknowledgeMedia: e.target.checked }))
            }
            color="primary"
            inputProps={{ "aria-label": "Reconhecer mídia recebida" }}
          />
        </div>
        <div className={classes.switchRow} style={{ marginTop: 8 }}>
          <span className={classes.labelSmall}>Permitir que o modelo sugira URLs de mídia na resposta</span>
          <Switch
            checked={!!proactiveState.defaultOutbound?.allowAgentToSuggestUrls}
            onChange={(e) =>
              setProactiveState((prev) => ({
                ...prev,
                defaultOutbound: {
                  ...(prev.defaultOutbound || {}),
                  allowAgentToSuggestUrls: e.target.checked
                }
              }))
            }
            color="primary"
          />
        </div>
      </SectionCard>

      <Paper
        elevation={0}
        style={{
          padding: 12,
          marginBottom: 12,
          backgroundColor: "#e8f5e9",
          borderLeft: "4px solid #2e7d32",
          borderRadius: 8
        }}
      >
        <Typography variant="body2" style={{ color: "#1b5e20", fontWeight: 600 }}>
          Mídias após a resposta da IA
        </Typography>
        <Typography variant="caption" style={{ display: "block", marginTop: 4, color: "#33691e" }}>
          Cada cartão é um anexo com nome e situação — no mesmo estilo dos links na aba Proatividade. A IA usa isso para
          preparar o cliente antes do envio automático.
        </Typography>
      </Paper>

      <Grid container spacing={1}>
        <Grid item xs={12}>
          <SectionCard className={classes.sectionCardSpacing}>
            <Typography variant="caption" style={{ display: "block", marginBottom: 6, fontWeight: 600 }}>
              Atalhos para “Quando usar” (aplicam no cartão selecionado)
            </Typography>
            <Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 6 }}>
              Clique num cartão abaixo para selecioná-lo; depois use os atalhos.
            </Typography>
            <Box display="flex" flexWrap="wrap" style={{ gap: 6, marginBottom: 8 }}>
              {MEDIA_WHEN_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  size="small"
                  variant="outlined"
                  style={chipPreset}
                  onClick={() => {
                    const idx = Math.min(focusedSlotIdx, Math.max(0, inboundSlots.length - 1));
                    if (inboundSlots.length === 0) {
                      toast.info("Adicione um cartão antes.");
                      return;
                    }
                    appendWhenPreset(INBOUND_CTX, idx, preset.text);
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </Box>

            {(inboundSlots.length ? inboundSlots : []).map((slot, idx) => (
                  <Paper
                    key={slot.id || idx}
                    onClick={() => {
                      setFocusedSlotIdx(idx);
                    }}
                    style={{
                      padding: 10,
                      marginBottom: 8,
                      borderLeft: "4px solid #1976d2",
                      background: focusedSlotIdx === idx ? "#f0f7ff" : "#fafafa",
                      cursor: "pointer"
                    }}
                  >
                    <Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 6 }}>
                      Cartão {idx + 1}
                      {focusedSlotIdx === idx ? " (selecionado para atalhos)" : ""}
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Nome do anexo"
                          fullWidth
                          variant="outlined"
                          size="small"
                          className={classes.inputDense}
                          value={slot.title || ""}
                          onChange={(e) => updateSlot(INBOUND_CTX, idx, { title: e.target.value })}
                          onFocus={() => setFocusedSlotIdx(idx)}
                          placeholder="Ex.: Tabela de preços"
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Quando usar"
                          fullWidth
                          variant="outlined"
                          size="small"
                          className={classes.inputDense}
                          value={slot.whenToUse || ""}
                          onChange={(e) => updateSlot(INBOUND_CTX, idx, { whenToUse: e.target.value })}
                          onFocus={() => setFocusedSlotIdx(idx)}
                          placeholder="Ex.: cliente pediu valores"
                          InputLabelProps={{ shrink: true }}
                        />
                      </Grid>
                    </Grid>

                    <Typography variant="caption" color="textSecondary" display="block" style={{ marginTop: 8 }}>
                      Um arquivo por cartão: escolha o tipo e envie.
                    </Typography>
                    <Box display="flex" flexWrap="wrap" style={{ gap: 8, marginTop: 4 }}>
                      {uploadInput(INBOUND_CTX, idx, "image", "image/*", "Imagem")}
                      {uploadInput(
                        INBOUND_CTX,
                        idx,
                        "document",
                        ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,application/*",
                        "Documento"
                      )}
                      {uploadInput(INBOUND_CTX, idx, "video", "video/*", "Vídeo")}
                    </Box>
                    {slotKind(slot) ? (
                      <Box display="flex" alignItems="center" flexWrap="wrap" style={{ gap: 8, marginTop: 8 }}>
                        <Chip
                          size="small"
                          label={`${
                            slotKind(slot) === "image"
                              ? "Imagem"
                              : slotKind(slot) === "document"
                                ? "Documento"
                                : "Vídeo"
                          }: ${shortPath(
                            slot.imageUrl || slot.documentUrl || slot.videoUrl
                          )}`}
                          onDelete={() =>
                            updateSlot(INBOUND_CTX, idx, { imageUrl: "", documentUrl: "", videoUrl: "" })
                          }
                          title={slot.imageUrl || slot.documentUrl || slot.videoUrl}
                        />
                      </Box>
                    ) : null}

                    <Button size="small" onClick={() => removeSlot(INBOUND_CTX, idx)} style={{ marginTop: 8 }}>
                      Remover cartão
                    </Button>
                  </Paper>
                ))}

                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  onClick={() => addSlot(INBOUND_CTX)}
                  disabled={inboundSlots.length >= MAX_SLOTS}
                  style={{ marginTop: 4 }}
                >
                  + Adicionar cartão de anexo (máx. {MAX_SLOTS})
                </Button>

                <Accordion square className={classes.promptsAccordion} style={{ marginTop: 12 }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                      <InsertLinkIcon fontSize="small" color="action" />
                      <Typography variant="body2">Avançado: adicionar por URL pública</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails style={{ display: "block" }}>
                    <Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 8 }}>
                      Cada linha vira um novo cartão com o arquivo. Limite {MAX_SLOTS} cartões no total.
                    </Typography>
                    {["imageUrls", "documentUrls", "videoUrls"].map((field) => {
                      const key = `${INBOUND_CTX}:${field}`;
                      const lab =
                        field === "imageUrls"
                          ? "URLs de imagem"
                          : field === "documentUrls"
                            ? "URLs de documento"
                            : "URLs de vídeo";
                      return (
                        <Box key={field} style={{ marginBottom: 10 }}>
                          <TextField
                            label={lab}
                            fullWidth
                            variant="outlined"
                            size="small"
                            multiline
                            minRows={2}
                            className={classes.inputDense}
                            value={urlDraft[key] || ""}
                            onChange={(e) => setUrlDraft((d) => ({ ...d, [key]: e.target.value }))}
                            InputLabelProps={{ shrink: true }}
                          />
                          <Button size="small" style={{ marginTop: 4 }} onClick={() => mergeUrlsFromDraft(INBOUND_CTX, field)}>
                            Adicionar como cartões
                          </Button>
                        </Box>
                      );
                    })}
                  </AccordionDetails>
                </Accordion>
              </SectionCard>
            </Grid>
      </Grid>

      {showStepSaveButton ? (
        <Box mt={2}>
          <Tooltip
            disableHoverListener={canSaveSettings}
            title="Apenas administradores podem salvar configurações do agente."
          >
            <span>
              <Button
                variant="contained"
                style={{ backgroundColor: "#1565c0", color: "#fff" }}
                onClick={onSaveMedia}
                disabled={!canSaveSettings}
              >
                Salvar mídias
              </Button>
            </span>
          </Tooltip>
        </Box>
      ) : null}
    </div>
  );
}
