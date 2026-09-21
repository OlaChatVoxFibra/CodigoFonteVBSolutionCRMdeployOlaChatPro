/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Switch,
  Typography,
  makeStyles
} from "@material-ui/core";
import { Github, Unlink } from "lucide-react";
import { toast } from "react-toastify";
import IntegrationApiKeyGuidePanel from "../IntegrationApiKeyGuidePanel";
import githubIntegrationService from "../../../services/githubIntegrationService";
import {
  openGithubOAuthPopup,
  subscribeGithubOAuthCallback
} from "../githubOAuthPopup";
import { CONNECTIONS_FONT } from "../connectionsTypography";
import { getConnectionsSwitchDarkStyles } from "../connectionsTheme";
import { useSetupHeaderActions } from "../ConnectionsChannelLayout";

const useLayoutStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const border = isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)";

  return {
    root: {
      fontFamily: CONNECTIONS_FONT,
      width: "100%",
      maxWidth: "100%",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      padding: theme.spacing(0, 0.5, 2),
      [theme.breakpoints.up("md")]: {
        padding: theme.spacing(0, 1, 2)
      }
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: theme.spacing(2.5),
      flex: 1,
      width: "100%",
      alignItems: "start",
      [theme.breakpoints.up("md")]: {
        gridTemplateColumns: "minmax(0, 1fr) minmax(280px, min(42vw, 400px))",
        gap: theme.spacing(2, 3),
        alignItems: "start"
      },
      [theme.breakpoints.up("lg")]: {
        gridTemplateColumns: "minmax(320px, 1fr) minmax(300px, 420px)",
        gap: theme.spacing(2.5, 4)
      }
    },
    formCol: {
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing(2),
      minWidth: 0,
      width: "100%",
      paddingTop: theme.spacing(1.5),
      [theme.breakpoints.up("sm")]: {
        paddingTop: theme.spacing(2)
      }
    },
    asideCol: { minWidth: 0, width: "100%" },
    helper: {
      fontSize: "0.8125rem",
      color: theme.palette.text.secondary,
      lineHeight: 1.45,
      marginTop: theme.spacing(0.5)
    },
    switchRow: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: theme.spacing(2),
      padding: theme.spacing(1.25, 1.5),
      borderRadius: 12,
      border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)"}`,
      background: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)",
      ...getConnectionsSwitchDarkStyles(theme)
    },
    switchText: { flex: 1, minWidth: 0 },
    switchTitle: {
      fontSize: "0.875rem",
      fontWeight: 500,
      color: theme.palette.text.primary
    },
    switchDesc: {
      fontSize: "0.8125rem",
      color: theme.palette.text.secondary,
      marginTop: 4,
      lineHeight: 1.4
    },
    sectionTitle: {
      fontSize: "0.8125rem",
      fontWeight: 600,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      color: theme.palette.text.secondary
    },
    statusRow: {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing(1),
      flexWrap: "wrap"
    },
    saveBtn: {
      textTransform: "none",
      boxShadow: "none",
      borderRadius: 8,
      minWidth: 120,
      fontWeight: 500,
      fontSize: "0.8125rem",
      padding: theme.spacing(0.55, 1.5),
      fontFamily: CONNECTIONS_FONT
    },
    connectBox: {
      border: `1px dashed ${border}`,
      borderRadius: 12,
      padding: theme.spacing(2.5),
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start",
      gap: theme.spacing(1.25)
    },
    accountRow: {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing(1.5),
      padding: theme.spacing(1.25, 1.5),
      borderRadius: 12,
      border: `1px solid ${border}`,
      background: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)"
    },
    oauthBtn: {
      textTransform: "none",
      borderRadius: 10,
      fontWeight: 600
    },
    intro: {
      fontSize: "0.875rem",
      color: theme.palette.text.secondary,
      lineHeight: 1.55
    }
  };
});

const STATUS_LABELS = {
  connected: "Conectado",
  disconnected: "Desconectado",
  error: "Erro de Conexão"
};

const STATUS_COLORS = {
  connected: { bg: "rgba(37,211,102,0.12)", color: "#15803d" },
  disconnected: { bg: "rgba(120,120,128,0.12)", color: "#71717a" },
  error: { bg: "rgba(244,67,54,0.12)", color: "#b91c1c" }
};

const DEFAULT_STATE = {
  enableBrainAi: true,
  enablePublish: true,
  enableReposRead: true
};

