/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Switch,
  TextField,
  Typography
} from "@material-ui/core";
import { WhatsApp } from "@material-ui/icons";
import { makeStyles } from "@material-ui/core/styles";
import { toast } from "react-toastify";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import useMetaEmbeddedSignup from "../../hooks/useMetaEmbeddedSignup";

const useStyles = makeStyles((theme) => ({
  wrap: {
    marginBottom: theme.spacing(2)
  },
  wrapCompact: {
    marginBottom: theme.spacing(1.5)
  },
  connectBtn: {
    backgroundColor: "#1877F2",
    color: "#fff",
    textTransform: "none",
    fontWeight: 600,
    fontSize: "0.9375rem",
    padding: theme.spacing(1.25, 3),
    borderRadius: 8,
    boxShadow: "0 2px 8px rgba(24, 119, 242, 0.35)",
    "&:hover": {
      backgroundColor: "#166FE0"
    }
  },
  connectBtnFull: {
    width: "100%",
    maxWidth: 420,
    justifyContent: "center"
  },
  modalField: {
    marginBottom: theme.spacing(2)
  },
  modalHint: {
    fontSize: "0.8125rem",
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(2),
    lineHeight: 1.5
  }
}));

const looksLikeEmail = (value) => /@/.test(String(value || ""));

