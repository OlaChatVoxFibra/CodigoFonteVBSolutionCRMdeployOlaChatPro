/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useContext, useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from "@material-ui/core";
import FacebookLogin from "react-facebook-login/dist/facebook-login-render-props";
import { toast } from "react-toastify";
import api from "../../../services/api";
import toastError from "../../../errors/toastError";
import { i18n } from "../../../translate/i18n";
import { AuthContext } from "../../../context/Auth/AuthContext";
import usePlans from "../../../hooks/usePlans";
import {
  META_FACEBOOK_LOGIN_SCOPE,
  META_INSTAGRAM_LOGIN_SCOPE,
} from "../../../config/metaOAuthScopes";
import ConnectionSetupFluid from "../ConnectionSetupFluid";
import ConnectionSetupSection, {
  ConnectionSetupFormShell,
} from "../ConnectionSetupSection";

const FACEBOOK_APP_ID =
  process.env.REACT_APP_FACEBOOK_APP_ID || "2005927163294829";

const EMPTY_EDIT = {
  name: "",
  greetingMessage: "",
  farewellMessage: "",
  promptId: "",
  agentDisabled: false,
  queueIds: [],
  status: "CONNECTED",
  isDefault: false,
};

/**
 * Setup Facebook Messenger / Instagram Business — mesmo padrão das outras páginas
 * de criar conexão (ConnectionSetupFluid + seções), com login Meta OAuth.
 */
