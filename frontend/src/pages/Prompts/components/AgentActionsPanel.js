/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Typography
} from "@material-ui/core";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import UnfoldMoreIcon from "@material-ui/icons/UnfoldMore";
import UnfoldLessIcon from "@material-ui/icons/UnfoldLess";
import { makeStyles } from "@material-ui/core/styles";
import {
  EventNote,
  PersonAdd,
  Business,
  Assignment,
  SwapHoriz,
  Note,
  TrendingUp,
  Repeat,
  LocalOffer
} from "@material-ui/icons";
import {
  TRIGGER_OPTIONS,
  CONTEXT_OPTIONS,
  STANDARD_ACTION_NAMES,
  DEFAULT_TRIGGERS_BY_ACTION,
  DEFAULT_CONTEXTS_BY_ACTION,
  DEST_FIELD_MODE_BY_ACTION
} from "../constants/agentActionTriggers";

const ACTION_META = {
  Agendamento: { desc: "Cria compromissos e lembretes", icon: EventNote },
  "Criar Lead": { desc: "Gera leads na área de Vendas", icon: PersonAdd },
  "Criar Empresa": { desc: "Registra empresas no CRM", icon: Business },
  "Consultar Pedidos": { desc: "Busca pedidos no sistema", icon: Assignment },
  "Transferir Chamado": { desc: "Encaminha ao responsável e/ou fila", icon: SwapHoriz },
  "Resumo p/ handoff": { desc: "Contexto curto ao transferir", icon: Note },
  "Qualificar interesse": { desc: "Perguntas de fit antes de valor", icon: TrendingUp },
  "Follow-up suave": { desc: "Relembrar próximo passo", icon: Repeat },
  "Oferta contextual": { desc: "Sugerir pacote ou add-on", icon: LocalOffer }
};

function defaultRow(actionName) {
  return {
    triggers: [...(DEFAULT_TRIGGERS_BY_ACTION[actionName] || ["qualify_signal"])],
    contexts: [...(DEFAULT_CONTEXTS_BY_ACTION[actionName] || ["ctx_neutral"])],
    queueId: "",
    queueIntegrationId: "",
    userId: ""
  };
}

function getRow(actionName, perAction) {
  return { ...defaultRow(actionName), ...(perAction?.[actionName] || {}) };
}

function ensurePerAction(perAction, actionName, enabled) {
  if (!enabled) return perAction;
  return {
    ...perAction,
    [actionName]: getRow(actionName, perAction)
  };
}

