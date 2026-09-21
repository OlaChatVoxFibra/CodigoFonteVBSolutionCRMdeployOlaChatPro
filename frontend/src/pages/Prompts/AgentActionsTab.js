/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
  makeStyles
} from "@material-ui/core";
import {
  Calendar,
  ArrowRightLeft,
  UserPlus,
  Link2,
  CalendarSearch,
  Package,
  DollarSign,
  Settings as SettingsIcon,
  Zap,
  Sparkles,
  X
} from "lucide-react";
import clsx from "clsx";
import { toast } from "react-toastify";
import api from "../../services/api";
import leadPipelinesService from "../../services/leadPipelinesService";
import {
  HELVETICA_STACK,
  iconStyleForAction,
  speechConfigForAction,
  triggerGroupsForAction,
  mergeSuggestionsWithGroups
} from "./actionUiConfig";

const ICON_BY_PRESET = {
  Calendar,
  ArrowRightLeft,
  UserPlus,
  Link2,
  CalendarSearch,
  Package,
  DollarSign
};

const inputLabelProps = {
  shrink: true,
  style: {
    fontFamily: HELVETICA_STACK,
    fontWeight: 400,
    fontSize: 12.5,
    letterSpacing: "-0.01em"
  }
};

const inputPropsStyle = {
  style: {
    fontFamily: HELVETICA_STACK,
    fontWeight: 300,
    fontSize: 14,
    letterSpacing: "-0.01em"
  }
};

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  const brand = theme.palette.primary.main;
  return {
    root: {
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing(1.5),
      fontFamily: HELVETICA_STACK
    },
    heroRing: {
      borderRadius: 20,
      padding: 1,
      marginBottom: theme.spacing(1),
      background: isDark
        ? "linear-gradient(145deg, rgba(129,140,248,0.45), rgba(45,212,191,0.25))"
        : "linear-gradient(145deg, rgba(99,102,241,0.28), rgba(14,165,233,0.18))"
    },
    heroInner: {
      borderRadius: 19,
      background: isDark
        ? "linear-gradient(165deg, rgba(20,20,24,0.97) 0%, rgba(20,20,24,0.94) 100%)"
        : "linear-gradient(165deg, #ffffff 0%, #f8f9fb 100%)",
      padding: theme.spacing(2.25, 2.5),
      display: "flex",
      alignItems: "center",
      gap: theme.spacing(2),
      border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(15,23,42,0.06)",
      backdropFilter: "saturate(1.1) blur(10px)"
    },
    heroIconWrap: {
      width: 44,
      height: 44,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      color: brand
    },
    heroIconRing: {
      display: "flex",
      alignItems: "center",
      flexShrink: 0,
      color: brand
    },
    heroIcon: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "transparent",
      color: "inherit",
      width: "auto",
      height: "auto",
      borderRadius: 0,
      boxShadow: "none"
    },
    heroTitle: {
      fontSize: 18,
      fontWeight: 300,
      letterSpacing: "-0.03em",
      fontFamily: HELVETICA_STACK
    },
    heroSubtitle: {
      fontSize: 12.5,
      color: theme.palette.text.secondary,
      marginTop: 2
    },
    heroNew: {
      marginLeft: "auto",
      textTransform: "none",
      borderRadius: 14,
      padding: "8px 16px",
      fontSize: 13,
      fontWeight: 600,
      background:
        "linear-gradient(135deg, rgba(99,102,241,0.95), rgba(14,165,233,0.95))",
      color: "#fff",
      boxShadow: "0 6px 18px rgba(99,102,241,0.25)",
      "&:hover": {
        background:
          "linear-gradient(135deg, rgba(99,102,241,1), rgba(14,165,233,1))"
      }
    },
    cardRing: {
      borderRadius: 17,
      padding: 1,
      background: isDark
        ? "linear-gradient(145deg, rgba(129,140,248,0.28), rgba(45,212,191,0.16))"
        : "linear-gradient(145deg, rgba(99,102,241,0.18), rgba(14,165,233,0.1))",
      transition: "transform 160ms ease, box-shadow 160ms ease",
      "&:hover": {
        transform: "translateY(-1px)",
        boxShadow: isDark
          ? "0 12px 32px rgba(0,0,0,0.35)"
          : "0 12px 32px rgba(15,23,42,0.08)"
      }
    },
    cardInner: {
      borderRadius: 16,
      background: isDark ? "rgba(22,22,26,0.98)" : "#ffffff",
      padding: theme.spacing(1.75, 2),
      border: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(15,23,42,0.06)"
    },
    cardRow: {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing(1.5)
    },
    cardIconWrap: {
      width: 36,
      height: 36,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    },
    cardIconRing: {
      display: "flex",
      alignItems: "center",
      flexShrink: 0,
      background: "transparent",
      padding: 0
    },
    cardIcon: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "transparent !important",
      color: "inherit",
      width: "auto",
      height: "auto",
      borderRadius: 0,
      boxShadow: "none"
    },
    cardTitle: {
      fontSize: 14.5,
      fontWeight: 400,
      letterSpacing: "-0.02em",
      fontFamily: HELVETICA_STACK
    },
    cardSubtitle: {
      fontSize: 12,
      color: theme.palette.text.secondary,
      marginTop: 2
    },
    cardActions: {
      marginLeft: "auto",
      display: "flex",
      alignItems: "center",
      gap: theme.spacing(1)
    },
    triggerBlock: {
      marginTop: theme.spacing(1.25),
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing(0.75)
    },
    triggerLabel: {
      fontSize: 10.5,
      fontWeight: 400,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: theme.palette.text.secondary,
      fontFamily: HELVETICA_STACK
    },
    groupLabel: {
      fontSize: 11,
      fontWeight: 400,
      letterSpacing: "-0.01em",
      color: theme.palette.text.secondary,
      marginTop: theme.spacing(1),
      marginBottom: theme.spacing(0.5),
      fontFamily: HELVETICA_STACK
    },
    chipsRow: {
      display: "flex",
      gap: theme.spacing(0.5),
      flexWrap: "wrap"
    },
    triggerChip: {
      fontSize: 11.5,
      fontWeight: 400,
      fontFamily: HELVETICA_STACK,
      borderRadius: 10,
      height: 24,
      background: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)",
      border: `1px solid ${border}`,
      color: theme.palette.text.primary
    },
    scriptChip: {
      fontSize: 11,
      fontWeight: 500,
      borderRadius: 10,
      height: 22,
      background: isDark
        ? "rgba(148,163,184,0.12)"
        : "rgba(100,116,139,0.1)",
      color: isDark ? "#cbd5e1" : "#475569"
    },
    iosSwitch: {
      "& .MuiSwitch-thumb": { boxShadow: "0 1px 2px rgba(0,0,0,0.2)" },
      "& .MuiSwitch-track": { borderRadius: 14 }
    },
    configBtn: {
      textTransform: "none",
      borderRadius: 12,
      padding: "6px 16px",
      fontSize: 12.5,
      fontWeight: 400,
      fontFamily: HELVETICA_STACK,
      borderColor: border
    },
    dialogPaper: {
      borderRadius: 20,
      background: isDark ? "rgba(22,22,26,0.98)" : "#ffffff",
      overflow: "hidden",
      fontFamily: HELVETICA_STACK
    },
    dialogTitle: {
      padding: theme.spacing(2.5, 3, 1.5, 3),
      textAlign: "center",
      "& h2": {
        fontSize: 17,
        fontWeight: 300,
        letterSpacing: "-0.03em",
        fontFamily: HELVETICA_STACK,
        paddingRight: 32
      }
    },
    dialogSubtitle: {
      fontSize: 12.5,
      fontWeight: 300,
      color: theme.palette.text.secondary,
      textAlign: "center",
      padding: theme.spacing(0, 3, 1),
      letterSpacing: "-0.01em"
    },
    dialogClose: {
      position: "absolute",
      right: 8,
      top: 8
    },
    tabs: {
      borderBottom: `1px solid ${border}`,
      minHeight: 42,
      "& .MuiTab-root": {
        textTransform: "none",
        fontSize: 13,
        fontWeight: 400,
        fontFamily: HELVETICA_STACK,
        letterSpacing: "-0.01em",
        minHeight: 42,
        padding: "10px 16px",
        opacity: 0.72,
        "&.Mui-selected": { opacity: 1, fontWeight: 400 }
      },
      "& .MuiTabs-indicator": { height: 2, borderRadius: 2 }
    },
    quickPanel: {
      marginTop: theme.spacing(1.25),
      padding: theme.spacing(1.25),
      borderRadius: 14,
      border: `1px solid ${border}`,
      background: isDark ? "rgba(255,255,255,0.025)" : "rgba(15,23,42,0.025)"
    },
    quickTitle: {
      fontSize: 11,
      fontWeight: 400,
      letterSpacing: "0.07em",
      textTransform: "uppercase",
      color: theme.palette.text.secondary,
      marginBottom: theme.spacing(0.75),
      fontFamily: HELVETICA_STACK
    },
    quickButtons: {
      display: "flex",
      flexWrap: "wrap",
      gap: theme.spacing(0.75)
    },
    quickButton: {
      border: `1px solid ${border}`,
      borderRadius: 999,
      padding: "7px 12px",
      minHeight: 0,
      textTransform: "none",
      fontSize: 12,
      fontWeight: 300,
      fontFamily: HELVETICA_STACK,
      lineHeight: 1.2,
      color: theme.palette.text.primary,
      background: isDark ? "rgba(255,255,255,0.045)" : "#fff",
      boxShadow: isDark ? "none" : "0 2px 10px rgba(15,23,42,0.04)",
      "&:hover": {
        background: isDark ? "rgba(129,140,248,0.14)" : "rgba(99,102,241,0.07)",
        borderColor: isDark ? "rgba(165,180,252,0.45)" : "rgba(99,102,241,0.28)"
      }
    },
    quickButtonActive: {
      background: isDark ? "rgba(45,212,191,0.14)" : "rgba(20,184,166,0.1)",
      color: isDark ? "#99f6e4" : "#0f766e",
      borderColor: isDark ? "rgba(45,212,191,0.35)" : "rgba(20,184,166,0.26)"
    },
    selectionHint: {
      marginTop: theme.spacing(1),
      fontSize: 12,
      color: theme.palette.text.secondary
    },
    formGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: theme.spacing(1.25),
      [theme.breakpoints.down("xs")]: {
        gridTemplateColumns: "1fr"
      }
    },
    formField: {
      "& .MuiOutlinedInput-root": {
        borderRadius: 14,
        fontFamily: HELVETICA_STACK
      },
      "& .MuiOutlinedInput-input": {
        fontWeight: 300
      },
      "& .MuiFormHelperText-root": {
        fontFamily: HELVETICA_STACK,
        fontWeight: 300
      }
    },
    dialogActions: {
      padding: theme.spacing(2, 3, 2.5, 3),
      justifyContent: "center",
      gap: theme.spacing(1.25),
      borderTop: `1px solid ${border}`
    },
    footerBtn: {
      textTransform: "none",
      borderRadius: 12,
      padding: "8px 20px",
      fontWeight: 400,
      fontFamily: HELVETICA_STACK,
      fontSize: 13,
      minWidth: 108,
      height: 38
    },
    cancelBtn: {
      textTransform: "none",
      borderRadius: 12,
      padding: "8px 20px",
      fontWeight: 400,
      fontFamily: HELVETICA_STACK,
      fontSize: 13,
      minWidth: 108,
      height: 38,
      color: theme.palette.text.secondary,
      border: `1px solid ${border}`
    },
    saveBtn: {
      textTransform: "none",
      borderRadius: 12,
      padding: "8px 20px",
      fontWeight: 400,
      fontFamily: HELVETICA_STACK,
      fontSize: 13,
      minWidth: 108,
      height: 38,
      color: theme.palette.getContrastText(brand),
      backgroundColor: brand,
      boxShadow: "none",
      "&:hover": {
        backgroundColor: brand,
        filter: "brightness(0.94)"
      }
    },
    speechHint: {
      fontSize: 12.5,
      fontWeight: 300,
      color: theme.palette.text.secondary,
      lineHeight: 1.55,
      marginBottom: theme.spacing(1.5),
      fontFamily: HELVETICA_STACK
    },
    fullField: {
      gridColumn: "1 / -1"
    },
    emptyState: {
      padding: theme.spacing(3),
      textAlign: "center",
      borderRadius: 16,
      border: `1px dashed ${border}`,
      background: isDark ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.02)"
    }
  };
});