export default function MetaChannelSetupForm({
  channel = "facebook",
  whatsAppId,
  isEdit,
  onCancel,
  onSaved,
  hidePageHeader = false,
}) {
  const isInstagram = channel === "instagram";
  const label = isInstagram ? "Instagram" : "Facebook";
  const { user } = useContext(AuthContext);
  const companyId = user?.companyId;
  const { getPlanCompany } = usePlans();

  const [planConfig, setPlanConfig] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(whatsAppId));
  const [config, setConfig] = useState(EMPTY_EDIT);
  const [prompts, setPrompts] = useState([]);

  const planBlocked =
    planConfig?.plan &&
    (isInstagram
      ? !planConfig.plan.useInstagram
      : !planConfig.plan.useFacebook);

  useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    (async () => {
      try {
        const planConfigs = await getPlanCompany(undefined, companyId);
        if (!cancelled) setPlanConfig(planConfigs);
      } catch {
        if (!cancelled) setPlanConfig(null);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId]);

  useEffect(() => {
    if (!companyId || !isEdit) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/prompt", {
          params: { pageNumber: "1" },
        });
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
  }, [companyId, isEdit]);

  useEffect(() => {
    if (!whatsAppId) {
      setConfig(EMPTY_EDIT);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/whatsapp/${whatsAppId}`);
        if (!cancelled) {
          setConfig({
            name: data.name || "",
            greetingMessage: data.greetingMessage || "",
            farewellMessage:
              data.farewellMessage || data.complationMessage || "",
            promptId: data.promptId ? String(data.promptId) : "",
            agentDisabled: Boolean(data.agentDisabled),
            queueIds: Array.isArray(data.queues)
              ? data.queues.map((q) => q.id)
              : [],
            status: data.status || "CONNECTED",
            isDefault: Boolean(data.isDefault),
          });
        }
      } catch (err) {
        toastError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [whatsAppId]);

  const handleMetaLogin = async (response) => {
    if (!response?.accessToken || !response?.id) {
      console.warn(`[Connections] ${label} Login callback status unknown`, {
        status: response?.status,
      });
      toast.error(
        i18n.t("connections.facebook.loginCancelledOrFailed") ||
          "Login cancelado ou não concluído. Tente novamente e aceite as permissões ao abrir a janela do Facebook."
      );
      return;
    }

    setConnecting(true);
    try {
      await api.post("/facebook", {
        addInstagram: isInstagram,
        facebookUserId: response.id,
        facebookUserToken: response.accessToken,
      });
      toast.success(i18n.t("connections.facebook.success"));
      if (typeof onSaved === "function") onSaved();
    } catch (err) {
      console.warn(`[Connections] POST /facebook falhou (${label})`, {
        status: err?.response?.status,
        data: err?.response?.data,
      });
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "";
      if (
        String(msg).toLowerCase().includes("página") ||
        String(msg).toLowerCase().includes("page")
      ) {
        toast.error(
          i18n.t("connections.facebook.noPageError") ||
            "É necessário ter uma Página do Facebook (página pública de fãs) para conectar. Crie uma em facebook.com/pages e tente novamente."
        );
      } else {
        toastError(err);
      }
    } finally {
      setConnecting(false);
    }
  };

  const saveEdit = async () => {
    if (!whatsAppId) return;
    setSaving(true);
    try {
      await api.put(`/whatsapp/${whatsAppId}`, {
        name: config.name,
        greetingMessage: config.greetingMessage,
        complationMessage: config.farewellMessage,
        farewellMessage: config.farewellMessage,
        promptId: config.promptId ? Number(config.promptId) : null,
        agentDisabled: Boolean(config.agentDisabled),
        queueIds: config.queueIds || [],
        status: config.status,
        isDefault: config.isDefault,
      });
      toast.success("Conexão atualizada.");
      if (typeof onSaved === "function") onSaved();
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={4}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (isEdit) {
    return (
      <ConnectionSetupFluid
        fluid
        hidePageHeader={hidePageHeader}
        title={`Editar ${label}`}
        subtitle="Nome, mensagens e agente de IA desta conexão Meta."
        footer={
          <>
            <Button onClick={onCancel} color="default" disabled={saving}>
              Cancelar
            </Button>
            <Button
              onClick={saveEdit}
              color="primary"
              variant="contained"
              disableElevation
              disabled={saving || !String(config.name || "").trim()}
            >
              {saving ? <CircularProgress size={18} /> : "Salvar"}
            </Button>
          </>
        }
      >
        <ConnectionSetupFormShell>
          <ConnectionSetupSection title="Identidade">
            <TextField
              label="Nome da conexão"
              fullWidth
              variant="outlined"
              size="small"
              value={config.name}
              onChange={(e) =>
                setConfig((p) => ({ ...p, name: e.target.value }))
              }
              placeholder={
                isInstagram ? "Ex.: Instagram Atendimento" : "Ex.: Página Vendas"
              }
              autoComplete="off"
            />
          </ConnectionSetupSection>

          <ConnectionSetupSection title="Mensagens">
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
            <TextField
              label="Despedida"
              fullWidth
              variant="outlined"
              size="small"
              multiline
              minRows={2}
              value={config.farewellMessage}
              onChange={(e) =>
                setConfig((p) => ({ ...p, farewellMessage: e.target.value }))
              }
              placeholder="Mensagem ao finalizar (opcional)"
            />
          </ConnectionSetupSection>

          <ConnectionSetupSection title="Agente IA">
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel id="meta-prompt-label">Agente de IA (Prompt)</InputLabel>
              <Select
                labelId="meta-prompt-label"
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
              label="Agente IA ativo nesta conexão"
            />
          </ConnectionSetupSection>
        </ConnectionSetupFormShell>
      </ConnectionSetupFluid>
    );
  }

  return (
    <ConnectionSetupFluid
      fluid
      hidePageHeader={hidePageHeader}
      title={`Nova conexão — ${label}`}
      subtitle={
        isInstagram
          ? "Authorize o Instagram Business vinculado à sua Página Meta."
          : "Authorize a Página do Facebook com Messenger ativo."
      }
      hint={
        isInstagram ? (
          <>
            Conta Instagram <strong>Business/Creator</strong> vinculada a uma Página
            do Facebook. Ao conectar, o CRM cria a conexão e inscreve os webhooks
            Meta automaticamente.
          </>
        ) : (
          <>
            É necessário uma <strong>Página do Facebook</strong> com Messenger. Ao
            conectar, o CRM lista as páginas autorizadas e cria as conexões.
          </>
        )
      }
      footer={
        <>
          <Button onClick={onCancel} color="default" disabled={connecting}>
            Cancelar
          </Button>
          {FACEBOOK_APP_ID ? (
            <FacebookLogin
              appId={FACEBOOK_APP_ID}
              autoLoad={false}
              fields="name,email,picture"
              version="19.0"
              redirectUri={
                typeof window !== "undefined" ? window.location.origin : undefined
              }
              scope={
                isInstagram
                  ? META_INSTAGRAM_LOGIN_SCOPE
                  : META_FACEBOOK_LOGIN_SCOPE
              }
              callback={handleMetaLogin}
              render={(renderProps) => (
                <Button
                  color="primary"
                  variant="contained"
                  disableElevation
                  disabled={connecting || planBlocked}
                  onClick={(e) => renderProps.onClick(e)}
                >
                  {connecting ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : (
                    `Conectar ${label}`
                  )}
                </Button>
              )}
            />
          ) : (
            <Button color="primary" variant="contained" disabled>
              App ID não configurado
            </Button>
          )}
        </>
      }
    >
      <ConnectionSetupFormShell>
        <ConnectionSetupSection title="Pré-requisitos Meta">
          <Typography variant="body2" color="textSecondary">
            {isInstagram
              ? "1) Página Facebook · 2) Instagram Business vinculado · 3) Permissões de Direct no app Meta."
              : "1) Página Facebook pública · 2) Messenger ativo · 3) Permissões pages_messaging no app Meta."}
          </Typography>
          {!FACEBOOK_APP_ID ? (
            <Typography variant="body2" color="error">
              Configure REACT_APP_FACEBOOK_APP_ID no .env do frontend.
            </Typography>
          ) : null}
          {planBlocked ? (
            <Typography variant="body2" color="error">
              Seu plano não inclui {label}. Ative o recurso no plano da empresa.
            </Typography>
          ) : null}
        </ConnectionSetupSection>

        <ConnectionSetupSection title="Autorização">
          <Typography variant="body2" color="textSecondary">
            Clique em <strong>Conectar {label}</strong> abaixo. Uma janela da Meta
            pedirá as permissões; após autorizar, as conexões aparecem na lista.
          </Typography>
        </ConnectionSetupSection>
      </ConnectionSetupFormShell>
    </ConnectionSetupFluid>
  );
}
