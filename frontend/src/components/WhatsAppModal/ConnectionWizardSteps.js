/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState } from "react";
import {
  Grid,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Switch,
  FormControlLabel,
  Typography,
  Box,
  Button,
  Divider,
  CircularProgress,
  IconButton,
} from "@material-ui/core";
import { Field } from "formik";
import moment from "moment";
import { makeStyles } from "@material-ui/core/styles";
import {
  getConnectionsBorder,
  getConnectionsMinimalFieldWrap,
} from "../../pages/Connections/connectionsTheme";
import {
  ChevronRight,
  MenuBook,
  ArrowBack,
  ArrowForward,
  Close,
  Check,
  SkipNext,
  ThumbUp,
  NotInterested,
  Colorize,
  WhatsApp,
} from "@material-ui/icons";
import { i18n } from "../../translate/i18n";
import QueueSelect from "../QueueSelect";
import ConnectionQueuePreview from "../ConnectionQueuePreview";
import QueueOrderList from "../QueueOrderList";
import ConnectionHelpDialog from "../ConnectionHelpDialog";
import WhatsAppEmbeddedSignupConnect from "../WhatsAppEmbeddedSignup/WhatsAppEmbeddedSignupConnect";
import InputAdornment from "@material-ui/core/InputAdornment";
import ColorPicker from "../ColorPicker";

export const STEP = {
  BASIC: 1,
  QUEUES: 2,
  NPS: 3,
};

const opt = (label) =>
  `${label} ${i18n.t("whatsappModal.wizard.optional")}`;

