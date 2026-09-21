/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Cadastro grátis (Starter): cria nova organização (empresa) + usuário admin — rota /cadastro-gratis.
 */
import React, { useMemo, useState, useContext } from "react";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import {
  Box,
  Typography,
  TextField,
  Grid,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  FormControlLabel,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  makeStyles,
  IconButton,
  Paper,
  Button
} from "@material-ui/core";
import { toast } from "react-toastify";
import toastError from "../../errors/toastError";
import api, { openApi } from "../../services/api";
import { i18n } from "../../translate/i18n";
import ColorModeContext from "../../layout/themeContext";
import { useTheme, withStyles } from "@material-ui/core/styles";
import Brightness4Icon from "@material-ui/icons/Brightness4";
import Brightness7Icon from "@material-ui/icons/Brightness7";
import ArrowBackIosIcon from "@material-ui/icons/ArrowBackIos";
import ArrowForwardIosIcon from "@material-ui/icons/ArrowForwardIos";
import StepConnector from "@material-ui/core/StepConnector";
import BRFlag from "../../assets/brazil.png";
import USFlag from "../../assets/unitedstates.png";
import ESFlag from "../../assets/esspain.png";
import ARFlag from "../../assets/arabe.png";

const useStyles = makeStyles(theme => ({
  root: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: theme.palette.type === "light" ? "#f5f5f7" : theme.palette.background.default,
    padding: theme.spacing(5, 1.5, 2),
    fontFamily: "'Helvetica Neue', Arial, sans-serif",
    color: theme.palette.type === "light" ? "#111" : theme.palette.text.primary
  },
  container: {
    width: "100%",
    maxWidth: 640,
    position: "relative"
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: theme.spacing(2),
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    padding: theme.spacing(1, 2),
    zIndex: 20,
    background: "transparent"
  },
  stepperWrap: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing(0, 1),
    marginTop: theme.spacing(1)
  },
  stepperInner: {
    width: "100%",
    maxWidth: 520
  },
  brand: {
    display: "flex",
    alignItems: "flex-start",
    gap: theme.spacing(1.5),
    paddingTop: 0,
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2)
  },
  logo: {
    height: 72,
    width: "auto",
    marginRight: theme.spacing(1.5),
    filter: theme.palette.type === "dark" ? "invert(1) brightness(1.1)" : "none"
  },
  stepperClear: {
    background: "transparent !important",
    boxShadow: "none !important",
    padding: theme.spacing(0.5, 0),
    "& .MuiSvgIcon-root": {
      fontSize: "1.2rem"
    },
    "& .MuiStepLabel-label": {
      fontSize: 12,
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      color: theme.palette.type === "light" ? "#111" : theme.palette.text.primary
    },
    "& .MuiStepIcon-root": {
      color: "#cbd5e1"
    },
    "& .MuiStepIcon-root.MuiStepIcon-active": {
      color: theme.palette.primary.main
    },
    "& .MuiStepIcon-root.MuiStepIcon-completed": {
      color: theme.palette.primary.dark
    },
    "& .MuiStepLabel-label.MuiStepLabel-active": {
      color: theme.palette.primary.main
    }
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(2)
  },
  title: {
    fontWeight: 700,
    fontSize: 22
  },
  subtitle: {
    color: theme.palette.text.secondary
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: theme.spacing(2)
  },
  grayDivider: {
    backgroundColor: theme.palette.type === "light" ? "#e5e7eb" : theme.palette.divider,
    margin: theme.spacing(2, 0)
  },
  inputGroup: {
    border: "none",
    borderRadius: 16,
    padding: theme.spacing(1),
    background: "transparent",
    boxShadow: "none",
    "& .MuiOutlinedInput-root": {
      background: theme.palette.type === "light" ? "#ffffff" : theme.palette.background.paper,
      borderRadius: 12,
      minHeight: 42
    },
    "& .MuiSelect-select.MuiSelect-outlined": {
      paddingTop: 9,
      paddingBottom: 9,
      borderRadius: 12
    },
    "& .MuiFormLabel-root": {
      color: theme.palette.type === "light" ? "#111" : theme.palette.text.primary,
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      fontWeight: 300
    },
    "& .MuiInputBase-input": {
      color: theme.palette.type === "light" ? "#111" : theme.palette.text.primary,
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      fontWeight: 300
    }
  },
  menuPaper: {
    borderRadius: 12,
    boxShadow: "0 8px 24px rgba(0,0,0,0.12)"
  },
  actionBar: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: theme.spacing(1)
  },
  navButtonLeft: {
    position: "fixed",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 40,
    left: 96,
    [theme.breakpoints.up("sm")]: { left: 120 },
    [theme.breakpoints.up("md")]: { left: 144 },
    [theme.breakpoints.up("lg")]: { left: 168 },
    [theme.breakpoints.up("xl")]: { left: 192 }
  },
  navButtonRight: {
    position: "fixed",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 40,
    right: 96,
    [theme.breakpoints.up("sm")]: { right: 120 },
    [theme.breakpoints.up("md")]: { right: 144 },
    [theme.breakpoints.up("lg")]: { right: 168 },
    [theme.breakpoints.up("xl")]: { right: 192 }
  }
}));

