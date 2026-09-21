/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useContext } from "react";
import {
  Button,
  Box,
  TextField,
  Typography,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
} from "@material-ui/core";
import { toast } from "react-toastify";
import api from "../../../services/api";
import toastError from "../../../errors/toastError";
import { AuthContext } from "../../../context/Auth/AuthContext";
import { WhatsAppsContext } from "../../../context/WhatsApp/WhatsAppsContext";
import ConnectionSetupFluid from "../ConnectionSetupFluid";
import ConnectionSetupSection, {
  ConnectionSetupFormShell,
} from "../ConnectionSetupSection";

function isValidPhone(phone) {
  const p = String(phone || "").trim();
  if (!p || p.startsWith("@")) return false;
  const digits = p.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

const EMPTY = {
  id: null,
  name: "Telegram Oficial",
  apiId: "",
  apiHash: "",
  phoneNumber: "",
  loginCode: "",
  password2fa: "",
  greetingMessage: "",
  color: "#229ED9",
  promptId: "",
  agentDisabled: false,
  hasSession: false,
  status: "DISCONNECTED",
  codeSent: false,
  pairingPending: false,
  telegramLabel: null,
};

export default function TelegramOficialSetupForm({
  whatsAppId,
  isEdit,
  onCancel,
  onSaved,
  hidePageHeader = false,
}) {
  const { user } = useContext(AuthContext);
  const { fetchWhatsApps } = useContext(WhatsAppsContext);
  const companyId = user?.companyId;
  const [config, setConfig] = useState(EMPTY);
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(Boolean(whatsAppId));
  const [sendingCode, setSendingCode] = useState(false);
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/prompt", { params: { pageNumber: "1" } });
        if (!cancelled) {
          setPrompts(Array.isArray(data?.prompts) ? data.prompts : []);
        }
      } catch {
        if (!cancelled) setPrompts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  useEffect(() => {
    if (!whatsAppId) {
      setConfig(EMPTY);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/telegram-user/connection/${whatsAppId}`);
        if (cancelled) return;
        setConfig({
          id: data.id,
          name: data.name || "Telegram Oficial",
          apiId: data.apiId || "",
          apiHash: "",
          phoneNumber: data.phoneNumber || "",
          telegramLabel: data.telegramLabel || null,
          loginCode: "",
          password2fa: "",
          greetingMessage: data.greetingMessage || "",
          color: data.color || "#229ED9",
          promptId: data.promptId != null ? String(data.promptId) : "",
          agentDisabled: Boolean(data.agentDisabled),
          hasSession: Boolean(data.hasSession),
          status: data.hasSession
            ? "CONNECTED"
            : data.status === "PAIRING" || data.pairingPending
              ? "PAIRING"
              : data.status || "DISCONNECTED",
          codeSent: Boolean(data.pairingPending || data.status === "PAIRING"),
          pairingPending: Boolean(data.pairingPending || data.status === "PAIRING"),
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

  const statusLabel = () => {
    if (config.hasSession) return "CONNECTED — sessão ativa";
    if (config.codeSent || config.pairingPending || config.status === "PAIRING") {
      return "PAIRING — digite o código e confirme";
    }
    return "DISCONNECTED — envie o código para logar";
  };

  const canConfirm =
    Boolean(config.id) &&
    !config.hasSession &&
    String(config.loginCode || "").trim().length >= 4;

  const save = async () => {
    if (!config.name?.trim()) {
      toast.error("Informe o nome da conexão.");
      return;
    }
    if (!config.apiId?.trim()) {
      toast.error("Informe o api_id de my.telegram.org/apps.");
      return;
    }
    if (!config.id && !config.apiHash?.trim()) {
      toast.error("Informe o api_hash.");
      return;
    }
    if (!isValidPhone(config.phoneNumber)) {
      toast.error("Informe o celular com DDI (+5541989046696).");
      return;
    }
    try {
      const payload = {
        id: config.id || undefined,
        name: config.name,
        apiId: config.apiId.trim(),
        ...(config.apiHash?.trim() ? { apiHash: config.apiHash.trim() } : {}),
        phoneNumber: config.phoneNumber.trim(),
        greetingMessage: config.greetingMessage || "",
        color: config.color || "#229ED9",
        queueIds: [],
        promptId:
          config.promptId === "" || config.promptId == null
            ? null
            : Number(config.promptId),
        agentDisabled: Boolean(config.agentDisabled),
      };
      const { data } = config.id
        ? await api.put("/telegram-user/connection", payload)
        : await api.post("/telegram-user/connection", payload);
      setConfig((p) => ({
        ...p,
        id: data.id,
        status: data.status || p.status,
        hasSession: Boolean(data.hasSession),
      }));
      toast.success(
        data.hasSession
          ? "Conexão salva (sessão ativa)."
          : "Credenciais salvas. Envie o código e confirme o login."
      );
      if (typeof fetchWhatsApps === "function") fetchWhatsApps({ silent: true });
      if (data.hasSession) onSaved();
    } catch (err) {
      toastError(err);
    }
  };

  const sendCode = async () => {
    if (!config.id) {
      toast.error("Salve a conexão antes de enviar o código.");
      return;
    }
    if (!isValidPhone(config.phoneNumber)) {
      toast.error("Corrija o número com DDI antes de enviar o código.");
      return;
    }
    setSendingCode(true);
    try {
      const { data } = await api.post(
        `/telegram-user/connection/${config.id}/send-code`
      );
      toast.success(data?.message || "Código enviado. Use o último código do app.");
      setConfig((p) => ({
        ...p,
        status: data?.status || "PAIRING",
        codeSent: true,
        pairingPending: data?.pairingPending !== false,
      }));
      if (typeof fetchWhatsApps === "function") fetchWhatsApps({ silent: true });
    } catch (err) {
      toastError(err);
    } finally {
      setSendingCode(false);
    }
  };

  const signIn = async () => {
    if (!config.id) {
      toast.error("Salve a conexão antes de confirmar o código.");
      return;
    }
    if (!canConfirm) {
      toast.error("Digite o código de 5 dígitos enviado pelo Telegram.");
      return;
    }
    setSigning(true);
    try {
      const { data } = await api.post(
        `/telegram-user/connection/${config.id}/sign-in`,
        {
          code: config.loginCode.trim(),
          password: config.password2fa?.trim() || undefined,
        }
      );
      toast.success("Conta Telegram conectada (MTProto).");
      setConfig((p) => ({
        ...p,
        status: data.status || "CONNECTED",
        hasSession: true,
        loginCode: "",
        password2fa: "",
      }));
      if (typeof fetchWhatsApps === "function") fetchWhatsApps({ silent: true });
      onSaved();
    } catch (err) {
      toastError(err);
    } finally {
      setSigning(false);
    }
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
      title={
        isEdit ? "Editar Telegram Oficial (MTProto)" : "Nova conexão — Telegram Oficial"
      }
      subtitle="Conta real via my.telegram.org — login SMS/app."
      hint={
        <>
          Credenciais em{" "}
          <a href="https://my.telegram.org/apps" target="_blank" rel="noreferrer">
            my.telegram.org/apps
          </a>
          . Use número com DDI (não @username).
        </>
      }
      footer={
        <>
          <Button onClick={onCancel} color="default">
            Cancelar
          </Button>
          <Button onClick={save} color="primary" variant="outlined">
            {config.id ? "Salvar credenciais" : "1. Salvar credenciais"}
          </Button>
          {config.id && !config.hasSession ? (
            <>
              <Button
                onClick={sendCode}
                color="secondary"
                variant="contained"
                disabled={sendingCode}
                startIcon={sendingCode ? <CircularProgress size={16} /> : null}
                disableElevation
              >
                2. Enviar código
              </Button>
              <Button
                onClick={signIn}
                color="primary"
                variant="contained"
                disabled={signing || !canConfirm}
                startIcon={signing ? <CircularProgress size={16} /> : null}
                disableElevation
              >
                3. Confirmar login
              </Button>
            </>
          ) : null}
        </>
      }
    >
      <ConnectionSetupFormShell>
        <ConnectionSetupSection title="Conta">
          <TextField
            label="Nome"
            fullWidth
            variant="outlined"
            size="small"
            value={config.name}
            onChange={(e) => setConfig((p) => ({ ...p, name: e.target.value }))}
            placeholder="Ex.: Telegram Oficial"
            autoComplete="off"
          />
          <TextField
            label="API ID"
            fullWidth
            variant="outlined"
            size="small"
            value={config.apiId}
            onChange={(e) => setConfig((p) => ({ ...p, apiId: e.target.value.trim() }))}
            placeholder="my.telegram.org"
            autoComplete="off"
          />
          <TextField
            label="API Hash"
            fullWidth
            variant="outlined"
            size="small"
            type="password"
            value={config.apiHash}
            onChange={(e) => setConfig((p) => ({ ...p, apiHash: e.target.value.trim() }))}
            placeholder={config.id ? "Vazio = manter" : "Obrigatório"}
            autoComplete="new-password"
          />
          {config.telegramLabel ? (
            <Typography variant="body2" color="textSecondary" style={{ fontSize: "0.75rem" }}>
              {config.telegramLabel}
            </Typography>
          ) : null}
          <TextField
            label="Telefone (DDI)"
            fullWidth
            variant="outlined"
            size="small"
            value={config.phoneNumber}
            onChange={(e) => {
              let v = e.target.value.trim();
              if (v.startsWith("@")) v = "";
              setConfig((p) => ({ ...p, phoneNumber: v }));
            }}
            placeholder="+55..."
            error={Boolean(config.phoneNumber) && !isValidPhone(config.phoneNumber)}
            autoComplete="off"
            name="telegram-mtproto-phone"
          />
        </ConnectionSetupSection>

        {config.id && !config.hasSession ? (
          <ConnectionSetupSection title="Login">
            <Typography variant="body2" color="textSecondary" style={{ fontSize: "0.75rem", lineHeight: 1.5 }}>
              {config.codeSent || config.pairingPending
                ? "Cole o código recebido no Telegram."
                : "Salve e use Enviar código nos botões abaixo."}
            </Typography>
            <TextField
              label="Código"
              fullWidth
              variant="outlined"
              size="small"
              value={config.loginCode}
              onChange={(e) =>
                setConfig((p) => ({
                  ...p,
                  loginCode: e.target.value.replace(/\s/g, ""),
                }))
              }
              placeholder="12345"
              autoComplete="one-time-code"
            />
            <TextField
              label="Senha 2FA (se ativada)"
              fullWidth
              variant="outlined"
              size="small"
              type="password"
              value={config.password2fa}
              onChange={(e) =>
                setConfig((p) => ({ ...p, password2fa: e.target.value }))
              }
              autoComplete="new-password"
            />
          </ConnectionSetupSection>
        ) : null}

        <ConnectionSetupSection title="Mensagens e IA">
          <TextField
            label="Mensagem de saudação (opcional)"
            fullWidth
            variant="outlined"
            size="small"
            multiline
            minRows={3}
            value={config.greetingMessage}
            onChange={(e) =>
              setConfig((p) => ({ ...p, greetingMessage: e.target.value }))
            }
          />
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel id="tg-oficial-prompt">Agente de IA (Prompt)</InputLabel>
            <Select
              labelId="tg-oficial-prompt"
              label="Agente de IA (Prompt)"
              value={config.promptId}
              onChange={(e) =>
                setConfig((p) => ({ ...p, promptId: e.target.value }))
              }
            >
              <MenuItem value="">
                <em>Nenhum</em>
              </MenuItem>
              {prompts.map((pr) => (
                <MenuItem key={pr.id} value={String(pr.id)}>
                  {pr.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box display="flex" alignItems="center" justifyContent="space-between" px={0.5}>
            <Typography variant="body2" color="textSecondary">
              Agente IA ativo
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  color="primary"
                  checked={!config.agentDisabled}
                  onChange={(e) =>
                    setConfig((p) => ({ ...p, agentDisabled: !e.target.checked }))
                  }
                />
              }
              label=""
            />
          </Box>
          <Typography variant="caption" color="textSecondary" display="block">
            Status: {statusLabel()}
          </Typography>
        </ConnectionSetupSection>
      </ConnectionSetupFormShell>
    </ConnectionSetupFluid>
  );
}