const useWizardStyles = makeStyles((theme) => ({
  fieldMark: getConnectionsMinimalFieldWrap(theme),
  tutorialBlock: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing(1.5, 2),
    marginTop: theme.spacing(2.5),
    borderRadius: 12,
    cursor: "pointer",
    border: `1px solid ${
      theme.palette.type === "dark" ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)"
    }`,
    background:
      theme.palette.type === "dark" ? "rgba(255,255,255,0.04)" : "#f5f5f7",
    "&:hover": { background: theme.palette.type === "dark" ? "rgba(255,255,255,0.08)" : "#ebebef" },
  },
  tutorialIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginRight: theme.spacing(1.25),
    background: theme.palette.type === "dark" ? "rgba(255,255,255,0.1)" : "#fff",
  },
  tutorialTitle: { fontWeight: 600, fontSize: 13 },
  tutorialSub: { fontSize: 11, color: theme.palette.text.secondary },
  sectionWrap: {
    marginBottom: theme.spacing(1),
    "&:last-child": {
      marginBottom: 0,
    },
  },
  sectionCompact: {
    fontSize: 11,
    fontWeight: 600,
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(1),
    marginTop: 0,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  step1Root: {
    width: "100%",
  },
  step1Row: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: theme.spacing(0.75),
  },
  switchFull: {
    width: "100%",
    marginLeft: 0,
    marginRight: 0,
    marginTop: theme.spacing(0.25),
    marginBottom: theme.spacing(1.25),
    alignItems: "flex-start",
    "& .MuiFormControlLabel-label": {
      fontSize: 12,
      lineHeight: 1.4,
      whiteSpace: "normal",
      wordBreak: "break-word",
      paddingTop: 2,
    },
  },
  step1FieldDense: {
    marginTop: theme.spacing(0.25),
    marginBottom: theme.spacing(0.25),
  },
  fieldBelowSwitch: {
    marginTop: theme.spacing(1.25),
  },
  apiGrid: {
    marginTop: 0,
  },
  tutorialBlockCompact: {
    padding: theme.spacing(1, 1.5),
    marginTop: theme.spacing(1.25),
  },
  step2Wrap: {
    width: "100%",
    maxWidth: 420,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: 6,
    paddingTop: 10,
    paddingBottom: 4,
    boxSizing: "border-box",
  },
  step2SectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(0.5),
    marginTop: theme.spacing(0.5),
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    textAlign: "center",
  },
  questionWrap: {
    textAlign: "center",
    padding: theme.spacing(3, 2),
    width: "100%",
    maxWidth: 480,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  questionTitle: {
    fontSize: 20,
    fontWeight: 600,
    marginBottom: theme.spacing(1.5),
    letterSpacing: "-0.02em",
    lineHeight: 1.25,
  },
  questionSub: {
    fontSize: 14,
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(3),
    lineHeight: 1.55,
    maxWidth: 420,
    marginLeft: "auto",
    marginRight: "auto",
  },
  questionHint: {
    fontSize: 12,
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(2.5),
    lineHeight: 1.45,
    maxWidth: 400,
    opacity: 0.9,
  },
  choiceRow: {
    display: "flex",
    gap: theme.spacing(2),
    justifyContent: "center",
    width: "100%",
    maxWidth: 400,
  },
  choiceBtn: {
    flex: 1,
    maxWidth: 168,
    minHeight: 120,
    padding: theme.spacing(2, 1),
    borderRadius: 14,
    textTransform: "none",
    flexDirection: "column",
    border: `1px solid ${
      theme.palette.type === "dark" ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"
    }`,
    "& .MuiButton-label": { flexDirection: "column", gap: 8 },
  },
  choiceBtnYes: {
    background: theme.palette.type === "dark" ? "rgba(52,199,89,0.15)" : "rgba(52,199,89,0.1)",
    "&:hover": { background: theme.palette.type === "dark" ? "rgba(52,199,89,0.25)" : "rgba(52,199,89,0.18)" },
  },
  choiceBtnNo: {
    background: theme.palette.type === "dark" ? "rgba(255,255,255,0.05)" : "#f5f5f7",
  },
  choiceIcon: { fontSize: 32 },
  choiceLabel: { fontSize: 15, fontWeight: 600 },
  choiceHint: { fontSize: 11, color: theme.palette.text.secondary, fontWeight: 400 },
  compactField: {
    "& .MuiInputBase-root": { fontSize: "0.6875rem" },
    "& .MuiInputLabel-root": { fontSize: "0.625rem" },
    "& .MuiFormHelperText-root": { fontSize: "0.5625rem", marginTop: 0 },
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
    padding: theme.spacing(1.5, 2, 0.75),
    borderBottom: `1px solid ${
      theme.palette.type === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"
    }`,
  },
  modalHeaderBrand: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.25),
    minWidth: 0,
  },
  modalHeaderIcon: {
    fontSize: 28,
    flexShrink: 0,
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: 600,
    letterSpacing: "-0.02em",
    lineHeight: 1.2,
  },
  modalHeaderSub: {
    fontSize: 11,
    color: theme.palette.text.secondary,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    marginRight: -6,
    color: theme.palette.text.secondary,
    "&:hover": {
      color: theme.palette.text.primary,
      background: theme.palette.type === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
    },
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    flexShrink: 0,
    padding: theme.spacing(1.25, 2.5, 2),
    borderTop: `1px solid ${
      theme.palette.type === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"
    }`,
    gap: theme.spacing(1),
  },
  footerEmbedded: {
    padding: 0,
    margin: 0,
    borderTop: "none",
    background: "transparent",
    gap: theme.spacing(0.5),
    boxShadow: "none",
  },
  footerSide: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    minWidth: 108,
    flex: "1 1 108px",
  },
  footerSideRight: {
    justifyContent: "flex-end",
  },
  footerCenter: {
    flex: "0 0 72px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  footerBtnHidden: {
    visibility: "hidden",
    pointerEvents: "none",
  },
  footerBtn: {
    fontSize: 13,
    fontWeight: 500,
    textTransform: "none",
    borderRadius: 10,
    padding: "6px 14px",
    minWidth: 0,
    boxShadow: "none",
  },
  footerBtnOutlined: {
    border: `1px solid ${
      theme.palette.type === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)"
    }`,
    color: theme.palette.text.primary,
    backgroundColor: "transparent",
  },
  footerBtnPrimary: {
    backgroundColor: "#1e40af",
    color: "#ffffff",
    padding: "6px 18px",
    "&:hover": {
      backgroundColor: "#2563eb",
      boxShadow: "none",
    },
    "&.Mui-disabled": {
      backgroundColor: "rgba(30, 64, 175, 0.45)",
      color: "rgba(255, 255, 255, 0.72)",
    },
  },
  footerBtnText: {
    fontSize: 12,
    textTransform: "none",
    color: theme.palette.text.secondary,
    padding: "4px 8px",
    minWidth: 0,
  },
  footerBtnSubmit: {
    fontSize: 13,
    fontWeight: 600,
    textTransform: "none",
    borderRadius: 10,
    padding: "6px 18px",
    minWidth: 108,
    boxShadow: "none",
    backgroundColor: "#1e40af",
    color: "#ffffff",
    "&:hover": {
      backgroundColor: "#2563eb",
      boxShadow: "none",
    },
    "&.Mui-disabled": {
      backgroundColor: "rgba(30, 64, 175, 0.45)",
      color: "rgba(255, 255, 255, 0.72)",
    },
  },
  optionalNote: {
    fontSize: 11,
    color: theme.palette.text.secondary,
    marginBottom: 10,
    textAlign: "center",
  },
  segmented: {
    display: "flex",
    gap: 4,
    padding: 3,
    borderRadius: 8,
    background:
      theme.palette.type === "dark" ? "rgba(255,255,255,0.06)" : "#f3f4f6",
    marginBottom: 8,
  },
  segmentBtn: {
    flex: 1,
    borderRadius: 6,
    textTransform: "none",
    fontSize: 12,
    fontWeight: 500,
    padding: "6px 10px",
    color: theme.palette.text.secondary,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    transition: "background 0.15s ease, color 0.15s ease",
  },
  segmentBtnActive: {
    background:
      theme.palette.type === "dark" ? "rgba(255,255,255,0.12)" : "#ffffff",
    color: theme.palette.text.primary,
    boxShadow:
      theme.palette.type === "dark"
        ? "none"
        : "0 1px 3px rgba(0,0,0,0.08)",
  },
  msgRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    minHeight: 28,
  },
  msgLabel: {
    fontSize: 12,
    fontWeight: 500,
  },
  addQueueBtn: {
    textTransform: "none",
    fontSize: 11,
    borderRadius: 6,
    minWidth: 0,
    padding: "2px 8px",
    lineHeight: 1.4,
  },
  labelRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 2,
  },
  step2WrapQueues: {
    maxWidth: 800,
    width: "100%",
    paddingTop: 8,
  },
  queuesFlowGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 228px",
    gap: 12,
    alignItems: "start",
    width: "100%",
    [theme.breakpoints.down("md")]: {
      gridTemplateColumns: "1fr",
    },
  },
  queuesFlowForm: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    minWidth: 0,
  },
  queuesFlowPreview: {
    position: "sticky",
    top: 0,
    display: "flex",
    justifyContent: "center",
    padding: "6px 4px 8px",
    borderRadius: 10,
    background: "transparent",
    [theme.breakpoints.down("md")]: {
      position: "static",
    },
  },
  queueBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  queueBlockLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: theme.palette.text.secondary,
    letterSpacing: "0.02em",
    textTransform: "uppercase",
  },
  menuOrderBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  farewellBlock: {
    paddingTop: 10,
    borderTop: `1px solid ${
      theme.palette.type === "dark" ? "rgba(255,255,255,0.06)" : "#ececf1"
    }`,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  agentBlock: {
    marginTop: 2,
    paddingTop: 8,
    borderTop: `1px solid ${
      theme.palette.type === "dark" ? "rgba(255,255,255,0.06)" : "#ececf1"
    }`,
  },
  simplePreviewStack: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    width: "100%",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingTop: 10,
    borderTop: `1px solid ${
      theme.palette.type === "dark" ? "rgba(255,255,255,0.06)" : "#ececf1"
    }`,
  },
  simpleFlowColumn: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
    width: "100%",
  },
  simplePreviewEmpty: {
    fontSize: 10,
    color: theme.palette.text.secondary,
    textAlign: "center",
    padding: "12px 8px",
    lineHeight: 1.4,
  },
}));

