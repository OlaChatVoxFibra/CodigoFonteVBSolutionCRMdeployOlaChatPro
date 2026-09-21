/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect } from "react";
import {
  Button,
  TextField,
  Typography,
  Box,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@material-ui/core";
import { toast } from "react-toastify";
import api from "../../../services/api";
import toastError from "../../../errors/toastError";
import ConnectionSetupFluid from "../ConnectionSetupFluid";
import ConnectionSetupSection, {
  ConnectionSetupFormShell,
} from "../ConnectionSetupSection";

const EMPTY = {
  id: null,
  name: "SMS",
  provider: "vonage",
  fromNumber: "",
  apiKey: "",
  apiSecret: "",
  color: "#1976d2",
  notes: "",
};

export default function SmsSetupForm({
  whatsAppId,
  isEdit,
  onCancel,
  onSaved,
  hidePageHeader = false,
}) {
  const [config, setConfig] = useState(EMPTY);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(Boolean(whatsAppId));

  useEffect(() => {
    if (!whatsAppId) {
      setConfig(EMPTY);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/sms/connection/${whatsAppId}`);
        if (cancelled) return;
        setConfig({
          id: data.id,
          name: data.name || "SMS",
          provider: data.provider === "twilio" ? "twilio" : "vonage",
          fromNumber: data.fromNumber || "",
          apiKey: data.apiKey || "",
          apiSecret: "",
          color: data.color || "#1976d2",
          notes: data.webhookUrl || "",
        });
      } catch (err) {
        if (!cancelled) toastError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [whatsAppId]);

  const save = async () => {
    if (!config.name?.trim()) {
      toast.error("Informe o nome da conexão SMS.");
      return;
    }
    if (!config.fromNumber) {
      toast.error("Informe o número remetente (From).");
      return;
    }
    const key = config.apiKey;
    if (!key) {
      toast.error(
        config.provider === "twilio"
          ? "Informe o Account SID."
          : "Informe a API Key Vonage."
      );
      return;
    }
    if (!config.id && !config.apiSecret) {
      toast.error(
        config.provider === "twilio"
          ? "Informe o Auth Token."
          : "Informe a API Secret Vonage."
      );
      return;
    }
    try {
      const payload = {
        id: config.id || undefined,
        name: config.name,
        provider: config.provider || "vonage",
        apiKey: key,
        apiSecret: config.apiSecret,
        fromNumber: config.fromNumber,
        queueIds: [],
        greetingMessage: "",
        color: config.color || "#1976d2",
      };
      const { data } = config.id
        ? await api.put("/sms/connection", payload)
        : await api.post("/sms/connection", payload);
      const webhookUrl = data?.webhookUrl || data?.waba_webhook || "";
      toast.success(
        webhookUrl
          ? "Conexão SMS salva. Configure o webhook inbound no painel."
          : "Conexão SMS salva."
      );
      if (webhookUrl) {
        try {
          await navigator.clipboard.writeText(webhookUrl);
          toast.info("URL do webhook copiada.");
        } catch (_) {}
      }
      onSaved();
    } catch (err) {
      toastError(err);
    }
  };

  const test = async () => {
    if (!config.apiKey || !config.apiSecret || !config.fromNumber) {
      toast.error("Preencha API Key, API Secret e remetente (From).");
      return;
    }
    setTesting(true);
    try {
      const { data } = await api.post("/sms/test", {
        provider: config.provider || "vonage",
        apiKey: config.apiKey,
        apiSecret: config.apiSecret,
        fromNumber: config.fromNumber,
      });
      if (data?.ok) toast.success(data.message || "SMS OK");
      else toast.error(data?.message || "Falha no teste");
    } catch (err) {
      toastError(err);
    } finally {
      setTesting(false);
    }
  };

  const copyWebhook = () => {
    if (!config.notes) {
      toast.warning("Salve a conexão primeiro para gerar o webhook.");
      return;
    }
    navigator.clipboard.writeText(config.notes);
    toast.success("Webhook copiado.");
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <ConnectionSetupFluid
      fluid
      hidePageHeader={hidePageHeader}
      title={isEdit ? "Editar conexão SMS" : "Nova conexão — SMS"}
      subtitle={`${config.provider === "twilio" ? "Twilio" : "Vonage"} — credenciais e webhook inbound.`}
      footer={
        <>
          <Button onClick={onCancel} color="default">
            Cancelar
          </Button>
          <Button onClick={save} color="primary" variant="contained" disableElevation>
            Salvar
          </Button>
        </>
      }
    >
      <ConnectionSetupFormShell>
        <ConnectionSetupSection title="Provedor">
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel>Provedor</InputLabel>
            <Select
              value={config.provider || "vonage"}
              onChange={(e) =>
                setConfig((p) => ({ ...p, provider: e.target.value }))
              }
              label="Provedor"
            >
              <MenuItem value="vonage">Vonage</MenuItem>
              <MenuItem value="twilio">Twilio</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Nome da conexão"
            fullWidth
            variant="outlined"
            size="small"
            value={config.name}
            onChange={(e) => setConfig((p) => ({ ...p, name: e.target.value }))}
            autoComplete="off"
          />
        </ConnectionSetupSection>

        <ConnectionSetupSection title="Credenciais">
          <TextField
            label={
              config.provider === "twilio"
                ? "Número remetente (From)"
                : "Remetente Vonage"
            }
            fullWidth
            variant="outlined"
            size="small"
            value={config.fromNumber}
            onChange={(e) =>
              setConfig((p) => ({ ...p, fromNumber: e.target.value }))
            }
            placeholder={
              config.provider === "twilio" ? "+5511999999999" : "VBSolution"
            }
          />
          <TextField
            label={config.provider === "twilio" ? "Account SID" : "API Key"}
            fullWidth
            variant="outlined"
            size="small"
            value={config.apiKey}
            onChange={(e) => setConfig((p) => ({ ...p, apiKey: e.target.value }))}
            autoComplete="off"
          />
          <TextField
            label={config.provider === "twilio" ? "Auth Token" : "API Secret"}
            type="password"
            fullWidth
            variant="outlined"
            size="small"
            value={config.apiSecret}
            onChange={(e) =>
              setConfig((p) => ({ ...p, apiSecret: e.target.value }))
            }
            placeholder={config.id ? "Vazio = manter atual" : ""}
            autoComplete="new-password"
          />
        </ConnectionSetupSection>

        {config.notes ? (
          <ConnectionSetupSection title="Webhook inbound">
            <Typography
              variant="body2"
              color="textSecondary"
              style={{ wordBreak: "break-all", lineHeight: 1.5 }}
            >
              {config.notes}
            </Typography>
            <Button size="small" variant="outlined" onClick={copyWebhook}>
              Copiar URL
            </Button>
          </ConnectionSetupSection>
        ) : null}
      </ConnectionSetupFormShell>
    </ConnectionSetupFluid>
  );
}
