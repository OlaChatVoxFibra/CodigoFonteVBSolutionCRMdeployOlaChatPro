/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useContext } from "react";
import {
  Button,
  TextField,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Box,
  Typography,
  Switch,
  FormControlLabel,
} from "@material-ui/core";
import TelegramIcon from "@mui/icons-material/Telegram";
import { toast } from "react-toastify";
import api from "../../../services/api";
import toastError from "../../../errors/toastError";
import { AuthContext } from "../../../context/Auth/AuthContext";
import ConnectionSetupFluid from "../ConnectionSetupFluid";
import ConnectionSetupSection, {
  ConnectionSetupFormShell,
} from "../ConnectionSetupSection";

const EMPTY_CONFIG = {
  id: null,
  name: "Telegram",
  botToken: "",
  botUsername: "",
  operatorAccount: "",
  webhookSecret: "",
  color: "#0088cc",
  notes: "",
  greetingMessage: "",
  promptId: "",
  agentDisabled: false,
};

export default function TelegramBotSetupForm({
  whatsAppId,
  isEdit,
  onCancel,
  onSaved,
  hidePageHeader = false,
}) {
  const { user } = useContext(AuthContext);
  const companyId = user?.companyId;
  const [config, setConfig] = useState(EMPTY_CONFIG);
  const [prompts, setPrompts] = useState([]);
  const [testing, setTesting] = useState(false);
  const [loading, setLoading] = useState(Boolean(whatsAppId));

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
      setConfig(EMPTY_CONFIG);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/telegram/connection/${whatsAppId}`);
        if (cancelled) return;
        setConfig({
          id: data.id,
          name: data.name || "Telegram",
          botToken: "",
          botUsername: data.botUsername || "",
          operatorAccount: "",
          webhookSecret: "",
          color: data.color || "#0088cc",
          notes: data.webhookUrl || "",
          greetingMessage: data.greetingMessage || "",
          promptId: data.promptId != null ? String(data.promptId) : "",
          agentDisabled: Boolean(data.agentDisabled),
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
      toast.error("Informe o nome da conexão Telegram.");
      return;
    }
    if (!config.id && (!config.botToken || config.botToken.length < 20)) {
      toast.error("Informe um Bot Token válido do Telegram.");
      return;
    }
    try {
      const payload = {
        id: config.id || undefined,
        name: config.name,
        botToken: config.botToken,
        webhookSecret: config.webhookSecret || undefined,
        greetingMessage: config.greetingMessage || "",
        color: config.color || "#0088cc",
        queueIds: [],
        promptId:
          config.promptId === "" || config.promptId == null
            ? null
            : Number(config.promptId),
        agentDisabled: Boolean(config.agentDisabled),
      };
      const { data } = config.id
        ? await api.put("/telegram/connection", payload)
        : await api.post("/telegram/connection", payload);
      const webhookUrl = data?.webhookUrl || data?.waba_webhook || "";
      if (data?.webhookConfigured === false) {
        toast.warning(
          data?.webhookError ||
            "Conexão salva, mas o webhook não foi registrado. Use BACKEND_URL HTTPS público."
        );
      } else {
        toast.success(
          webhookUrl
            ? "Conexão Telegram salva. Webhook registrado no Bot API."
            : "Conexão Telegram salva."
        );
      }
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
    if (!config.botToken) {
      toast.error("Preencha o Bot Token para testar.");
      return;
    }
    setTesting(true);
    try {
      const chatId = config.operatorAccount?.trim() || undefined;
      const { data } = await api.post("/telegram/test", {
        botToken: config.botToken,
        testChatId: chatId,
      });
      if (data?.ok) {
        if (data.botUsername) {
          setConfig((p) => ({
            ...p,
            botUsername: data.botUsername.startsWith("@")
              ? data.botUsername
              : `@${data.botUsername}`,
          }));
        }
        toast.success(data.message || "Telegram OK");
      } else {
        toast.error(data?.message || "Falha no teste");
      }
    } catch (err) {
      toastError(err);
    } finally {
      setTesting(false);
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
      title={isEdit ? "Editar Telegram (Bot API)" : "Nova conexão — Telegram Bot"}
      subtitle="Token do BotFather, webhook e agente de IA."
      hint={
        <>
          Cole o token do{" "}
          <a href="https://t.me/BotFather" target="_blank" rel="noreferrer">
            @BotFather
          </a>
          . Depois de salvar, ative o recebimento com <strong>Webhook</strong> na lista.
        </>
      }
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
        <ConnectionSetupSection title="Bot">
          <TextField
            label="Nome"
            fullWidth
            variant="outlined"
            size="small"
            value={config.name}
            onChange={(e) => setConfig((p) => ({ ...p, name: e.target.value }))}
            placeholder="Ex.: Atendimento Telegram"
            autoComplete="off"
          />
          <TextField
            label="@ do bot"
            fullWidth
            variant="outlined"
            size="small"
            value={config.botUsername}
            onChange={(e) => {
              let v = e.target.value.trim();
              if (v && !v.startsWith("@")) v = `@${v}`;
              setConfig((p) => ({ ...p, botUsername: v }));
            }}
            placeholder="@meu_bot"
            helperText="Opcional — preenchido ao testar"
            autoComplete="off"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <TelegramIcon style={{ color: "#0088cc", fontSize: 20 }} />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label={config.id ? "Token (vazio = manter)" : "Bot Token"}
            fullWidth
            variant="outlined"
            size="small"
            type="password"
            value={config.botToken}
            onChange={(e) =>
              setConfig((p) => ({ ...p, botToken: e.target.value.trim() }))
            }
            placeholder="Cole o token do BotFather"
            autoComplete="new-password"
            name="telegram-bot-token"
          />
          <TextField
            label="Seu Chat ID ou @ (teste)"
            fullWidth
            variant="outlined"
            size="small"
            value={config.operatorAccount}
            onChange={(e) =>
              setConfig((p) => ({ ...p, operatorAccount: e.target.value.trim() }))
            }
            placeholder="123456789 ou @usuario"
            helperText="Envie /start ao bot antes de testar"
            autoComplete="off"
            name="telegram-test-chat-id"
          />
        </ConnectionSetupSection>

        <ConnectionSetupSection title="Opcional">
          <TextField
            label="Webhook secret"
            fullWidth
            variant="outlined"
            size="small"
            value={config.webhookSecret}
            onChange={(e) =>
              setConfig((p) => ({ ...p, webhookSecret: e.target.value }))
            }
            placeholder="Opcional"
            autoComplete="off"
          />
          <TextField
            label="Saudação"
            fullWidth
            variant="outlined"
            size="small"
            multiline
            minRows={2}
            value={config.greetingMessage}
            onChange={(e) =>
              setConfig((p) => ({ ...p, greetingMessage: e.target.value }))
            }
            placeholder="Mensagem inicial (opcional)"
          />
          {config.notes ? (
            <TextField
              label="Webhook URL"
              fullWidth
              variant="outlined"
              size="small"
              value={config.notes}
              InputProps={{ readOnly: true }}
            />
          ) : null}
        </ConnectionSetupSection>

        <ConnectionSetupSection title="Agente IA">
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel id="telegram-prompt-label">Agente de IA (Prompt)</InputLabel>
            <Select
              labelId="telegram-prompt-label"
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
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            px={0.5}
          >
            <Typography variant="body2" color="textSecondary">
              Agente IA ativo nesta conexão
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  color="primary"
                  checked={!config.agentDisabled}
                  onChange={(e) =>
                    setConfig((p) => ({
                      ...p,
                      agentDisabled: !e.target.checked,
                    }))
                  }
                />
              }
              label=""
            />
          </Box>
        </ConnectionSetupSection>
      </ConnectionSetupFormShell>
    </ConnectionSetupFluid>
  );
}