const ADVANCED_SWITCHES = [
  {
    key: "enableBrainAi",
    title: "Permitir acesso ao Brain AI",
    desc: "O Brain pode listar repos, ler código e consultar pull requests."
  },
  {
    key: "enablePublish",
    title: "Publicar código no GitHub",
    desc: "Permite enviar arquivos gerados pelo Brain para repositórios."
  },
  {
    key: "enableReposRead",
    title: "Leitura de repositórios",
    desc: "Lista repositórios e lê arquivos via API GitHub."
  }
];

function isGithubConnected(data) {
  return (
    data?.status === "connected" &&
    Boolean(data?.credential?.hasKey || data?.githubAccount?.login)
  );
}

export default function GithubConnectionSetupForm({ onSaved }) {
  const layout = useLayoutStyles();
  const registerHeaderActions = useSetupHeaderActions();
  const oauthPopupRef = useRef(null);
  const oauthTimerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [state, setState] = useState(DEFAULT_STATE);
  const [status, setStatus] = useState("disconnected");
  const [connected, setConnected] = useState(false);
  const [githubAccount, setGithubAccount] = useState(null);

  const reload = useCallback(async () => {
    const data = await githubIntegrationService.getIntegration();
    setState({
      enableBrainAi: data?.enableBrainAi !== false,
      enablePublish: data?.enablePublish !== false,
      enableReposRead: data?.enableReposRead !== false
    });
    setStatus(data?.status || "disconnected");
    setConnected(isGithubConnected(data));
    setGithubAccount(data?.githubAccount || null);
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (!cancelled) await reload();
      } catch {
        if (!cancelled) toast.error("Não foi possível carregar a integração GitHub.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const closeOauthPopup = useCallback(() => {
    if (oauthTimerRef.current) {
      clearInterval(oauthTimerRef.current);
      oauthTimerRef.current = null;
    }
    if (oauthPopupRef.current && !oauthPopupRef.current.closed) {
      oauthPopupRef.current.close();
    }
    oauthPopupRef.current = null;
    setConnecting(false);
  }, []);

  const handleOAuthSuccess = useCallback(
    async (login) => {
      toast.success(
        login ? `GitHub conectado: @${login}` : "Conta GitHub conectada."
      );
      const data = await reload();
      if (isGithubConnected(data)) {
        onSaved?.(data);
      }
    },
    [reload, onSaved]
  );

  const handleOAuthMessage = useCallback(
    async (payload) => {
      closeOauthPopup();
      if (payload.status === "success") {
        await handleOAuthSuccess(payload.login);
      } else {
        const msg = payload.message || "";
        if (msg && !/GITHUB_OAUTH|\.env|CLIENT_SECRET|redirect_uri/i.test(msg)) {
          toast.error(msg);
        } else {
          toast.error("Não foi possível conectar ao GitHub. Tente novamente.");
        }
      }
    },
    [closeOauthPopup, handleOAuthSuccess]
  );

  useEffect(() => subscribeGithubOAuthCallback(handleOAuthMessage), [handleOAuthMessage]);

  useEffect(() => () => closeOauthPopup(), [closeOauthPopup]);

  const connectWithGithub = () => {
    if (connected) return;
    setConnecting(true);
    const result = openGithubOAuthPopup({ mode: "org" });
    if (!result.ok) {
      setConnecting(false);
      toast.warning("Permita popups para conectar com o GitHub.");
      return;
    }
    oauthPopupRef.current = result.popup;
    oauthTimerRef.current = setInterval(async () => {
      if (result.popup.closed) {
        closeOauthPopup();
        const data = await reload();
        if (isGithubConnected(data)) {
          await handleOAuthSuccess(data?.githubAccount?.login);
        }
      }
    }, 400);
  };

  const handleSave = useCallback(async () => {
    if (!connected) {
      toast.error("Conecte o GitHub antes de salvar as configurações.");
      return;
    }

    setSaving(true);
    try {
      const data = await githubIntegrationService.saveIntegration({
        enableBrainAi: state.enableBrainAi,
        enablePublish: state.enablePublish,
        enableReposRead: state.enableReposRead
      });
      setStatus(data?.status || status);
      setConnected(isGithubConnected(data));
      setGithubAccount(data?.githubAccount || githubAccount);
      toast.success("Integração GitHub salva.");
      onSaved?.(data);
    } catch (e) {
      setStatus("error");
      toast.error(e?.response?.data?.error || "Falha ao salvar integração GitHub.");
    } finally {
      setSaving(false);
    }
  }, [connected, state, onSaved, status, githubAccount]);

  const handleClear = async () => {
    try {
      await githubIntegrationService.clearIntegration();
      setConnected(false);
      setGithubAccount(null);
      setStatus("disconnected");
      toast.info("Integração GitHub removida.");
      await reload();
    } catch {
      toast.error("Não foi possível remover a integração.");
    }
  };

  useEffect(() => {
    if (!registerHeaderActions) return undefined;
    registerHeaderActions(
      connected ? (
        <Button
          variant="contained"
          color="primary"
          disableElevation
          disabled={saving}
          onClick={handleSave}
          className={layout.saveBtn}
        >
          {saving ? "Salvando…" : "Salvar Integração"}
        </Button>
      ) : null
    );
    return () => registerHeaderActions(null);
  }, [registerHeaderActions, saving, handleSave, layout.saveBtn, connected]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={280} width="100%">
        <CircularProgress size={28} />
      </Box>
    );
  }

  const statusStyle = STATUS_COLORS[status] || STATUS_COLORS.disconnected;

  return (
    <Box className={layout.root}>
      <div className={layout.grid}>
        <div className={layout.formCol}>
          <Typography className={layout.intro}>
            Autorize a conta GitHub da sua organização. O acesso fica salvo apenas
            na sua org — o Brain AI usa essa conexão para repositórios, pull requests
            e publicação de código.
          </Typography>

          <Box className={layout.statusRow}>
            <Typography variant="body2" color="textSecondary">
              Status:
            </Typography>
            <Chip
              size="small"
              label={STATUS_LABELS[status] || status}
              style={{
                backgroundColor: statusStyle.bg,
                color: statusStyle.color,
                fontWeight: 500
              }}
            />
            {connected ? (
              <Chip size="small" label="OAuth" style={{ fontWeight: 500 }} />
            ) : null}
          </Box>

          {githubAccount?.login ? (
            <Box className={layout.accountRow}>
              <Avatar src={githubAccount.avatarUrl} style={{ width: 36, height: 36 }}>
                {githubAccount.login[0]?.toUpperCase()}
              </Avatar>
              <Box flex={1} minWidth={0}>
                <Typography variant="body2" style={{ fontWeight: 600 }}>
                  @{githubAccount.login}
                </Typography>
                {githubAccount.name ? (
                  <Typography variant="caption" color="textSecondary">
                    {githubAccount.name}
                  </Typography>
                ) : null}
              </Box>
              <Button
                size="small"
                startIcon={<Unlink size={14} />}
                onClick={handleClear}
                style={{ textTransform: "none" }}
              >
                Desconectar
              </Button>
            </Box>
          ) : (
            <Box className={layout.connectBox}>
              <Typography variant="body2" style={{ fontWeight: 600 }}>
                Conectar conta GitHub
              </Typography>
              <Typography className={layout.helper}>
                Clique abaixo e autorize o acesso na tela do GitHub. Use a conta
                que tem permissão nos repositórios da organização.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                disableElevation
                className={layout.oauthBtn}
                startIcon={connecting ? <CircularProgress size={14} /> : <Github size={16} />}
                onClick={connectWithGithub}
                disabled={connecting}
              >
                {connecting ? "Aguardando autorização…" : "Conectar com GitHub"}
              </Button>
            </Box>
          )}

          {connected ? (
            <>
              <Typography className={layout.sectionTitle}>Configurações avançadas</Typography>
              {ADVANCED_SWITCHES.map((sw) => (
                <div key={sw.key} className={layout.switchRow}>
                  <div className={layout.switchText}>
                    <Typography className={layout.switchTitle}>{sw.title}</Typography>
                    <Typography className={layout.switchDesc}>{sw.desc}</Typography>
                  </div>
                  <Switch
                    color="primary"
                    checked={Boolean(state[sw.key])}
                    onChange={(e) =>
                      setState((p) => ({ ...p, [sw.key]: e.target.checked }))
                    }
                  />
                </div>
              ))}
            </>
          ) : null}
        </div>

        <div className={layout.asideCol}>
          <IntegrationApiKeyGuidePanel provider="github" />
        </div>
      </div>
    </Box>
  );
}
