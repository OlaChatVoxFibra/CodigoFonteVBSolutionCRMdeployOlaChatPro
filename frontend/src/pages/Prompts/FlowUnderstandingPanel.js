/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Chip,
  Divider,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Tooltip,
  TextField,
  Button
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(2),
    background: theme.palette.background.paper
  },
  section: {
    marginBottom: theme.spacing(2)
  },
  sectionTitle: {
    fontWeight: 600,
    marginBottom: theme.spacing(1)
  },
  chip: {
    marginRight: theme.spacing(0.5),
    marginBottom: theme.spacing(0.5)
  },
  stepCard: {
    padding: theme.spacing(1.5),
    marginBottom: theme.spacing(1),
    background: theme.palette.background.default,
    borderRadius: 6,
    border: `1px solid ${theme.palette.divider}`
  },
  intentBadge: {
    fontFamily: "monospace",
    fontSize: 12,
    padding: "2px 6px",
    borderRadius: 4
  },
  intentAdvance: { background: "#1f7a35", color: "#fff" },
  intentCorrection: { background: "#c47f00", color: "#fff" },
  intentRepeat: { background: "#3b6ec0", color: "#fff" },
  intentOffTopic: { background: "#8a4baf", color: "#fff" },
  intentNoise: { background: "#666", color: "#fff" },
  intentTerminate: { background: "#a32a2a", color: "#fff" },
  timelineItem: {
    fontFamily: "monospace",
    fontSize: 12,
    padding: theme.spacing(0.5),
    borderBottom: `1px solid ${theme.palette.divider}`
  },
  empty: {
    padding: theme.spacing(2),
    textAlign: "center",
    color: theme.palette.text.secondary,
    fontStyle: "italic"
  }
}));

/**
 * FlowUnderstandingPanel
 * Painel admin para conferir o que o agente "entendeu" sobre o fluxo
 * (flowUnderstanding pré-compilado) + a timeline de decisões do motor v2
 * em um ticket específico.
 *
 * Endpoints consumidos:
 *  - GET /prompt/:promptId/flow-understanding
 *  - GET /prompt/:promptId/flow-timeline?ticketId=NN
 */
