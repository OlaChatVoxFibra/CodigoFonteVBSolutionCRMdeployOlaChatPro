/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useContext, useRef } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import CircularProgress from "@material-ui/core/CircularProgress";
import Select from "@material-ui/core/Select";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import Switch from "@material-ui/core/Switch";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import { Close as CloseIcon } from "@material-ui/icons";
import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import QueueSelect from "../QueueSelect";
import { AuthContext } from "../../context/Auth/AuthContext";
import useWhatsApps from "../../hooks/useWhatsApps";

import { Can } from "../Can";
import { Grid, Box } from "@material-ui/core";
import { getBackendUrl } from "../../config";
import AvatarUploader from "../AvatarUpload";

const backendUrl = getBackendUrl();

const formatDateForInput = (date) => {
  if (!date) return '';
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateFromInput = (dateString) => {
  if (!dateString) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
  if (dateString.includes('T')) return dateString.split('T')[0];
  return dateString;
};

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const borderColor = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)";
  const surfaceBg = isDark ? "rgba(255,255,255,0.04)" : "#f9fafb";

  return {
    dialog: {
      "& .MuiDialog-paper": {
        borderRadius: 16,
        maxWidth: 520,
        width: "100%",
        margin: 16,
        overflow: "hidden",
        boxShadow: isDark
          ? "0 24px 48px rgba(0,0,0,0.5)"
          : "0 24px 48px rgba(0,0,0,0.12)",
      },
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "14px 20px 10px",
      borderBottom: `1px solid ${borderColor}`,
    },
    headerTitle: {
      fontSize: "0.9375rem",
      fontWeight: 600,
      letterSpacing: "-0.01em",
      color: theme.palette.text.primary,
    },
    closeBtn: {
      padding: 4,
      color: theme.palette.text.secondary,
      "&:hover": {
        backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
      },
    },
    tabs: {
      display: "flex",
      gap: 0,
      padding: "0 20px",
      borderBottom: `1px solid ${borderColor}`,
      backgroundColor: "transparent",
    },
    tab: {
      flex: 1,
      padding: "8px 0",
      fontSize: "0.75rem",
      fontWeight: 500,
      color: theme.palette.text.secondary,
      background: "none",
      border: "none",
      borderBottom: "2px solid transparent",
      cursor: "pointer",
      transition: "all 0.2s ease",
      textAlign: "center",
      "&:hover": {
        color: theme.palette.text.primary,
      },
    },
    tabActive: {
      color: theme.palette.primary.main,
      borderBottomColor: theme.palette.primary.main,
      fontWeight: 600,
    },
    content: {
      padding: "12px 20px 16px",
      overflowY: "auto",
      maxHeight: "calc(100vh - 220px)",
      "&::-webkit-scrollbar": { width: 4 },
      "&::-webkit-scrollbar-thumb": {
        backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)",
        borderRadius: 4,
      },
    },
    section: {
      marginBottom: 12,
      "&:last-child": { marginBottom: 0 },
    },
    sectionLabel: {
      fontSize: "0.6875rem",
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.04em",
      color: theme.palette.text.secondary,
      marginBottom: 6,
      paddingLeft: 2,
    },
    avatarRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    avatarRemoveBtn: {
      fontSize: "0.6875rem",
      textTransform: "none",
      padding: "2px 10px",
      borderRadius: 6,
      marginTop: 4,
    },
    compactField: {
      "& .MuiOutlinedInput-root": {
        borderRadius: 8,
        fontSize: "0.8125rem",
      },
      "& .MuiOutlinedInput-input": {
        padding: "8px 12px",
      },
      "& .MuiInputLabel-outlined": {
        fontSize: "0.8125rem",
        transform: "translate(12px, 10px) scale(1)",
        "&.MuiInputLabel-shrink": {
          transform: "translate(12px, -6px) scale(0.75)",
        },
      },
      "& .MuiFormHelperText-root": {
        fontSize: "0.6875rem",
        marginTop: 2,
        marginLeft: 4,
      },
    },
    compactSelect: {
      "& .MuiOutlinedInput-root": {
        borderRadius: 8,
        fontSize: "0.8125rem",
      },
      "& .MuiSelect-outlined": {
        padding: "8px 12px",
        paddingRight: 32,
      },
      "& .MuiInputLabel-outlined": {
        fontSize: "0.8125rem",
        transform: "translate(12px, 10px) scale(1)",
        "&.MuiInputLabel-shrink": {
          transform: "translate(12px, -6px) scale(0.75)",
        },
      },
    },
    permRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "5px 10px",
      borderRadius: 8,
      backgroundColor: surfaceBg,
      marginBottom: 4,
      border: `1px solid ${borderColor}`,
      transition: "background-color 0.15s ease",
      "&:hover": {
        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#f3f4f6",
      },
      "&:last-child": { marginBottom: 0 },
    },
    permLabel: {
      fontSize: "0.775rem",
      fontWeight: 400,
      color: theme.palette.text.primary,
      flex: 1,
    },
    permSwitch: {
      "& .MuiSwitch-switchBase": {
        padding: 3,
      },
      "& .MuiSwitch-thumb": {
        width: 14,
        height: 14,
      },
      "& .MuiSwitch-track": {
        borderRadius: 10,
        opacity: 0.3,
      },
      "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
        opacity: 0.6,
      },
    },
    footer: {
      display: "flex",
      justifyContent: "flex-end",
      gap: 8,
      padding: "10px 20px 14px",
      borderTop: `1px solid ${borderColor}`,
    },
    cancelBtn: {
      fontSize: "0.75rem",
      fontWeight: 500,
      textTransform: "none",
      borderRadius: 8,
      padding: "5px 16px",
      minHeight: 30,
      color: theme.palette.text.secondary,
      borderColor: borderColor,
      "&:hover": {
        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#f3f4f6",
        borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
      },
    },
    saveBtn: {
      fontSize: "0.75rem",
      fontWeight: 600,
      textTransform: "none",
      borderRadius: 8,
      padding: "5px 20px",
      minHeight: 30,
      boxShadow: "none",
      "&:hover": { boxShadow: "none" },
    },
    btnWrapper: {
      position: "relative",
    },
    buttonProgress: {
      color: green[500],
      position: "absolute",
      top: "50%",
      left: "50%",
      marginTop: -10,
      marginLeft: -10,
    },
  };
});