const WIZARD_STEPS = [
  { id: STEP.BASIC, label: i18n.t("whatsappModal.wizard.steps.basic") },
  { id: STEP.QUEUES, label: i18n.t("whatsappModal.wizard.steps.service") },
  { id: STEP.NPS, label: i18n.t("whatsappModal.wizard.steps.extras") },
];

export const getVisibleSteps = ({ NPSEnabled, showFlow } = {}) =>
  WIZARD_STEPS.filter(
    (s) => s.id !== STEP.NPS || NPSEnabled || showFlow
  );

export const WizardModalHeader = ({ isOfficialChannel, channel, onClose, isEdit }) => {
  const c = useWizardStyles();
  const isApi = isOfficialChannel || channel === "whatsapp_oficial";

  return (
    <Box className={c.modalHeader}>
      <Box className={c.modalHeaderBrand}>
        <WhatsApp className={c.modalHeaderIcon} style={{ color: "#25D366" }} />
        <Box>
          <Typography className={c.modalHeaderTitle} component="div">
            {isApi ? "API Oficial Meta" : "WhatsApp Web"}
          </Typography>
          <Typography className={c.modalHeaderSub} component="div">
            {isEdit
              ? i18n.t("whatsappModal.title.edit")
              : i18n.t("whatsappModal.title.add")}
          </Typography>
        </Box>
      </Box>
      <IconButton
        className={c.closeBtn}
        onClick={onClose}
        size="small"
        aria-label="Fechar"
      >
        <Close fontSize="small" />
      </IconButton>
    </Box>
  );
};