function DestinationFields({
  classes,
  value,
  onPatch,
  queues,
  queueIntegrations,
  actionsUsers,
  queueRequired,
  transferQueueOrUser,
  idPrefix,
  mode = "full"
}) {
  const v = value || {};
  const pid = idPrefix || "dest";

  if (mode === "responsibleOnly") {
    return (
      <Grid container spacing={1}>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth variant="outlined" className={classes.inputDense}>
            <InputLabel shrink id={`${pid}-u`}>
              Responsável (opcional)
            </InputLabel>
            <Select
              labelId={`${pid}-u`}
              label="Responsável (opcional)"
              displayEmpty
              value={v.userId === "" || v.userId == null ? "" : v.userId}
              onChange={(e) =>
                onPatch({ userId: e.target.value === "" ? "" : e.target.value })
              }
              className={classes.selectWhite}
            >
              <MenuItem value="">
                <em>Nenhum</em>
              </MenuItem>
              {(actionsUsers || []).map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    );
  }

  const qLabel =
    transferQueueOrUser
      ? "Fila de destino"
      : queueRequired
        ? "Fila de atendimento *"
        : "Fila (opcional)";
  const uLabel = transferQueueOrUser ? "Usuário de destino" : "Usuário (opcional)";

  return (
    <Grid container spacing={1}>
      {transferQueueOrUser && (
        <Grid item xs={12}>
          <Typography variant="caption" style={{ color: "#475569", display: "block", marginBottom: 4 }}>
            Obrigatório definir <b>fila</b> ou <b>usuário</b> de destino (pelo menos um). Integração/chatbot é
            opcional. Se só o usuário for informado, o sistema usa a fila do ticket ou a primeira fila vinculada a
            esse usuário.
          </Typography>
        </Grid>
      )}
      <Grid item xs={12} md={4}>
        <FormControl
          fullWidth
          required={!!queueRequired && !transferQueueOrUser}
          variant="outlined"
          className={classes.inputDense}
        >
          <InputLabel shrink id={`${pid}-q`}>
            {qLabel}
          </InputLabel>
          <Select
            labelId={`${pid}-q`}
            label={qLabel}
            displayEmpty
            value={v.queueId === "" || v.queueId == null ? "" : v.queueId}
            onChange={(e) =>
              onPatch({ queueId: e.target.value === "" ? "" : e.target.value })
            }
            className={classes.selectWhite}
          >
            <MenuItem value="">
              <em>{queueRequired && !transferQueueOrUser ? "Selecione a fila" : "Nenhuma"}</em>
            </MenuItem>
            {(queues || []).map((q) => (
              <MenuItem key={q.id} value={q.id}>
                {q.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={4}>
        <FormControl fullWidth variant="outlined" className={classes.inputDense}>
          <InputLabel shrink id={`${pid}-i`}>
            Chatbot / integração (opcional)
          </InputLabel>
          <Select
            labelId={`${pid}-i`}
            label="Chatbot / integração (opcional)"
            displayEmpty
            value={
              v.queueIntegrationId === "" || v.queueIntegrationId == null
                ? ""
                : v.queueIntegrationId
            }
            onChange={(e) =>
              onPatch({
                queueIntegrationId: e.target.value === "" ? "" : e.target.value
              })
            }
            className={classes.selectWhite}
          >
            <MenuItem value="">
              <em>Nenhuma</em>
            </MenuItem>
            {(queueIntegrations || []).map((integ) => (
              <MenuItem key={integ.id} value={integ.id}>
                {integ.name}
                {integ.type ? ` — ${integ.type}` : ""}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={4}>
        <FormControl fullWidth variant="outlined" className={classes.inputDense}>
          <InputLabel shrink id={`${pid}-u`}>
            {uLabel}
          </InputLabel>
          <Select
            labelId={`${pid}-u`}
            label={uLabel}
            displayEmpty
            value={v.userId === "" || v.userId == null ? "" : v.userId}
            onChange={(e) =>
              onPatch({ userId: e.target.value === "" ? "" : e.target.value })
            }
            className={classes.selectWhite}
          >
            <MenuItem value="">
              <em>Nenhum</em>
            </MenuItem>
            {(actionsUsers || []).map((u) => (
              <MenuItem key={u.id} value={u.id}>
                {u.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
    </Grid>
  );
}

const usePanelStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  return {
  intro: {
    padding: theme.spacing(1.5, 2),
    borderRadius: 12,
    background: isDark
      ? "linear-gradient(135deg, rgba(37,99,235,0.18) 0%, rgba(30,30,30,0.95) 100%)"
      : "linear-gradient(135deg, #f0f7ff 0%, #f8fafc 100%)",
    border: isDark ? "1px solid rgba(59,130,246,0.35)" : "1px solid #dbeafe",
    marginBottom: theme.spacing(2)
  },
  introTitle: {
    fontWeight: 600,
    fontSize: 14,
    color: isDark ? theme.palette.text.primary : "#0f172a",
    marginBottom: 4
  },
  introBody: {
    fontSize: 12,
    color: isDark ? theme.palette.text.secondary : "#64748b",
    lineHeight: 1.5
  },
  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1.5)
  },
  toolbarMeta: {
    fontSize: 12,
    color: isDark ? theme.palette.text.secondary : "#64748b",
    marginRight: "auto"
  },
  toolbarBtn: {
    textTransform: "none",
    fontSize: 12,
    borderRadius: 8
  },
  accordion: {
    border: isDark
      ? "1px solid rgba(255,255,255,0.12)"
      : "1px solid #e2e8f0",
    borderRadius: "12px !important",
    marginBottom: theme.spacing(1),
    boxShadow: isDark
      ? "0 1px 3px rgba(0, 0, 0, 0.4)"
      : "0 1px 3px rgba(15, 23, 42, 0.06)",
    overflow: "hidden",
    backgroundColor: isDark ? theme.palette.inputBackground : undefined,
    "&:before": { display: "none" }
  },
  accordionInactive: {
    background: isDark ? "rgba(255,255,255,0.04)" : "#f8fafc",
    borderColor: isDark ? "rgba(255,255,255,0.08)" : "#eef2f6"
  },
  summary: {
    minHeight: 64,
    padding: theme.spacing(0.5, 1, 0.5, 1.5),
    "&.Mui-expanded": { minHeight: 64 },
    "&:hover": {
      backgroundColor: "rgba(37, 99, 235, 0.03)"
    }
  },
  summaryContent: {
    alignItems: "center",
    margin: "8px 0"
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(145deg, rgba(37,99,235,0.12) 0%, rgba(37,99,235,0.06) 100%)",
    color: isDark ? "#93c5fd" : "#1d4ed8",
    flexShrink: 0
  },
  actionTitle: {
    fontWeight: 600,
    fontSize: 14,
    color: isDark ? theme.palette.text.primary : "#0f172a",
    letterSpacing: "-0.01em"
  },
  actionDesc: {
    fontSize: 12,
    color: isDark ? theme.palette.text.secondary : "#64748b",
    lineHeight: 1.35,
    marginTop: 2
  },
  switchWrap: {
    display: "flex",
    alignItems: "center",
    marginLeft: theme.spacing(1)
  },
  details: {
    display: "block",
    padding: theme.spacing(0, 2, 2, 2),
    borderTop: isDark
      ? "1px solid rgba(255,255,255,0.1)"
      : "1px solid #f1f5f9",
    background: isDark ? theme.palette.background.default : "#fafbfc"
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: isDark ? theme.palette.text.secondary : "#64748b",
    marginBottom: theme.spacing(1),
    marginTop: theme.spacing(1.5),
    "&:first-child": { marginTop: 0 }
  },
  destSection: {
    marginTop: theme.spacing(2),
    paddingTop: theme.spacing(2),
    borderTop: isDark
      ? "1px dashed rgba(255,255,255,0.15)"
      : "1px dashed #e2e8f0"
  },
  destHeading: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: isDark ? theme.palette.text.secondary : "#64748b",
    marginBottom: theme.spacing(1.5)
  },
  chipWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    height: 28,
    fontSize: 11,
    borderRadius: 8,
    maxWidth: "100%",
    "& .MuiChip-label": {
      whiteSpace: "normal",
      lineHeight: 1.25,
      paddingTop: 4,
      paddingBottom: 4
    }
  },
  chipOn: {
    backgroundColor: "#2563eb !important",
    color: "#fff !important",
    border: "none"
  },
  chipOff: {
    borderColor: isDark ? "rgba(255,255,255,0.2)" : "#e2e8f0",
    color: isDark ? theme.palette.text.secondary : "#475569",
    background: isDark ? theme.palette.inputBackground : "#fff"
  },
  transferPaper: {
    padding: theme.spacing(2),
    borderRadius: 12,
    border: isDark
      ? "1px solid rgba(255,255,255,0.12)"
      : "1px solid #e2e8f0",
    borderLeft: "4px solid #2563eb",
    background: isDark ? theme.palette.inputBackground : "#fff",
    boxShadow: isDark
      ? "0 1px 3px rgba(0, 0, 0, 0.35)"
      : "0 1px 3px rgba(15, 23, 42, 0.06)",
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(2)
  },
  footer: {
    marginTop: theme.spacing(2),
    paddingTop: theme.spacing(2),
    borderTop: isDark
      ? "1px solid rgba(255,255,255,0.12)"
      : "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    flexWrap: "wrap",
    gap: theme.spacing(1)
  },
  saveBtn: {
    textTransform: "none",
    fontWeight: 600,
    borderRadius: 10,
    padding: "8px 22px",
    boxShadow: "0 1px 2px rgba(37, 99, 235, 0.25)"
  }
  };
});

export default function AgentActionsPanel({
  classes,
  actionsState,
  setActionsState,
  queues,
  queueIntegrations,
  actionsUsers,
  onSaveActions,
  canSave = true,
  showStepSaveButton = true
}) {
  const s = usePanelStyles();
  const perAction = actionsState.perAction || {};

  const [expanded, setExpanded] = useState(() => {
    const init = {};
    STANDARD_ACTION_NAMES.forEach((n) => {
      init[n] = false;
    });
    return init;
  });

  const enabledCount = (actionsState.enabled || []).length;

  const expandAll = () => {
    const next = {};
    STANDARD_ACTION_NAMES.forEach((n) => {
      next[n] = true;
    });
    setExpanded(next);
  };

  const collapseAll = () => {
    const next = {};
    STANDARD_ACTION_NAMES.forEach((n) => {
      next[n] = false;
    });
    setExpanded(next);
  };

  const handleAccordion = (name) => (e, isExp) => {
    setExpanded((prev) => ({ ...prev, [name]: isExp }));
  };

  const patchTransfer = (patch) => {
    setActionsState((prev) => ({
      ...prev,
      transferChamado: {
        queueId: "",
        userId: "",
        queueIntegrationId: "",
        ...(prev.transferChamado || {}),
        ...patch
      }
    }));
  };

  const patchPerActionDest = (actionName, patch) => {
    setActionsState((prev) => {
      const po = { ...(prev.perAction || {}) };
      const row = getRow(actionName, po);
      po[actionName] = { ...row, ...patch };
      return { ...prev, perAction: po };
    });
  };

  const toggleTrigger = (actionName, id) => {
    setActionsState((prev) => {
      const po = { ...(prev.perAction || {}) };
      const row = getRow(actionName, po);
      const set = new Set(row.triggers || []);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      po[actionName] = { ...row, triggers: Array.from(set) };
      return { ...prev, perAction: po };
    });
  };

  const toggleContext = (actionName, id) => {
    setActionsState((prev) => {
      const po = { ...(prev.perAction || {}) };
      const row = getRow(actionName, po);
      const set = new Set(row.contexts || []);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      po[actionName] = { ...row, contexts: Array.from(set) };
      return { ...prev, perAction: po };
    });
  };

  return (
    <Grid container spacing={0} className={classes.formRow} alignItems="flex-start">
      <Grid item xs={12}>
        <Box className={s.intro}>
          <Typography className={s.introTitle}>Ações</Typography>
          <Typography className={s.introBody}>
            Ative a ação, ajuste gatilhos e contexto. Em <b>Transferir chamado</b>, informe fila ou usuário.
          </Typography>
        </Box>

        <Box className={s.toolbar}>
          <Typography className={s.toolbarMeta}>
            {enabledCount} {enabledCount === 1 ? "ação ativa" : "ações ativas"}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            className={s.toolbarBtn}
            startIcon={<UnfoldMoreIcon style={{ fontSize: 18 }} />}
            onClick={expandAll}
          >
            Expandir todos
          </Button>
          <Button
            size="small"
            variant="outlined"
            className={s.toolbarBtn}
            startIcon={<UnfoldLessIcon style={{ fontSize: 18 }} />}
            onClick={collapseAll}
          >
            Recolher todos
          </Button>
        </Box>
      </Grid>

      {STANDARD_ACTION_NAMES.map((name) => {
        const on = actionsState.enabled?.includes(name);
        const meta = ACTION_META[name] || { desc: "", icon: EventNote };
        const Icon = meta.icon;
        const row = getRow(name, perAction);
        const triggers = row.triggers || [];
        const contexts = row.contexts || [];

        return (
          <Grid key={name} item xs={12}>
            <Accordion
              className={`${s.accordion} ${!on ? s.accordionInactive : ""}`}
              expanded={!!expanded[name]}
              onChange={handleAccordion(name)}
              elevation={0}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon style={{ color: "#64748b" }} />}
                className={s.summary}
                classes={{ content: s.summaryContent }}
              >
                <Box display="flex" alignItems="center" style={{ gap: 12, width: "100%", minWidth: 0 }}>
                  <Box className={s.iconWrap}>
                    <Icon style={{ fontSize: 22 }} />
                  </Box>
                  <Box flex={1} minWidth={0}>
                    <Typography className={s.actionTitle}>{name}</Typography>
                    <Typography className={s.actionDesc}>{meta.desc}</Typography>
                  </Box>
                  <Box
                    className={s.switchWrap}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                  >
                    <Switch
                      checked={!!on}
                      color="primary"
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setActionsState((prev) => {
                          const set = new Set(prev.enabled || []);
                          if (checked) {
                            set.add(name);
                          } else {
                            set.delete(name);
                          }
                          let nextPer = { ...(prev.perAction || {}) };
                          if (checked) {
                            nextPer = ensurePerAction(nextPer, name, true);
                          }
                          return {
                            ...prev,
                            enabled: Array.from(set),
                            perAction: nextPer
                          };
                        });
                        if (checked) {
                          setExpanded((prev) => ({ ...prev, [name]: true }));
                        } else {
                          setExpanded((prev) => ({ ...prev, [name]: false }));
                        }
                      }}
                    />
                  </Box>
                </Box>
              </AccordionSummary>

              <AccordionDetails className={s.details}>
                {on ? (
                  <>
                    <Typography className={s.sectionLabel}>Gatilhos</Typography>
                    <Box className={s.chipWrap}>
                      {TRIGGER_OPTIONS.map((t) => {
                        const active = triggers.includes(t.id);
                        return (
                          <Chip
                            key={t.id}
                            size="small"
                            label={t.label}
                            onClick={() => toggleTrigger(name, t.id)}
                            className={`${s.chip} ${active ? s.chipOn : s.chipOff}`}
                            variant={active ? "default" : "outlined"}
                          />
                        );
                      })}
                    </Box>
                    <Typography className={s.sectionLabel}>Contexto</Typography>
                    <Box className={s.chipWrap}>
                      {CONTEXT_OPTIONS.map((c) => {
                        const active = contexts.includes(c.id);
                        return (
                          <Chip
                            key={c.id}
                            size="small"
                            label={c.label}
                            onClick={() => toggleContext(name, c.id)}
                            className={`${s.chip} ${active ? s.chipOn : s.chipOff}`}
                            variant={active ? "default" : "outlined"}
                          />
                        );
                      })}
                    </Box>

                    {DEST_FIELD_MODE_BY_ACTION[name] === "transferBlock" && (
                      <Box className={s.destSection}>
                        <Typography className={s.destHeading}>Destino da transferência</Typography>
                        <Box className={s.transferPaper} style={{ marginTop: 0, marginBottom: 0 }}>
                          <DestinationFields
                            classes={classes}
                            idPrefix="transfer"
                            value={actionsState.transferChamado || {}}
                            onPatch={patchTransfer}
                            queues={queues}
                            queueIntegrations={queueIntegrations}
                            actionsUsers={actionsUsers}
                            transferQueueOrUser
                          />
                        </Box>
                      </Box>
                    )}

                    {DEST_FIELD_MODE_BY_ACTION[name] === "responsibleOnly" && (
                      <Box className={s.destSection}>
                        <Typography className={s.destHeading}>
                          Responsável no sistema (opcional)
                        </Typography>
                        <DestinationFields
                          classes={classes}
                          mode="responsibleOnly"
                          idPrefix={`act-${name.replace(/\s+/g, "-")}`}
                          value={{
                            queueId: row.queueId,
                            queueIntegrationId: row.queueIntegrationId,
                            userId: row.userId
                          }}
                          onPatch={(patch) => patchPerActionDest(name, patch)}
                          queues={queues}
                          queueIntegrations={queueIntegrations}
                          actionsUsers={actionsUsers}
                          queueRequired={false}
                        />
                      </Box>
                    )}
                  </>
                ) : (
                  <Typography variant="caption" style={{ color: "#94a3b8" }}>
                    Ative a ação acima para configurar gatilhos, contexto e vínculos opcionais.
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>
          </Grid>
        );
      })}

      {showStepSaveButton ? (
        <Grid item xs={12}>
          <Box className={s.footer}>
            <Button
              color="primary"
              variant="contained"
              size="medium"
              disabled={!canSave}
              onClick={() => onSaveActions()}
              className={s.saveBtn}
            >
              Salvar ações
            </Button>
          </Box>
        </Grid>
      ) : null}
    </Grid>
  );
}
