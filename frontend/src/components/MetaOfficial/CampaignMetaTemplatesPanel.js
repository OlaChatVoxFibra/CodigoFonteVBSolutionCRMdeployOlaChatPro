/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useState } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
  makeStyles,
  useTheme
} from "@material-ui/core";
import WhatsApp from "@material-ui/icons/WhatsApp";
import SyncOutlined from "@material-ui/icons/Sync";
import AnnouncementOutlined from "@material-ui/icons/AnnouncementOutlined";
import ChatOutlined from "@material-ui/icons/ChatOutlined";
import CheckCircleOutline from "@material-ui/icons/CheckCircleOutline";
import HourglassEmpty from "@material-ui/icons/HourglassEmpty";
import CancelOutlined from "@material-ui/icons/CancelOutlined";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import MetaOfficialTemplateSelector from "./MetaOfficialTemplateSelector";

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  const surface = isDark ? "rgba(255,255,255,0.03)" : "#fff";
  const muted = isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)";
  return {
    root: {
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: theme.spacing(2.5),
      width: "100%",
      boxSizing: "border-box",
      [theme.breakpoints.up("md")]: {
        gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 340px)",
        alignItems: "start",
        gap: theme.spacing(3)
      }
    },
    main: {
      minWidth: 0,
      borderRadius: 14,
      border: `1px solid ${border}`,
      background: surface,
      padding: theme.spacing(2.5, 2.75),
      boxShadow: isDark ? "none" : "0 1px 2px rgba(15,23,42,0.04)"
    },
    hero: {
      display: "flex",
      gap: theme.spacing(1.75),
      alignItems: "flex-start",
      marginBottom: theme.spacing(2.5),
      paddingBottom: theme.spacing(2),
      borderBottom: `1px solid ${border}`
    },
    heroIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      background: "rgba(37,211,102,0.12)",
      color: "#25D366"
    },
    heroTitle: {
      fontSize: "1.15rem",
      fontWeight: 650,
      letterSpacing: "-0.02em",
      lineHeight: 1.3,
      marginBottom: 4
    },
    heroSub: {
      fontSize: "0.84rem",
      lineHeight: 1.5,
      color: theme.palette.text.secondary,
      maxWidth: 520
    },
    controls: {
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing(1.5),
      marginBottom: theme.spacing(2)
    },
    statusRow: {
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: theme.spacing(1),
      marginTop: theme.spacing(2.5),
      [theme.breakpoints.up("sm")]: {
        gridTemplateColumns: "repeat(3, 1fr)"
      }
    },
    statusCard: {
      borderRadius: 12,
      border: `1px solid ${border}`,
      background: muted,
      padding: theme.spacing(1.25, 1.5),
      display: "flex",
      gap: 10,
      alignItems: "flex-start"
    },
    statusIcon: { marginTop: 2, fontSize: 18 },
    statusLabel: { fontSize: "0.78rem", fontWeight: 650, marginBottom: 2 },
    statusDesc: { fontSize: "0.72rem", lineHeight: 1.4, color: theme.palette.text.secondary },
    aside: {
      borderRadius: 14,
      border: `1px solid ${border}`,
      background: surface,
      padding: theme.spacing(2, 2.25),
      position: "sticky",
      top: 12,
      boxShadow: isDark ? "none" : "0 1px 2px rgba(15,23,42,0.04)"
    },
    asideHead: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: theme.spacing(1.75)
    },
    asideTitle: { fontSize: "0.92rem", fontWeight: 650, letterSpacing: "-0.01em" },
    asideSub: { fontSize: "0.75rem", color: theme.palette.text.secondary },
    step: {
      display: "flex",
      gap: 12,
      marginBottom: theme.spacing(1.75),
      "&:last-child": { marginBottom: 0 }
    },
    stepNum: {
      width: 24,
      height: 24,
      borderRadius: 8,
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "0.72rem",
      fontWeight: 700,
      background: "rgba(37,211,102,0.14)",
      color: isDark ? "#86efac" : "#15803d"
    },
    stepTitle: { fontSize: "0.8rem", fontWeight: 600, marginBottom: 2 },
    stepBody: { fontSize: "0.74rem", lineHeight: 1.45, color: theme.palette.text.secondary }
  };
});

const TUTORIAL_STEPS = [
  {
    title: "Conexão API Oficial",
    body: "Selecione a WABA conectada (canal WhatsApp API Oficial). Só aparecem conexões CONNECTED."
  },
  {
    title: "Sincronizar Meta",
    body: "Clique em Sincronizar para buscar templates APPROVED, PENDING e REJECTED na Meta Cloud API."
  },
  {
    title: "Usar em campanhas",
    body: "Na aba Campanhas, escolha a conexão oficial e o template aprovado. Variáveis {{1}}, {{2}}… são preenchidas no disparo."
  },
  {
    title: "Usar no atendimento",
    body: "No ticket (composer), menu WhatsApp verde → Template Meta. Obrigatório fora da janela de 24h."
  },
  {
    title: "Criar / editar na Meta",
    body: "Novos modelos são criados no Meta Business Manager (WhatsApp Manager → Templates). Depois sincronize aqui."
  }
];