export const WizardStepIndicator = ({ step, classes, NPSEnabled, showFlow }) => {
  const steps = getVisibleSteps({ NPSEnabled, showFlow });

  return (
    <Box className={classes.wizardSteps}>
      {steps.map((s, idx) => {
        const isActive = step === s.id;
        const isDone = step > s.id;

        return (
          <Box key={s.id} className={classes.wizardStepItem}>
            <Box
              className={`${classes.wizardDot} ${
                isActive
                  ? classes.wizardDotActive
                  : isDone
                  ? classes.wizardDotDone
                  : ""
              }`}
            >
              {isDone ? "✓" : idx + 1}
            </Box>
            <Typography
              className={`${classes.wizardLabel} ${
                isActive ? classes.wizardLabelActive : ""
              }`}
            >
              {s.label}
            </Typography>
            {idx < steps.length - 1 && (
              <Box
                className={`${classes.wizardLine} ${
                  isDone ? classes.wizardLineDone : ""
                }`}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
};

const ConnectionTutorialBlock = ({ isOfficialChannel }) => {
  const classes = useWizardStyles();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Divider style={{ marginTop: 10 }} />
      <Box
        className={`${classes.tutorialBlock} ${classes.tutorialBlockCompact}`}
        onClick={() => setOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
      >
        <Box display="flex" alignItems="center" flex={1} minWidth={0}>
          <Box className={classes.tutorialIcon}>
            <MenuBook style={{ fontSize: 18 }} />
          </Box>
          <Box minWidth={0}>
            <Typography className={classes.tutorialTitle} noWrap>
              Como realizar a conexão
            </Typography>
            <Typography className={classes.tutorialSub} noWrap>
              Ver tutorial passo a passo
            </Typography>
          </Box>
        </Box>
        <ChevronRight style={{ fontSize: 20, opacity: 0.5 }} />
      </Box>
      <ConnectionHelpDialog
        open={open}
        onClose={() => setOpen(false)}
        variant="wizard"
        guideType={isOfficialChannel ? "api" : "web"}
        title="Como realizar a conexão"
      />
    </>
  );
};

export const WizardStep1 = ({
  classes,
  values,
  touched,
  errors,
  isOfficialChannel,
  enableImportMessage,
  handleEnableImportMessage,
  importOldMessagesGroups,
  setImportOldMessagesGroups,
  closedTicketsPostImported,
  setClosedTicketsPostImported,
  importOldMessages,
  setImportOldMessages,
  importRecentMessages,
  setImportRecentMessages,
  queues,
  colorPickerModalOpen,
  setColorPickerModalOpen,
  setWhatsApp,
  whatsAppId,
  onEmbeddedSignupSuccess,
}) => {
  const ws = useWizardStyles();
  return (
    <Box className={ws.step1Root} maxWidth="100%" mx="auto">
      <Box className={ws.sectionWrap}>
      <Typography className={ws.sectionCompact}>Identificação</Typography>
      <Grid container spacing={1}>
        <Grid item xs={12}>
          <Box className={ws.fieldMark}>
          <Field
            as={TextField}
            label={i18n.t("whatsappModal.form.name")}
            autoFocus
            name="name"
            fullWidth
            size="small"
            className={`${ws.compactField} ${ws.step1FieldDense}`}
            error={touched.name && Boolean(errors.name)}
            helperText={touched.name && errors.name}
            variant="outlined"
            margin="dense"
          />
          </Box>
        </Grid>
        <Grid item xs={8}>
          <Box className={ws.fieldMark}>
          <Field
            as={TextField}
            label={i18n.t("connections.table.color")}
            name="color"
            fullWidth
            size="small"
            className={ws.compactField}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <div
                    style={{ backgroundColor: values.color, width: 16, height: 16, borderRadius: 4 }}
                  />
                </InputAdornment>
              ),
              endAdornment: (
                <IconButton size="small" onClick={() => setColorPickerModalOpen(true)}>
                  <Colorize fontSize="small" />
                </IconButton>
              ),
            }}
            variant="outlined"
            margin="dense"
          />
          </Box>
          <ColorPicker
            open={colorPickerModalOpen}
            handleClose={() => setColorPickerModalOpen(false)}
            onChange={(color) => setWhatsApp((prev) => ({ ...prev, color }))}
          />
        </Grid>
        <Grid item xs={4} style={{ display: "flex", alignItems: "center", paddingTop: 4 }}>
          <FormControlLabel
            style={{ margin: 0 }}
            control={<Field as={Switch} size="small" color="primary" name="isDefault" checked={values.isDefault} />}
            label={<Typography style={{ fontSize: 12 }}>Padrão</Typography>}
          />
        </Grid>
      </Grid>
      </Box>

      <Box className={ws.sectionWrap}>
      <Typography className={ws.sectionCompact}>Grupos</Typography>
      <FormControlLabel
        className={ws.switchFull}
        control={
          <Field as={Switch} size="small" color="primary" name="allowGroup" checked={values.allowGroup} />
        }
        label={i18n.t("whatsappModal.form.group")}
      />
      <Box className={ws.fieldMark}>
      <FormControl
        variant="outlined"
        margin="dense"
        size="small"
        fullWidth
        className={`${ws.step1FieldDense} ${ws.fieldBelowSwitch}`}
      >
        <InputLabel id="groupAsTicket-wizard-label" shrink>
          {i18n.t("whatsappModal.form.groupAsTicket")}
        </InputLabel>
        <Field
          as={Select}
          label={i18n.t("whatsappModal.form.groupAsTicket")}
          labelId="groupAsTicket-wizard-label"
          name="groupAsTicket"
          fullWidth
        >
          <MenuItem value="disabled">{i18n.t("whatsappModal.menuItem.disabled")}</MenuItem>
          <MenuItem value="enabled">{i18n.t("whatsappModal.menuItem.enabled")}</MenuItem>
        </Field>
      </FormControl>
      </Box>
      </Box>

      {isOfficialChannel ? (
        <>
          <WhatsAppEmbeddedSignupConnect
            compact
            whatsappId={whatsAppId}
            defaultName={values.name}
            onSuccess={(wa) => {
              if (wa && typeof setWhatsApp === "function") {
                setWhatsApp((prev) => ({
                  ...prev,
                  name: wa.name || prev.name,
                  phone_number_id: wa.phone_number_id || "",
                  waba_id: wa.waba_id || "",
                  business_id: wa.business_id || "",
                  phone_number: wa.phone_number || "",
                  send_token: wa.send_token || ""
                }));
              }
              if (typeof onEmbeddedSignupSuccess === "function") {
                onEmbeddedSignupSuccess(wa);
              }
            }}
          />
          <Typography
            className={ws.sectionCompact}
            style={{ marginTop: 8, opacity: 0.85 }}
          >
            Ou preencha manualmente
          </Typography>
          <Box className={ws.sectionWrap}>
          <Typography className={ws.sectionCompact}>API Oficial Meta</Typography>
          <Grid container spacing={1} className={ws.apiGrid}>
            {[
              ["phone_number_id", "Phone number ID"],
              ["waba_id", "WABA ID"],
              ["business_id", "Business ID"],
              ["phone_number", "Número WhatsApp"],
            ].map(([name, label]) => (
              <Grid item xs={6} key={name}>
                <Box className={ws.fieldMark}>
                <Field
                  fullWidth
                  as={TextField}
                  label={label}
                  name={name}
                  size="small"
                  className={ws.compactField}
                  variant="outlined"
                  margin="dense"
                  required
                  InputLabelProps={{ shrink: true }}
                />
                </Box>
              </Grid>
            ))}
            <Grid item xs={12}>
              <Box className={ws.fieldMark}>
              <Field
                fullWidth
                as={TextField}
                label="Token de acesso"
                name="send_token"
                size="small"
                className={ws.compactField}
                variant="outlined"
                margin="dense"
                required
                InputLabelProps={{ shrink: true }}
              />
              </Box>
            </Grid>
          </Grid>
          </Box>
        </>
      ) : (
        <>
          <Box className={ws.sectionWrap}>
          <Typography className={ws.sectionCompact}>Histórico</Typography>
          <FormControlLabel
            className={ws.switchFull}
            control={
              <Switch
                size="small"
                checked={enableImportMessage}
                onChange={handleEnableImportMessage}
                color="primary"
              />
            }
            label={i18n.t("whatsappModal.form.importOldMessagesEnable")}
          />
          {enableImportMessage && (
            <Grid container spacing={1} style={{ marginTop: 2 }}>
              <Grid item xs={6}>
                <Box className={ws.fieldMark}>
                <Field
                  fullWidth
                  as={TextField}
                  label="De"
                  type="datetime-local"
                  size="small"
                  className={ws.compactField}
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                  margin="dense"
                  value={moment(importOldMessages).format("YYYY-MM-DDTHH:mm")}
                  onChange={(e) => setImportOldMessages(e.target.value)}
                />
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box className={ws.fieldMark}>
                <Field
                  fullWidth
                  as={TextField}
                  label="Até"
                  type="datetime-local"
                  size="small"
                  className={ws.compactField}
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                  margin="dense"
                  value={moment(importRecentMessages).format("YYYY-MM-DDTHH:mm")}
                  onChange={(e) => setImportRecentMessages(e.target.value)}
                />
                </Box>
              </Grid>
            </Grid>
          )}
          </Box>
          <ConnectionTutorialBlock isOfficialChannel={false} />
        </>
      )}
    </Box>
  );
};

export const WizardStep2 = ({
  values,
  setFieldValue,
  selectedQueueIds,
  handleChangeQueue,
  onReorderQueues,
  queues = [],
  onAddQueue,
  selectedPrompt,
  handleChangePrompt,
  prompts,
  connectionAgents = [],
}) => {
  const agentOptions =
    connectionAgents.length > 0
      ? connectionAgents
      : (prompts || []).map((p) => ({
          ...p,
          connectionValue: `prompt:${p.id}`,
          provider: "openai",
        }));
  const ws = useWizardStyles();
  const queuesEnabled = Boolean(values.queuesEnabled);
  const selectedQueues = selectedQueueIds
    .map((id) => queues.find((q) => q.id === id))
    .filter(Boolean);
  const multiQueue = queuesEnabled && selectedQueueIds.length >= 2;
  const singleQueue = queuesEnabled && selectedQueueIds.length === 1;
  const hasQueues = selectedQueueIds.length > 0;

  const previewMode = multiQueue ? "menu" : singleQueue ? "direct" : "menu";

  return (
    <Box
      className={`${ws.step2Wrap} ${
        queuesEnabled ? ws.step2WrapQueues : ""
      }`}
    >
      <Box className={ws.segmented} role="tablist">
        <button
          type="button"
          className={`${ws.segmentBtn} ${!queuesEnabled ? ws.segmentBtnActive : ""}`}
          onClick={() => setFieldValue("queuesEnabled", false)}
          title={i18n.t("whatsappModal.wizard.mode.simpleHint")}
        >
          {i18n.t("whatsappModal.wizard.mode.simple")}
        </button>
        <button
          type="button"
          className={`${ws.segmentBtn} ${queuesEnabled ? ws.segmentBtnActive : ""}`}
          onClick={() => setFieldValue("queuesEnabled", true)}
          title={i18n.t("whatsappModal.wizard.mode.queuesHint")}
        >
          {i18n.t("whatsappModal.wizard.mode.queues")}
        </button>
      </Box>

      {queuesEnabled ? (
        <>
          <Box className={ws.queuesFlowGrid}>
            <Box className={ws.queuesFlowForm}>
              <Box className={ws.queueBlock}>
                <Box className={ws.labelRow}>
                  <Typography className={ws.queueBlockLabel}>
                    {i18n.t("whatsappModal.wizard.stepChooseQueues")}
                  </Typography>
                  {onAddQueue && (
                    <Button
                      size="small"
                      className={ws.addQueueBtn}
                      onClick={onAddQueue}
                      variant="text"
                      color="primary"
                    >
                      {i18n.t("whatsappModal.wizard.addQueue")}
                    </Button>
                  )}
                </Box>
                <Box className={ws.fieldMark}>
                  <QueueSelect
                    selectedQueueIds={selectedQueueIds}
                    onChange={handleChangeQueue}
                  />
                </Box>
              </Box>

              {multiQueue && (
                <Box className={ws.menuOrderBlock}>
                  <Typography className={ws.queueBlockLabel}>
                    {i18n.t("whatsappModal.wizard.menuAndOrder")}
                  </Typography>
                  <Box className={ws.fieldMark}>
                    <Field
                      as={TextField}
                      fullWidth
                      name="greetingMessage"
                      size="small"
                      variant="outlined"
                      placeholder={i18n.t("whatsappModal.wizard.menuPlaceholder")}
                      className={ws.compactField}
                    />
                  </Box>
                  <QueueOrderList
                    queues={selectedQueues}
                    onMove={onReorderQueues}
                  />
                </Box>
              )}

              {singleQueue && (
                <Box className={ws.msgRow}>
                  <Typography className={ws.msgLabel}>
                    {i18n.t("whatsappModal.wizard.greeting")}
                  </Typography>
                  <Switch
                    size="small"
                    checked={Boolean(values.sendGreetingMessage)}
                    onChange={(e) =>
                      setFieldValue("sendGreetingMessage", e.target.checked)
                    }
                  />
                </Box>
              )}
              {singleQueue && values.sendGreetingMessage && (
                <Box className={ws.fieldMark}>
                  <Field
                    as={TextField}
                    fullWidth
                    name="greetingMessage"
                    size="small"
                    variant="outlined"
                    placeholder={i18n.t("whatsappModal.wizard.greetingPlaceholder")}
                    className={ws.compactField}
                  />
                </Box>
              )}
            </Box>

            <Box className={ws.queuesFlowPreview}>
              <ConnectionQueuePreview
                mode={previewMode}
                headerText={values.greetingMessage}
                queues={selectedQueues}
                greetingText={values.greetingMessage}
                connectionName={values.name}
              />
            </Box>
          </Box>

          {hasQueues && (
            <Box className={ws.farewellBlock}>
              <Box className={ws.msgRow}>
                <Typography className={ws.queueBlockLabel}>
                  {i18n.t("whatsappModal.wizard.queueEntry")}
                </Typography>
                <Switch
                  size="small"
                  checked={values.sendQueueEntryMessage === "enabled"}
                  onChange={(e) => {
                    const enabled = e.target.checked;
                    setFieldValue(
                      "sendQueueEntryMessage",
                      enabled ? "enabled" : "disabled"
                    );
                    if (enabled && !values.queueEntryMessage?.trim()) {
                      setFieldValue(
                        "queueEntryMessage",
                        i18n.t("whatsappModal.wizard.queueEntryDefault")
                      );
                    }
                  }}
                />
              </Box>
              {values.sendQueueEntryMessage === "enabled" && (
                <Box className={ws.fieldMark}>
                  <Field
                    as={TextField}
                    fullWidth
                    name="queueEntryMessage"
                    size="small"
                    variant="outlined"
                    placeholder={i18n.t(
                      "whatsappModal.wizard.queueEntryPlaceholder"
                    )}
                    className={ws.compactField}
                    multiline
                    minRows={2}
                  />
                </Box>
              )}
            </Box>
          )}

          {hasQueues && (
            <Box className={ws.farewellBlock}>
              <Box className={ws.msgRow}>
                <Typography className={ws.queueBlockLabel}>
                  {i18n.t("whatsappModal.wizard.farewell")}
                </Typography>
                <Switch
                  size="small"
                  checked={Boolean(values.sendFarewellMessage)}
                  onChange={(e) =>
                    setFieldValue("sendFarewellMessage", e.target.checked)
                  }
                />
              </Box>
              {values.sendFarewellMessage && (
                <Box className={ws.fieldMark}>
                  <Field
                    as={TextField}
                    fullWidth
                    name="complationMessage"
                    size="small"
                    variant="outlined"
                    placeholder={i18n.t("whatsappModal.wizard.farewellPlaceholder")}
                    className={ws.compactField}
                  />
                </Box>
              )}
            </Box>
          )}
        </>
      ) : (
        <Box className={ws.simpleFlowColumn}>
          <Box className={ws.queuesFlowForm}>
            <Box className={ws.msgRow}>
              <Typography className={ws.msgLabel}>
                {i18n.t("whatsappModal.wizard.greeting")}
              </Typography>
              <Switch
                size="small"
                checked={Boolean(values.sendGreetingMessage)}
                onChange={(e) =>
                  setFieldValue("sendGreetingMessage", e.target.checked)
                }
              />
            </Box>
            {values.sendGreetingMessage && (
              <Box className={ws.fieldMark}>
                <Field
                  as={TextField}
                  fullWidth
                  name="greetingMessage"
                  size="small"
                  variant="outlined"
                  placeholder={i18n.t("whatsappModal.wizard.greetingPlaceholder")}
                  className={ws.compactField}
                />
              </Box>
            )}
            <Box className={ws.msgRow}>
              <Typography className={ws.msgLabel}>
                {i18n.t("whatsappModal.wizard.farewell")}
              </Typography>
              <Switch
                size="small"
                checked={Boolean(values.sendFarewellMessage)}
                onChange={(e) =>
                  setFieldValue("sendFarewellMessage", e.target.checked)
                }
              />
            </Box>
            {values.sendFarewellMessage && (
              <Box className={ws.fieldMark}>
                <Field
                  as={TextField}
                  fullWidth
                  name="complationMessage"
                  size="small"
                  variant="outlined"
                  placeholder={i18n.t("whatsappModal.wizard.farewellPlaceholder")}
                  className={ws.compactField}
                />
              </Box>
            )}
          </Box>

          <Box className={ws.simplePreviewStack}>
            {values.sendGreetingMessage && (
              <ConnectionQueuePreview
                compact
                label={i18n.t("whatsappModal.wizard.previewGreetingLabel")}
                mode="simple"
                greetingText={values.greetingMessage}
                connectionName={values.name}
              />
            )}
            {values.sendFarewellMessage && (
              <ConnectionQueuePreview
                compact
                label={i18n.t("whatsappModal.wizard.previewFarewellLabel")}
                mode="farewell"
                farewellText={values.complationMessage}
                connectionName={values.name}
              />
            )}
            {!values.sendGreetingMessage && !values.sendFarewellMessage && (
              <Typography className={ws.simplePreviewEmpty}>
                {i18n.t("whatsappModal.wizard.previewSimpleEmpty")}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      <Box className={ws.agentBlock}>
        <Box className={ws.fieldMark}>
        <FormControl variant="outlined" margin="dense" fullWidth size="small">
          <InputLabel id="wizard-prompt-label" shrink>
            {opt(i18n.t("whatsappModal.wizard.agentLabel"))}
          </InputLabel>
          <Select
            labelId="wizard-prompt-label"
            value={selectedPrompt === "" ? "__none__" : selectedPrompt}
            onChange={handleChangePrompt}
            label={opt(i18n.t("whatsappModal.wizard.agentLabel"))}
            fullWidth
          >
            <MenuItem value="__none__">
              {i18n.t("whatsappModal.wizard.agentNone")}
            </MenuItem>
            {agentOptions.map((p) => (
              <MenuItem
                key={p.connectionValue || `prompt:${p.id}`}
                value={p.connectionValue || `prompt:${p.id}`}
              >
                {p.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        </Box>
      </Box>
    </Box>
  );
};

/** Etapa 3 — pergunta de ramificação */
export const WizardStepQuestion = ({ onYes, onNo, isSubmitting, isEdit }) => {
  const classes = useWizardStyles();
  return (
    <Box className={classes.questionWrap}>
      <Typography className={classes.questionTitle}>
        Personalizar atendimento?
      </Typography>
      <Typography className={classes.questionSub}>
        Deseja configurar mensagens de boas-vindas, pesquisa NPS e fluxos
        automáticos nesta conexão?
      </Typography>
      <Typography className={classes.questionHint}>
        As filas (listas) escolhidas na etapa anterior já ficam vinculadas. Ao
        escolher uma opção, {isEdit ? "as alterações são salvas" : "a conexão é salva"} e a
        lista de conexões atualiza na hora.
      </Typography>
      <Box className={classes.choiceRow}>
        <Button
          className={`${classes.choiceBtn} ${classes.choiceBtnYes}`}
          onClick={onYes}
          disabled={isSubmitting}
        >
          <ThumbUp className={classes.choiceIcon} style={{ color: "#34c759" }} />
          <span className={classes.choiceLabel}>Sim</span>
          <span className={classes.choiceHint}>Configurar agora</span>
        </Button>
        <Button
          className={`${classes.choiceBtn} ${classes.choiceBtnNo}`}
          onClick={onNo}
          disabled={isSubmitting}
        >
          <NotInterested className={classes.choiceIcon} color="action" />
          <span className={classes.choiceLabel}>Não</span>
          <span className={classes.choiceHint}>Concluir</span>
        </Button>
      </Box>
    </Box>
  );
};

export const WizardStep3 = () => {
  const ws = useWizardStyles();
  return (
    <Box maxWidth="100%" mx="auto">
      <Typography className={ws.optionalNote}>Campos opcionais</Typography>
      <Typography className={ws.sectionCompact}>Mensagens</Typography>
      <Grid container spacing={1}>
        <Grid item xs={12}>
          <Box className={ws.fieldMark}>
          <FormControl fullWidth size="small" variant="outlined">
            <InputLabel>Mensagem de entrada na fila</InputLabel>
            <Field as={Select} name="sendQueueEntryMessage" label="Mensagem de entrada na fila">
              <MenuItem value="inherit">Herdar da fila</MenuItem>
              <MenuItem value="enabled">Sempre enviar</MenuItem>
              <MenuItem value="disabled">Nunca enviar</MenuItem>
            </Field>
          </FormControl>
          </Box>
        </Grid>
        <Grid item xs={12}>
          <Box className={ws.fieldMark}>
          <Field
            as={TextField}
            label={opt("Boas-vindas")}
            multiline
            rows={2}
            fullWidth
            name="greetingMessage"
            size="small"
            className={ws.compactField}
            variant="outlined"
            margin="dense"
            placeholder="Olá! Como posso ajudar?"
          />
          </Box>
        </Grid>
        <Grid item xs={12}>
          <Box className={ws.fieldMark}>
          <Field
            as={TextField}
            label={opt("Despedida")}
            multiline
            rows={2}
            fullWidth
            name="complationMessage"
            size="small"
            className={ws.compactField}
            variant="outlined"
            margin="dense"
            placeholder="Obrigado pelo contato!"
          />
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export const WizardStep4 = ({
  touched,
  errors,
  NPSEnabled,
  showFlow,
  webhooks,
  flowIdWelcome,
  flowIdNotPhrase,
  handleChangeFlowIdWelcome,
  handleChangeFlowIdNotPhrase,
}) => {
  const ws = useWizardStyles();
  return (
    <Box maxWidth="100%" mx="auto">
      <Typography className={ws.optionalNote}>
        {i18n.t("whatsappModal.wizard.optionalNote")}
      </Typography>
      {NPSEnabled && (
        <>
          <Typography className={ws.sectionCompact}>NPS</Typography>
          <Grid container spacing={1}>
            <Grid item xs={12}>
              <Field
                as={TextField}
                label={opt("Msg. avaliação")}
                multiline
                rows={2}
                fullWidth
                name="ratingMessage"
                size="small"
                className={ws.compactField}
                variant="outlined"
                margin="dense"
                error={touched.ratingMessage && Boolean(errors.ratingMessage)}
                helperText={touched.ratingMessage && errors.ratingMessage}
              />
            </Grid>
            <Grid item xs={6}>
              <Field
                as={TextField}
                label={opt("Máx. envios")}
                fullWidth
                name="maxUseBotQueuesNPS"
                size="small"
                className={ws.compactField}
                variant="outlined"
                margin="dense"
              />
            </Grid>
            <Grid item xs={6}>
              <Field
                as={TextField}
                label={opt("Expira (min)")}
                fullWidth
                name="expiresTicketNPS"
                size="small"
                className={ws.compactField}
                variant="outlined"
                margin="dense"
              />
            </Grid>
          </Grid>
        </>
      )}
      {showFlow && (
        <>
          <Typography className={ws.sectionCompact}>Fluxos</Typography>
          <FormControl variant="outlined" margin="dense" fullWidth size="small" style={{ marginBottom: 8 }}>
            <InputLabel shrink>{opt("Boas-vindas")}</InputLabel>
            <Select value={flowIdNotPhrase || ""} onChange={handleChangeFlowIdNotPhrase} displayEmpty fullWidth>
              <MenuItem value="">Nenhum</MenuItem>
              {(webhooks || []).map((w) => (
                <MenuItem key={w.id} value={w.id}>
                  {w.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl variant="outlined" margin="dense" fullWidth size="small">
            <InputLabel shrink>{opt("Padrão")}</InputLabel>
            <Select value={flowIdWelcome || ""} onChange={handleChangeFlowIdWelcome} displayEmpty fullWidth>
              <MenuItem value="">Nenhum</MenuItem>
              {(webhooks || []).map((w) => (
                <MenuItem key={w.id} value={w.id}>
                  {w.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </>
      )}
      {!NPSEnabled && !showFlow && (
        <Typography variant="caption" color="textSecondary" align="center" display="block" style={{ padding: 16 }}>
          NPS e fluxos não disponíveis no plano. Toque em concluir.
        </Typography>
      )}
    </Box>
  );
};

export const WizardFooter = ({
  wizardStep,
  isSubmitting,
  onClose,
  onBack,
  onNext,
  onSkip,
  onSubmit,
  NPSEnabled,
  showFlow,
  isEdit,
  embedded = false,
}) => {
  const c = useWizardStyles();
  const hasExtras = NPSEnabled || showFlow;
  const isLast =
    wizardStep === STEP.NPS || (wizardStep === STEP.QUEUES && !hasExtras);
  const isOptionalStep = wizardStep === STEP.NPS;
  const showBack = wizardStep > STEP.BASIC;

  return (
    <Box
      className={`${c.footer} ${embedded ? c.footerEmbedded : ""}`}
      component="footer"
    >
      <Box className={c.footerSide}>
        {showBack ? (
          <Button
            className={`${c.footerBtn} ${c.footerBtnOutlined}`}
            onClick={onBack}
            disabled={isSubmitting}
            startIcon={<ArrowBack style={{ fontSize: 16 }} />}
          >
            Voltar
          </Button>
        ) : (
          <Button
            className={`${c.footerBtn} ${c.footerBtnOutlined}`}
            onClick={onClose}
            disabled={isSubmitting}
          >
            Sair
          </Button>
        )}
      </Box>

      <Box className={c.footerCenter}>
        <Button
          className={`${c.footerBtnText} ${
            isOptionalStep && !isLast ? "" : c.footerBtnHidden
          }`}
          onClick={onSkip}
          disabled={isSubmitting}
          startIcon={<SkipNext style={{ fontSize: 16 }} />}
          tabIndex={isOptionalStep && !isLast ? 0 : -1}
        >
          Pular
        </Button>
      </Box>

      <Box className={`${c.footerSide} ${c.footerSideRight}`}>
        {!isLast ? (
          <Button
            className={`${c.footerBtn} ${c.footerBtnPrimary}`}
            onClick={onNext}
            disabled={isSubmitting}
            endIcon={<ArrowForward style={{ fontSize: 16 }} />}
          >
            Avançar
          </Button>
        ) : (
          <Button
            className={c.footerBtnSubmit}
            onClick={onSubmit}
            disabled={isSubmitting}
            startIcon={
              isSubmitting ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <Check style={{ fontSize: 16 }} />
              )
            }
          >
            {isEdit
              ? i18n.t("whatsappModal.buttons.okEdit")
              : i18n.t("whatsappModal.buttons.okAdd")}
          </Button>
        )}
      </Box>
    </Box>
  );
};