const Connector = withStyles((theme) => ({
  alternativeLabel: {
    top: 14
  },
  active: {
    "& $line": {
      backgroundColor: theme.palette.primary.main
    }
  },
  completed: {
    "& $line": {
      backgroundColor: theme.palette.primary.main
    }
  },
  line: {
    height: 2,
    border: 0,
    backgroundColor: "#e5e7eb",
    borderRadius: 1
  }
}))(StepConnector);

const tKey = (key, fallback) => {
  const v = i18n.t(key);
  return v !== key ? v : fallback;
};

const niches = [
  "retail",
  "services",
  "education",
  "health",
  "realEstate",
  "technology",
  "other"
];

const foundOptions = [
  "google",
  "referral",
  "social",
  "marketplace",
  "other"
];

const needsOptions = [
  "whatsappSupport",
  "chatbotFlows",
  "campaigns",
  "reportsNps",
  "integrations",
  "leadManagement",
  "crmPipeline",
  "projectManagement",
  "kanbanTasks",
  "emailMarketing",
  "omnichannelCampaigns",
  "telephonyDialer",
  "formsCapture",
  "calendar",
  "advancedReportsBi",
  "taskAutomation",
  "erpEcommerceIntegrations",
  "aiAgents",
  "other"
];

const Schema = Yup.object().shape({
  companyName: Yup.string().required(),
  legalName: Yup.string().required(),
  legalEmail: Yup.string().email().required(),
  email: Yup.string().email().required(),
  password: Yup.string().min(5).required(),
  phone: Yup.string().required(),
  document: Yup.string()
    .required()
    .test("doc", "Informe CPF (11) ou CNPJ (14) dígitos", v => {
      const d = String(v || "").replace(/\D/g, "");
      return d.length === 11 || d.length === 14;
    }),
  acceptTerms: Yup.boolean().oneOf([true]).required()
});

/** Encerra sessão antiga (ex.: outro usuário logado) e recarrega o app na tela de login — evita Redirect do Route para "/" com a conta errada. */
const exitToLoginForNewAccount = async () => {
  try {
    await api.delete("/auth/logout");
  } catch {
    /* cookie/token inválido: segue limpando storage */
  }
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("cshow");
    localStorage.removeItem("profileImage");
    localStorage.removeItem("companyDueDate");
  } catch {
    /* ignore */
  }
  if (api.defaults) api.defaults.headers.Authorization = undefined;
  window.location.assign("/login");
};

