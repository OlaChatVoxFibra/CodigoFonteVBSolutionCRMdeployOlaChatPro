/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useState } from "react";

import Grid from "@material-ui/core/Grid";
import MenuItem from "@material-ui/core/MenuItem";
import { Box } from "@material-ui/core";
import Typography from "@material-ui/core/Typography";
import TextField from "@material-ui/core/TextField";

import useSettings from "../../hooks/useSettings";
import { makeStyles } from "@material-ui/core/styles";

import { i18n } from "../../translate/i18n";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import ManualVisualIdentityAdminModal from "./ManualVisualIdentityAdminModal";
import { isPlatformAdminEmail } from "../../constants/fullOrgSettingsAdmin";

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
    /** Alinha com Identidade Visual: um pouco acima e à esquerda dentro do Paper de /settings */
    marginTop: theme.spacing(-0.5),
    marginLeft: theme.spacing(-0.75),
    [theme.breakpoints.down("sm")]: {
      marginLeft: theme.spacing(-0.5),
    },
  },
  sheet: {
    width: "100%",
    borderRadius: 0,
    backgroundColor: "transparent",
    border: "none",
    boxShadow: "none",
    overflow: "visible",
    "& .MuiGrid-item": {
      minWidth: 0,
    },
  },
  sectionBlock: {
    padding: theme.spacing(3),
    "&:first-of-type": {
      paddingTop: theme.spacing(1.5),
    },
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(2),
    },
    "&:not(:first-of-type)": {
      borderTop:
        theme.mode === "light"
          ? "1px solid rgba(15, 23, 42, 0.08)"
          : "1px solid rgba(255, 255, 255, 0.08)",
    },
  },
  sectionTitle: {
    fontWeight: 400,
    letterSpacing: "-0.02em",
    fontSize: "1.05rem",
    marginBottom: theme.spacing(0.5),
  },
  sectionHint: {
    display: "block",
    marginBottom: theme.spacing(2.5),
    lineHeight: 1.5,
    maxWidth: 720,
  },
  /** Coluna do grid: estica para alinhar linhas entre si */
  gridItem: {
    display: "flex",
    alignItems: "stretch",
  },
  /** Cartão por opção — hover com leve elevação */
  fieldShell: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100%",
    minHeight: 0,
    padding: theme.spacing(2),
    borderRadius: 10,
    border: `1px solid ${
      theme.palette.type === "dark"
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(15, 23, 42, 0.08)"
    }`,
    backgroundColor:
      theme.palette.type === "dark"
        ? "rgba(255, 255, 255, 0.03)"
        : "#f8fafc",
    boxSizing: "border-box",
    cursor: "default",
    willChange: "transform, box-shadow",
    transition:
      "border-color 0.28s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.28s cubic-bezier(0.4, 0, 0.2, 1), transform 0.28s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.28s ease",
    "&:hover": {
      borderColor:
        theme.palette.type === "dark"
          ? "rgba(255, 255, 255, 0.22)"
          : "rgba(37, 99, 235, 0.35)",
      boxShadow:
        theme.palette.type === "dark"
          ? "0 10px 28px rgba(0, 0, 0, 0.35)"
          : "0 10px 28px rgba(15, 23, 42, 0.1)",
      transform: "translateY(-3px)",
      backgroundColor:
        theme.palette.type === "dark"
          ? "rgba(255, 255, 255, 0.055)"
          : "#ffffff",
    },
  },
  textFieldShell: {
    width: "100%",
    "& .MuiOutlinedInput-root": {
      borderRadius: 8,
    },
    "& .MuiOutlinedInput-input": {
      fontSize: "0.8125rem",
    },
    "& .MuiInputLabel-outlined": {
      fontSize: "0.8125rem",
    },
    "& .MuiFormHelperText-root": {
      fontSize: "0.75rem",
    },
  },
  selectField: {
    width: "100%",
    "& .MuiOutlinedInput-root": {
      borderRadius: 8,
    },
    "& .MuiOutlinedInput-input": {
      paddingTop: theme.spacing(1.25),
      paddingBottom: theme.spacing(1.25),
      fontSize: "0.8125rem",
    },
    "& .MuiInputLabel-outlined": {
      fontSize: "0.8125rem",
    },
    "& .MuiFormHelperText-root": {
      fontSize: "0.75rem",
      marginTop: theme.spacing(0.75),
    },
  },
  /** Área fixa da legenda — mesma altura em todos os cartões */
  legendSlot: {
    marginTop: theme.spacing(1.5),
    minHeight: "3.25em",
    flexShrink: 0,
    display: "flex",
    alignItems: "flex-start",
  },
  fieldLegendText: {
    margin: 0,
    fontSize: "0.8125rem",
    lineHeight: 1.45,
    letterSpacing: "0.01em",
    color: theme.palette.text.secondary,
  },
  optionsGrid: {
    width: "100%",
  },
}));

/** Select outlined + legenda fixa (altura uniforme) */
function OptionSelectField({
  classes,
  label,
  value,
  onChange,
  loading,
  children,
  legend,
}) {
  return (
    <Box className={classes.fieldShell}>
      <TextField
        select
        fullWidth
        variant="outlined"
        size="small"
        label={label}
        value={value}
        onChange={onChange}
        helperText={
          loading ? i18n.t("settings.settings.options.updating") : undefined
        }
        className={classes.selectField}
      >
        {children}
      </TextField>
      <Box className={classes.legendSlot}>
        <Typography component="div" className={classes.fieldLegendText}>
          {legend}
        </Typography>
      </Box>
    </Box>
  );
}

