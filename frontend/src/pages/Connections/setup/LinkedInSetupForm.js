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
  Box,
  Typography,
  Switch,
  FormControlLabel,
} from "@material-ui/core";
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
  name: "LinkedIn",
  clientId: "",
  clientSecret: "",
  accessToken: "",
  senderUrn: "",
  senderLabel: "",
  webhookSecret: "",
  testRecipientUrn: "",
  color: "#0A66C2",
  greetingMessage: "",
  promptId: "",
  agentDisabled: false,
  notes: "",
};

export default function LinkedInSetupForm({
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
        const { data } = await api.get(`/linkedin/connection/${whatsAppId}`);
        if (cancelled) return;
        setConfig({
          id: data.id,
          name: data.name || "LinkedIn",
          clientId: data.clientId || "",
          clientSecret: "",
          accessToken: "",
          senderUrn: data.senderUrn || data.phone_number_id || "",
          senderLabel: data.number || "",
          webhookSecret: "",
          testRecipientUrn: "",
          color: data.color || "#0A66C2",
          greetingMessage: data.greetingMessage || "",
          promptId: data.promptId != null ? String(data.promptId) : "",
          agentDisabled: Boolean(data.agentDisabled),
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
      toast.error("Informe o nome da conexão LinkedIn.");
      return;
    }
    if (!config.clientId?.trim()) {
      toast.error("Informe o Client ID do app LinkedIn.");
      return;
    }
    if (!config.senderUrn?.trim()) {
      toast.error("Informe o URN do remetente (pessoa ou organização).");
      return;
    }
    if (!config.id && (!config.accessToken || config.accessToken.length < 10)) {
      toast.error("Informe um Access Token válido do LinkedIn.");
      return;
    }
    if (!config.id && (!config.clientSecret || config.clientSecret.length < 4)) {
      toast.error("Informe o Client Secret do app LinkedIn.");
      return;
    }
    try {
      const payload = {
        id: config.id || undefined,
        name: config.name,
        clientId: config.clientId,
        clientSecret: config.clientSecret || undefined,
        accessToken: config.accessToken,
        senderUrn: config.senderUrn,
        senderLabel: config.senderLabel || undefined,
        webhookSecret: config.webhookSecret || undefined,
        greetingMessage: config.greetingMessage || "",
        color: config.color || "#0A66C2",
        queueIds: [],
        promptId:
          config.promptId === "" || config.promptId == null
            ? null
            : Number(config.promptId),
        agentDisabled: Boolean(config.agentDisabled),
      };
      const { data } = config.id
        ? await api.put("/linkedin/connection", payload)
        : await api.post("/linkedin/connection", payload);
      const webhookUrl = data?.webhookUrl || "";
      toast.success(
        webhookUrl
          ? "Conexão LinkedIn salva. Configure o webhook no app LinkedIn Developer."
          : "Conexão LinkedIn salva."
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
    if (!config.accessToken) {
      toast.error("Preencha o Access Token para testar.");
      return;
    }
    setTesting(true);
    try {
      const { data } = await api.post("/linkedin/test", {
        accessToken: config.accessToken,
        senderUrn: config.senderUrn || undefined,
        testRecipientUrn: config.testRecipientUrn?.trim() || undefined,
      });
      if (data?.ok) {
        if (data.profileName) {
          setConfig((p) => ({
            ...p,
            senderLabel: data.profileName,
          }));
        }
        toast.success(data.message || "LinkedIn OK");
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
      title={isEdit ? "Editar LinkedIn" : "Nova conexão — LinkedIn"}
      subtitle="OAuth, Messaging API, webhook e agente de IA nas DMs."
      hint={
        <>
          Crie um app em{" "}
          <a
            href="https://www.linkedin.com/developers/apps"
            target="_blank"
            rel="noreferrer"
          >
            LinkedIn Developer
          </a>
          . Informe Client ID, Secret, Access Token e o URN do remetente. O BrainAI
          usa essas credenciais para contexto de publicações e o agente responde nas
          DMs — cada mensagem nova gera ticket com ícone LinkedIn.
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
        <ConnectionSetupSection title="App LinkedIn">
          <TextField
            label="Nome"
            fullWidth
            variant="outlined"
            size="small"
            value={config.name}
            onChange={(e) => setConfig((p) => ({ ...p, name: e.target.value }))}
            placeholder="Ex.: Atendimento LinkedIn"
            autoComplete="off"
          />
          <TextField
            label="Client ID (API Key)"
            fullWidth
            variant="outlined"
            size="small"
            value={config.clientId}
            onChange={(e) =>
              setConfig((p) => ({ ...p, clientId: e.target.value.trim() }))
            }
            placeholder="ID do app LinkedIn Developer"
            autoComplete="off"
          />
          <TextField
            label={config.id ? "Client Secret (vazio = manter)" : "Client Secret"}
            fullWidth
            variant="outlined"
            size="small"
            type="password"
            value={config.clientSecret}
            onChange={(e) =>
              setConfig((p) => ({ ...p, clientSecret: e.target.value }))
            }
            placeholder="Secret do app"
            autoComplete="new-password"
          />
          <TextField
            label={config.id ? "Access Token (vazio = manter)" : "Access Token"}
            fullWidth
            variant="outlined"
            size="small"
            type="password"
            value={config.accessToken}
            onChange={(e) =>
              setConfig((p) => ({ ...p, accessToken: e.target.value.trim() }))
            }
            placeholder="Token OAuth com escopo de mensagens"
            autoComplete="new-password"
          />
          <TextField
            label="URN do remetente"
            fullWidth
            variant="outlined"
            size="small"
            value={config.senderUrn}
            onChange={(e) =>
              setConfig((p) => ({ ...p, senderUrn: e.target.value.trim() }))
            }
            placeholder="urn:li:person:… ou urn:li:organization:…"
            helperText="Conta ou página que envia e recebe as DMs"
            autoComplete="off"
          />
          <TextField
            label="URN destino (teste opcional)"
            fullWidth
            variant="outlined"
            size="small"
            value={config.testRecipientUrn}
            onChange={(e) =>
              setConfig((p) => ({ ...p, testRecipientUrn: e.target.value.trim() }))
            }
            placeholder="urn:li:person:… para enviar mensagem de teste"
            autoComplete="off"
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
            placeholder="Validação do webhook inbound"
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
            <InputLabel id="linkedin-prompt-label">Agente de IA (Prompt)</InputLabel>
            <Select
              labelId="linkedin-prompt-label"
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
              Agente IA ativo nesta conexão (responde DMs do LinkedIn)
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
