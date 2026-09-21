/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Tooltip,
  Typography
} from "@material-ui/core";
import HelpOutlineIcon from "@material-ui/icons/HelpOutline";
import SectionCard from "./shared/SectionCard";
import ProactivityHelpDialog from "./ProactivityHelpDialog";
import {
  QUICK_OBJECTIVES,
  QUICK_TONES,
  appendToField,
  FOLLOWUP_VACUO_CHIPS,
  FOLLOWUP_CLIENTE_CHIPS,
  INBOUND_SALES_PRESETS,
  INBOUND_ROTEIRO_CHIPS,
  LINK_WHEN_CHIPS
} from "../constants/proactivityQuickSnippets";
import { toast } from "react-toastify";
import { applySalesCampaignPreset } from "../constants/salesCampaignPreset";
import {
  ProactiveMissionPicker,
  ProactivePlaybookPicker,
  PROACTIVE_PLAYBOOK_OPTIONS
} from "./personalization/ProactivityStylePickers";

const chipInfo = { borderColor: "#1976d2", color: "#1565c0" };
const chipOk = { borderColor: "#2e7d32", color: "#1b5e20" };

export default function ProactivityTab({
  classes,
  proactiveState,
  setProactiveState,
  ExpandableField,
  onSaveProactivity,
  tags,
  contactLists,
  canSaveSettings = true,
  showStepSaveButton = true
}) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const [masterDialog, setMasterDialog] = useState(false);

  const appendObjectiveSnippet = (flowId, snippet) => {
    setProactiveState((prev) => ({
      ...prev,
      objectives: {
        ...(prev.objectives || {}),
        [flowId]: appendToField(prev.objectives?.[flowId], snippet.text, "; ")
      }
    }));
  };

  const appendInboundBriefSnippet = (snippet) => {
    setProactiveState((prev) => ({
      ...prev,
      inboundConversationBrief: appendToField(prev.inboundConversationBrief, snippet.text, "\n")
    }));
  };

  const appendToneSnippet = (hintKey, snippet) => {
    setProactiveState((prev) => ({
      ...prev,
      [hintKey]: appendToField(prev[hintKey], snippet.text)
    }));
  };

  const setSegment = (partial) => {
    setProactiveState((prev) => ({
      ...prev,
      segments: {
        ...(prev.segments || {}),
        follow_up: {
          tagIds: [],
          contactListId: "",
          ...(prev.segments || {}).follow_up,
          ...partial
        }
      }
    }));
  };

  const setObjective = (ctx, text) => {
    setProactiveState((prev) => ({
      ...prev,
      objectives: { ...(prev.objectives || {}), [ctx]: text }
    }));
  };

  const setCustomProactiveText = (ctx, text) => {
    setProactiveState((prev) => ({
      ...prev,
      customProactiveText: { ...(prev.customProactiveText || {}), [ctx]: text }
    }));
  };

  const updateLink = (idx, field, value) => {
    setProactiveState((prev) => {
      const list = [...(prev.contextualLinks || [])];
      if (!list[idx]) return prev;
      list[idx] = { ...list[idx], [field]: value };
      return { ...prev, contextualLinks: list };
    });
  };

  const addLink = () => {
    setProactiveState((prev) => {
      const list = [...(prev.contextualLinks || [])];
      if (list.length >= 8) return prev;
      list.push({
        id: `lnk_${Date.now()}`,
        url: "https://",
        label: "",
        whenToUse: "",
        fetchContent: false
      });
      return { ...prev, contextualLinks: list };
    });
  };

  const removeLink = (idx) => {
    setProactiveState((prev) => ({
      ...prev,
      contextualLinks: (prev.contextualLinks || []).filter((_, i) => i !== idx)
    }));
  };

  const appendWhenToLastLink = (text) => {
    setProactiveState((prev) => {
      const list = [...(prev.contextualLinks || [])];
      if (!list.length) return prev;
      const last = list.length - 1;
      list[last] = {
        ...list[last],
        whenToUse: appendToField(list[last].whenToUse, text, "; ")
      };
      return { ...prev, contextualLinks: list };
    });
  };

  const toggleFollowUp = (checked) => {
    if (checked && !proactiveState.enabled) {
      setMasterDialog(true);
      return;
    }
    setProactiveState((prev) => ({ ...prev, followUpEnabled: checked }));
  };

  return (
    <div className={`${classes.mainPaper} ${classes.mainPaperTight}`}>
      <SectionCard className={classes.sectionCardSpacing}>
        <Box display="flex" flexWrap="wrap" alignItems="center" style={{ gap: 10 }}>
          <Button variant="outlined" color="primary" size="small" onClick={() => setPresetOpen(true)}>
            Preset comercial…
          </Button>
          <Button
            variant="contained"
            style={{ backgroundColor: "#1565c0", color: "#fff" }}
            size="small"
            startIcon={<HelpOutlineIcon />}
            onClick={() => setHelpOpen(true)}
          >
            Manual e fluxo
          </Button>
        </Box>
        <Typography variant="caption" color="textSecondary" style={{ display: "block", marginTop: 8 }}>
          Campanha abre o chat; aqui você define como a IA vende ao vivo e como retomar quem parou de responder.
        </Typography>
      </SectionCard>

      <ProactivityHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />

      <SectionCard className={classes.sectionCardSpacing}>
        <div className={classes.switchRow}>
          <Box display="flex" alignItems="center" style={{ gap: 6 }} flex={1}>
            <span className={classes.labelSmall}>Automações (follow-up automático)</span>
            <Tooltip title="Desligado: o job de follow-up não roda. O chat ao vivo com IA continua configurável abaixo.">
              <HelpOutlineIcon fontSize="small" color="action" style={{ cursor: "help" }} />
            </Tooltip>
          </Box>
          <Switch
            checked={!!proactiveState.enabled}
            onChange={(e) => setProactiveState((prev) => ({ ...prev, enabled: e.target.checked }))}
            color="primary"
          />
        </div>
      </SectionCard>

      {!proactiveState.enabled ? (
        <SectionCard className={classes.sectionCardSpacing}>
          <Paper
            elevation={0}
            style={{
              padding: 12,
              backgroundColor: "#e3f2fd",
              borderLeft: "4px solid #1976d2",
              borderRadius: 8
            }}
          >
            <Typography variant="body2" style={{ color: "#0d47a1" }}>
              Com o interruptor desligado, o <b>follow-up automático</b> não executa. Salve após alterar.
            </Typography>
          </Paper>
        </SectionCard>
      ) : null}

      <SectionCard className={classes.sectionCardSpacing}>
        <Typography variant="body2" style={{ fontWeight: 600, marginBottom: 8 }}>
          Essencial
        </Typography>
        <div className={classes.switchRow} style={{ marginBottom: 12 }}>
          <Box display="flex" alignItems="center" style={{ gap: 6 }} flex={1}>
            <span className={classes.labelSmall}>Filtrar follow-up por tag ou lista</span>
            <Tooltip title="Ligado: só contatos que batem tag/lista no bloco Follow-up. Desligado: todos os elegíveis.">
              <HelpOutlineIcon fontSize="small" color="action" style={{ cursor: "help" }} />
            </Tooltip>
          </Box>
          <Switch
            checked={proactiveState.applySegmentFilters !== false}
            onChange={(e) =>
              setProactiveState((prev) => ({ ...prev, applySegmentFilters: e.target.checked }))
            }
            color="primary"
          />
        </div>
        <ProactiveMissionPicker
          value={proactiveState.proactiveMission}
          onChange={(val) => setProactiveState((prev) => ({ ...prev, proactiveMission: val }))}
        />
        <Box mt={1}>
          <Typography variant="body2" style={{ fontWeight: 600, marginBottom: 4, fontSize: 13 }}>
            Playbook
          </Typography>
          <ProactivePlaybookPicker
            value={proactiveState.playbook}
            onChange={(val) => setProactiveState((prev) => ({ ...prev, playbook: val }))}
          />
          <Typography variant="caption" color="textSecondary" display="block" style={{ marginTop: 6 }}>
            Atalhos de playbook
          </Typography>
          <Box display="flex" flexWrap="wrap" style={{ gap: 6, marginTop: 4 }}>
            {PROACTIVE_PLAYBOOK_OPTIONS.map((opt) => (
              <Chip
                key={opt.value === "" ? "__none__" : opt.value}
                size="small"
                label={opt.title}
                clickable
                style={
                  (proactiveState.playbook || "") === opt.value
                    ? chipInfo
                    : { border: "1px solid #e5e7eb" }
                }
                onClick={() =>
                  setProactiveState((prev) => ({ ...prev, playbook: opt.value }))
                }
              />
            ))}
          </Box>
        </Box>
        <Box display="flex" alignItems="center" style={{ gap: 6, marginTop: 12, marginBottom: 8 }}>
          <Typography variant="body2" style={{ fontWeight: 600, fontSize: 13 }}>
            Limites de insistência (follow-up)
          </Typography>
          <Tooltip title="Máximo de tentativas automáticas e intervalo mínimo entre elas.">
            <HelpOutlineIcon fontSize="small" color="action" style={{ cursor: "help" }} />
          </Tooltip>
        </Box>
        <Grid container spacing={1}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Máx. follow-ups sem resposta"
              type="number"
              fullWidth
              variant="outlined"
              size="small"
              className={classes.inputDense}
              helperText="1–15; depois pode marcar inativo"
              value={proactiveState.maxFollowUpAttempts ?? 3}
              onChange={(e) =>
                setProactiveState((prev) => ({
                  ...prev,
                  maxFollowUpAttempts: Math.min(15, Math.max(1, Number(e.target.value) || 3))
                }))
              }
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: 1, max: 15 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Mín. horas entre follow-ups"
              type="number"
              fullWidth
              variant="outlined"
              size="small"
              className={classes.inputDense}
              helperText="Vazio = só regra em dias"
              value={proactiveState.minHoursBetweenFollowUps ?? ""}
              onChange={(e) =>
                setProactiveState((prev) => ({ ...prev, minHoursBetweenFollowUps: e.target.value }))
              }
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: 0, max: 168 }}
            />
          </Grid>
        </Grid>
      </SectionCard>

      <SectionCard className={classes.sectionCardSpacing}>
        <Box
          display="flex"
          alignItems="center"
          flexWrap="wrap"
          style={{ gap: 8, marginBottom: 10, paddingBottom: 8, borderBottom: "1px solid #e3f2fd" }}
        >
          <Typography variant="body2" style={{ fontWeight: 700, fontSize: 14 }}>
            Chat ao vivo (cliente escreve)
          </Typography>
          <Paper
            component="span"
            style={{
              backgroundColor: "#e8f5e9",
              color: "#1b5e20",
              padding: "2px 8px",
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 4
            }}
          >
            Venda e links
          </Paper>
          <Tooltip title="Entra no prompt com Cargo e Cérebro. Mídias após a resposta: aba Mídias.">
            <HelpOutlineIcon fontSize="small" color="action" style={{ cursor: "help" }} />
          </Tooltip>
        </Box>

        <ExpandableField
          label="Roteiro (checklist curto)"
          value={proactiveState.inboundConversationBrief || ""}
          onChange={(e) =>
            setProactiveState((prev) => ({ ...prev, inboundConversationBrief: e.target.value }))
          }
          className={classes.inputDense}
          minRows={2}
          maxRows={12}
          placeholder="Ex.: 1) Qualificar 2) Apresentar serviço 3) CTA: pagamento ou reunião"
        />

        <Typography variant="caption" style={{ display: "block", marginTop: 10, marginBottom: 4, fontWeight: 600 }}>
          Roteiro rápido (múltipla escolha)
        </Typography>
        <Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 6 }}>
          Cada chip adiciona uma linha ao roteiro acima.
        </Typography>
        <Box display="flex" flexWrap="wrap" style={{ gap: 6, marginBottom: 10 }}>
          {INBOUND_ROTEIRO_CHIPS.map((s) => (
            <Button
              key={`rot-${s.label}`}
              size="small"
              variant="outlined"
              style={chipInfo}
              onClick={() => appendInboundBriefSnippet(s)}
            >
              {s.label}
            </Button>
          ))}
        </Box>

        <Typography variant="caption" style={{ display: "block", marginTop: 10, marginBottom: 4, fontWeight: 600 }}>
          Objetivo rápido
        </Typography>
        <Box display="flex" flexWrap="wrap" style={{ gap: 6, marginBottom: 8 }}>
          {INBOUND_SALES_PRESETS.map((s) => (
            <Button
              key={`sale-${s.label}`}
              size="small"
              variant="outlined"
              style={chipOk}
              onClick={() => appendObjectiveSnippet("inbound", s)}
            >
              {s.label}
            </Button>
          ))}
          {(QUICK_OBJECTIVES.inbound || []).map((s) => (
            <Button
              key={`obj-in-${s.label}`}
              size="small"
              variant="outlined"
              style={chipInfo}
              onClick={() => appendObjectiveSnippet("inbound", s)}
            >
              {s.label}
            </Button>
          ))}
        </Box>
        <TextField
          label="Objetivo no chat (uma frase)"
          fullWidth
          variant="outlined"
          size="small"
          className={classes.inputDense}
          value={(proactiveState.objectives && proactiveState.objectives.inbound) || ""}
          onChange={(e) => setObjective("inbound", e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <Typography variant="caption" style={{ display: "block", marginTop: 10, marginBottom: 4, fontWeight: 600 }}>
          Links com contexto (site, pagamento, agenda)
        </Typography>
        <Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 8 }}>
          A IA só deve citar estes URLs quando fizer sentido. Opcional: buscar trecho público da página para o prompt.
        </Typography>
        <div className={classes.switchRow} style={{ marginBottom: 10 }}>
          <span className={classes.labelSmall}>Buscar texto das páginas (quando marcado por link)</span>
          <Switch
            checked={!!proactiveState.fetchLinkContentForPrompt}
            onChange={(e) =>
              setProactiveState((prev) => ({ ...prev, fetchLinkContentForPrompt: e.target.checked }))
            }
            color="primary"
          />
        </div>
        {(proactiveState.contextualLinks || []).map((link, idx) => (
          <Paper
            key={link.id || idx}
            style={{ padding: 10, marginBottom: 8, borderLeft: "4px solid #1976d2", background: "#fafafa" }}
          >
            <Grid container spacing={1}>
              <Grid item xs={12} sm={5}>
                <TextField
                  label="URL (https://)"
                  fullWidth
                  variant="outlined"
                  size="small"
                  className={classes.inputDense}
                  value={link.url || ""}
                  onChange={(e) => updateLink(idx, "url", e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Nome"
                  fullWidth
                  variant="outlined"
                  size="small"
                  className={classes.inputDense}
                  value={link.label || ""}
                  onChange={(e) => updateLink(idx, "label", e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Quando usar"
                  fullWidth
                  variant="outlined"
                  size="small"
                  className={classes.inputDense}
                  value={link.whenToUse || ""}
                  onChange={(e) => updateLink(idx, "whenToUse", e.target.value)}
                  placeholder="ex.: pagamento"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={1} style={{ display: "flex", alignItems: "center" }}>
                <Tooltip title="Buscar trecho desta página">
                  <span>
                    <Switch
                      checked={!!link.fetchContent}
                      onChange={(e) => updateLink(idx, "fetchContent", e.target.checked)}
                      color="primary"
                      size="small"
                    />
                  </span>
                </Tooltip>
              </Grid>
            </Grid>
            <Button size="small" onClick={() => removeLink(idx)} style={{ marginTop: 4 }}>
              Remover link
            </Button>
          </Paper>
        ))}
        <Button size="small" variant="outlined" color="primary" onClick={addLink} disabled={(proactiveState.contextualLinks || []).length >= 8}>
          + Adicionar link (máx. 8)
        </Button>

        <Typography variant="caption" style={{ display: "block", marginTop: 10, marginBottom: 4, fontWeight: 600 }}>
          Atalhos “Quando usar” (último link da lista)
        </Typography>
        <Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 6 }}>
          Aplica ao último cartão de link. Adicione o link antes ou selecione editando o campo.
        </Typography>
        <Box display="flex" flexWrap="wrap" style={{ gap: 6, marginBottom: 8 }}>
          {LINK_WHEN_CHIPS.map((s) => (
            <Button
              key={`when-${s.label}`}
              size="small"
              variant="outlined"
              style={chipOk}
              onClick={() => {
                const n = (proactiveState.contextualLinks || []).length;
                if (!n) {
                  toast.info("Adicione um link antes.");
                  return;
                }
                appendWhenToLastLink(s.text);
              }}
            >
              {s.label}
            </Button>
          ))}
        </Box>

        <div className={classes.switchRow} style={{ marginTop: 12 }}>
          <Box flex={1} pr={1}>
            <span className={classes.labelSmall}>Mídia após resposta: só na 1ª mensagem da IA no ticket</span>
          </Box>
          <Switch
            checked={!!proactiveState.inboundMediaOnlyFirstResponse}
            onChange={(e) =>
              setProactiveState((prev) => ({
                ...prev,
                inboundMediaOnlyFirstResponse: e.target.checked
              }))
            }
            color="primary"
          />
        </div>

        <Typography variant="caption" style={{ display: "block", marginTop: 8, marginBottom: 4, fontWeight: 600 }}>
          Tom no chat
        </Typography>
        <Box display="flex" flexWrap="wrap" style={{ gap: 6 }}>
          {(QUICK_TONES.inbound || []).map((s) => (
            <Button
              key={`tin-${s.label}`}
              size="small"
              variant="outlined"
              style={chipInfo}
              onClick={() => appendInboundBriefSnippet(s)}
            >
              {s.label}
            </Button>
          ))}
        </Box>
      </SectionCard>

      <SectionCard className={classes.sectionCardSpacing}>
        <Box display="flex" alignItems="center" flexWrap="wrap" style={{ gap: 8, marginBottom: 10 }}>
          <Typography variant="body2" style={{ fontWeight: 700, fontSize: 14 }}>
            Follow-up automático
          </Typography>
          <Paper
            component="span"
            style={{
              backgroundColor: "#fff3e0",
              color: "#e65100",
              padding: "2px 8px",
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 4
            }}
          >
            ~1x/dia manhã SP
          </Paper>
        </Box>

        <div className={classes.switchRow} style={{ marginBottom: 12 }}>
          <span className={classes.labelSmall}>Ativar follow-up</span>
          <Switch
            checked={proactiveState.followUpEnabled !== false}
            onChange={(e) => toggleFollowUp(e.target.checked)}
            color="primary"
          />
        </div>

        <TextField
          label="Dias sem resposta do cliente para tentar follow-up"
          type="number"
          fullWidth
          variant="outlined"
          size="small"
          className={classes.inputDense}
          style={{ marginBottom: 10 }}
          value={proactiveState.followUpAfterDays}
          onChange={(e) =>
            setProactiveState((prev) => ({ ...prev, followUpAfterDays: Number(e.target.value) || 1 }))
          }
          InputLabelProps={{ shrink: true }}
        />

        <Typography variant="caption" style={{ fontWeight: 600, display: "block", marginBottom: 4 }}>
          Quando a última mensagem foi sua (cliente em vácuo)
        </Typography>
        <Box display="flex" flexWrap="wrap" style={{ gap: 6, marginBottom: 6 }}>
          {FOLLOWUP_VACUO_CHIPS.map((s) => (
            <Button
              key={`fv-${s.label}`}
              size="small"
              variant="outlined"
              style={chipInfo}
              onClick={() =>
                setProactiveState((prev) => ({
                  ...prev,
                  followUpToneVacuo: appendToField(prev.followUpToneVacuo, s.text, " ")
                }))
              }
            >
              {s.label}
            </Button>
          ))}
        </Box>
        <TextField
          label="Tom / instruções para este caso"
          fullWidth
          variant="outlined"
          size="small"
          multiline
          minRows={2}
          className={classes.inputDense}
          value={proactiveState.followUpToneVacuo || ""}
          onChange={(e) => setProactiveState((prev) => ({ ...prev, followUpToneVacuo: e.target.value }))}
          InputLabelProps={{ shrink: true }}
        />

        <Typography variant="caption" style={{ fontWeight: 600, display: "block", marginTop: 10, marginBottom: 4 }}>
          Quando o cliente falou por último e depois silenciou
        </Typography>
        <Box display="flex" flexWrap="wrap" style={{ gap: 6, marginBottom: 6 }}>
          {FOLLOWUP_CLIENTE_CHIPS.map((s) => (
            <Button
              key={`fc-${s.label}`}
              size="small"
              variant="outlined"
              style={chipOk}
              onClick={() =>
                setProactiveState((prev) => ({
                  ...prev,
                  followUpToneClienteSilencioso: appendToField(
                    prev.followUpToneClienteSilencioso,
                    s.text,
                    " "
                  )
                }))
              }
            >
              {s.label}
            </Button>
          ))}
        </Box>
        <TextField
          label="Tom / instruções para este caso"
          fullWidth
          variant="outlined"
          size="small"
          multiline
          minRows={2}
          className={classes.inputDense}
          value={proactiveState.followUpToneClienteSilencioso || ""}
          onChange={(e) =>
            setProactiveState((prev) => ({ ...prev, followUpToneClienteSilencioso: e.target.value }))
          }
          InputLabelProps={{ shrink: true }}
        />

        <Typography variant="caption" style={{ fontWeight: 600, display: "block", marginTop: 10, marginBottom: 4 }}>
          Objetivo do follow-up
        </Typography>
        <Box display="flex" flexWrap="wrap" style={{ gap: 6, marginBottom: 6 }}>
          {(QUICK_OBJECTIVES.follow_up || []).map((s) => (
            <Button
              key={`ofu-${s.label}`}
              size="small"
              variant="outlined"
              style={chipInfo}
              onClick={() => appendObjectiveSnippet("follow_up", s)}
            >
              {s.label}
            </Button>
          ))}
        </Box>
        <TextField
          label="Objetivo (uma frase)"
          fullWidth
          variant="outlined"
          size="small"
          className={classes.inputDense}
          style={{ marginBottom: 8 }}
          value={(proactiveState.objectives && proactiveState.objectives.follow_up) || ""}
          onChange={(e) => setObjective("follow_up", e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <Typography variant="caption" style={{ fontWeight: 600, display: "block", marginBottom: 4 }}>
          Tom geral (instruções ao modelo)
        </Typography>
        <Box display="flex" flexWrap="wrap" style={{ gap: 6, marginBottom: 6 }}>
          {(QUICK_TONES.follow_up || []).map((s) => (
            <Button
              key={`tfu-${s.label}`}
              size="small"
              variant="outlined"
              onClick={() => appendToneSnippet("hintFollowUp", s)}
            >
              {s.label}
            </Button>
          ))}
        </Box>
        <ExpandableField
          label="Instruções extras (tom, limites)"
          value={proactiveState.hintFollowUp || ""}
          onChange={(e) => setProactiveState((prev) => ({ ...prev, hintFollowUp: e.target.value }))}
          className={classes.inputDense}
          minRows={2}
          maxRows={8}
        />

        <ExpandableField
          label="Texto fixo (opcional — substitui a IA no follow-up)"
          value={(proactiveState.customProactiveText && proactiveState.customProactiveText.follow_up) || ""}
          onChange={(e) => setCustomProactiveText("follow_up", e.target.value)}
          className={classes.inputDense}
          minRows={2}
          maxRows={6}
          placeholder="{{primeiro_nome}}, {{ticket_id}}…"
        />

        <Typography variant="caption" color="textSecondary" display="block" style={{ marginTop: 8, marginBottom: 4 }}>
          Público do follow-up (opcional)
        </Typography>
        <Select
          multiple
          displayEmpty
          fullWidth
          variant="outlined"
          value={(proactiveState.segments && proactiveState.segments.follow_up?.tagIds) || []}
          onChange={(e) => setSegment({ tagIds: e.target.value })}
          className={`${classes.inputDense} ${classes.selectWhite}`}
          renderValue={(selected) =>
            !selected || selected.length === 0 ? (
              <em>Todas as conversas elegíveis (se filtro global permitir)</em>
            ) : (
              selected.map((id) => tags.find((t) => t.id === id)?.name || id).join(", ")
            )
          }
        >
          {tags.map((t) => (
            <MenuItem key={t.id} value={t.id}>
              {t.name}
            </MenuItem>
          ))}
        </Select>
        <Select
          displayEmpty
          fullWidth
          variant="outlined"
          style={{ marginTop: 8 }}
          value={(proactiveState.segments && proactiveState.segments.follow_up?.contactListId) || ""}
          onChange={(e) =>
            setSegment({ contactListId: e.target.value === "" ? "" : e.target.value })
          }
          className={`${classes.inputDense} ${classes.selectWhite}`}
        >
          <MenuItem value="">
            <em>Sem lista</em>
          </MenuItem>
          {contactLists.map((l) => (
            <MenuItem key={l.id} value={l.id}>
              {l.name}
            </MenuItem>
          ))}
        </Select>
      </SectionCard>

      {showStepSaveButton ? (
        <Box mt={2}>
          <Tooltip
            disableHoverListener={canSaveSettings}
            title="Apenas administradores podem salvar configurações do agente."
          >
            <span>
              <Button
                variant="contained"
                style={{ backgroundColor: "#2e7d32", color: "#fff" }}
                onClick={onSaveProactivity}
                disabled={!canSaveSettings}
              >
                Salvar proatividade
              </Button>
            </span>
          </Tooltip>
          {!canSaveSettings ? (
            <Typography variant="caption" color="textSecondary" display="block" style={{ marginTop: 8 }}>
              Só administradores persistem alterações.
            </Typography>
          ) : null}
        </Box>
      ) : null}

      <Dialog open={presetOpen} onClose={() => setPresetOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Preset comercial</DialogTitle>
        <DialogContent>
          <Typography variant="body2" style={{ lineHeight: 1.55 }}>
            Aplica o preset na tela. Use <b>Salvar agente</b> para gravar.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPresetOpen(false)}>Cancelar</Button>
          <Button
            color="primary"
            variant="contained"
            onClick={() => {
              setProactiveState((prev) => applySalesCampaignPreset(prev));
              setPresetOpen(false);
              toast.success("Preset aplicado. Clique em Salvar agente.");
            }}
          >
            Aplicar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={masterDialog} onClose={() => setMasterDialog(false)}>
        <DialogTitle>Ativar follow-up</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            O interruptor geral está desligado. Você pode ativar só o follow-up (fica salvo) ou ligar o geral para o job
            executar.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setMasterDialog(false);
              setProactiveState((prev) => ({ ...prev, followUpEnabled: false }));
            }}
          >
            Cancelar
          </Button>
          <Button
            color="primary"
            onClick={() => {
              setMasterDialog(false);
              setProactiveState((prev) => ({ ...prev, followUpEnabled: true }));
            }}
          >
            Só marcar follow-up
          </Button>
          <Button
            color="primary"
            variant="contained"
            onClick={() => {
              setMasterDialog(false);
              setProactiveState((prev) => ({ ...prev, enabled: true, followUpEnabled: true }));
            }}
          >
            Ligar geral e follow-up
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