const RegisterFreemium = () => {
  const classes = useStyles();
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
  const [activeStep, setActiveStep] = useState(0);
  const [validatingCep, setValidatingCep] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const steps = [
    tKey("register.steps.discovery", "Encontro e necessidades"),
    tKey("register.steps.company", "Informações da empresa"),
    tKey("register.steps.address", "Endereço"),
    tKey("register.steps.access", "Acesso")
  ];

  const initialValues = useMemo(
    () => ({
      foundUs: [],
      needs: [],
      razaoSocial: "",
      companyName: "",
      document: "",
      hasCNPJ: true,
      cpf: "",
      personName: "",
      inscricaoEstadual: "",
      inscricaoMunicipal: "",
      niche: "",
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      uf: "",
      legalName: "",
      legalEmail: "",
      legalPhone: "",
      techName: "",
      techEmail: "",
      techPhone: "",
      publicAccountName: "",
      email: "",
      password: "",
      phone: "",
      acceptTerms: false
    }),
    []
  );

  const handleCnpjCpf = async (value, isCnpj, setFieldValue) => {
    const digits = (value || "").replace(/\D/g, "");
    if (isCnpj) {
      if (digits.length !== 14) return;
      try {
        const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data) {
          setFieldValue("razaoSocial", data.razao_social || "");
          setFieldValue("companyName", data.nome_fantasia || data.razao_social || "");
          if (data.cep) setFieldValue("cep", data.cep);
          if (data.logradouro) setFieldValue("logradouro", data.logradouro);
          if (data.numero) setFieldValue("numero", String(data.numero));
          if (data.complemento) setFieldValue("complemento", data.complemento);
          if (data.bairro) setFieldValue("bairro", data.bairro);
          if (data.municipio) setFieldValue("cidade", data.municipio);
          if (data.uf) setFieldValue("uf", data.uf);
        }
      } catch {}
    } else {
      const valid = digits.length === 11;
      if (!valid) return;
      try {
        const customUrl = process.env.REACT_APP_CPF_LOOKUP_URL;
        if (customUrl) {
          const r = await fetch(`${customUrl}?cpf=${digits}`);
          if (r.ok) {
            const d = await r.json();
            const nome = d.nome || d.name || d.fullname || d.nome_completo;
            if (nome) setFieldValue("personName", nome);
          }
          return;
        }
        const token = process.env.REACT_APP_HUBDEV_TOKEN;
        if (token) {
          const r = await fetch(`https://ws.hubdodesenvolvedor.com.br/v2/cpf/?cpf=${digits}&token=${token}`);
          if (r.ok) {
            const d = await r.json();
            const nome = d?.result?.nome || d?.nome;
            if (nome) setFieldValue("personName", nome);
          }
        }
      } catch {}
    }
  };

  const handleCep = async (cep, setFieldValue) => {
    const digits = (cep || "").replace(/\D/g, "");
    if (digits.length !== 8) return;
    setValidatingCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setFieldValue("logradouro", data.logradouro || "");
        setFieldValue("bairro", data.bairro || "");
        setFieldValue("cidade", data.localidade || "");
        setFieldValue("uf", data.uf || "");
      }
    } catch {}
    setValidatingCep(false);
  };

  const next = () => setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
  const prev = () => setActiveStep(prev => Math.max(prev - 1, 0));

  const onSubmit = async values => {
    const docDigits = String(values.document || "").replace(/\D/g, "");
    const payload = {
      signupSource: "freemium",
      document: docDigits,
      email: values.email,
      password: values.password,
      name: values.legalName,
      companyName: values.companyName,
      phone: values.phone || values.legalPhone,
      metadata: {
        niche: values.niche,
        foundUs: values.foundUs,
        needs: values.needs,
        address: {
          cep: values.cep,
          logradouro: values.logradouro,
          numero: values.numero,
          complemento: values.complemento,
          bairro: values.bairro,
          cidade: values.cidade,
          uf: values.uf
        },
        contacts: {
          legal: { name: values.legalName, email: values.legalEmail, phone: values.legalPhone },
          tech: { name: values.techName, email: values.techEmail, phone: values.techPhone }
        },
        publicAccountName: values.publicAccountName,
        acceptTerms: values.acceptTerms,
        acceptTimestamp: new Date().toISOString()
      }
    };
    try {
      await openApi.post("/auth/signup", payload);
      toast.success("Cadastro concluído");
      setSubmitSuccess(true);
    } catch (e) {
      toastError(e);
      const status = e?.response?.status;
      if (!status || status >= 500) {
        const apiErr = e?.response?.data?.error;
        toast.error(
          apiErr ||
            "Não foi possível concluir o cadastro (servidor ou plano indisponível). Tente novamente em instantes."
        );
      }
    }
  };

  const Section1 = ({ values, setFieldValue }) => (
    <Box>
      <Grid container spacing={1} className={classes.inputGroup}>
        <Grid item xs={12}>
          <InputLabel>{tKey("register.labels.niche", "Nicho de Atuação")}</InputLabel>
          <Select
            value={values.niche}
            onChange={e => setFieldValue("niche", e.target.value)}
            fullWidth
            variant="outlined"
            displayEmpty
          >
            <MenuItem value=""><em>{tKey("common.select", "Selecione")}</em></MenuItem>
            {niches.map(key => (
              <MenuItem key={key} value={key} style={{ fontSize: 14, paddingTop: 6, paddingBottom: 6 }}>
                {tKey(`register.options.niches.${key}`, key)}
              </MenuItem>
            ))}
          </Select>
        </Grid>
        <Grid item xs={12}>
          <InputLabel>{tKey("register.labels.foundUs", "Como nos encontrou")}</InputLabel>
          <Select
            multiple
            value={values.foundUs}
            onChange={e => setFieldValue("foundUs", e.target.value)}
            fullWidth
            variant="outlined"
            displayEmpty
            MenuProps={{
              PaperProps: { className: classes.menuPaper, style: { maxHeight: 280, width: 320 } },
              MenuListProps: { dense: true }
            }}
            renderValue={(selected) => {
              if (!selected || selected.length === 0) {
                return <span style={{ color: "#9ca3af" }}>{tKey("common.select", "Selecione")}</span>;
              }
              return selected.map(k => tKey(`register.options.foundUs.${k}`, k)).join(", ");
            }}
          >
            {foundOptions.map(key => (
              <MenuItem key={key} value={key} style={{ fontSize: 14, paddingTop: 6, paddingBottom: 6 }}>
                <Checkbox checked={values.foundUs.indexOf(key) > -1} />
                <ListItemText primary={tKey(`register.options.foundUs.${key}`, key)} />
              </MenuItem>
            ))}
          </Select>
        </Grid>
        <Grid item xs={12}>
          <InputLabel>{tKey("register.labels.needs", "Necessidade")}</InputLabel>
          <Select
            multiple
            value={values.needs}
            onChange={e => setFieldValue("needs", e.target.value)}
            fullWidth
            variant="outlined"
            displayEmpty
            MenuProps={{
              PaperProps: { className: classes.menuPaper, style: { maxHeight: 280, width: 320 } },
              MenuListProps: { dense: true }
            }}
            renderValue={(selected) => {
              if (!selected || selected.length === 0) {
                return <span style={{ color: "#9ca3af" }}>{tKey("common.select", "Selecione")}</span>;
              }
              return selected.map(k => tKey(`register.options.needs.${k}`, k)).join(", ");
            }}
          >
            {needsOptions.map(key => (
              <MenuItem key={key} value={key} style={{ fontSize: 14, paddingTop: 6, paddingBottom: 6 }}>
                <Checkbox checked={values.needs.indexOf(key) > -1} />
                <ListItemText primary={tKey(`register.options.needs.${key}`, key)} />
              </MenuItem>
            ))}
          </Select>
        </Grid>
      </Grid>
    </Box>
  );

  const Section2 = ({ setFieldValue }) => (
    <Box>
      <Grid container spacing={1} className={classes.inputGroup}>
        <Grid item xs={12}>
          <Field
            as={TextField}
            name="document"
            label={tKey("register.labels.document", "CPF ou CNPJ")}
            variant="outlined"
            fullWidth
            placeholder="000.000.000-00 ou 00.000.000/0001-00"
            onBlur={e => {
              const raw = e.target.value || "";
              const digits = raw.replace(/\D/g, "");
              if (digits.length === 14) {
                handleCnpjCpf(raw, true, setFieldValue);
              } else if (digits.length === 11) {
                handleCnpjCpf(raw, false, setFieldValue);
              }
            }}
          />
        </Grid>
        <Grid item xs={12}>
          <Field as={TextField} name="companyName" label={tKey("register.labels.companyName", "Nome da Empresa")} variant="outlined" fullWidth />
        </Grid>
        <Grid item xs={12}>
          <Field as={TextField} name="legalName" label={tKey("register.labels.userName", "Nome do Usuário")} variant="outlined" fullWidth />
        </Grid>
        <Grid item xs={12}>
          <Field as={TextField} name="legalEmail" label={tKey("register.labels.email", "E-mail")} variant="outlined" fullWidth />
        </Grid>
      </Grid>
    </Box>
  );

  const SectionAddress = ({ setFieldValue }) => (
    <Box>
      <Grid container spacing={2} className={classes.inputGroup}>
        <Grid item xs={12} sm={6} md={4}>
          <Field
            as={TextField}
            name="cep"
            label={tKey("register.address.cep", "CEP")}
            variant="outlined"
            fullWidth
            size="small"
            margin="dense"
            placeholder="00000-000"
            onBlur={e => handleCep(e.target.value, setFieldValue)}
            InputProps={{
              endAdornment: validatingCep ? <CircularProgress size={16} /> : null
            }}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={8}>
          <Field as={TextField} name="logradouro" label={tKey("register.address.street", "Logradouro")} variant="outlined" fullWidth size="small" margin="dense" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Field as={TextField} name="numero" label={tKey("register.address.number", "Número")} variant="outlined" fullWidth size="small" margin="dense" />
        </Grid>
        <Grid item xs={12} sm={6} md={8}>
          <Field as={TextField} name="complemento" label={tKey("register.address.complement", "Complemento")} variant="outlined" fullWidth size="small" margin="dense" />
        </Grid>
        <Grid item xs={12} sm={6} md={6}>
          <Field as={TextField} name="bairro" label={tKey("register.address.neighborhood", "Bairro")} variant="outlined" fullWidth size="small" margin="dense" />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Field as={TextField} name="cidade" label={tKey("register.address.city", "Cidade")} variant="outlined" fullWidth size="small" margin="dense" />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <Field as={TextField} name="uf" label={tKey("register.address.state", "UF")} variant="outlined" fullWidth size="small" margin="dense" />
        </Grid>
      </Grid>
    </Box>
  );

  const SectionAccess = ({ touched, errors }) => (
    <Box>
      <Grid container spacing={1} className={classes.inputGroup}>
        <Grid item xs={12} sm={6}>
          <Field as={TextField} name="email" label={tKey("register.labels.loginEmail", "E-mail de acesso")} variant="outlined" fullWidth error={touched.email && Boolean(errors.email)} helperText={touched.email && errors.email} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Field as={TextField} name="password" label={tKey("register.labels.password", "Senha")} type="password" variant="outlined" fullWidth error={touched.password && Boolean(errors.password)} helperText={touched.password && errors.password} />
        </Grid>
        <Grid item xs={12} sm={6}>
          <Field as={TextField} name="phone" label={tKey("register.labels.whatsapp", "Telefone (WhatsApp)")} variant="outlined" fullWidth />
        </Grid>
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Field as={Checkbox} name="acceptTerms" color="primary" />
            }
            label={tKey("register.labels.terms", "Li e aceito os Termos e a Política de Privacidade")}
          />
          {touched.acceptTerms && errors.acceptTerms && (
            <Typography color="error" variant="caption">{errors.acceptTerms}</Typography>
          )}
        </Grid>
      </Grid>
    </Box>
  );

  const canGoNext = (step, values) => {
    const docOk = String(values.document || "").replace(/\D/g, "").length === 11 || String(values.document || "").replace(/\D/g, "").length === 14;
    switch (step) {
      case 0:
        return (values.niche && values.niche !== "") || (values.foundUs && values.foundUs.length > 0) || (values.needs && values.needs.length > 0);
      case 1:
        return docOk && values.companyName && values.legalName && values.legalEmail;
      case 2:
        return values.cep && values.logradouro && values.cidade && values.uf;
      case 3:
        return values.email && values.password && values.acceptTerms;
      default:
        return false;
    }
  };

  return (
    <Box className={classes.root}>
      <div className={classes.container}>
        <Box className={classes.topBar}>
          <div className={classes.brand}>
            <img
              className={classes.logo}
              alt="VB Solution"
              src={theme.mode === "light" ? theme.calculatedLogoLight() : theme.calculatedLogoDark()}
            />
          </div>
          {!submitSuccess ? (
          <div className={classes.stepperWrap}>
            <div className={classes.stepperInner}>
              <Stepper activeStep={activeStep} alternativeLabel className={classes.stepperClear} connector={<Connector />}>
                {steps.map(label => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </div>
          </div>
          ) : null}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Select
              value={(i18n.language && i18n.language.split("-")[0]) || "pt"}
              onChange={e => i18n.changeLanguage(e.target.value)}
              variant="outlined"
              style={{ height: 36, borderRadius: 10 }}
            >
              <MenuItem value="pt"><img alt="pt" src={BRFlag} height={14} style={{ marginRight: 8 }} />PT</MenuItem>
              <MenuItem value="en"><img alt="en" src={USFlag} height={14} style={{ marginRight: 8 }} />EN</MenuItem>
              <MenuItem value="es"><img alt="es" src={ESFlag} height={14} style={{ marginRight: 8 }} />ES</MenuItem>
              <MenuItem value="ar"><img alt="ar" src={ARFlag} height={14} style={{ marginRight: 8 }} />AR</MenuItem>
            </Select>
            <IconButton onClick={() => colorMode?.toggleColorMode?.()}>
              {theme.mode === "light" ? <Brightness4Icon /> : <Brightness7Icon />}
            </IconButton>
          </div>
        </Box>
        <Box mt={6}>
          {submitSuccess ? (
            <Paper elevation={0} style={{ padding: 32, borderRadius: 16, textAlign: "center", maxWidth: 520, margin: "0 auto" }}>
              <Typography variant="h5" style={{ fontWeight: 700, marginBottom: 16 }}>
                Parabéns — cadastro grátis concluído
              </Typography>
              <Typography variant="body1" color="textSecondary" paragraph>
                Sua empresa está no plano Starter com 1 mês de uso. Confira o e-mail cadastrado: enviamos os dados de acesso e lembretes sobre o fim do período grátis.
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Em até 48 horas úteis você pode receber mensagens de boas-vindas e suporte neste mesmo e-mail.
              </Typography>
              <Typography variant="caption" color="textSecondary" display="block" paragraph>
                Se você já estava logado com outra conta, vamos encerrar essa sessão para você entrar com o e-mail e a senha que acabou de cadastrar.
              </Typography>
              <Button color="primary" variant="contained" size="large" onClick={() => exitToLoginForNewAccount()}>
                Ir ao login
              </Button>
            </Paper>
          ) : (
          <Formik
            initialValues={initialValues}
            validationSchema={Schema}
            onSubmit={onSubmit}
          >
            {({ values, touched, errors, isSubmitting, setFieldValue }) => (
              <Form>
                {activeStep === 0 && <Section1 values={values} setFieldValue={setFieldValue} />}
                {activeStep === 1 && <Section2 setFieldValue={setFieldValue} />}
                {activeStep === 2 && <SectionAddress setFieldValue={setFieldValue} />}
                {activeStep === 3 && <SectionAccess touched={touched} errors={errors} />}

                <IconButton
                  className={classes.navButtonLeft}
                  onClick={prev}
                  disabled={activeStep === 0}
                  style={{
                    background: activeStep === 0 ? "#cbd5e1" : theme.palette.primary.main,
                    color: "#fff",
                    width: 46,
                    height: 46,
                    borderRadius: "50%",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                  }}
                >
                  <ArrowBackIosIcon />
                </IconButton>
                {activeStep < steps.length - 1 ? (
                  <IconButton
                    className={classes.navButtonRight}
                    onClick={() => canGoNext(activeStep, values) && next()}
                    disabled={!canGoNext(activeStep, values)}
                    style={{
                      background: canGoNext(activeStep, values) ? theme.palette.primary.main : "#cbd5e1",
                      color: "#fff",
                      width: 46,
                      height: 46,
                      borderRadius: "50%",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                    }}
                  >
                    <ArrowForwardIosIcon />
                  </IconButton>
                ) : (
                  <IconButton
                    className={classes.navButtonRight}
                    type="submit"
                    disabled={!canGoNext(activeStep, values) || isSubmitting}
                    style={{
                      background: canGoNext(activeStep, values) ? theme.palette.primary.main : "#cbd5e1",
                      color: "#fff",
                      width: 46,
                      height: 46,
                      borderRadius: "50%",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                    }}
                  >
                    <ArrowForwardIosIcon />
                  </IconButton>
                )}
              </Form>
            )}
          </Formik>
          )}
        </Box>
      </div>
    </Box>
  );
};

export default RegisterFreemium;
