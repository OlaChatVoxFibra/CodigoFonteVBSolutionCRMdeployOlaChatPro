/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Popover,
  Typography,
  makeStyles
} from "@material-ui/core";
import WhatsApp from "@material-ui/icons/WhatsApp";
import GetApp from "@material-ui/icons/GetApp";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import { downloadMetaHealthReportPdf } from "../../utils/downloadMetaHealthReportPdf";

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  return {
    paper: {
      width: 300,
      maxWidth: "calc(100vw - 16px)",
      borderRadius: 12,
      padding: theme.spacing(1.25, 0, 1),
      boxShadow: isDark
        ? "0 12px 40px rgba(0,0,0,0.5)"
        : "0 12px 32px rgba(15,23,42,0.14)",
      border: isDark
        ? "1px solid rgba(255,255,255,0.08)"
        : "1px solid rgba(15,23,42,0.08)"
    },
    header: {
      padding: theme.spacing(0, 1.5, 1)
    },
    title: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontWeight: 600,
      fontSize: "0.82rem",
      color: "#25D366"
    },
    row: {
      display: "flex",
      justifyContent: "space-between",
      gap: 8,
      padding: theme.spacing(0.4, 1.5),
      fontSize: "0.72rem"
    },
    label: { color: theme.palette.text.secondary },
    value: { fontWeight: 500, textAlign: "right", wordBreak: "break-word" },
    actions: {
      padding: theme.spacing(1, 1.5, 0),
      display: "flex",
      flexDirection: "column",
      gap: 6
    }
  };
});

function qualityLabel(rating) {
  const r = String(rating || "").toUpperCase();
  if (r === "GREEN") return "Alta (GREEN)";
  if (r === "YELLOW") return "Média (YELLOW)";
  if (r === "RED") return "Baixa (RED)";
  return rating || "—";
}

/**
 * Painel compacto com dados reais da Meta Cloud API (health / qualidade / limite).
 */
export default function MetaOfficialInsightsPanel({
  open,
  anchorEl,
  onClose,
  whatsappId
}) {
  const classes = useStyles();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const load = async () => {
    if (!whatsappId) return;
    setLoading(true);
    try {
      const { data: health } = await api.get(
        `/whatsapp/${whatsappId}/meta-health`
      );
      setData(health);
    } catch (err) {
      toastError(err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && whatsappId) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, whatsappId]);

  const handleSyncTemplates = async () => {
    if (!whatsappId) return;
    try {
      await api.get(`/whatsapp/sync-templates/${whatsappId}`);
      toast.success("Templates sincronizados com a Meta.");
      await load();
    } catch (err) {
      toastError(err);
    }
  };

  const handleRepair = async () => {
    if (!whatsappId) return;
    try {
      await api.post(`/whatsapp/${whatsappId}/repair-oficial`);
      toast.success("Conexão reparada / perfil Meta atualizado.");
      await load();
    } catch (err) {
      toastError(err);
    }
  };

  const handleDownloadPdf = () => {
    if (!data) {
      toast.warn("Atualize os dados antes de baixar o PDF.");
      return;
    }
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      downloadMetaHealthReportPdf(
        data,
        `relatorio-meta-${whatsappId || "waba"}-${stamp}.pdf`
      );
      toast.success("PDF do relatório baixado.");
    } catch (e) {
      toast.error("Não foi possível gerar o PDF.");
    }
  };

  const Row = ({ label, value }) => (
    <Box className={classes.row}>
      <span className={classes.label}>{label}</span>
      <span className={classes.value}>{value}</span>
    </Box>
  );

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "right" }}
      transformOrigin={{ vertical: "bottom", horizontal: "right" }}
      marginThreshold={8}
      disableScrollLock
      PaperProps={{ className: classes.paper, elevation: 8 }}
    >
      <Box className={classes.header}>
        <Typography className={classes.title} component="div">
          <WhatsApp style={{ fontSize: 18 }} />
          Relatório Meta (API Oficial)
        </Typography>
      </Box>
      <Divider />
      {loading ? (
        <Box display="flex" justifyContent="center" py={3}>
          <CircularProgress size={22} />
        </Box>
      ) : !whatsappId ? (
        <Box p={2}>
          <Typography variant="caption">Conexão não encontrada neste ticket.</Typography>
        </Box>
      ) : (
        <>
          <Row label="Status conexão" value={data?.status || "—"} />
          <Row
            label="Cloud API"
            value={data?.phoneCloudStatus || data?.meta_phone_status || "—"}
          />
          <Row
            label="Qualidade"
            value={qualityLabel(data?.meta_quality_rating)}
          />
          <Row
            label="Limite msg"
            value={data?.meta_messaging_limit || "—"}
          />
          <Row
            label="Nome verificado"
            value={data?.meta_verified_name || "—"}
          />
          <Row
            label="Token válido"
            value={
              data?.tokenValid === true
                ? "Sim"
                : data?.tokenValid === false
                ? "Não — atualize o token"
                : "—"
            }
          />
          <Row
            label="App Secret"
            value={data?.facebookAppSecretConfigured ? "OK" : "Faltando no servidor"}
          />
          {data?.tokenError ? (
            <Box px={1.5} pt={0.5}>
              <Typography variant="caption" color="error">
                {data.tokenError}
              </Typography>
            </Box>
          ) : null}
          <Box className={classes.actions}>
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<GetApp style={{ fontSize: 16 }} />}
              onClick={handleDownloadPdf}
              disabled={!data || loading}
            >
              Baixar PDF
            </Button>
            <Button size="small" variant="outlined" color="primary" onClick={load}>
              Atualizar dados
            </Button>
            <Button size="small" variant="outlined" onClick={handleSyncTemplates}>
              Sincronizar templates
            </Button>
            <Button size="small" variant="outlined" onClick={handleRepair}>
              Reparar conexão / perfil
            </Button>
          </Box>
        </>
      )}
    </Popover>
  );
}