function parsePatterns(raw) {
  if (Array.isArray(raw)) return raw.filter((s) => typeof s === "string" && s.trim());
  if (typeof raw === "string") {
    return raw
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function patternsOrPreset(raw, preset, key) {
  const parsed = parsePatterns(raw);
  if (parsed.length || Array.isArray(raw)) return parsed;
  return parsePatterns(preset?.[key] || []);
}

function availablePatternsOrPreset(raw, selected, preset, key) {
  return [...parsePatterns(preset?.[key] || []), ...parsePatterns(raw), ...parsePatterns(selected)].filter(
    (item, index, arr) => arr.findIndex((x) => x.toLowerCase() === item.toLowerCase()) === index
  );
}

function uniquePatterns(patterns) {
  return parsePatterns(patterns).filter(
    (item, index, arr) => arr.findIndex((x) => x.toLowerCase() === item.toLowerCase()) === index
  );
}

function togglePattern(current, pattern) {
  const value = String(pattern || "").trim();
  if (!value) return current;
  const exists = current.some((item) => item.toLowerCase() === value.toLowerCase());
  if (exists) return current.filter((item) => item.toLowerCase() !== value.toLowerCase());
  return uniquePatterns([...current, value]);
}

function selectAllPatterns(patterns) {
  return uniquePatterns(patterns);
}

function selectedPatternCount(selected, suggestions) {
  const suggestionSet = suggestions.map((s) => s.toLowerCase());
  return selected.filter((item) => suggestionSet.includes(item.toLowerCase())).length;
}

const PRIMARY_PRESET_SLUGS = [
  "agendamento",
  "transferirchamado",
  "enviarlink",
  "criarlead",
  "criarcontato",
  "criaratividade"
];

function actionIsTransfer(action) {
  const type = String(action?.type || "").toLowerCase();
  const slug = String(action?.slug || "").toLowerCase();
  return type === "transferir" || slug.includes("transferir");
}

function actionIsLead(action) {
  const type = String(action?.type || "").toLowerCase();
  const slug = String(action?.slug || "").toLowerCase();
  return type === "criar_lead" || slug.includes("lead");
}

function actionIsContact(action) {
  const type = String(action?.type || "").toLowerCase();
  const slug = String(action?.slug || "").toLowerCase();
  return type === "criar_contato" || slug.includes("contato");
}

function actionIsActivity(action) {
  const type = String(action?.type || "").toLowerCase();
  const slug = String(action?.slug || "").toLowerCase();
  return type === "criar_atividade" || slug.includes("atividade") || slug.includes("tarefa");
}

function actionIsSchedule(action) {
  const type = String(action?.type || "").toLowerCase();
  const slug = String(action?.slug || "").toLowerCase();
  return type === "agendamento" || slug.includes("agend");
}

function actionIsLink(action) {
  const type = String(action?.type || "").toLowerCase();
  const slug = String(action?.slug || "").toLowerCase();
  return type === "enviar_link" || slug.includes("link");
}

function actionSlotSchema(action) {
  return Array.isArray(action?.intentSlotSchema) ? action.intentSlotSchema.filter((slot) => slot?.name) : [];
}

function cleanActionVariables(action, form) {
  const base = action?.variables && typeof action.variables === "object" ? action.variables : {};
  const vars = { ...base };
  const setNumOrDelete = (key) => {
    if (form[key]) vars[key] = Number(form[key]);
    else delete vars[key];
  };
  setNumOrDelete("queueId");
  setNumOrDelete("userId");
  setNumOrDelete("whatsappId");
  setNumOrDelete("responsibleId");
  setNumOrDelete("pipelineId");
  setNumOrDelete("inventoryId");
  if (form.meetingDurationMinutes) {
    const mins = Number(form.meetingDurationMinutes);
    if (Number.isFinite(mins) && mins > 0) {
      vars.slotMinutes = mins;
      vars.meetingDurationMinutes = mins;
    }
  } else {
    delete vars.slotMinutes;
    delete vars.meetingDurationMinutes;
  }

  [
    "url",
    "urlName",
    "linkText",
    "customUrlTriggers",
    "openingPrompt",
    "agentSpeechPrompt",
    "contactCategory",
    "autoTags",
    "stageId",
    "confirmAuto",
    "activityType",
    "description",
    "date",
    "meetingDurationMinutes"
  ].forEach((key) => {
    const value = String(form[key] || "").trim();
    if (value) vars[key] = value;
    else delete vars[key];
  });
  if (form.responseMessage && String(form.responseMessage).trim()) {
    vars.responseMessage = String(form.responseMessage).trim();
  } else {
    delete vars.responseMessage;
  }
  actionSlotSchema(action).forEach((slot) => {
    const key = String(slot.name || "").trim();
    if (!key) return;
    const value = String(form[key] || "").trim();
    if (value) {
      vars[key] = slot.type === "number" ? Number(value) : value;
    } else {
      delete vars[key];
    }
  });
  return vars;
}

function GroupedPatternSelector({
  title,
  description,
  suggestions,
  groups,
  selected,
  onChange,
  classes
}) {
  const merged = mergeSuggestionsWithGroups(suggestions, groups);
  const selectedCount = selectedPatternCount(selected, merged);
  const renderChips = (items) =>
    (items || []).map((pattern) => {
      const active = selected.some((p) => p.toLowerCase() === pattern.toLowerCase());
      return (
        <Button
          key={`${title}-${pattern}`}
          size="small"
          className={clsx(classes.quickButton, active && classes.quickButtonActive)}
          onClick={() => onChange(togglePattern(selected, pattern))}
        >
          {pattern}
        </Button>
      );
    });

  return (
    <Box>
      <Typography className={classes.speechHint} style={{ marginBottom: 8 }}>
        {description}
      </Typography>
      <Box className={classes.quickPanel}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.75}>
          <Typography className={classes.quickTitle} style={{ marginBottom: 0 }}>
            {title}
          </Typography>
          <Typography variant="caption" color="textSecondary" style={{ fontWeight: 300 }}>
            {selectedCount}/{merged.length}
          </Typography>
        </Box>
        <div className={classes.quickButtons}>
          <Button
            size="small"
            className={classes.quickButton}
            onClick={() => onChange(selectAllPatterns(merged))}
          >
            Todas
          </Button>
          <Button
            size="small"
            className={classes.quickButton}
            onClick={() => onChange([])}
          >
            Limpar
          </Button>
        </div>
        {groups?.length ? (
          groups.map((group) => (
            <Box key={`${title}-${group.label}`} mt={1}>
              <Typography className={classes.groupLabel}>{group.label}</Typography>
              <div className={classes.quickButtons}>{renderChips(group.items)}</div>
            </Box>
          ))
        ) : (
          <div className={classes.quickButtons} style={{ marginTop: 8 }}>
            {renderChips(merged)}
          </div>
        )}
        <Typography className={classes.selectionHint}>
          Toque para ativar. Gatilhos selecionados são salvos e usados na conversa (texto + OpenAI).
        </Typography>
      </Box>
    </Box>
  );
}

function ActionConfigDialog({
  open,
  onClose,
  action,
  onSave,
  queues,
  users,
  whatsapps,
  pipelines
}) {
  const classes = useStyles();
  const [activeTab, setActiveTab] = useState(0);
  const [agentPatterns, setAgentPatterns] = useState([]);
  const [userPatterns, setUserPatterns] = useState([]);
  const [customAgentExtra, setCustomAgentExtra] = useState("");
  const [paramForm, setParamForm] = useState({
    queueId: "",
    userId: "",
    whatsappId: "",
    responseMessage: "",
    url: "",
    urlName: "",
    linkText: "",
    customUrlTriggers: "",
    pipelineId: "",
    stageId: "",
    openingPrompt: "",
    agentSpeechPrompt: "",
    contactCategory: "",
    autoTags: "",
    activityType: "task",
    meetingDurationMinutes: "60"
  });

  useEffect(() => {
    if (!action) return;
    const vars = action.variables && typeof action.variables === "object" ? action.variables : {};
    const slotValues = actionSlotSchema(action).reduce((acc, slot) => {
      acc[slot.name] = vars[slot.name] != null ? String(vars[slot.name]) : "";
      return acc;
    }, {});
    setAgentPatterns(uniquePatterns(action.agentTriggerPatterns || []));
    setUserPatterns(uniquePatterns(action.userTriggerPatterns || []));
    setCustomAgentExtra("");
    setParamForm({
      queueId: vars.queueId != null ? String(vars.queueId) : "",
      userId: vars.userId != null ? String(vars.userId) : "",
      responsibleId: vars.responsibleId != null ? String(vars.responsibleId) : "",
      whatsappId: vars.whatsappId != null ? String(vars.whatsappId) : "",
      responseMessage: String(vars.responseMessage || action.responseMessage || ""),
      url: String(vars.url || ""),
      urlName: String(vars.urlName || vars.linkName || ""),
      linkText: String(vars.linkText || action.responseMessage || ""),
      customUrlTriggers: String(vars.customUrlTriggers || ""),
      pipelineId: vars.pipelineId != null ? String(vars.pipelineId) : "",
      stageId: vars.stageId != null ? String(vars.stageId) : "",
      agentSpeechPrompt: String(
        vars.agentSpeechPrompt ||
          vars.openingPrompt ||
          speechConfigForAction(action)?.placeholder ||
          ""
      ),
      openingPrompt: String(vars.openingPrompt || vars.agentSpeechPrompt || ""),
      contactCategory: String(vars.contactCategory || ""),
      autoTags: String(vars.autoTags || ""),
      activityType: String(vars.activityType || "task"),
      meetingDurationMinutes:
        vars.meetingDurationMinutes != null
          ? String(vars.meetingDurationMinutes)
          : vars.slotMinutes != null
            ? String(vars.slotMinutes)
            : "60",
      ...slotValues
    });
    setActiveTab(0);
  }, [action]);

  const selectedPipeline = useMemo(
    () => (pipelines || []).find((p) => String(p.id) === String(paramForm.pipelineId)),
    [pipelines, paramForm.pipelineId]
  );

  if (!action) return null;

  const agentSuggestions = availablePatternsOrPreset(
    action.availableAgentTriggerPatterns,
    action.agentTriggerPatterns,
    null,
    "agentTriggerPatterns"
  );
  const userSuggestions = availablePatternsOrPreset(
    action.availableUserTriggerPatterns,
    action.userTriggerPatterns,
    null,
    "userTriggerPatterns"
  );
  const slots = actionSlotSchema(action);
  const showParams =
    actionIsTransfer(action) ||
    actionIsLink(action) ||
    actionIsLead(action) ||
    actionIsContact(action) ||
    actionIsActivity(action) ||
    actionIsSchedule(action) ||
    slots.length > 0;

  const speechConfig = speechConfigForAction(action);
  const agentGroups = triggerGroupsForAction(action, "agent");
  const userGroups = triggerGroupsForAction(action, "user");
  const tabSpeech = speechConfig ? 0 : -1;
  const tabTriggers = speechConfig ? 1 : 0;
  const tabConfig = speechConfig ? 2 : showParams ? 1 : -1;

  const handleSave = async () => {
    const extraUrlTriggers = actionIsLink(action) ? parsePatterns(paramForm.customUrlTriggers) : [];
    const variables = cleanActionVariables(action, paramForm);
    const speechText = String(paramForm.agentSpeechPrompt || "").trim();
    if (speechText) {
      variables.agentSpeechPrompt = speechText;
      if (actionIsSchedule(action)) variables.openingPrompt = speechText;
    }
    const mergedAgent = uniquePatterns([...agentPatterns, ...parsePatterns(customAgentExtra)]);
    await onSave({
      agentTriggerPatterns: mergedAgent,
      userTriggerPatterns: uniquePatterns([...userPatterns, ...extraUrlTriggers]),
      variables,
      responseMessage: actionIsLink(action)
        ? String(paramForm.linkText || "").trim()
        : String(paramForm.responseMessage || "").trim()
    });
    onClose();
  };

  const updateParam = (key) => (event) => {
    const value = event?.target?.value ?? "";
    setParamForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ className: classes.dialogPaper }}
    >
      <DialogTitle className={classes.dialogTitle}>
        {action.name}
        <IconButton size="small" onClick={onClose} className={classes.dialogClose}>
          <X size={18} />
        </IconButton>
      </DialogTitle>
      <Typography className={classes.dialogSubtitle}>
        Gatilhos salvos no banco e interpretados pela OpenAI no contexto da conversa.
      </Typography>
      <Tabs
        value={activeTab}
        onChange={(_e, v) => setActiveTab(v)}
        indicatorColor="primary"
        textColor="primary"
        className={classes.tabs}
        variant="fullWidth"
      >
        {speechConfig ? <Tab label="Fala da IA" /> : null}
        <Tab label="Gatilhos" />
        {showParams ? <Tab label="Configuração" /> : null}
      </Tabs>

      <DialogContent style={{ padding: "20px 28px 8px" }}>
        {speechConfig && activeTab === tabSpeech && (
          <Box className={classes.quickPanel}>
            <Typography className={classes.quickTitle}>{speechConfig.title}</Typography>
            <Typography className={classes.speechHint}>{speechConfig.hint}</Typography>
            <TextField
              fullWidth
              multiline
              minRows={3}
              variant="outlined"
              size="small"
              className={clsx(classes.formField, classes.fullField)}
              label={speechConfig.title}
              placeholder={speechConfig.placeholder}
              value={paramForm.agentSpeechPrompt}
              onChange={updateParam("agentSpeechPrompt")}
              InputLabelProps={inputLabelProps}
              inputProps={inputPropsStyle}
            />
            {speechConfig.confirmLabel ? (
              <Box mt={2}>
                <TextField
                  fullWidth
                  multiline
                  minRows={2}
                  variant="outlined"
                  size="small"
                  className={clsx(classes.formField, classes.fullField)}
                  label={speechConfig.confirmLabel}
                  placeholder={speechConfig.confirmPlaceholder || ""}
                  value={paramForm.responseMessage}
                  onChange={updateParam("responseMessage")}
                  InputLabelProps={inputLabelProps}
                  inputProps={inputPropsStyle}
                />
              </Box>
            ) : null}
          </Box>
        )}
        {activeTab === tabTriggers && (
          <>
            <GroupedPatternSelector
            title="Quando o agente disser"
            description="Frases e intenções na fala do agente que disparam esta automação."
            suggestions={agentSuggestions}
            groups={agentGroups}
            selected={agentPatterns}
            onChange={setAgentPatterns}
            classes={classes}
          />
            <Box mt={2.5}>
              <GroupedPatternSelector
                title="Quando o cliente responder"
                description="Respostas ou intenções do cliente que confirmam a ação."
                suggestions={userSuggestions}
                groups={userGroups}
                selected={userPatterns}
                onChange={setUserPatterns}
                classes={classes}
              />
            </Box>
            <Box mt={2}>
              <Typography className={classes.speechHint} display="block" paragraph>
                Prompts extras — uma linha por ideia. A OpenAI entende o sentido, não só palavras exatas.
              </Typography>
              <TextField
                fullWidth
                multiline
                minRows={3}
                variant="outlined"
                size="small"
                className={classes.formField}
                placeholder={"Ex.: convidar a escolher data\nperguntar manhã ou tarde"}
                value={customAgentExtra}
                onChange={(e) => setCustomAgentExtra(e.target.value)}
                InputLabelProps={inputLabelProps}
                inputProps={inputPropsStyle}
              />
            </Box>
          </>
        )}
        {activeTab === tabConfig && showParams && actionIsSchedule(action) && (
          <Box mb={2}>
            <Typography className={classes.speechHint}>
              Quem atende a reunião e por quanto tempo. A IA consulta o calendário antes de confirmar o horário.
            </Typography>
            <Box className={classes.quickPanel}>
              <div className={classes.formGrid}>
                <TextField
                  select
                  label="Responsável"
                  value={paramForm.responsibleId}
                  onChange={updateParam("responsibleId")}
                  variant="outlined"
                  size="small"
                  className={classes.formField}
                  InputLabelProps={inputLabelProps}
                  inputProps={inputPropsStyle}
                >
                  <MenuItem value="">Sem responsável fixo</MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={String(user.id)}>
                      {user.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Duração da reunião"
                  value={paramForm.meetingDurationMinutes}
                  onChange={updateParam("meetingDurationMinutes")}
                  variant="outlined"
                  size="small"
                  className={classes.formField}
                  InputLabelProps={inputLabelProps}
                  inputProps={inputPropsStyle}
                >
                  <MenuItem value="30">30 minutos</MenuItem>
                  <MenuItem value="45">45 minutos</MenuItem>
                  <MenuItem value="60">1 hora</MenuItem>
                  <MenuItem value="90">1h 30min</MenuItem>
                  <MenuItem value="120">2 horas</MenuItem>
                </TextField>
              </div>
            </Box>
          </Box>
        )}
        {activeTab === tabConfig && showParams && actionIsLead(action) && (
          <Box mb={2}>
            <Typography variant="caption" color="textSecondary">
              Pipeline, etapa e responsável padrão no CRM.
            </Typography>
            <Box className={classes.quickPanel}>
              <div className={classes.formGrid}>
                <TextField
                  select
                  label="Pipeline (opcional)"
                  value={paramForm.pipelineId}
                  onChange={updateParam("pipelineId")}
                  variant="outlined"
                  size="small"
                  className={classes.formField}
                >
                  <MenuItem value="">(padrão)</MenuItem>
                  {(pipelines || []).map((p) => (
                    <MenuItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Etapa do funil (opcional)"
                  value={paramForm.stageId}
                  onChange={updateParam("stageId")}
                  variant="outlined"
                  size="small"
                  className={classes.formField}
                  disabled={!selectedPipeline}
                >
                  <MenuItem value="">(qualquer)</MenuItem>
                  {(selectedPipeline?.stages || []).map((s) => (
                    <MenuItem key={s.id || s.key || s.name} value={String(s.id || s.key || s.name)}>
                      {s.name || s.title || s.id}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Responsável (opcional)"
                  value={paramForm.responsibleId}
                  onChange={updateParam("responsibleId")}
                  variant="outlined"
                  size="small"
                  className={classes.formField}
                >
                  <MenuItem value="">Sem responsável fixo</MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={String(user.id)}>
                      {user.name}
                    </MenuItem>
                  ))}
                </TextField>
              </div>
            </Box>
          </Box>
        )}
        {activeTab === tabConfig && showParams && actionIsContact(action) && (
          <Box mb={2}>
            <Typography variant="caption" color="textSecondary">
              Categoria e etiquetas sugeridas quando o contato for registrado.
            </Typography>
            <Box className={classes.quickPanel}>
              <div className={classes.formGrid}>
                <TextField
                  label="Categoria (opcional)"
                  value={paramForm.contactCategory}
                  onChange={updateParam("contactCategory")}
                  variant="outlined"
                  size="small"
                  className={classes.formField}
                />
                <TextField
                  label="Tags automáticas (opcional, separadas por vírgula)"
                  value={paramForm.autoTags}
                  onChange={updateParam("autoTags")}
                  variant="outlined"
                  size="small"
                  className={clsx(classes.formField, classes.fullField)}
                />
                <TextField
                  select
                  label="Responsável (opcional)"
                  value={paramForm.responsibleId}
                  onChange={updateParam("responsibleId")}
                  variant="outlined"
                  size="small"
                  className={classes.formField}
                >
                  <MenuItem value="">Sem responsável fixo</MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={String(user.id)}>
                      {user.name}
                    </MenuItem>
                  ))}
                </TextField>
              </div>
            </Box>
          </Box>
        )}
        {activeTab === tabConfig && showParams && actionIsActivity(action) && (
          <Box mb={2}>
            <Typography variant="caption" color="textSecondary">
              Tipo e responsável da atividade gerada a partir da conversa.
            </Typography>
            <Box className={classes.quickPanel}>
              <div className={classes.formGrid}>
                <TextField
                  select
                  label="Tipo da atividade"
                  value={paramForm.activityType}
                  onChange={updateParam("activityType")}
                  variant="outlined"
                  size="small"
                  className={classes.formField}
                >
                  <MenuItem value="task">Tarefa</MenuItem>
                  <MenuItem value="call">Ligação</MenuItem>
                  <MenuItem value="meeting">Reunião</MenuItem>
                </TextField>
                <TextField
                  select
                  label="Responsável (opcional)"
                  value={paramForm.userId}
                  onChange={updateParam("userId")}
                  variant="outlined"
                  size="small"
                  className={classes.formField}
                >
                  <MenuItem value="">Sem responsável fixo</MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={String(user.id)}>
                      {user.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Descrição padrão (opcional)"
                  value={paramForm.description}
                  onChange={updateParam("description")}
                  variant="outlined"
                  size="small"
                  multiline
                  minRows={2}
                  className={clsx(classes.formField, classes.fullField)}
                />
                <TextField
                  label="Data sugerida (opcional)"
                  value={paramForm.date}
                  onChange={updateParam("date")}
                  variant="outlined"
                  size="small"
                  className={classes.formField}
                  placeholder="Ex.: amanhã 10h"
                />
              </div>
            </Box>
          </Box>
        )}
        {activeTab === tabConfig && showParams && actionIsTransfer(action) && (
          <Box>
            <Typography variant="caption" color="textSecondary">
              Configure como o chamado será transferido, igual ao fluxo de automação: fila obrigatória,
              usuário e conexão opcionais.
            </Typography>
            <Box className={classes.quickPanel}>
              <div className={classes.formGrid}>
                <TextField
                  select
                  label="Fila / lista de atendimento"
                  value={paramForm.queueId}
                  onChange={updateParam("queueId")}
                  variant="outlined"
                  size="small"
                  className={classes.formField}
                >
                  <MenuItem value="">Usar fila do agente ou do ticket</MenuItem>
                  {queues.map((queue) => (
                    <MenuItem key={queue.id} value={String(queue.id)}>
                      {queue.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Usuário responsável (opcional)"
                  value={paramForm.userId}
                  onChange={updateParam("userId")}
                  variant="outlined"
                  size="small"
                  className={classes.formField}
                >
                  <MenuItem value="">Sem usuário fixo</MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={String(user.id)}>
                      {user.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Conexão (opcional)"
                  value={paramForm.whatsappId}
                  onChange={updateParam("whatsappId")}
                  variant="outlined"
                  size="small"
                  className={classes.formField}
                >
                  <MenuItem value="">Manter conexão do ticket</MenuItem>
                  {whatsapps.map((whatsapp) => (
                    <MenuItem key={whatsapp.id} value={String(whatsapp.id)}>
                      {whatsapp.name || `Conexão ${whatsapp.id}`}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Mensagem enviada ao cliente após transferir"
                  value={paramForm.responseMessage}
                  onChange={updateParam("responseMessage")}
                  variant="outlined"
                  size="small"
                  multiline
                  minRows={2}
                  className={clsx(classes.formField, classes.fullField)}
                  placeholder="Você foi transferido para um atendente humano. Em instantes alguém da nossa equipe continuará o atendimento."
                  helperText="Se deixar em branco, o sistema usa essa mensagem padrão automaticamente."
                />
              </div>
            </Box>
          </Box>
        )}
        {activeTab === tabConfig && showParams && actionIsLink(action) && (
          <Box>
            <Typography variant="caption" color="textSecondary">
              Configure o link que a IA vai enviar. Use {"{{url}}"} e {"{{nome}}"} no texto, se quiser.
            </Typography>
            <Box className={classes.quickPanel}>
              <div className={classes.formGrid}>
                <TextField
                  label="Nome da URL"
                  value={paramForm.urlName}
                  onChange={updateParam("urlName")}
                  variant="outlined"
                  size="small"
                  className={classes.formField}
                  placeholder="Ex.: Catálogo, Formulário, Pagamento"
                />
                <TextField
                  label="URL"
                  value={paramForm.url}
                  onChange={updateParam("url")}
                  variant="outlined"
                  size="small"
                  className={classes.formField}
                  placeholder="https://"
                />
                <TextField
                  label="Texto que a IA envia junto com o link"
                  value={paramForm.linkText}
                  onChange={updateParam("linkText")}
                  variant="outlined"
                  size="small"
                  multiline
                  minRows={2}
                  className={clsx(classes.formField, classes.fullField)}
                  placeholder="Ex.: Segue o {{nome}}: {{url}}"
                />
                <TextField
                  label="Gatilhos personalizados para enviar essa URL"
                  value={paramForm.customUrlTriggers}
                  onChange={updateParam("customUrlTriggers")}
                  variant="outlined"
                  size="small"
                  multiline
                  minRows={3}
                  className={clsx(classes.formField, classes.fullField)}
                  placeholder={"manda catálogo\nquero formulário\nlink de pagamento"}
                />
              </div>
            </Box>
          </Box>
        )}
        {activeTab === tabConfig &&
          showParams &&
          !actionIsTransfer(action) &&
          !actionIsLink(action) &&
          !actionIsLead(action) &&
          !actionIsContact(action) &&
          !actionIsActivity(action) &&
          !actionIsSchedule(action) && (
          <Box>
            <Typography variant="caption" color="textSecondary">
              Configure os campos que a ação usa. Se algum campo obrigatório ficar vazio, a IA deve
              pedir só essa informação antes de executar.
            </Typography>
            <Box className={classes.quickPanel}>
              <div className={classes.formGrid}>
                {slots.map((slot) => (
                  <TextField
                    key={slot.name}
                    label={`${slot.label || slot.name}${slot.required ? " *" : ""}`}
                    value={paramForm[slot.name] || ""}
                    onChange={updateParam(slot.name)}
                    variant="outlined"
                    size="small"
                    type={slot.type === "number" ? "number" : "text"}
                    className={classes.formField}
                    placeholder={slot.required ? "Obrigatório" : "Opcional"}
                  />
                ))}
                <TextField
                  label="Mensagem após execução (opcional)"
                  value={paramForm.responseMessage}
                  onChange={updateParam("responseMessage")}
                  variant="outlined"
                  size="small"
                  multiline
                  minRows={2}
                  className={clsx(classes.formField, classes.fullField)}
                />
              </div>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions className={classes.dialogActions}>
        <Button onClick={onClose} className={classes.cancelBtn}>
          Cancelar
        </Button>
        <Button onClick={handleSave} variant="contained" className={classes.saveBtn} disableElevation>
          Salvar automação
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AgentActionsTab({ promptId, anthropicMultiAgentId, onRegistryUpdated }) {
  const smartActionsBase =
    anthropicMultiAgentId != null && String(anthropicMultiAgentId).trim() !== ""
      ? `/anthropic/multi-agents/${anthropicMultiAgentId}/smart-actions`
      : `/prompt/${promptId}/smart-actions`;
  const agentReady = anthropicMultiAgentId
    ? Boolean(anthropicMultiAgentId)
    : Boolean(promptId);
  const classes = useStyles();
  const [loading, setLoading] = useState(true);
  const [actions, setActions] = useState([]);
  const [presets, setPresets] = useState([]);
  const [configAction, setConfigAction] = useState(null);
  const [queues, setQueues] = useState([]);
  const [users, setUsers] = useState([]);
  const [whatsapps, setWhatsapps] = useState([]);
  const [pipelines, setPipelines] = useState([]);

  const load = useCallback(async () => {
    if (!agentReady) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [actRes, presetsRes] = await Promise.all([
        api.get(smartActionsBase),
        api.get(`/prompt-action-presets`)
      ]);
      setActions(actRes.data?.actions || []);
      setPresets(presetsRes.data?.presets || []);
    } catch (e) {
      toast.error("Falha ao carregar ações.");
    } finally {
      setLoading(false);
    }
  }, [agentReady, smartActionsBase]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [queuesRes, usersRes, whatsappsRes, pipes] = await Promise.allSettled([
        api.get("/queue"),
        api.get("/users/list"),
        api.get("/whatsapp/"),
        leadPipelinesService.list().catch(() => [])
      ]);
      if (!mounted) return;
      if (queuesRes.status === "fulfilled") {
        const data = queuesRes.value.data;
        setQueues(Array.isArray(data) ? data : []);
      }
      if (usersRes.status === "fulfilled") {
        const data = usersRes.value.data;
        setUsers(Array.isArray(data) ? data : Array.isArray(data?.users) ? data.users : []);
      }
      if (whatsappsRes.status === "fulfilled") {
        const data = whatsappsRes.value.data;
        setWhatsapps(Array.isArray(data) ? data : []);
      }
      if (pipes.status === "fulfilled") {
        const data = pipes.value;
        setPipelines(Array.isArray(data) ? data : []);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const presetBySlug = useMemo(() => {
    const map = {};
    for (const p of presets) map[p.slug.toLowerCase()] = p;
    return map;
  }, [presets]);

  const handleToggle = async (action, next) => {
    try {
      await api.patch(`${smartActionsBase}/${action.id}`, {
        enabled: next
      });
      setActions((prev) =>
        prev.map((a) => (a.id === action.id ? { ...a, enabled: next } : a))
      );
      onRegistryUpdated?.();
    } catch {
      toast.error("Não foi possível alterar a ação.");
    }
  };

  const handleSaveTriggers = async (patch) => {
    if (!configAction) return;
    try {
      await api.patch(`${smartActionsBase}/${configAction.id}`, patch);
      await load();
      toast.success("Opções salvas no banco.");
      onRegistryUpdated?.();
    } catch (e) {
      const msg = e?.response?.data?.details || e?.response?.data?.error;
      toast.error(msg ? `Não foi possível salvar os gatilhos: ${msg}` : "Não foi possível salvar os gatilhos.");
    }
  };

  const addPreset = async (slug) => {
    if (!agentReady) {
      toast.info("Salve o agente primeiro — é preciso de um ID para adicionar automações.");
      return;
    }
    try {
      await api.post(smartActionsBase, { slug });
      await load();
      onRegistryUpdated?.();
      toast.success("Automação adicionada ao agente.");
    } catch (e) {
      const msg = e?.response?.data?.error;
      toast.error(msg ? String(msg) : "Não foi possível adicionar a ação.");
    }
  };

  if (loading) {
    return (
      <Box>
        <LinearProgress />
        <Typography variant="caption" color="textSecondary" style={{ marginTop: 8 }}>
          Carregando ações inteligentes…
        </Typography>
      </Box>
    );
  }

  const enabledCount = actions.filter((a) => a.enabled !== false).length;
  const disabledCount = actions.length - enabledCount;

  return (
    <Box className={classes.root}>
      <div className={classes.heroRing}>
        <div className={classes.heroInner}>
          <div className={classes.heroIconWrap}>
            <Sparkles size={22} strokeWidth={1.5} />
          </div>
          <div>
            <Typography className={classes.heroTitle}>Ações inteligentes</Typography>
            <Typography className={classes.heroSubtitle}>
              {actions.length === 0
                ? "Central de automações desacoplada do roteiro — a IA usa a API OpenAI do agente para entender gatilhos no contexto."
                : `${enabledCount} ${enabledCount === 1 ? "ativa" : "ativas"} · ${disabledCount} ${disabledCount === 1 ? "inativa" : "inativas"}`}
            </Typography>
          </div>
          <Tooltip title="Com API key no agente, gatilhos são interpretados semanticamente (além do texto literal). Variável de ambiente AGENT_INTENT_SEMANTIC_OPENAI=off desliga a camada OpenAI.">
            <Chip
              size="small"
              icon={<Zap size={14} style={{ marginLeft: 6 }} />}
              label="OpenAI · contexto"
              className={classes.triggerChip}
              style={{ marginLeft: "auto" }}
            />
          </Tooltip>
        </div>
      </div>

      {presets.length > 0 && (
        <Box mb={1.5}>
          <Typography className={classes.quickTitle} style={{ marginBottom: 10 }}>
            Adicionar ao agente
          </Typography>
          <div className={classes.quickButtons}>
            {PRIMARY_PRESET_SLUGS.map((slug) => {
              const key = slug.toLowerCase();
              const pr = presetBySlug[key];
              if (!pr) return null;
              const exists = actions.some((a) => String(a.slug || "").toLowerCase() === key);
              return (
                <Button
                  key={slug}
                  size="small"
                  disabled={!promptId || exists}
                  className={classes.quickButton}
                  onClick={() => addPreset(pr.slug)}
                >
                  {exists ? `${pr.name} ✓` : `+ ${pr.name}`}
                </Button>
              );
            })}
          </div>
          {!promptId ? (
            <Typography variant="caption" color="textSecondary" display="block" style={{ marginTop: 8 }}>
              Salve o agente (topo) para habilitar novas automações.
            </Typography>
          ) : null}
        </Box>
      )}

      {actions.length === 0 ? (
        <Paper className={classes.emptyState} elevation={0}>
          <Typography variant="body2" color="textSecondary" paragraph>
            Nenhuma automação neste agente. Escolha um módulo acima ou importe um agente já configurado.
          </Typography>
          <Typography variant="caption" color="textSecondary">
            O roteiro permanece só para diálogo; execuções e integrações ficam aqui, com gatilhos compreendidos pela IA.
          </Typography>
        </Paper>
      ) : (
        actions.map((action) => {
          const preset =
            presetBySlug[String(action.slug || "").toLowerCase()] ||
            presetBySlug[String(action.type || "").toLowerCase()];
          const IconCmp = preset ? ICON_BY_PRESET[preset.icon] : SettingsIcon;
          const agentPats = patternsOrPreset(action.agentTriggerPatterns, preset, "agentTriggerPatterns");
          const userPats = patternsOrPreset(action.userTriggerPatterns, preset, "userTriggerPatterns");
          const availableAgentPats = availablePatternsOrPreset(
            action.availableAgentTriggerPatterns,
            agentPats,
            preset,
            "agentTriggerPatterns"
          );
          const availableUserPats = availablePatternsOrPreset(
            action.availableUserTriggerPatterns,
            userPats,
            preset,
            "userTriggerPatterns"
          );
          const actionForConfig = {
            ...action,
            agentTriggerPatterns: agentPats,
            userTriggerPatterns: userPats,
            availableAgentTriggerPatterns: availableAgentPats,
            availableUserTriggerPatterns: availableUserPats,
            intentSlotSchema: Array.isArray(action.intentSlotSchema) && action.intentSlotSchema.length
              ? action.intentSlotSchema
              : preset?.intentSlotSchema || []
          };

          return (
            <div key={action.id} className={classes.cardRing}>
              <div className={classes.cardInner}>
                <div className={classes.cardRow}>
                  <div
                    className={classes.cardIconWrap}
                    style={{ color: iconStyleForAction(action).iconColor || "#6366f1" }}
                  >
                    {IconCmp ? <IconCmp size={20} strokeWidth={1.75} /> : <Zap size={20} />}
                  </div>
                  <div>
                    <Typography className={classes.cardTitle}>{action.name}</Typography>
                    <Typography className={classes.cardSubtitle}>
                      {preset?.description ||
                        action.description ||
                        "Ação personalizada"}
                    </Typography>
                  </div>
                  <div className={classes.cardActions}>
                    <Switch
                      checked={action.enabled !== false}
                      onChange={(_e, v) => handleToggle(action, v)}
                      color="primary"
                      className={classes.iosSwitch}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      className={classes.configBtn}
                      onClick={() => setConfigAction(actionForConfig)}
                    >
                      Configurar
                    </Button>
                  </div>
                </div>

                <div className={classes.triggerBlock}>
                  <Typography className={classes.triggerLabel}>
                    Dispara quando o AGENTE diz
                  </Typography>
                  <div className={classes.chipsRow}>
                    {agentPats.length === 0 ? (
                      <Typography variant="caption" color="textSecondary">
                        (defina na configuração — a IA usa estes exemplos + prompts livres)
                      </Typography>
                    ) : (
                      agentPats.slice(0, 4).map((p, idx) => (
                        <Chip
                          key={`a-${idx}`}
                          label={p}
                          size="small"
                          className={classes.triggerChip}
                        />
                      ))
                    )}
                    {agentPats.length > 4 && (
                      <Chip
                        label={`+${agentPats.length - 4}`}
                        size="small"
                        className={classes.triggerChip}
                      />
                    )}
                  </div>
                </div>

                <div className={classes.triggerBlock}>
                  <Typography className={classes.triggerLabel}>
                    Dispara quando o CLIENTE responde com
                  </Typography>
                  <div className={classes.chipsRow}>
                    {userPats.length === 0 ? (
                      <Typography variant="caption" color="textSecondary">
                        (respostas ou intenções do cliente — ver aba de gatilhos)
                      </Typography>
                    ) : (
                      userPats.slice(0, 4).map((p, idx) => (
                        <Chip
                          key={`u-${idx}`}
                          label={p}
                          size="small"
                          className={classes.triggerChip}
                        />
                      ))
                    )}
                    {userPats.length > 4 && (
                      <Chip
                        label={`+${userPats.length - 4}`}
                        size="small"
                        className={classes.triggerChip}
                      />
                    )}
                  </div>
                </div>

                <Box mt={1.25} className={classes.quickPanel}>
                  <Typography variant="caption" color="textSecondary">
                    <strong>Preview:</strong> quando a conversa coincidir com estes exemplos (ou com o sentido, via
                    OpenAI), o sistema prepara esta automação antes da próxima mensagem do cliente.
                  </Typography>
                </Box>
              </div>
            </div>
          );
        })
      )}

      <ActionConfigDialog
        open={!!configAction}
        onClose={() => setConfigAction(null)}
        action={configAction}
        onSave={handleSaveTriggers}
        queues={queues}
        users={users}
        whatsapps={whatsapps}
        pipelines={pipelines}
      />
    </Box>
  );
}
