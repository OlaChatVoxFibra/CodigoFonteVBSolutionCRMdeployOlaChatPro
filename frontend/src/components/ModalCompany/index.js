/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect } from "react";
import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  TextField,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Grid,
  CircularProgress,
  Box,
  Switch,
  useMediaQuery,
} from "@material-ui/core";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import moment from "moment";
import api from "../../services/api";
import { formatStripeMoney } from "../../utils/stripeCatalogMerge";
import { SETTINGS_FONT } from "../StripeAdminHub/stripeSettingsPageStyles";
import { planOptionLabel } from "../StripeAdminHub/StripePriceCells";

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const border = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  return {
    root: { display: "flex", flexWrap: "wrap" },
    dialogPaper: {
      borderRadius: 14,
      maxHeight: "90vh",
      [theme.breakpoints.down("xs")]: {
        margin: 8,
        maxHeight: "96vh",
        borderRadius: 10,
      },
    },
    header: {
      padding: "14px 18px 6px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      [theme.breakpoints.down("xs")]: { padding: "12px 14px 4px" },
    },
    titleText: {
      fontSize: 14,
      fontWeight: 400,
      fontFamily: SETTINGS_FONT,
      letterSpacing: "-0.01em",
      color: theme.palette.text.primary,
    },
    closeBtn: {
      width: 24,
      height: 24,
      borderRadius: "50%",
      border: "none",
      background: isDark ? "rgba(255,255,255,0.08)" : "#f3f4f6",
      color: theme.palette.text.secondary,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 12,
      lineHeight: 1,
      "&:hover": { background: isDark ? "rgba(255,255,255,0.14)" : "#e5e7eb" },
    },
    content: {
      padding: "4px 18px 12px",
      "&::-webkit-scrollbar": { width: 3 },
      "&::-webkit-scrollbar-thumb": {
        background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
        borderRadius: 3,
      },
      [theme.breakpoints.down("xs")]: { padding: "4px 14px 10px" },
    },
    section: {
      fontSize: 10,
      fontWeight: 400,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      color: isDark ? "rgba(255,255,255,0.38)" : "rgba(15,23,42,0.4)",
      marginTop: 12,
      marginBottom: 6,
      fontFamily: SETTINGS_FONT,
    },
    planHint: {
      fontSize: 11,
      fontFamily: SETTINGS_FONT,
      color: theme.palette.text.secondary,
      marginTop: 4,
      lineHeight: 1.45,
    },
    field: {
      "& .MuiOutlinedInput-root": {
        borderRadius: 7,
        fontSize: 12,
        height: 32,
      },
      "& .MuiOutlinedInput-input": {
        padding: "6px 10px",
        fontSize: 12,
      },
      "& .MuiInputLabel-outlined": {
        fontSize: 11,
        transform: "translate(10px, 9px) scale(1)",
      },
      "& .MuiInputLabel-outlined.MuiInputLabel-shrink": {
        transform: "translate(10px, -6px) scale(0.75)",
      },
      "& .MuiFormHelperText-root": {
        fontSize: 10,
        marginTop: 1,
        marginLeft: 4,
      },
    },
    sel: {
      "& .MuiOutlinedInput-root": {
        borderRadius: 7,
        fontSize: 12,
        height: 32,
      },
      "& .MuiSelect-outlined": {
        padding: "6px 10px",
        fontSize: 12,
      },
      "& .MuiInputLabel-outlined": {
        fontSize: 11,
        transform: "translate(10px, 9px) scale(1)",
      },
      "& .MuiInputLabel-outlined.MuiInputLabel-shrink": {
        transform: "translate(10px, -6px) scale(0.75)",
      },
    },
    toggleGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(145px, 1fr))",
      gap: 4,
      [theme.breakpoints.down("xs")]: {
        gridTemplateColumns: "1fr 1fr",
      },
    },
    toggleItem: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "2px 8px",
      borderRadius: 6,
      background: isDark ? "rgba(255,255,255,0.03)" : "#f9fafb",
      border: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "#f0f0f0"}`,
      minHeight: 28,
      "& .MuiSwitch-root": { transform: "scale(0.6)" },
    },
    toggleLabel: {
      fontSize: 10.5,
      fontWeight: 500,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      color: theme.palette.text.primary,
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    },
    actions: {
      padding: "8px 18px 12px",
      gap: 6,
      [theme.breakpoints.down("xs")]: { padding: "8px 14px 10px" },
    },
    cancelBtn: {
      borderRadius: 7,
      textTransform: "none",
      fontSize: 12,
      fontWeight: 500,
      padding: "4px 14px",
      height: 30,
    },
    saveBtn: {
      borderRadius: 7,
      textTransform: "none",
      fontSize: 12,
      fontWeight: 600,
      padding: "4px 18px",
      height: 30,
      boxShadow: "none",
      "&:hover": { boxShadow: "none" },
    },
  };
});

const CompanySchema = Yup.object().shape({
  name: Yup.string().required("Obrigatório"),
  email: Yup.string().email("E-mail inválido").required("Obrigatório"),
  stripeProductKey: Yup.string().when("id", {
    is: (id) => id === undefined,
    then: Yup.string().required("Selecione um plano"),
    otherwise: Yup.string().nullable()
  }),
  password: Yup.string().when("id", {
    is: (id) => id === undefined,
    then: Yup.string().required("Obrigatório").min(5, "Mín. 5 caracteres"),
    otherwise: Yup.string().nullable(),
  }),
});

function Toggle({ label, name, values, setFieldValue, trueVal = "enabled", falseVal = "disabled" }) {
  const classes = useStyles();
  const isOn = values[name] === trueVal || values[name] === "enable" || values[name] === true;
  return (
    <div className={classes.toggleItem}>
      <span className={classes.toggleLabel}>{label}</span>
      <Switch
        size="small"
        checked={isOn}
        onChange={(e) => {
          if (trueVal === true) setFieldValue(name, e.target.checked);
          else if (name === "allTicket") setFieldValue(name, e.target.checked ? "enable" : "disable");
          else setFieldValue(name, e.target.checked ? trueVal : falseVal);
        }}
        color="primary"
      />
    </div>
  );
}

const ModalCompany = ({ open, onClose, company, onSave }) => {
  const classes = useStyles();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("xs"));
  const [stripePlans, setStripePlans] = useState([]);

  const initialState = {
    name: "", email: "", phone: "", stripeProductKey: "", planId: "", status: true,
    dueDate: "", recurrence: "MENSAL", password: "", document: "",
    generateInvoice: true,
    userRating: "disabled", scheduleType: "disabled",
    sendGreetingAccepted: "enabled", userRandom: "enabled",
    sendMsgTransfTicket: "enabled", acceptCallWhatsapp: "enabled",
    sendSignMessage: "enabled", sendGreetingMessageOneQueues: "enabled",
    sendQueuePosition: "enabled", sendFarewellWaitingTicket: "enabled",
    acceptAudioMessageContact: "enabled",
    enableLGPD: "disabled", requiredTag: "enabled",
    closeTicketOnTransfer: false, DirectTicketsToWallets: false,
    showNotificationPending: false,
    allHistoric: "enabled", allTicket: "disable",
    allUserChat: "enabled", allUserChatHistoric: "enabled",
    allUserChatHistoricTotal: "enabled", userChat: "enabled",
    viewMessagesPending: "enabled", viewMessagesPendingHistoric: "enabled",
    closePendingTicket: "enabled",
    campaigns: "enabled", contacts: "enabled", dashboard: "enabled",
    connections: "enabled", flow: "enabled", groups: "disable",
    kanban: "enabled", internalChat: "enabled", schedules: "enabled",
    quickAnswers: "enabled", tags: "enabled", settings: "enabled",
    financeiro: "enabled",
    useWhatsappOfficial: false,
  };

  const [record, setRecord] = useState(initialState);

  useEffect(() => {
    async function fetchStripePlans() {
      if (!open) return;
      try {
        const { data } = await api.get("/subscription/stripe/admin/plans?type=all");
        setStripePlans(Array.isArray(data?.products) ? data.products : []);
      } catch {
        setStripePlans([]);
      }
    }
    fetchStripePlans();
  }, [open]);

  useEffect(() => {
    async function fetchCompanyData() {
      if (company && open) {
        try {
          const [{ data: settings }, { data: planData }] = await Promise.all([
            api.get(`/companySettings/${company.id}`),
            api.get(`/companies/listPlan/${company.id}`)
          ]);
          const obj = {};
          if (Array.isArray(settings)) settings.forEach(s => { obj[s.column] = s.data; });
          const effectiveWaOfficial = Boolean(planData?.plan?.useWhatsappOfficial);
          setRecord({
            ...initialState, ...company, ...obj,
            stripeProductKey: company.stripeProductKey || "",
            dueDate: company.dueDate ? moment(company.dueDate).format("YYYY-MM-DD") : "",
            password: "",
            useWhatsappOfficial: effectiveWaOfficial,
          });
        } catch {
          setRecord({
            ...initialState, ...company,
            stripeProductKey: company.stripeProductKey || "",
            dueDate: company.dueDate ? moment(company.dueDate).format("YYYY-MM-DD") : "",
            password: "",
            useWhatsappOfficial: Boolean(company.useWhatsappOfficial ?? company.plan?.useWhatsappOfficial),
          });
        }
      } else { setRecord(initialState); }
    }
    fetchCompanyData();
  }, [company, open]);

  const handleClose = () => { onClose(); setRecord(initialState); };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={fullScreen}
      scroll="paper"
      classes={{ paper: classes.dialogPaper }}
    >
      <div className={classes.header}>
        <span className={classes.titleText}>
          {company ? "Editar Assinatura" : "Nova Assinatura"}
        </span>
        <button type="button" className={classes.closeBtn} onClick={handleClose}>✕</button>
      </div>

      <Formik
        initialValues={record}
        enableReinitialize
        validationSchema={CompanySchema}
        onSubmit={(values, actions) => {
          onSave({
            ...values,
            stripeProductKey: values.stripeProductKey || undefined,
            planId: values.planId ? parseInt(values.planId, 10) : undefined
          });
          actions.setSubmitting(false);
        }}
      >
        {({ touched, errors, isSubmitting, values, setFieldValue }) => {
          const selectedPlan = stripePlans.find((p) => p.key === values.stripeProductKey);
          const { monthly, annual } = {
            monthly: selectedPlan?.prices?.find((p) => p.currency === "brl" && p.interval === "monthly"),
            annual: selectedPlan?.prices?.find((p) => p.currency === "brl" && p.interval === "annual")
          };
          const isAnnual = String(values.recurrence || "").toUpperCase() === "ANUAL";
          const activePrice = isAnnual ? annual : monthly;
          const ent = selectedPlan?.entitlements;

          return (
          <Form>
            <DialogContent className={classes.content} dividers={false}>

              <div className={classes.section}>Organização</div>
              <Grid container spacing={1}>
                <Grid item xs={12} sm={6}>
                  <Field as={TextField} label="Nome" name="name"
                    error={touched.name && Boolean(errors.name)}
                    helperText={touched.name && errors.name}
                    variant="outlined" fullWidth className={classes.field} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Field as={TextField} label="E-mail" name="email"
                    error={touched.email && Boolean(errors.email)}
                    helperText={touched.email && errors.email}
                    variant="outlined" fullWidth className={classes.field} />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Field as={TextField} label="Senha" type="password" name="password"
                    variant="outlined" fullWidth autoComplete="new-password" className={classes.field} />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Field as={TextField} label="Telefone" name="phone"
                    variant="outlined" fullWidth className={classes.field} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Field as={TextField} label="CNPJ/CPF" name="document"
                    variant="outlined" fullWidth className={classes.field} />
                </Grid>
              </Grid>

              <div className={classes.section}>Plano e Faturamento</div>
              <Grid container spacing={1}>
                <Grid item xs={12} sm={8}>
                  <FormControl variant="outlined" fullWidth className={classes.sel}
                    error={touched.stripeProductKey && Boolean(errors.stripeProductKey)}>
                    <InputLabel>Plano (Stripe)</InputLabel>
                    <Field as={Select} label="Plano (Stripe)" name="stripeProductKey">
                      {stripePlans.map((p) => (
                        <MenuItem key={p.key} value={p.key}>
                          {planOptionLabel(p, formatStripeMoney)}
                        </MenuItem>
                      ))}
                    </Field>
                  </FormControl>
                  {selectedPlan && (
                    <div className={classes.planHint}>
                      {monthly?.unitAmount != null && (
                        <span>Mensal: {formatStripeMoney(monthly.unitAmount, "brl")} · </span>
                      )}
                      {annual?.unitAmount != null && (
                        <span>Anual: {formatStripeMoney(annual.unitAmount, "brl")} · </span>
                      )}
                      {activePrice?.unitAmount != null && (
                        <span>Selecionado ({isAnnual ? "anual" : "mensal"}): {formatStripeMoney(activePrice.unitAmount, "brl")} · </span>
                      )}
                      {ent?.maxUsers != null && (
                        <span>Usuários: {ent.maxUsers === null ? "ilimitado" : ent.maxUsers} · </span>
                      )}
                      {ent?.maxConnections != null && (
                        <span>Conexões: {ent.maxConnections === null ? "ilimitado" : ent.maxConnections}</span>
                      )}
                      {ent?.monthlyCredits != null && (
                        <span>Créditos Brain: {ent.monthlyCredits}/mês</span>
                      )}
                    </div>
                  )}
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Field as={TextField} label="Vencimento" type="date" name="dueDate"
                    InputLabelProps={{ shrink: true }}
                    variant="outlined" fullWidth className={classes.field} />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <FormControl variant="outlined" fullWidth className={classes.sel}>
                    <InputLabel>Recorrência</InputLabel>
                    <Field as={Select} label="Recorrência" name="recurrence">
                      <MenuItem value="MENSAL">Mensal</MenuItem>
                      <MenuItem value="BIMESTRAL">Bimestral</MenuItem>
                      <MenuItem value="TRIMESTRAL">Trimestral</MenuItem>
                      <MenuItem value="SEMESTRAL">Semestral</MenuItem>
                      <MenuItem value="ANUAL">Anual</MenuItem>
                    </Field>
                  </FormControl>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <FormControl variant="outlined" fullWidth className={classes.sel}>
                    <InputLabel>Ativo</InputLabel>
                    <Field as={Select} label="Ativo" name="status">
                      <MenuItem value={true}>Sim</MenuItem>
                      <MenuItem value={false}>Não</MenuItem>
                    </Field>
                  </FormControl>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <FormControl variant="outlined" fullWidth className={classes.sel}>
                    <InputLabel>Gerar Fatura</InputLabel>
                    <Field as={Select} label="Gerar Fatura" name="generateInvoice">
                      <MenuItem value={true}>Sim</MenuItem>
                      <MenuItem value={false}>Não</MenuItem>
                    </Field>
                  </FormControl>
                </Grid>
              </Grid>

              <div className={classes.section}>Tickets</div>
              <div className={classes.toggleGrid}>
                <Toggle label="Ver de Outros" name="allTicket" values={values} setFieldValue={setFieldValue} />
                <Toggle label="Histórico" name="allHistoric" values={values} setFieldValue={setFieldValue} />
                <Toggle label="Chats de Outros" name="allUserChat" values={values} setFieldValue={setFieldValue} />
                <Toggle label="Msg Pendentes" name="viewMessagesPending" values={values} setFieldValue={setFieldValue} />
                <Toggle label="Fechar Pend." name="closePendingTicket" values={values} setFieldValue={setFieldValue} />
                <Toggle label="Chamadas WA" name="acceptCallWhatsapp" values={values} setFieldValue={setFieldValue} />
              </div>

              <div className={classes.section}>Módulos</div>
              <div className={classes.toggleGrid}>
                <Toggle label="Dashboard" name="dashboard" values={values} setFieldValue={setFieldValue} />
                <Toggle label="Contatos" name="contacts" values={values} setFieldValue={setFieldValue} />
                <Toggle label="Campanhas" name="campaigns" values={values} setFieldValue={setFieldValue} />
                <Toggle label="Flow" name="flow" values={values} setFieldValue={setFieldValue} />
                <Toggle label="Kanban" name="kanban" values={values} setFieldValue={setFieldValue} />
                <Toggle label="Agendamentos" name="schedules" values={values} setFieldValue={setFieldValue} />
                <Toggle label="Chat Interno" name="internalChat" values={values} setFieldValue={setFieldValue} />
                <Toggle label="Financeiro" name="financeiro" values={values} setFieldValue={setFieldValue} />
                <Toggle label="WA API Oficial" name="useWhatsappOfficial" values={values} setFieldValue={setFieldValue} trueVal={true} falseVal={false} />
              </div>

              <div className={classes.section}>Configurações</div>
              <Grid container spacing={1}>
                <Grid item xs={6} sm={4}>
                  <FormControl variant="outlined" fullWidth className={classes.sel}>
                    <InputLabel>Avaliações</InputLabel>
                    <Field as={Select} label="Avaliações" name="userRating">
                      <MenuItem value="enabled">Sim</MenuItem>
                      <MenuItem value="disabled">Não</MenuItem>
                    </Field>
                  </FormControl>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <FormControl variant="outlined" fullWidth className={classes.sel}>
                    <InputLabel>Horários</InputLabel>
                    <Field as={Select} label="Horários" name="scheduleType">
                      <MenuItem value="disabled">Não</MenuItem>
                      <MenuItem value="queue">Fila</MenuItem>
                      <MenuItem value="company">Empresa</MenuItem>
                      <MenuItem value="connection">Conexão</MenuItem>
                    </Field>
                  </FormControl>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <FormControl variant="outlined" fullWidth className={classes.sel}>
                    <InputLabel>Assin. Msg</InputLabel>
                    <Field as={Select} label="Assin. Msg" name="sendSignMessage">
                      <MenuItem value="enabled">Sim</MenuItem>
                      <MenuItem value="disabled">Não</MenuItem>
                    </Field>
                  </FormControl>
                </Grid>
              </Grid>
              <Box mt={0.5}>
                <div className={classes.toggleGrid}>
                  <Toggle label="Pos. Fila" name="sendQueuePosition" values={values} setFieldValue={setFieldValue} />
                  <Toggle label="Encerrar Transf." name="closeTicketOnTransfer" values={values} setFieldValue={setFieldValue} trueVal={true} falseVal={false} />
                  <Toggle label="Carteira" name="DirectTicketsToWallets" values={values} setFieldValue={setFieldValue} trueVal={true} falseVal={false} />
                  <Toggle label="Notif. Pend." name="showNotificationPending" values={values} setFieldValue={setFieldValue} trueVal={true} falseVal={false} />
                  <Toggle label="LGPD" name="enableLGPD" values={values} setFieldValue={setFieldValue} />
                  <Toggle label="Tag Obrig." name="requiredTag" values={values} setFieldValue={setFieldValue} />
                </div>
              </Box>
            </DialogContent>

            <DialogActions className={classes.actions}>
              <Button onClick={handleClose} disabled={isSubmitting} variant="outlined" className={classes.cancelBtn}>
                Cancelar
              </Button>
              <Button type="submit" color="primary" disabled={isSubmitting} variant="contained" className={classes.saveBtn}>
                {isSubmitting ? <CircularProgress size={16} /> : "Salvar"}
              </Button>
            </DialogActions>
          </Form>
          );
        }}
      </Formik>
    </Dialog>
  );
};

export default ModalCompany;