export default function CampaignMetaTemplatesPanel() {
  const classes = useStyles();
  const theme = useTheme();
  const [whatsapps, setWhatsapps] = useState([]);
  const [whatsappId, setWhatsappId] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/whatsapp", { params: { session: 0 } });
        const oficial = (data || []).filter(
          (w) => w.channel === "whatsapp_oficial" && w.status === "CONNECTED"
        );
        setWhatsapps(oficial);
        if (oficial[0]?.id) setWhatsappId(String(oficial[0].id));
      } catch (err) {
        toastError(err);
      }
    };
    load();
  }, []);

  return (
    <Box className={classes.root}>
      <Paper className={classes.main} elevation={0}>
        <Box className={classes.hero}>
          <Box className={classes.heroIcon}>
            <WhatsApp style={{ fontSize: 26 }} />
          </Box>
          <Box>
            <Typography className={classes.heroTitle}>
              Templates WhatsApp API Oficial
            </Typography>
            <Typography className={classes.heroSub}>
              Biblioteca dos templates aprovados pela Meta, sincronizados da sua WABA.
              Use em campanhas em massa e no atendimento fora da janela de 24 horas.
            </Typography>
          </Box>
        </Box>

        <Box className={classes.controls}>
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel>Conexão API Oficial</InputLabel>
            <Select
              label="Conexão API Oficial"
              value={whatsappId}
              onChange={(e) => setWhatsappId(String(e.target.value))}
            >
              {whatsapps.length === 0 ? (
                <MenuItem value="" disabled>
                  Nenhuma conexão oficial conectada
                </MenuItem>
              ) : (
                whatsapps.map((w) => (
                  <MenuItem key={w.id} value={String(w.id)}>
                    {w.name} ({w.phone_number || w.phone_number_id})
                  </MenuItem>
                ))
              )}
            </Select>
          </FormControl>
        </Box>

        <MetaOfficialTemplateSelector
          whatsappId={whatsappId ? Number(whatsappId) : null}
          listMode
          showSync
        />

        <Box className={classes.statusRow}>
          <Box className={classes.statusCard}>
            <CheckCircleOutline
              className={classes.statusIcon}
              style={{ color: theme.palette.success.main }}
            />
            <Box>
              <Typography className={classes.statusLabel}>APPROVED</Typography>
              <Typography className={classes.statusDesc}>
                Pronto para envio em campanhas e tickets.
              </Typography>
            </Box>
          </Box>
          <Box className={classes.statusCard}>
            <HourglassEmpty
              className={classes.statusIcon}
              style={{ color: theme.palette.warning.main }}
            />
            <Box>
              <Typography className={classes.statusLabel}>PENDING</Typography>
              <Typography className={classes.statusDesc}>
                Aguardando aprovação da Meta.
              </Typography>
            </Box>
          </Box>
          <Box className={classes.statusCard}>
            <CancelOutlined
              className={classes.statusIcon}
              style={{ color: theme.palette.error.main }}
            />
            <Box>
              <Typography className={classes.statusLabel}>REJECTED</Typography>
              <Typography className={classes.statusDesc}>
                Rejeitado — revise no Meta Business.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      <Paper className={classes.aside} elevation={0}>
        <Box className={classes.asideHead}>
          <Box className={classes.heroIcon} style={{ width: 36, height: 36 }}>
            <SyncOutlined style={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography className={classes.asideTitle}>Como usar</Typography>
            <Typography className={classes.asideSub}>Passo a passo rápido</Typography>
          </Box>
        </Box>
        {TUTORIAL_STEPS.map((s, i) => (
          <Box key={s.title} className={classes.step}>
            <Box className={classes.stepNum}>{i + 1}</Box>
            <Box>
              <Typography className={classes.stepTitle}>{s.title}</Typography>
              <Typography className={classes.stepBody}>{s.body}</Typography>
            </Box>
          </Box>
        ))}
        <Box mt={2} display="flex" flexDirection="column" style={{ gap: 8 }}>
          <Box display="flex" alignItems="center" style={{ gap: 8 }}>
            <AnnouncementOutlined style={{ fontSize: 16, color: "#25D366" }} />
            <Typography className={classes.stepBody}>
              Campanhas → template Meta no disparo oficial
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" style={{ gap: 8 }}>
            <ChatOutlined style={{ fontSize: 16, color: "#25D366" }} />
            <Typography className={classes.stepBody}>
              Tickets → menu WhatsApp → Template Meta
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