const UserSchema = Yup.object().shape({
  name: Yup.string().min(2, "Too Short!").max(50, "Too Long!").required("Required"),
  password: Yup.string().min(5, "Too Short!").max(50, "Too Long!"),
  email: Yup.string().email("Invalid email").required("Required"),
  allHistoric: Yup.string().nullable(),
});

const PERM_FIELDS = [
  { name: "allTicket", label: "userModal.form.allTicket", onValue: "enable", offValue: "disable" },
  { name: "allowGroup", label: "userModal.form.allowGroup", onValue: true, offValue: false },
  { name: "allHistoric", label: "userModal.form.allHistoric", onValue: "enabled", offValue: "disabled" },
  { name: "allUserChat", label: "userModal.form.allUserChat", onValue: "enabled", offValue: "disabled" },
  { name: "userClosePendingTicket", label: "userModal.form.userClosePendingTicket", onValue: "enabled", offValue: "disabled" },
  { name: "allowSeeMessagesInPendingTickets", label: "userModal.form.allowSeeMessagesInPendingTickets", onValue: "enabled", offValue: "disabled" },
  { name: "allowConnections", label: "userModal.form.allowConnections", onValue: "enabled", offValue: "disabled" },
  { name: "showDashboard", label: "userModal.form.showDashboard", onValue: "enabled", offValue: "disabled" },
  { name: "allowRealTime", label: "userModal.form.allowRealTime", onValue: "enabled", offValue: "disabled" },
  { name: "showContacts", label: "userModal.form.showContacts", onValue: "enabled", offValue: "disabled" },
  { name: "showCampaign", label: "userModal.form.showCampaign", onValue: "enabled", offValue: "disabled" },
  { name: "showFlow", label: "userModal.form.showFlow", onValue: "enabled", offValue: "disabled" },
  { name: "finalizacaoComValorVendaAtiva", label: null, labelText: "Finalização com Valor de Venda", onValue: "true", offValue: "false" },
];