/** Legenda abaixo de TextField multilinha */
function FieldLegendBlock({ classes, legend, children }) {
  return (
    <Box className={classes.fieldShell}>
      <Box className={classes.textFieldShell}>{children}</Box>
      <Box className={classes.legendSlot}>
        <Typography component="div" className={classes.fieldLegendText}>
          {legend}
        </Typography>
      </Box>
    </Box>
  );
}

export default function Options(props) {
  const { oldSettings = {}, settings = {}, scheduleTypeChanged, user } = props;

  const classes = useStyles();
  const optLegend = (key) =>
    i18n.t(`settings.settings.options.legends.${key}`);
  const [userRating, setUserRating] = useState("disabled");
  const [scheduleType, setScheduleType] = useState("disabled");
  const [chatBotType, setChatBotType] = useState("text");

  const [loadingUserRating, setLoadingUserRating] = useState(false);
  const [loadingScheduleType, setLoadingScheduleType] = useState(false);

  const [userCreation, setUserCreation] = useState("enabled");
  const [loadingUserCreation, setLoadingUserCreation] = useState(false);

  const [SendGreetingAccepted, setSendGreetingAccepted] = useState("enabled");
  const [loadingSendGreetingAccepted, setLoadingSendGreetingAccepted] =
    useState(false);

  const [UserRandom, setUserRandom] = useState("enabled");
  const [loadingUserRandom, setLoadingUserRandom] = useState(false);

  const [SettingsTransfTicket, setSettingsTransfTicket] = useState("enabled");
  const [loadingSettingsTransfTicket, setLoadingSettingsTransfTicket] =
    useState(false);

  const [AcceptCallWhatsapp, setAcceptCallWhatsapp] = useState("enabled");
  const [loadingAcceptCallWhatsapp, setLoadingAcceptCallWhatsapp] =
    useState(false);

  const [sendSignMessage, setSendSignMessage] = useState("enabled");
  const [loadingSendSignMessage, setLoadingSendSignMessage] = useState(false);

  const [sendGreetingMessageOneQueues, setSendGreetingMessageOneQueues] =
    useState("enabled");
  const [
    loadingSendGreetingMessageOneQueues,
    setLoadingSendGreetingMessageOneQueues,
  ] = useState(false);

  const [sendQueuePosition, setSendQueuePosition] = useState("enabled");
  const [loadingSendQueuePosition, setLoadingSendQueuePosition] =
    useState(false);

  const [sendFarewellWaitingTicket, setSendFarewellWaitingTicket] =
    useState("enabled");
  const [
    loadingSendFarewellWaitingTicket,
    setLoadingSendFarewellWaitingTicket,
  ] = useState(false);

  const [acceptAudioMessageContact, setAcceptAudioMessageContact] =
    useState("enabled");
  const [
    loadingAcceptAudioMessageContact,
    setLoadingAcceptAudioMessageContact,
  ] = useState(false);

  const [enableLGPD, setEnableLGPD] = useState("disabled");
  const [loadingEnableLGPD, setLoadingEnableLGPD] = useState(false);

  const [lgpdMessage, setLGPDMessage] = useState("");
  const [loadinglgpdMessage, setLoadingLGPDMessage] = useState(false);

  const [lgpdLink, setLGPDLink] = useState("");
  const [loadingLGPDLink, setLoadingLGPDLink] = useState(false);

  const [lgpdDeleteMessage, setLGPDDeleteMessage] = useState("disabled");
  const [loadingLGPDDeleteMessage, setLoadingLGPDDeleteMessage] =
    useState(false);

  const [lgpdConsent, setLGPDConsent] = useState("disabled");
  const [loadingLGPDConsent, setLoadingLGPDConsent] = useState(false);

  const [lgpdHideNumber, setLGPDHideNumber] = useState("disabled");
  const [loadingLGPDHideNumber, setLoadingLGPDHideNumber] = useState(false);

  const [requiredTag, setRequiredTag] = useState("enabled");
  const [loadingRequiredTag, setLoadingRequiredTag] = useState(false);

  const [closeTicketOnTransfer, setCloseTicketOnTransfer] = useState(false);
  const [loadingCloseTicketOnTransfer, setLoadingCloseTicketOnTransfer] =
    useState(false);

  const [directTicketsToWallets, setDirectTicketsToWallets] = useState(false);
  const [loadingDirectTicketsToWallets, setLoadingDirectTicketsToWallets] =
    useState(false);

  const [transferMessage, setTransferMessage] = useState("");
  const [loadingTransferMessage, setLoadingTransferMessage] = useState(false);

  const [greetingAcceptedMessage, setGreetingAcceptedMessage] = useState("");
  const [
    loadingGreetingAcceptedMessage,
    setLoadingGreetingAcceptedMessage,
  ] = useState(false);

  const [AcceptCallWhatsappMessage, setAcceptCallWhatsappMessage] =
    useState("");
  const [
    loadingAcceptCallWhatsappMessage,
    setLoadingAcceptCallWhatsappMessage,
  ] = useState(false);

  const [sendQueuePositionMessage, setSendQueuePositionMessage] = useState("");
  const [
    loadingSendQueuePositionMessage,
    setLoadingSendQueuePositionMessage,
  ] = useState(false);

  const [showNotificationPending, setShowNotificationPending] = useState(false);
  const [loadingShowNotificationPending, setLoadingShowNotificationPending] =
    useState(false);

  const { update: updateUserCreation } = useSettings();
  const { update } = useCompanySettings();

  const isSuper = () => {
    return user.super;
  };

  const canEditGlobalUserCreation = () =>
    user.super || isPlatformAdminEmail(user?.email);

  useEffect(() => {
    if (Array.isArray(oldSettings) && oldSettings.length) {
      const userPar = oldSettings.find((s) => s.key === "userCreation");
      if (userPar) {
        setUserCreation(userPar.value);
      }
    }
  }, [oldSettings]);

  useEffect(() => {
    const entries = Object.entries(settings || {});
    for (const [key, value] of entries) {
      if (key === "userRating") setUserRating(value);
      if (key === "scheduleType") setScheduleType(value);
      if (key === "chatBotType") setChatBotType(value);
      if (key === "acceptCallWhatsapp") setAcceptCallWhatsapp(value);
      if (key === "userRandom") setUserRandom(value);
      if (key === "sendGreetingMessageOneQueues")
        setSendGreetingMessageOneQueues(value);
      if (key === "sendSignMessage") setSendSignMessage(value);
      if (key === "sendFarewellWaitingTicket")
        setSendFarewellWaitingTicket(value);
      if (key === "sendGreetingAccepted") setSendGreetingAccepted(value);
      if (key === "sendQueuePosition") setSendQueuePosition(value);
      if (key === "acceptAudioMessageContact")
        setAcceptAudioMessageContact(value);
      if (key === "enableLGPD") setEnableLGPD(value);
      if (key === "requiredTag") setRequiredTag(value);
      if (key === "lgpdDeleteMessage") setLGPDDeleteMessage(value);
      if (key === "lgpdHideNumber") setLGPDHideNumber(value);
      if (key === "lgpdConsent") setLGPDConsent(value);
      if (key === "lgpdMessage") setLGPDMessage(value);
      if (key === "sendMsgTransfTicket") setSettingsTransfTicket(value);
      if (key === "lgpdLink") setLGPDLink(value);
      if (key === "DirectTicketsToWallets") setDirectTicketsToWallets(value);
      if (key === "closeTicketOnTransfer") setCloseTicketOnTransfer(value);
      if (key === "transferMessage") setTransferMessage(value);
      if (key === "greetingAcceptedMessage")
        setGreetingAcceptedMessage(value);
      if (key === "AcceptCallWhatsappMessage")
        setAcceptCallWhatsappMessage(value);
      if (key === "sendQueuePositionMessage")
        setSendQueuePositionMessage(value);
      if (key === "showNotificationPending") setShowNotificationPending(value);
    }
  }, [settings]);

  async function handleChangeUserCreation(value) {
    setUserCreation(value);
    setLoadingUserCreation(true);
    await updateUserCreation({
      key: "userCreation",
      value,
    });
    setLoadingUserCreation(false);
  }

  async function handleChangeUserRating(value) {
    setUserRating(value);
    setLoadingUserRating(true);
    await update({
      column: "userRating",
      data: value,
    });
    setLoadingUserRating(false);
  }

  async function handleScheduleType(value) {
    setScheduleType(value);
    setLoadingScheduleType(true);
    await update({
      column: "scheduleType",
      data: value,
    });
    setLoadingScheduleType(false);
    if (typeof scheduleTypeChanged === "function") {
      scheduleTypeChanged(value);
    }
  }

  async function handleChatBotType(value) {
    setChatBotType(value);
    await update({
      column: "chatBotType",
      data: value,
    });
  }

  async function handleLGPDMessage(value) {
    setLGPDMessage(value);
    setLoadingLGPDMessage(true);
    await update({
      column: "lgpdMessage",
      data: value,
    });
    setLoadingLGPDMessage(false);
  }

  async function handletransferMessage(value) {
    setTransferMessage(value);
    setLoadingTransferMessage(true);
    await update({
      column: "transferMessage",
      data: value,
    });
    setLoadingTransferMessage(false);
  }

  async function handleGreetingAcceptedMessage(value) {
    setGreetingAcceptedMessage(value);
    setLoadingGreetingAcceptedMessage(true);
    await update({
      column: "greetingAcceptedMessage",
      data: value,
    });
    setLoadingGreetingAcceptedMessage(false);
  }

  async function handleAcceptCallWhatsappMessage(value) {
    setAcceptCallWhatsappMessage(value);
    setLoadingAcceptCallWhatsappMessage(true);
    await update({
      column: "AcceptCallWhatsappMessage",
      data: value,
    });
    setLoadingAcceptCallWhatsappMessage(false);
  }

  async function handlesendQueuePositionMessage(value) {
    setSendQueuePositionMessage(value);
    setLoadingSendQueuePositionMessage(true);
    await update({
      column: "sendQueuePositionMessage",
      data: value,
    });
    setLoadingSendQueuePositionMessage(false);
  }

  async function handleShowNotificationPending(value) {
    setShowNotificationPending(value);
    setLoadingShowNotificationPending(true);
    await update({
      column: "showNotificationPending",
      data: value,
    });
    setLoadingShowNotificationPending(false);
  }

  async function handleLGPDLink(value) {
    setLGPDLink(value);
    setLoadingLGPDLink(true);
    await update({
      column: "lgpdLink",
      data: value,
    });
    setLoadingLGPDLink(false);
  }

  async function handleLGPDDeleteMessage(value) {
    setLGPDDeleteMessage(value);
    setLoadingLGPDDeleteMessage(true);
    await update({
      column: "lgpdDeleteMessage",
      data: value,
    });
    setLoadingLGPDDeleteMessage(false);
  }

  async function handleLGPDConsent(value) {
    setLGPDConsent(value);
    setLoadingLGPDConsent(true);
    await update({
      column: "lgpdConsent",
      data: value,
    });
    setLoadingLGPDConsent(false);
  }

  async function handleLGPDHideNumber(value) {
    setLGPDHideNumber(value);
    setLoadingLGPDHideNumber(true);
    await update({
      column: "lgpdHideNumber",
      data: value,
    });
    setLoadingLGPDHideNumber(false);
  }

  async function handleSendGreetingAccepted(value) {
    setSendGreetingAccepted(value);
    setLoadingSendGreetingAccepted(true);
    await update({
      column: "sendGreetingAccepted",
      data: value,
    });
    setLoadingSendGreetingAccepted(false);
  }

  async function handleUserRandom(value) {
    setUserRandom(value);
    setLoadingUserRandom(true);
    await update({
      column: "userRandom",
      data: value,
    });
    setLoadingUserRandom(false);
  }

  async function handleSettingsTransfTicket(value) {
    setSettingsTransfTicket(value);
    setLoadingSettingsTransfTicket(true);
    await update({
      column: "sendMsgTransfTicket",
      data: value,
    });
    setLoadingSettingsTransfTicket(false);
  }

  async function handleAcceptCallWhatsapp(value) {
    setAcceptCallWhatsapp(value);
    setLoadingAcceptCallWhatsapp(true);
    await update({
      column: "acceptCallWhatsapp",
      data: value,
    });
    setLoadingAcceptCallWhatsapp(false);
  }

  async function handleSendSignMessage(value) {
    setSendSignMessage(value);
    setLoadingSendSignMessage(true);
    await update({
      column: "sendSignMessage",
      data: value,
    });
    localStorage.setItem(
      "sendSignMessage",
      value === "enabled" ? true : false
    );
    setLoadingSendSignMessage(false);
  }

  async function handleSendGreetingMessageOneQueues(value) {
    setSendGreetingMessageOneQueues(value);
    setLoadingSendGreetingMessageOneQueues(true);
    await update({
      column: "sendGreetingMessageOneQueues",
      data: value,
    });
    setLoadingSendGreetingMessageOneQueues(false);
  }

  async function handleSendQueuePosition(value) {
    setSendQueuePosition(value);
    setLoadingSendQueuePosition(true);
    await update({
      column: "sendQueuePosition",
      data: value,
    });
    setLoadingSendQueuePosition(false);
  }

  async function handleSendFarewellWaitingTicket(value) {
    setSendFarewellWaitingTicket(value);
    setLoadingSendFarewellWaitingTicket(true);
    await update({
      column: "sendFarewellWaitingTicket",
      data: value,
    });
    setLoadingSendFarewellWaitingTicket(false);
  }

  async function handleAcceptAudioMessageContact(value) {
    setAcceptAudioMessageContact(value);
    setLoadingAcceptAudioMessageContact(true);
    await update({
      column: "acceptAudioMessageContact",
      data: value,
    });
    setLoadingAcceptAudioMessageContact(false);
  }

  async function handleEnableLGPD(value) {
    setEnableLGPD(value);
    setLoadingEnableLGPD(true);
    await update({
      column: "enableLGPD",
      data: value,
    });
    setLoadingEnableLGPD(false);
  }

  async function handleRequiredTag(value) {
    setRequiredTag(value);
    setLoadingRequiredTag(true);
    await update({
      column: "requiredTag",
      data: value,
    });
    setLoadingRequiredTag(false);
  }

  async function handleCloseTicketOnTransfer(value) {
    setCloseTicketOnTransfer(value);
    setLoadingCloseTicketOnTransfer(true);
    await update({
      column: "closeTicketOnTransfer",
      data: value,
    });
    setLoadingCloseTicketOnTransfer(false);
  }

  async function handleDirectTicketsToWallets(value) {
    setDirectTicketsToWallets(value);
    setLoadingDirectTicketsToWallets(true);
    await update({
      column: "DirectTicketsToWallets",
      data: value,
    });
    setLoadingDirectTicketsToWallets(false);
  }

  return (
    <Box className={classes.root}>
      <Box className={classes.sheet}>
        <Box className={classes.sectionBlock}>
        <Typography className={classes.sectionTitle} component="h2">
          {i18n.t("settings.settings.options.sectionGeneral")}
        </Typography>
        <Typography
          className={classes.sectionHint}
          variant="caption"
          color="textSecondary"
          component="p"
        >
          {i18n.t("settings.settings.options.sectionGeneralHint")}
        </Typography>

        <Grid container spacing={3} className={classes.optionsGrid}>
          {canEditGlobalUserCreation() ? (
            <Grid xs={12} sm={6} md={4} item className={classes.gridItem}>
              <OptionSelectField
                classes={classes}
                label={i18n.t("settings.settings.options.creationCompanyUser")}
                value={userCreation}
                onChange={async (e) => {
                  handleChangeUserCreation(e.target.value);
                }}
                loading={loadingUserCreation}
                legend={optLegend("userCreation")}
              >
                <MenuItem value={"disabled"}>
                  {i18n.t("settings.settings.options.disabled")}
                </MenuItem>
                <MenuItem value={"enabled"}>
                  {i18n.t("settings.settings.options.enabled")}
                </MenuItem>
              </OptionSelectField>
            </Grid>
          ) : null}

          {isPlatformAdminEmail(user?.email) ? (
            <Grid xs={12} sm={6} md={4} item className={classes.gridItem}>
              <ManualVisualIdentityAdminModal classes={classes} />
            </Grid>
          ) : null}

          <Grid xs={12} sm={6} md={4} item className={classes.gridItem}>
            <OptionSelectField
              classes={classes}
              label={i18n.t("settings.settings.options.evaluations")}
              value={userRating}
              onChange={async (e) => {
                handleChangeUserRating(e.target.value);
              }}
              loading={loadingUserRating}
              legend={optLegend("evaluations")}
            >
              <MenuItem value={"disabled"}>
                {i18n.t("settings.settings.options.disabled")}
              </MenuItem>
              <MenuItem value={"enabled"}>
                {i18n.t("settings.settings.options.enabled")}
              </MenuItem>
            </OptionSelectField>
          </Grid>

          <Grid xs={12} sm={6} md={4} item className={classes.gridItem}>
            <OptionSelectField
              classes={classes}
              label={i18n.t("settings.settings.options.officeScheduling")}
              value={scheduleType}
              onChange={async (e) => {
                handleScheduleType(e.target.value);
              }}
              loading={loadingScheduleType}
              legend={optLegend("officeScheduling")}
            >
              <MenuItem value={"disabled"}>
                {i18n.t("settings.settings.options.disabled")}
              </MenuItem>
              <MenuItem value={"queue"}>
                {i18n.t("settings.settings.options.queueManagement")}
              </MenuItem>
              <MenuItem value={"company"}>
                {i18n.t("settings.settings.options.companyManagement")}
              </MenuItem>
              <MenuItem value={"connection"}>
                {i18n.t("settings.settings.options.connectionManagement")}
              </MenuItem>
            </OptionSelectField>
          </Grid>

          <Grid xs={12} sm={6} md={4} item className={classes.gridItem}>
            <OptionSelectField
              classes={classes}
              label={i18n.t("settings.settings.options.sendGreetingAccepted")}
              value={SendGreetingAccepted}
              onChange={async (e) => {
                handleSendGreetingAccepted(e.target.value);
              }}
              loading={loadingSendGreetingAccepted}
              legend={optLegend("sendGreetingAccepted")}
            >
              <MenuItem value={"disabled"}>
                {i18n.t("settings.settings.options.disabled")}
              </MenuItem>
              <MenuItem value={"enabled"}>
                {i18n.t("settings.settings.options.enabled")}
              </MenuItem>
            </OptionSelectField>
          </Grid>

          <Grid xs={12} sm={6} md={4} item className={classes.gridItem}>
            <OptionSelectField
              classes={classes}
              label={i18n.t("settings.settings.options.userRandom")}
              value={UserRandom}
              onChange={async (e) => {
                handleUserRandom(e.target.value);
              }}
              loading={loadingUserRandom}
              legend={optLegend("userRandom")}
            >
              <MenuItem value={"disabled"}>
                {i18n.t("settings.settings.options.disabled")}
              </MenuItem>
              <MenuItem value={"enabled"}>
                {i18n.t("settings.settings.options.enabled")}
              </MenuItem>
            </OptionSelectField>
          </Grid>

          <Grid xs={12} sm={6} md={4} item className={classes.gridItem}>
            <OptionSelectField
              classes={classes}
              label={i18n.t("settings.settings.options.sendMsgTransfTicket")}
              value={SettingsTransfTicket}
              onChange={async (e) => {
                handleSettingsTransfTicket(e.target.value);
              }}
              loading={loadingSettingsTransfTicket}
              legend={optLegend("sendMsgTransfTicket")}
            >
              <MenuItem value={"disabled"}>
                {i18n.t("settings.settings.options.disabled")}
              </MenuItem>
              <MenuItem value={"enabled"}>
                {i18n.t("settings.settings.options.enabled")}
              </MenuItem>
            </OptionSelectField>
          </Grid>

          <Grid xs={12} sm={6} md={4} item className={classes.gridItem}>
            <OptionSelectField
              classes={classes}
              label={i18n.t("settings.settings.options.chatBotType")}
              value={chatBotType}
              onChange={async (e) => {
                handleChatBotType(e.target.value);
              }}
              loading={false}
              legend={optLegend("chatBotType")}
            >
              <MenuItem value={"text"}>Texto</MenuItem>
            </OptionSelectField>
          </Grid>

          <Grid xs={12} sm={6} md={4} item className={classes.gridItem}>
            <OptionSelectField
              classes={classes}
              label={i18n.t("settings.settings.options.acceptCallWhatsapp")}
              value={AcceptCallWhatsapp}
              onChange={async (e) => {
                handleAcceptCallWhatsapp(e.target.value);
              }}
              loading={loadingAcceptCallWhatsapp}
              legend={optLegend("acceptCallWhatsapp")}
            >
              <MenuItem value={"disabled"}>
                {i18n.t("settings.settings.options.disabled")}
              </MenuItem>
              <MenuItem value={"enabled"}>
                {i18n.t("settings.settings.options.enabled")}
              </MenuItem>
            </OptionSelectField>
          </Grid>

          <Grid xs={12} sm={6} md={4} item className={classes.gridItem}>
            <OptionSelectField
              classes={classes}
              label={i18n.t("settings.settings.options.sendSignMessage")}
              value={sendSignMessage}
              onChange={async (e) => {
                handleSendSignMessage(e.target.value);
              }}
              loading={loadingSendSignMessage}
              legend={optLegend("sendSignMessage")}
            >
              <MenuItem value={"disabled"}>
                {i18n.t("settings.settings.options.disabled")}
              </MenuItem>
              <MenuItem value={"enabled"}>
                {i18n.t("settings.settings.options.enabled")}
              </MenuItem>
            </OptionSelectField>
          </Grid>

          <Grid xs={12} sm={6} md={4} item className={classes.gridItem}>
            <OptionSelectField
              classes={classes}
              label={"Notificar Novos Tickets Pendentes"}
              value={showNotificationPending}
              onChange={async (e) => {
                handleShowNotificationPending(e.target.value);
              }}
              loading={loadingShowNotificationPending}
              legend={"Se Sim, o sistema emitirá notificações visuais/sonoras para tickets que entrarem em Aguardando."}
            >
              <MenuItem value={true}>Sim</MenuItem>
              <MenuItem value={false}>Não</MenuItem>
            </OptionSelectField>
          </Grid>

          <Grid xs={12} sm={6} md={4} item className={classes.gridItem}>
            <OptionSelectField
              classes={classes}
              label={i18n.t(
                "settings.settings.options.sendGreetingMessageOneQueues"
              )}
              value={sendGreetingMessageOneQueues}
              onChange={async (e) => {
                handleSendGreetingMessageOneQueues(e.target.value);
              }}
              loading={loadingSendGreetingMessageOneQueues}
              legend={optLegend("sendGreetingMessageOneQueues")}
            >
              <MenuItem value={"disabled"}>
                {i18n.t("settings.settings.options.disabled")}
              </MenuItem>
              <MenuItem value={"enabled"}>
                {i18n.t("settings.settings.options.enabled")}
              </MenuItem>
            </OptionSelectField>
          </Grid>

          <Grid xs={12} sm={6} md={4} item className={classes.gridItem}>
            <OptionSelectField
              classes={classes}
              label={i18n.t("settings.settings.options.sendQueuePosition")}
              value={sendQueuePosition}
              onChange={async (e) => {
                handleSendQueuePosition(e.target.value);
              }}
              loading={loadingSendQueuePosition}
              legend={optLegend("sendQueuePosition")}
            >
              <MenuItem value={"disabled"}>
                {i18n.t("settings.settings.options.disabled")}
              </MenuItem>
              <MenuItem value={"enabled"}>
                {i18n.t("settings.settings.options.enabled")}
              </MenuItem>
            </OptionSelectField>
          </Grid>

          <Grid xs={12} sm={6} md={4} item className={classes.gridItem}>
            <OptionSelectField
              classes={classes}
              label={i18n.t(
                "settings.settings.options.sendFarewellWaitingTicket"
              )}
              value={sendFarewellWaitingTicket}
              onChange={async (e) => {
                handleSendFarewellWaitingTicket(e.target.value);
              }}
              loading={loadingSendFarewellWaitingTicket}
              legend={optLegend("sendFarewellWaitingTicket")}
            >
              <MenuItem value={"disabled"}>
                {i18n.t("settings.settings.options.disabled")}
              </MenuItem>
              <MenuItem value={"enabled"}>
                {i18n.t("settings.settings.options.enabled")}
              </MenuItem>
            </OptionSelectField>
          </Grid>

          <Grid xs={12} sm={6} md={4} item className={classes.gridItem}>
            <OptionSelectField
              classes={classes}
              label={i18n.t(
                "settings.settings.options.acceptAudioMessageContact"
              )}
              value={acceptAudioMessageContact}
              onChange={async (e) => {
                handleAcceptAudioMessageContact(e.target.value);
              }}
              loading={loadingAcceptAudioMessageContact}
              legend={optLegend("acceptAudioMessageContact")}
            >
              <MenuItem value={"disabled"}>
                {i18n.t("settings.settings.options.disabled")}
              </MenuItem>
              <MenuItem value={"enabled"}>
                {i18n.t("settings.settings.options.enabled")}
              </MenuItem>
            </OptionSelectField>
          </Grid>

          <Grid xs={12} sm={6} md={4} item className={classes.gridItem}>
            <OptionSelectField
              classes={classes}
              label={i18n.t("settings.settings.options.enableLGPD")}
              value={enableLGPD}
              onChange={async (e) => {
                handleEnableLGPD(e.target.value);
              }}
              loading={loadingEnableLGPD}
              legend={optLegend("enableLGPD")}
            >
              <MenuItem value={"disabled"}>
                {i18n.t("settings.settings.options.disabled")}
              </MenuItem>
              <MenuItem value={"enabled"}>
                {i18n.t("settings.settings.options.enabled")}
              </MenuItem>
            </OptionSelectField>
          </Grid>

          <Grid xs={12} sm={6} md={4} item className={classes.gridItem}>
            <OptionSelectField
              classes={classes}
              label={i18n.t("settings.settings.options.requiredTag")}
              value={requiredTag}
              onChange={async (e) => {
                handleRequiredTag(e.target.value);
              }}
              loading={loadingRequiredTag}
              legend={optLegend("requiredTag")}
            >
              <MenuItem value={"disabled"}>
                {i18n.t("settings.settings.options.disabled")}
              </MenuItem>
              <MenuItem value={"enabled"}>
                {i18n.t("settings.settings.options.enabled")}
              </MenuItem>
            </OptionSelectField>
          </Grid>

          <Grid xs={12} sm={6} md={4} item className={classes.gridItem}>
            <OptionSelectField
              classes={classes}
              label={i18n.t(
                "settings.settings.options.closeTicketOnTransfer"
              )}
              value={closeTicketOnTransfer}
              onChange={async (e) => {
                handleCloseTicketOnTransfer(e.target.value);
              }}
              loading={loadingCloseTicketOnTransfer}
              legend={optLegend("closeTicketOnTransfer")}
            >
              <MenuItem value={false}>
                {i18n.t("settings.settings.options.disabled")}
              </MenuItem>
              <MenuItem value={true}>
                {i18n.t("settings.settings.options.enabled")}
              </MenuItem>
            </OptionSelectField>
          </Grid>

          <Grid xs={12} sm={6} md={4} item className={classes.gridItem}>
            <OptionSelectField
              classes={classes}
              label={i18n.t(
                "settings.settings.options.showNotificationPending"
              )}
              value={showNotificationPending}
              onChange={async (e) => {
                handleShowNotificationPending(e.target.value);
              }}
              loading={loadingShowNotificationPending}
              legend={optLegend("showNotificationPending")}
            >
              <MenuItem value={false}>
                {i18n.t("settings.settings.options.disabled")}
              </MenuItem>
              <MenuItem value={true}>
                {i18n.t("settings.settings.options.enabled")}
              </MenuItem>
            </OptionSelectField>
          </Grid>

          <Grid xs={12} sm={6} md={4} item className={classes.gridItem}>
            <OptionSelectField
              classes={classes}
              label={i18n.t(
                "settings.settings.options.DirectTicketsToWallets"
              )}
              value={directTicketsToWallets}
              onChange={async (e) => {
                handleDirectTicketsToWallets(e.target.value);
              }}
              loading={loadingDirectTicketsToWallets}
              legend={optLegend("directTicketsToWallets")}
            >
              <MenuItem value={false}>
                {i18n.t("settings.settings.options.disabled")}
              </MenuItem>
              <MenuItem value={true}>
                {i18n.t("settings.settings.options.enabled")}
              </MenuItem>
            </OptionSelectField>
          </Grid>
        </Grid>
        </Box>

      {enableLGPD === "enabled" && (
        <Box className={classes.sectionBlock}>
          <Typography className={classes.sectionTitle} component="h2">
            {i18n.t("settings.settings.LGPD.title")}
          </Typography>
          <Typography
            className={classes.sectionHint}
            variant="caption"
            color="textSecondary"
            component="p"
          >
            {i18n.t("settings.settings.options.sectionLgpdHint")}
          </Typography>

          <Grid container spacing={3} className={classes.optionsGrid}>
            <Grid xs={12} sm={6} md={12} item className={classes.gridItem}>
              <FieldLegendBlock
                classes={classes}
                legend={optLegend("lgpdWelcome")}
              >
                <TextField
                  id="lgpdMessage"
                  name="lgpdMessage"
                  multiline
                  rows={3}
                  label={i18n.t("settings.settings.LGPD.welcome")}
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={lgpdMessage}
                  onChange={async (e) => {
                    handleLGPDMessage(e.target.value);
                  }}
                  helperText={
                    loadinglgpdMessage
                      ? i18n.t("settings.settings.options.updating")
                      : undefined
                  }
                />
              </FieldLegendBlock>
            </Grid>
            <Grid xs={12} sm={6} md={12} item className={classes.gridItem}>
              <FieldLegendBlock
                classes={classes}
                legend={optLegend("lgpdLink")}
              >
                <TextField
                  id="lgpdLink"
                  name="lgpdLink"
                  label={i18n.t("settings.settings.LGPD.linkLGPD")}
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={lgpdLink}
                  onChange={async (e) => {
                    handleLGPDLink(e.target.value);
                  }}
                  helperText={
                    loadingLGPDLink
                      ? i18n.t("settings.settings.options.updating")
                      : undefined
                  }
                />
              </FieldLegendBlock>
            </Grid>
            <Grid xs={12} sm={6} md={4} item className={classes.gridItem}>
              <OptionSelectField
                classes={classes}
                label={i18n.t(
                  "settings.settings.LGPD.obfuscateMessageDelete"
                )}
                value={lgpdDeleteMessage}
                onChange={async (e) => {
                  handleLGPDDeleteMessage(e.target.value);
                }}
                loading={loadingLGPDDeleteMessage}
                legend={optLegend("lgpdObfuscateDelete")}
              >
                <MenuItem value={"disabled"}>
                  {i18n.t("settings.settings.LGPD.disabled")}
                </MenuItem>
                <MenuItem value={"enabled"}>
                  {i18n.t("settings.settings.LGPD.enabled")}
                </MenuItem>
              </OptionSelectField>
            </Grid>
            <Grid xs={12} sm={6} md={4} item className={classes.gridItem}>
              <OptionSelectField
                classes={classes}
                label={i18n.t("settings.settings.LGPD.alwaysConsent")}
                value={lgpdConsent}
                onChange={async (e) => {
                  handleLGPDConsent(e.target.value);
                }}
                loading={loadingLGPDConsent}
                legend={optLegend("lgpdAlwaysConsent")}
              >
                <MenuItem value={"disabled"}>
                  {i18n.t("settings.settings.LGPD.disabled")}
                </MenuItem>
                <MenuItem value={"enabled"}>
                  {i18n.t("settings.settings.LGPD.enabled")}
                </MenuItem>
              </OptionSelectField>
            </Grid>
            <Grid xs={12} sm={6} md={4} item className={classes.gridItem}>
              <OptionSelectField
                classes={classes}
                label={i18n.t("settings.settings.LGPD.obfuscatePhoneUser")}
                value={lgpdHideNumber}
                onChange={async (e) => {
                  handleLGPDHideNumber(e.target.value);
                }}
                loading={loadingLGPDHideNumber}
                legend={optLegend("lgpdObfuscatePhone")}
              >
                <MenuItem value={"disabled"}>
                  {i18n.t("settings.settings.LGPD.disabled")}
                </MenuItem>
                <MenuItem value={"enabled"}>
                  {i18n.t("settings.settings.LGPD.enabled")}
                </MenuItem>
              </OptionSelectField>
            </Grid>
          </Grid>
        </Box>
      )}

      <Box className={classes.sectionBlock}>
        <Typography className={classes.sectionTitle} component="h2">
          {i18n.t("settings.settings.options.sectionMessages")}
        </Typography>
        <Typography
          className={classes.sectionHint}
          variant="caption"
          color="textSecondary"
          component="p"
        >
          {i18n.t("settings.settings.options.sectionMessagesHint")}
        </Typography>

        <Grid container spacing={3} className={classes.optionsGrid}>
          <Grid xs={12} sm={6} md={6} item className={classes.gridItem}>
            <FieldLegendBlock
              classes={classes}
              legend={optLegend("transferMessage")}
            >
              <TextField
                id="transferMessage"
                name="transferMessage"
                multiline
                rows={3}
                fullWidth
                size="small"
                label={i18n.t(
                  "settings.settings.customMessages.transferMessage"
                )}
                variant="outlined"
                value={transferMessage}
                required={SettingsTransfTicket === "enabled"}
                onChange={async (e) => {
                  handletransferMessage(e.target.value);
                }}
                helperText={
                  loadingTransferMessage
                    ? i18n.t("settings.settings.options.updating")
                    : undefined
                }
              />
            </FieldLegendBlock>
          </Grid>

          <Grid xs={12} sm={6} md={6} item className={classes.gridItem}>
            <FieldLegendBlock
              classes={classes}
              legend={optLegend("greetingAcceptedMessage")}
            >
              <TextField
                id="greetingAcceptedMessage"
                name="greetingAcceptedMessage"
                multiline
                rows={3}
                fullWidth
                size="small"
                label={i18n.t(
                  "settings.settings.customMessages.greetingAcceptedMessage"
                )}
                variant="outlined"
                value={greetingAcceptedMessage}
                required={SendGreetingAccepted === "enabled"}
                onChange={async (e) => {
                  handleGreetingAcceptedMessage(e.target.value);
                }}
                helperText={
                  loadingGreetingAcceptedMessage
                    ? i18n.t("settings.settings.options.updating")
                    : undefined
                }
              />
            </FieldLegendBlock>
          </Grid>

          <Grid xs={12} sm={6} md={6} item className={classes.gridItem}>
            <FieldLegendBlock
              classes={classes}
              legend={optLegend("acceptCallWhatsappMessage")}
            >
              <TextField
                id="AcceptCallWhatsappMessage"
                name="AcceptCallWhatsappMessage"
                multiline
                rows={3}
                fullWidth
                size="small"
                label={i18n.t(
                  "settings.settings.customMessages.AcceptCallWhatsappMessage"
                )}
                variant="outlined"
                required={AcceptCallWhatsapp === "disabled"}
                value={AcceptCallWhatsappMessage}
                onChange={async (e) => {
                  handleAcceptCallWhatsappMessage(e.target.value);
                }}
                helperText={
                  loadingAcceptCallWhatsappMessage
                    ? i18n.t("settings.settings.options.updating")
                    : undefined
                }
              />
            </FieldLegendBlock>
          </Grid>

          <Grid xs={12} sm={6} md={6} item className={classes.gridItem}>
            <FieldLegendBlock
              classes={classes}
              legend={optLegend("sendQueuePositionMessage")}
            >
              <TextField
                id="sendQueuePositionMessage"
                name="sendQueuePositionMessage"
                multiline
                required={sendQueuePosition === "enabled"}
                rows={3}
                fullWidth
                size="small"
                label={i18n.t(
                  "settings.settings.customMessages.sendQueuePositionMessage"
                )}
                variant="outlined"
                value={sendQueuePositionMessage}
                onChange={async (e) => {
                  handlesendQueuePositionMessage(e.target.value);
                }}
                helperText={
                  loadingSendQueuePositionMessage
                    ? i18n.t("settings.settings.options.updating")
                    : undefined
                }
              />
            </FieldLegendBlock>
          </Grid>
        </Grid>
      </Box>
      </Box>
    </Box>
  );
}
