/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  Box,
  Typography,
  Collapse,
  IconButton,
  Paper,
} from "@material-ui/core";
import {
  ExpandMore,
  ExpandLess,
  Smartphone,
  CropFree,
  Cloud,
  CheckCircleOutline,
} from "@material-ui/icons";
import { motion, AnimatePresence } from "framer-motion";

const HELVETICA =
  '"Helvetica Neue", Helvetica, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif';

const useStyles = makeStyles((theme) => ({
  root: {
    fontFamily: HELVETICA,
    marginBottom: theme.spacing(2),
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
    padding: theme.spacing(1.5, 2),
    borderRadius: 14,
    border: `1px solid ${
      theme.palette.type === "dark"
        ? "rgba(255,255,255,0.1)"
        : "rgba(0,0,0,0.06)"
    }`,
    background:
      theme.palette.type === "dark"
        ? "rgba(255,255,255,0.04)"
        : "rgba(255,255,255,0.85)",
    backdropFilter: "blur(12px)",
    transition: "box-shadow 0.2s ease",
    "&:hover": {
      boxShadow:
        theme.palette.type === "dark"
          ? "0 4px 24px rgba(0,0,0,0.3)"
          : "0 4px 20px rgba(0,0,0,0.06)",
    },
  },
  headerTitle: {
    fontFamily: HELVETICA,
    fontWeight: 600,
    fontSize: 15,
    letterSpacing: "-0.02em",
  },
  headerSub: {
    fontFamily: HELVETICA,
    fontSize: 12,
    color: theme.palette.text.secondary,
    marginTop: 2,
  },
  tabs: {
    display: "flex",
    gap: 8,
    marginTop: theme.spacing(1.5),
    marginBottom: theme.spacing(1.5),
  },
  tab: {
    fontFamily: HELVETICA,
    fontSize: 13,
    fontWeight: 500,
    padding: "8px 16px",
    borderRadius: 20,
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s ease",
    background: "transparent",
    color: theme.palette.text.secondary,
    "&.active": {
      background:
        theme.palette.type === "dark" ? "#fff" : "#1d1d1f",
      color: theme.palette.type === "dark" ? "#1d1d1f" : "#fff",
    },
  },
  stepCard: {
    display: "flex",
    gap: 10,
    padding: theme.spacing(1, 1.25),
    borderRadius: 10,
    marginBottom: 6,
    border: `1px solid ${
      theme.palette.type === "dark"
        ? "rgba(255,255,255,0.06)"
        : "rgba(0,0,0,0.05)"
    }`,
    background:
      theme.palette.type === "dark"
        ? "rgba(255,255,255,0.02)"
        : "rgba(0,0,0,0.02)",
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 600,
    flexShrink: 0,
    fontFamily: HELVETICA,
    background:
      theme.palette.type === "dark"
        ? "rgba(255,255,255,0.12)"
        : "rgba(0,0,0,0.08)",
  },
  stepTitle: {
    fontFamily: HELVETICA,
    fontWeight: 600,
    fontSize: 12,
    marginBottom: 2,
    letterSpacing: "-0.01em",
  },
  stepDesc: {
    fontFamily: HELVETICA,
    fontSize: 11,
    lineHeight: 1.4,
    color: theme.palette.text.secondary,
  },
  tip: {
    fontFamily: HELVETICA,
    fontSize: 12,
    padding: theme.spacing(1.25, 1.5),
    borderRadius: 10,
    marginTop: theme.spacing(1),
    background:
      theme.palette.type === "dark"
        ? "rgba(52, 199, 89, 0.12)"
        : "rgba(52, 199, 89, 0.1)",
    color: theme.palette.type === "dark" ? "#6ee7a0" : "#248a3d",
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
  },
  iconPulse: {
    animation: "$pulse 2s ease-in-out infinite",
  },
  "@keyframes pulse": {
    "0%, 100%": { opacity: 1, transform: "scale(1)" },
    "50%": { opacity: 0.7, transform: "scale(1.05)" },
  },
  compact: {
    marginBottom: theme.spacing(1.5),
  },
}));

const WEB_STEPS = [
  {
    title: "Configure as filas (listas)",
    desc: "Em Filas & Chatbot → Filas, crie ao menos uma lista. Depois vincule-a na etapa Filas ao criar a conexão.",
  },
  {
    title: "Crie a conexão",
    desc: 'Clique em "+" e escolha "WhatsApp". Preencha nome, grupos e histórico se precisar.',
  },
  {
    title: "Escaneie o QR Code",
    desc: "WhatsApp no celular → Dispositivos conectados → Conectar. Aponte para o QR na tela.",
  },
  {
    title: "Aguarde Conectado",
    desc: "Status CONNECTED = pronto para receber mensagens.",
  },
  {
    title: "Mensagens, NPS e fluxos",
    desc: "Opcional na criação: boas-vindas, despedida, pesquisa NPS e fluxos automáticos.",
  },
];