export default function WhatsAppEmbeddedSignupConnect({
  compact = false,
  whatsappId,
  defaultName = "",
  onSuccess,
  disabled = false
}) {
  const classes = useStyles();
  const { loading, launchEmbeddedSignup } = useMetaEmbeddedSignup();
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [connectionName, setConnectionName] = useState(defaultName);
  const [coexistence, setCoexistence] = useState(true);
  const [appId, setAppId] = useState("");
  const [configId, setConfigId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [hasAppSecret, setHasAppSecret] = useState(false);

  const loadConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const { data } = await api.get("/whatsapp/embedded-signup/config");
      setAppId(data?.appId || "");
      setConfigId(data?.configId || "");
      setHasAppSecret(Boolean(data?.hasAppSecret));
    } catch (err) {
      toastError(err);
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (defaultName) setConnectionName(defaultName);
  }, [defaultName]);

  const isConfigured = Boolean(
    appId.trim() && configId.trim() && hasAppSecret
  );

  const busy = loading || submitting || loadingConfig;

  const runEmbeddedSignup = async (credentials) => {
    const signup = await launchEmbeddedSignup({
      appId: credentials.appId,
      configId: credentials.configId,
      coexistence
    });

    const { data } = await api.post("/whatsapp/embedded-signup", {
      code: signup.code,
      wabaId: signup.wabaId,
      phoneNumberId: signup.phoneNumberId,
      businessId: signup.businessId,
      name: connectionName.trim() || undefined,
      coexistence: signup.coexistence,
      whatsappId,
      inlineAppId: credentials.appId,
      inlineAppSecret: credentials.appSecret
    });

    const wa = data?.whatsapp;
    const label = wa?.name || connectionName || "WhatsApp API Oficial";
    const statusLabel =
      wa?.status === "CONNECTED" ? "Conectado" : wa?.status || "salvo";

    toast.success(
      data?.created
        ? `Conexão "${label}" criada (${statusLabel}).`
        : `Conexão "${label}" atualizada (${statusLabel}).`,
      { autoClose: 6000 }
    );

    await loadConfig();

    if (typeof onSuccess === "function") {
      await onSuccess(wa);
    }

    return wa;
  };

  const saveConfig = async () => {
    const cleanAppId = appId.trim();
    const cleanConfigId = configId.trim();
    const cleanSecret = appSecret.trim();

    if (!cleanAppId || !cleanConfigId) {
      toast.error("Informe App ID e Configuration ID do app Meta.");
      return null;
    }

    if (looksLikeEmail(cleanConfigId)) {
      toast.error(
        "Configuration ID inválido. Use o ID do Embedded Signup (Meta App Dashboard), não e-mail."
      );
      return null;
    }

    if (!hasAppSecret && !cleanSecret) {
      toast.error("Informe o App Secret do app Meta.");
      return null;
    }

    const payload = {
      appId: cleanAppId,
      configId: cleanConfigId
    };
    if (cleanSecret) {
      payload.appSecret = cleanSecret;
    }

    const { data } = await api.put("/whatsapp/embedded-signup/config", payload);
    setHasAppSecret(Boolean(data?.hasAppSecret));
    setAppSecret("");

    return {
      appId: cleanAppId,
      configId: cleanConfigId,
      appSecret: cleanSecret || undefined
    };
  };

  const handleMainButtonClick = async () => {
    if (busy || disabled) return;

    if (isConfigured) {
      try {
        setSubmitting(true);
        await runEmbeddedSignup({
          appId: appId.trim(),
          configId: configId.trim()
        });
      } catch (err) {
        toastError(err);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setModalOpen(true);
  };

  const handleModalConnect = async () => {
    try {
      setSubmitting(true);
      const saved = await saveConfig();
      if (!saved) return;

      setModalOpen(false);

      await runEmbeddedSignup(saved);
    } catch (err) {
      toastError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Box className={compact ? classes.wrapCompact : classes.wrap}>
        <Button
          className={`${classes.connectBtn} ${compact ? "" : classes.connectBtnFull}`}
          variant="contained"
          disableElevation
          disabled={busy || disabled}
          onClick={handleMainButtonClick}
          startIcon={
            busy ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <WhatsApp />
            )
          }
        >
          {busy ? "Conectando..." : "Conectar com WhatsApp Business"}
        </Button>
      </Box>

      <Dialog
        open={modalOpen}
        onClose={() => !submitting && setModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gridGap={8}>
            <WhatsApp style={{ color: "#25D366" }} />
            Conectar WhatsApp Business
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Typography className={classes.modalHint}>
            Informe os dados do app Meta desta organização. Em seguida abriremos
            o login Facebook; ao concluir, a conexão API Oficial aparece na
            lista abaixo com token, WABA e Phone ID preenchidos automaticamente.
          </Typography>

          <TextField
            className={classes.modalField}
            fullWidth
            size="small"
            variant="outlined"
            label="App ID Meta"
            name="meta_whatsapp_app_id"
            autoComplete="off"
            inputProps={{ autoComplete: "off" }}
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            disabled={submitting}
          />
          <TextField
            className={classes.modalField}
            fullWidth
            size="small"
            variant="outlined"
            label="Configuration ID (Embedded Signup)"
            name="meta_whatsapp_config_id"
            autoComplete="off"
            inputProps={{ autoComplete: "off" }}
            value={configId}
            onChange={(e) => setConfigId(e.target.value)}
            disabled={submitting}
            helperText="Meta App → WhatsApp → Embedded Signup → Configuration ID"
          />
          <TextField
            className={classes.modalField}
            fullWidth
            size="small"
            variant="outlined"
            type="password"
            label={hasAppSecret ? "App Secret (deixe vazio para manter)" : "App Secret Meta"}
            name="meta_whatsapp_app_secret"
            autoComplete="new-password"
            inputProps={{ autoComplete: "new-password" }}
            value={appSecret}
            onChange={(e) => setAppSecret(e.target.value)}
            disabled={submitting}
          />
          <TextField
            className={classes.modalField}
            fullWidth
            size="small"
            variant="outlined"
            label="Nome da conexão (opcional)"
            name="meta_whatsapp_connection_name"
            autoComplete="off"
            value={connectionName}
            onChange={(e) => setConnectionName(e.target.value)}
            disabled={submitting}
          />
          <FormControlLabel
            control={
              <Switch
                color="primary"
                checked={coexistence}
                onChange={(e) => setCoexistence(e.target.checked)}
                disabled={submitting}
              />
            }
            label="Coexistência — app no celular + API"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            className={classes.connectBtn}
            variant="contained"
            disableElevation
            disabled={submitting}
            onClick={handleModalConnect}
            startIcon={
              submitting ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <WhatsApp />
              )
            }
          >
            {submitting ? "Abrindo Meta..." : "Continuar com Facebook"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