const UserModal = ({ open, onClose, userId }) => {
  const classes = useStyles();

  const initialState = {
    name: "",
    email: "",
    password: "",
    birthDate: "",
    profile: "user",
    startWork: "00:00",
    endWork: "23:59",
    farewellMessage: "",
    allTicket: "enable",
    allowGroup: false,
    defaultTheme: "light",
    defaultMenu: "open",
    allHistoric: "enabled",
    allUserChat: "enabled",
    userClosePendingTicket: "enabled",
    showDashboard: "enabled",
    allowRealTime: "enabled",
    allowConnections: "enabled",
    showContacts: "enabled",
    showCampaign: "enabled",
    showFlow: "enabled",
    finalizacaoComValorVendaAtiva: "false",
    allowSeeMessagesInPendingTickets: "enabled",
    ticketVisibility: "own_only",
  };

  const { user: loggedInUser } = useContext(AuthContext);

  const [user, setUser] = useState(initialState);
  const [selectedQueueIds, setSelectedQueueIds] = useState([]);
  const [whatsappId, setWhatsappId] = useState(false);
  const { loading, whatsApps } = useWhatsApps();
  const [tab, setTab] = useState("general");
  const [avatar, setAvatar] = useState(null);
  const startWorkRef = useRef();
  const endWorkRef = useRef();

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) return;
      try {
        const { data } = await api.get(`/users/${userId}`);
        setUser((prevState) => ({
          ...prevState,
          ...data,
          allTicket:
            data.allTicket === "enable" || data.allTicket === "enabled"
              ? "enable"
              : "disable",
          finalizacaoComValorVendaAtiva: data.finalizacaoComValorVendaAtiva
            ? "true"
            : "false",
          allowSeeMessagesInPendingTickets:
            data.allowSeeMessagesInPendingTickets === "enabled"
              ? "enabled"
              : "disabled",
          farewellMessage: data.farewellMessage || "",
          birthDate: formatDateForInput(data.birthDate),
        }));

        const { profileImage } = data;
        if (profileImage) {
          // keep reference for AvatarUploader
        }

        const userQueueIds = data.queues?.map((queue) => queue.id);
        setSelectedQueueIds(userQueueIds);
        setWhatsappId(data.whatsappId ? data.whatsappId : "");
      } catch (err) {
        toastError(err);
      }
    };

    fetchUser();
  }, [userId, open]);

  const handleClose = () => {
    onClose();
    setUser(initialState);
    setTab("general");
  };

  const handleSaveUser = async (values) => {
    const uploadAvatar = async (uid) => {
      if (!avatar || typeof avatar !== "object") return null;
      const formData = new FormData();
      formData.append("userId", uid);
      formData.append("typeArch", "user");
      formData.append("profileImage", avatar);
      try {
        const { data } = await api.post(`/users/${uid}/media-upload`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        return data.user.profileImage;
      } catch (error) {
        console.error("Erro no upload da imagem:", error);
        throw error;
      }
    };

    const userData = {
      ...values,
      whatsappId,
      queueIds: selectedQueueIds,
      finalizacaoComValorVendaAtiva: values.finalizacaoComValorVendaAtiva === "true",
      birthDate: parseDateFromInput(values.birthDate),
      allowSeeMessagesInPendingTickets:
        values.allowSeeMessagesInPendingTickets === "enabled" ? "enabled" : "disabled",
    };

    try {
      let responseData;
      if (userId) {
        const { data } = await api.put(`/users/${userId}`, userData);
        responseData = data;
        if (avatar && typeof avatar === "object") {
          const newProfileImage = await uploadAvatar(userId);
          if (newProfileImage) {
            responseData.profileImage = newProfileImage;
            if (userId === loggedInUser.id) {
              localStorage.setItem("profileImage", newProfileImage);
            }
          }
        }
      } else {
        const { data } = await api.post("/users", userData);
        responseData = data.user;
        if (avatar && typeof avatar === "object" && responseData.id) {
          const newProfileImage = await uploadAvatar(responseData.id);
          if (newProfileImage) {
            responseData.profileImage = newProfileImage;
          }
        }
      }
      handleClose();
      toast.success(i18n.t("userModal.success"));
      if (userId === loggedInUser.id) {
        setTimeout(() => window.location.reload(), 1000);
      }
    } catch (err) {
      toastError(err);
    }
  };

  const isOn = (value, onValue) => {
    if (typeof onValue === "boolean") return value === true || value === "true";
    return value === onValue;
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      className={classes.dialog}
      maxWidth={false}
    >
      <div className={classes.header}>
        <Typography className={classes.headerTitle}>
          {userId ? i18n.t("userModal.title.edit") : i18n.t("userModal.title.add")}
        </Typography>
        <IconButton className={classes.closeBtn} onClick={handleClose} size="small">
          <CloseIcon style={{ fontSize: 18 }} />
        </IconButton>
      </div>

      <div className={classes.tabs}>
        <button
          type="button"
          className={`${classes.tab} ${tab === "general" ? classes.tabActive : ""}`}
          onClick={() => setTab("general")}
        >
          {i18n.t("userModal.tabs.general")}
        </button>
        <Can
          role={loggedInUser.profile}
          perform="user-modal:editProfile"
          yes={() => (
            <button
              type="button"
              className={`${classes.tab} ${tab === "permissions" ? classes.tabActive : ""}`}
              onClick={() => setTab("permissions")}
            >
              {i18n.t("userModal.tabs.permissions")}
            </button>
          )}
        />
      </div>

      <Formik
        initialValues={user}
        enableReinitialize={true}
        validationSchema={UserSchema}
        onSubmit={(values, actions) => {
          setTimeout(() => {
            handleSaveUser(values);
            actions.setSubmitting(false);
          }, 400);
        }}
      >
        {({ touched, errors, isSubmitting, values, setFieldValue }) => (
          <Form>
            <div className={classes.content}>
              {tab === "general" && (
                <>
                  {/* Avatar */}
                  <div className={classes.section}>
                    <div className={classes.avatarRow}>
                      <Box display="flex" flexDirection="column" alignItems="center">
                        <AvatarUploader
                          setAvatar={setAvatar}
                          avatar={user.profileImage}
                          companyId={user.companyId}
                        />
                        {user.profileImage && (
                          <Button
                            variant="text"
                            color="secondary"
                            className={classes.avatarRemoveBtn}
                            onClick={() => {
                              user.profileImage = null;
                              setFieldValue("profileImage", null);
                              setAvatar(null);
                            }}
                          >
                            {i18n.t("userModal.title.removeImage")}
                          </Button>
                        )}
                      </Box>
                    </div>
                  </div>

                  {/* Dados Pessoais */}
                  <div className={classes.section}>
                    <Typography className={classes.sectionLabel}>Dados</Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={6}>
                        <Field
                          as={TextField}
                          label={i18n.t("userModal.form.name")}
                          autoFocus
                          name="name"
                          error={touched.name && Boolean(errors.name)}
                          helperText={touched.name && errors.name}
                          variant="outlined"
                          size="small"
                          fullWidth
                          className={classes.compactField}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Field
                          as={TextField}
                          label={i18n.t("userModal.form.password")}
                          type="password"
                          name="password"
                          error={touched.password && Boolean(errors.password)}
                          helperText={touched.password && errors.password}
                          variant="outlined"
                          size="small"
                          fullWidth
                          className={classes.compactField}
                        />
                      </Grid>
                      <Grid item xs={8}>
                        <Field
                          as={TextField}
                          label={i18n.t("userModal.form.email")}
                          name="email"
                          error={touched.email && Boolean(errors.email)}
                          helperText={touched.email && errors.email}
                          variant="outlined"
                          size="small"
                          fullWidth
                          className={classes.compactField}
                        />
                      </Grid>
                      <Grid item xs={4}>
                        <Can
                          role={loggedInUser.profile}
                          perform="user-modal:editProfile"
                          yes={() => (
                            <FormControl variant="outlined" size="small" fullWidth className={classes.compactSelect}>
                              <InputLabel>{i18n.t("userModal.form.profile")}</InputLabel>
                              <Field
                                as={Select}
                                label={i18n.t("userModal.form.profile")}
                                name="profile"
                              >
                                <MenuItem value="admin">Admin</MenuItem>
                                <MenuItem value="user">User</MenuItem>
                              </Field>
                            </FormControl>
                          )}
                        />
                      </Grid>
                    </Grid>
                  </div>

                  {/* Configurações */}
                  <div className={classes.section}>
                    <Typography className={classes.sectionLabel}>Configurações</Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={12}>
                        <Can
                          role={loggedInUser.profile}
                          perform="user-modal:editQueues"
                          yes={() => (
                            <QueueSelect
                              selectedQueueIds={selectedQueueIds}
                              onChange={(vals) => setSelectedQueueIds(vals)}
                              fullWidth
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Can
                          role={loggedInUser.profile}
                          perform="user-modal:editProfile"
                          yes={() => (
                            <FormControl variant="outlined" size="small" fullWidth className={classes.compactSelect}>
                              <InputLabel>{i18n.t("userModal.form.whatsapp")}</InputLabel>
                              <Field
                                as={Select}
                                value={whatsappId}
                                onChange={(e) => setWhatsappId(e.target.value)}
                                label={i18n.t("userModal.form.whatsapp")}
                              >
                                <MenuItem value="">&nbsp;</MenuItem>
                                {whatsApps.map((w) => (
                                  <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                                ))}
                              </Field>
                            </FormControl>
                          )}
                        />
                      </Grid>
                      <Can
                        role={loggedInUser.profile}
                        perform="user-modal:editProfile"
                        yes={() => (
                          <>
                            <Grid item xs={6}>
                              <Field
                                as={TextField}
                                label={i18n.t("userModal.form.startWork")}
                                type="time"
                                inputRef={startWorkRef}
                                InputLabelProps={{ shrink: true }}
                                inputProps={{ step: 600 }}
                                fullWidth
                                name="startWork"
                                variant="outlined"
                                size="small"
                                className={classes.compactField}
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <Field
                                as={TextField}
                                label={i18n.t("userModal.form.endWork")}
                                type="time"
                                inputRef={endWorkRef}
                                InputLabelProps={{ shrink: true }}
                                inputProps={{ step: 600 }}
                                fullWidth
                                name="endWork"
                                variant="outlined"
                                size="small"
                                className={classes.compactField}
                              />
                            </Grid>
                          </>
                        )}
                      />
                      <Grid item xs={6}>
                        <Field
                          as={TextField}
                          label="Nascimento"
                          type="date"
                          name="birthDate"
                          InputLabelProps={{ shrink: true }}
                          fullWidth
                          variant="outlined"
                          size="small"
                          className={classes.compactField}
                          onChange={(e) => {
                            setFieldValue("birthDate", parseDateFromInput(e.target.value));
                          }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <FormControl variant="outlined" size="small" fullWidth className={classes.compactSelect}>
                          <InputLabel>{i18n.t("userModal.form.defaultTheme")}</InputLabel>
                          <Field
                            as={Select}
                            label={i18n.t("userModal.form.defaultTheme")}
                            name="defaultTheme"
                          >
                            <MenuItem value="light">{i18n.t("userModal.form.defaultThemeLight")}</MenuItem>
                            <MenuItem value="dark">{i18n.t("userModal.form.defaultThemeDark")}</MenuItem>
                          </Field>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12}>
                        <Field
                          as={TextField}
                          label={i18n.t("userModal.form.farewellMessage")}
                          multiline
                          rows={2}
                          fullWidth
                          name="farewellMessage"
                          variant="outlined"
                          size="small"
                          className={classes.compactField}
                        />
                      </Grid>
                    </Grid>
                  </div>
                </>
              )}

              {tab === "permissions" && (
                <Can
                  role={loggedInUser.profile}
                  perform="user-modal:editProfile"
                  yes={() => (
                    <div className={classes.section}>
                      <Typography className={classes.sectionLabel}>
                        Permissões do usuário
                      </Typography>
                      <FormControl fullWidth variant="outlined" size="small" style={{ marginBottom: 16 }}>
                        <InputLabel>Visibilidade de atendimentos</InputLabel>
                        <Field
                          as={Select}
                          name="ticketVisibility"
                          label="Visibilidade de atendimentos"
                          onChange={(e) => {
                            const v = e.target.value;
                            setFieldValue("ticketVisibility", v);
                            if (v === "all") {
                              setFieldValue("allTicket", "enable");
                              setFieldValue("allHistoric", "enabled");
                              setFieldValue("allUserChat", "enabled");
                            } else if (v === "own_queues") {
                              setFieldValue("allTicket", "disable");
                              setFieldValue("allHistoric", "enabled");
                              setFieldValue("allUserChat", "enabled");
                            } else {
                              setFieldValue("allTicket", "disable");
                              setFieldValue("allHistoric", "disabled");
                              setFieldValue("allUserChat", "disabled");
                            }
                          }}
                        >
                          <MenuItem value="all">
                            Ver todos os atendimentos da empresa
                          </MenuItem>
                          <MenuItem value="own_queues">
                            Ver atendimentos das minhas filas
                          </MenuItem>
                          <MenuItem value="own_only">
                            Ver apenas meus atendimentos
                          </MenuItem>
                        </Field>
                      </FormControl>
                      {PERM_FIELDS.map((perm) => {
                        const checked = isOn(values[perm.name], perm.onValue);
                        const label = perm.label ? i18n.t(perm.label) : perm.labelText;
                        return (
                          <div key={perm.name} className={classes.permRow}>
                            <span className={classes.permLabel}>{label}</span>
                            <Switch
                              checked={checked}
                              onChange={() =>
                                setFieldValue(
                                  perm.name,
                                  checked ? perm.offValue : perm.onValue
                                )
                              }
                              color="primary"
                              size="small"
                              className={classes.permSwitch}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                />
              )}
            </div>

            <div className={classes.footer}>
              <Button
                onClick={handleClose}
                disabled={isSubmitting}
                variant="outlined"
                className={classes.cancelBtn}
              >
                {i18n.t("userModal.buttons.cancel")}
              </Button>
              <Button
                type="submit"
                color="primary"
                disabled={isSubmitting}
                variant="contained"
                className={`${classes.saveBtn} ${classes.btnWrapper}`}
              >
                {userId ? i18n.t("userModal.buttons.okEdit") : i18n.t("userModal.buttons.okAdd")}
                {isSubmitting && (
                  <CircularProgress size={18} className={classes.buttonProgress} />
                )}
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default UserModal;