const FlowUnderstandingPanel = ({ promptId, initialTicketId = "" }) => {
  const classes = useStyles();
  const [understanding, setUnderstanding] = useState(null);
  const [understandingMeta, setUnderstandingMeta] = useState(null);
  const [loadingU, setLoadingU] = useState(false);
  const [ticketId, setTicketId] = useState(initialTicketId);
  const [timeline, setTimeline] = useState([]);
  const [memory, setMemory] = useState(null);
  const [loadingT, setLoadingT] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchUnderstanding = useCallback(async () => {
    if (!promptId) return;
    setLoadingU(true);
    setErrorMsg("");
    try {
      const { data } = await api.get(`/prompt/${promptId}/flow-understanding`);
      setUnderstanding(data?.flowUnderstanding || null);
      setUnderstandingMeta({
        version: data?.flowUnderstandingVersion,
        compilerVersion: data?.compilerVersion,
        lastCompiledAt: data?.lastCompiledAt,
        transitionHooks: data?.transitionHooks
      });
    } catch (e) {
      setErrorMsg(e?.response?.data?.error || "Falha ao carregar flowUnderstanding");
    } finally {
      setLoadingU(false);
    }
  }, [promptId]);

  const fetchTimeline = useCallback(async () => {
    if (!promptId || !ticketId) return;
    setLoadingT(true);
    setErrorMsg("");
    try {
      const { data } = await api.get(
        `/prompt/${promptId}/flow-timeline?ticketId=${ticketId}`
      );
      setTimeline(data?.timeline || []);
      setMemory(data?.memory || null);
    } catch (e) {
      setErrorMsg(e?.response?.data?.error || "Falha ao carregar timeline");
      setTimeline([]);
    } finally {
      setLoadingT(false);
    }
  }, [promptId, ticketId]);

  useEffect(() => {
    fetchUnderstanding();
  }, [fetchUnderstanding]);

  const intentClass = (intent) => {
    switch (intent) {
      case "advance":
        return classes.intentAdvance;
      case "correction":
        return classes.intentCorrection;
      case "repeat":
        return classes.intentRepeat;
      case "off_topic":
        return classes.intentOffTopic;
      case "terminate":
        return classes.intentTerminate;
      default:
        return classes.intentNoise;
    }
  };

  return (
    <Paper className={classes.root} elevation={0}>
      <Typography variant="h6">Entendimento do fluxo (Pré-compreensão)</Typography>
      <Typography variant="caption" color="textSecondary">
        Resumo gerado no save — o agente usa isto antes de executar a conversa.
      </Typography>

      {loadingU && (
        <Box display="flex" justifyContent="center" my={2}>
          <CircularProgress size={24} />
        </Box>
      )}

      {!loadingU && !understanding && (
        <Box className={classes.empty}>
          Sem pré-compreensão registrada. Salve o fluxo para gerar.
        </Box>
      )}

      {!loadingU && understanding && (
        <Box className={classes.section}>
          <Box mt={1}>
            <Typography variant="body2">
              <strong>Objetivo global:</strong> {understanding.globalObjective}
            </Typography>
            <Typography variant="body2">
              <strong>Público:</strong> {understanding.audience}
            </Typography>
            <Typography variant="body2">
              <strong>Confiança:</strong>{" "}
              {(Number(understanding.confidence) * 100).toFixed(0)}%
              {" · "}fonte: {understanding.source || "auto"}
              {understandingMeta?.version != null && (
                <> · versão {understandingMeta.version}</>
              )}
            </Typography>
          </Box>

          <Divider style={{ margin: "12px 0" }} />

          <Typography className={classes.sectionTitle}>
            Mapa de etapas ({understanding.stepMap?.length || 0})
          </Typography>
          {(understanding.stepMap || []).map((s) => (
            <Box key={s.stepId} className={classes.stepCard}>
              <Typography variant="subtitle2">
                {s.stepId} — {s.title}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {s.objective}
              </Typography>
              {s.askedQuestion && (
                <Typography variant="body2" style={{ marginTop: 6 }}>
                  <strong>Pergunta:</strong> {s.askedQuestion}
                </Typography>
              )}
              {s.expectedSlot && (
                <Chip
                  className={classes.chip}
                  size="small"
                  label={`slot: ${s.expectedSlot}`}
                />
              )}
              {(s.typicalReplies || []).map((r, i) => (
                <Chip
                  key={i}
                  className={classes.chip}
                  size="small"
                  label={r}
                  variant="outlined"
                />
              ))}
              {s.successCriteria && (
                <Typography
                  variant="caption"
                  display="block"
                  style={{ marginTop: 6 }}
                >
                  ✓ {s.successCriteria}
                </Typography>
              )}
            </Box>
          ))}

          {(understanding.slotsExpected || []).length > 0 && (
            <>
              <Typography className={classes.sectionTitle}>Slots esperados</Typography>
              {understanding.slotsExpected.map((sl) => (
                <Chip
                  key={sl.slotName}
                  className={classes.chip}
                  size="small"
                  label={`${sl.slotName} (${sl.type})`}
                />
              ))}
            </>
          )}

          {(understanding.terminalStates || []).length > 0 && (
            <>
              <Typography className={classes.sectionTitle}>
                Estados terminais
              </Typography>
              {understanding.terminalStates.map((t) => (
                <Chip key={t} className={classes.chip} size="small" label={t} />
              ))}
            </>
          )}

          {(understanding.risksDetected || []).length > 0 && (
            <>
              <Typography className={classes.sectionTitle}>
                Riscos detectados
              </Typography>
              {understanding.risksDetected.map((r, i) => (
                <Tooltip key={i} title={r.mitigation || ""}>
                  <Chip
                    className={classes.chip}
                    size="small"
                    label={`${r.kind || "risco"}: ${r.detail || ""}`}
                  />
                </Tooltip>
              ))}
            </>
          )}
        </Box>
      )}

      <Divider style={{ margin: "16px 0" }} />

      <Typography variant="h6">Timeline de decisões (motor v2)</Typography>
      <Box display="flex" alignItems="center" mt={1} mb={2} style={{ gap: 8 }}>
        <TextField
          label="Ticket ID"
          size="small"
          value={ticketId}
          onChange={(e) => setTicketId(e.target.value)}
          style={{ width: 140 }}
        />
        <Button variant="outlined" onClick={fetchTimeline} disabled={!ticketId}>
          Carregar
        </Button>
      </Box>

      {loadingT && (
        <Box display="flex" justifyContent="center" my={2}>
          <CircularProgress size={20} />
        </Box>
      )}

      {!loadingT && timeline.length === 0 && (
        <Box className={classes.empty}>
          {ticketId
            ? "Sem eventos de timeline para esse ticket ainda."
            : "Informe um ticketId para ver a timeline."}
        </Box>
      )}

      {!loadingT && timeline.length > 0 && (
        <Box>
          {memory && (
            <Box mb={1}>
              <Typography variant="caption" color="textSecondary">
                Memory: lastPresentedStep={memory.lastPresentedStep ?? "?"} · phase=
                {memory.flowPhase || "?"} · awaiting={String(memory.awaitingUserReply)}
              </Typography>
            </Box>
          )}
          <List dense>
            {timeline
              .slice()
              .reverse()
              .map((ev, i) => (
                <ListItem key={i} className={classes.timelineItem}>
                  <ListItemText
                    primary={
                      <span>
                        <span
                          className={`${classes.intentBadge} ${intentClass(ev.intent)}`}
                        >
                          {ev.intent}
                        </span>
                        {"  "}
                        {ev.fromStepId || "—"} → {ev.toStepId || "—"}
                        {"  · "}conf {(Number(ev.confidence) * 100).toFixed(0)}%
                        {"  · "}fonte: {ev.source}
                      </span>
                    }
                    secondary={
                      <span>
                        {ev.reasoning}
                        {ev.filledSlot && (
                          <>
                            <br />
                            slot: <strong>{ev.filledSlot.name}</strong> ={" "}
                            {String(ev.filledSlot.value).slice(0, 80)}
                          </>
                        )}
                        {ev.hookFires?.length > 0 && (
                          <>
                            <br />
                            hooks:{" "}
                            {ev.hookFires
                              .map((h) => `${h.moment}@${h.stepId}`)
                              .join(", ")}
                          </>
                        )}
                      </span>
                    }
                  />
                </ListItem>
              ))}
          </List>
        </Box>
      )}

      {errorMsg && (
        <Box mt={2}>
          <Typography color="error">{errorMsg}</Typography>
        </Box>
      )}
    </Paper>
  );
};

export default FlowUnderstandingPanel;