const API_STEPS = [
  {
    title: "Configure as filas (listas)",
    desc: "Crie filas em Filas & Chatbot → Filas e associe na etapa Filas da conexão.",
  },
  {
    title: "Conta Meta Business",
    desc: "Conta em business.facebook.com com WhatsApp Business API ativo.",
  },
  {
    title: "IDs na Meta",
    desc: "Phone Number ID, WABA ID, Business ID e token permanente no Meta Developers.",
  },
  {
    title: "Conexão WhatsApp Oficial",
    desc: '"+" → WhatsApp Oficial. Preencha os campos da API e salve.',
  },
  {
    title: "Webhook e extras",
    desc: "Configure webhook na Meta. Opcional: mensagens, NPS e fluxos na criação da conexão.",
  },
];

const StepList = ({ steps, accent }) => {
  const classes = useStyles();
  return (
    <Box>
      {steps.map((step, i) => (
        <motion.div
          key={step.title}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08, duration: 0.35 }}
        >
          <Paper className={classes.stepCard} elevation={0}>
            <div
              className={classes.stepNum}
              style={
                accent
                  ? { background: `${accent}22`, color: accent }
                  : undefined
              }
            >
              {i + 1}
            </div>
            <div>
              <Typography className={classes.stepTitle}>{step.title}</Typography>
              <Typography className={classes.stepDesc}>{step.desc}</Typography>
            </div>
          </Paper>
        </motion.div>
      ))}
    </Box>
  );
};

const WhatsAppConnectionDocs = ({
  compact = false,
  defaultExpanded = false,
  guideType = "both",
  hideGuideTabs = false,
}) => {
  const classes = useStyles();
  const [expanded, setExpanded] = useState(defaultExpanded || compact);
  const initialGuide =
    guideType === "api" ? "api" : "web";
  const [guide, setGuide] = useState(initialGuide);

  React.useEffect(() => {
    if (guideType === "api") setGuide("api");
    else if (guideType === "web") setGuide("web");
  }, [guideType]);

  const activeGuide = hideGuideTabs
    ? guideType === "api"
      ? "api"
      : "web"
    : guide;

  const content = (
    <>
      {!hideGuideTabs && guideType === "both" && (
      <div className={classes.tabs}>
        <button
          type="button"
          className={`${classes.tab} ${guide === "web" ? "active" : ""}`}
          onClick={() => setGuide("web")}
        >
          <Smartphone
            style={{ fontSize: 16, marginRight: 6, verticalAlign: "middle" }}
          />
          WhatsApp Web
        </button>
        <button
          type="button"
          className={`${classes.tab} ${guide === "api" ? "active" : ""}`}
          onClick={() => setGuide("api")}
        >
          <Cloud
            style={{ fontSize: 16, marginRight: 6, verticalAlign: "middle" }}
          />
          API Oficial
        </button>
      </div>
      )}

      <AnimatePresence mode="wait">
        {activeGuide === "web" ? (
          <motion.div
            key="web"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <Box display="flex" alignItems="center" mb={1.5} style={{ gap: 8 }}>
              <CropFree
                className={classes.iconPulse}
                style={{ color: "#25D366", fontSize: 28 }}
              />
              <Typography
                style={{
                  fontFamily: HELVETICA,
                  fontSize: 13,
                  color: "#86868b",
                }}
              >
                Conexão via QR Code — ideal para começar rápido
              </Typography>
            </Box>
            <StepList steps={WEB_STEPS} accent="#25D366" />
            <motion.div className={classes.tip}>
              <CheckCircleOutline style={{ fontSize: 16, marginTop: 1 }} />
              <span>
                Renovação automática a cada 1h. Configure filas em Filas & Chatbot →
                Filas (botão ? na página).
              </span>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="api"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <Box display="flex" alignItems="center" mb={1.5} style={{ gap: 8 }}>
              <Cloud
                className={classes.iconPulse}
                style={{ color: "#1877F2", fontSize: 28 }}
              />
              <Typography
                style={{
                  fontFamily: HELVETICA,
                  fontSize: 13,
                  color: "#86868b",
                }}
              >
                API oficial Meta — maior estabilidade e escala
              </Typography>
            </Box>
            <StepList steps={API_STEPS} accent="#1877F2" />
            <motion.div
              className={classes.tip}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <CheckCircleOutline style={{ fontSize: 16, marginTop: 1 }} />
              <span>
                Documentação completa:{" "}
                <a
                  href="https://developers.facebook.com/docs/whatsapp/cloud-api"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "inherit", fontWeight: 600 }}
                >
                  Meta Cloud API
                </a>
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );

  if (compact) {
    return (
      <div className={`${classes.root} ${classes.compact}`}>{content}</div>
    );
  }

  return (
    <motion.div
      className={classes.root}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div
        className={classes.header}
        onClick={() => setExpanded((e) => !e)}
        role="button"
        tabIndex={0}
        onKeyDown={(ev) => ev.key === "Enter" && setExpanded((e) => !e)}
      >
        <div>
          <Typography className={classes.headerTitle}>
            Como conectar o WhatsApp
          </Typography>
          <Typography className={classes.headerSub}>
            Guia passo a passo — Web (QR Code) e API Oficial
          </Typography>
        </div>
        <IconButton size="small" aria-label="expandir guia">
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </div>
      <Collapse in={expanded}>{content}</Collapse>
    </motion.div>
  );
};

export default WhatsAppConnectionDocs;
