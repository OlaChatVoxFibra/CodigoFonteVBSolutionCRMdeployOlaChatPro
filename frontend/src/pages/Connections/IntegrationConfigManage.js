/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Chip,
  IconButton,
  Button,
  makeStyles,
  useTheme,
} from "@material-ui/core";
import { CheckCircle, ChevronRight, DeleteOutline } from "@material-ui/icons";
import { useHistory } from "react-router-dom";
import { toast } from "react-toastify";
import api from "../../services/api";
import geminiIntegrationService from "../../services/geminiIntegrationService";
import grokIntegrationService from "../../services/grokIntegrationService";
import figmaIntegrationService from "../../services/figmaIntegrationService";
import githubIntegrationService from "../../services/githubIntegrationService";
import smtpService from "../../services/smtpService";
import IntegrationBrandIcon, { getBrandVisual } from "./IntegrationBrandIcon";
import { CONNECTIONS_FONT } from "./connectionsTypography";
import {
  getConnectionsBorder,
} from "./connectionsTheme";
import { useConnectionsManageStyles } from "./connectionsMagicUi";
import { getIntegrationByKey } from "./integrationCatalog";

const listGoogleConnections = async () => [];
const deleteGoogleConnection = async () => {};
const crmIntegrationService = {
  getProvider: async () => ({ connected: false }),
  disconnect: async () => {},
  getStatus: async () => ({ providers: {} }),
};

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const border = getConnectionsBorder(theme);
  return {
    card: {
      position: "relative",
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing(1.25),
      padding: theme.spacing(3.5, 3),
      borderRadius: 22,
      border: `1px solid ${border}`,
      background: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
      width: "100%",
      maxWidth: 820,
      boxSizing: "border-box",
      minHeight: 252,
      cursor: "pointer",
      textAlign: "left",
      font: "inherit",
      color: "inherit",
      transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
      boxShadow: isDark
        ? "0 8px 32px rgba(0,0,0,0.25)"
        : "0 8px 32px rgba(15,23,42,0.06)",
      "&:hover": {
        transform: "translateY(-2px)",
        boxShadow: isDark
          ? "0 14px 40px rgba(0,0,0,0.35)"
          : "0 16px 48px rgba(15,23,42,0.1)",
        borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(15,23,42,0.12)"
      },
      "&:focus": {
        outline: "none",
        boxShadow: isDark
          ? "0 0 0 3px rgba(99,102,241,0.35)"
          : "0 0 0 3px rgba(99,102,241,0.2)"
      }
    },
    cardCompact: {
      maxWidth: "100%",
      minHeight: 88,
      padding: theme.spacing(1, 1.15),
      borderRadius: 10,
      cursor: "default",
      boxShadow: "none",
      "&:hover": {
        transform: "none",
        boxShadow: "none"
      }
    },
    head: {
      display: "flex",
      alignItems: "flex-start",
      gap: theme.spacing(1.5),
      minWidth: 0
    },
    iconWrap: {
      width: 80,
      height: 80,
      borderRadius: 18,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      background: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.04)"
    },
    main: { flex: 1, minWidth: 0 },
    name: {
      fontFamily: CONNECTIONS_FONT,
      fontWeight: 600,
      fontSize: "1.125rem",
      lineHeight: 1.25,
      color: theme.palette.text.primary,
      letterSpacing: "-0.02em"
    },
    meta: {
      fontFamily: CONNECTIONS_FONT,
      fontSize: "0.8125rem",
      color: theme.palette.text.secondary,
      marginTop: 6,
      lineHeight: 1.45
    },
    chevron: {
      flexShrink: 0,
      color: theme.palette.text.disabled,
      marginTop: 4
    },
    empty: {
      fontFamily: CONNECTIONS_FONT,
      fontSize: "0.875rem",
      color: theme.palette.text.secondary,
      padding: theme.spacing(4, 2),
      textAlign: "center",
      width: "100%",
      maxWidth: 440,
      margin: "0 auto"
    },
    chipOk: {
      height: 22,
      fontSize: "0.6875rem",
      marginTop: theme.spacing(1),
      fontWeight: 500,
      backgroundColor: isDark ? "rgba(37,211,102,0.18)" : "rgba(37,211,102,0.12)",
      color: isDark ? "#86efac" : "#15803d"
    },
    chipWarn: {
      height: 22,
      fontSize: "0.6875rem",
      marginTop: theme.spacing(1)
    },
    aiCenter: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      maxWidth: 960,
      margin: "0 auto",
      minHeight: 360,
      padding: theme.spacing(4, 3),
      boxSizing: "border-box",
      gap: theme.spacing(2),
    },
    cardDelete: {
      position: "absolute",
      top: theme.spacing(1.5),
      right: theme.spacing(1.5),
      zIndex: 2,
      color: theme.palette.text.secondary,
      "&:hover": {
        color: theme.palette.error.main,
        backgroundColor: isDark
          ? "rgba(239,68,68,0.12)"
          : "rgba(239,68,68,0.08)",
      },
    },
  };
});

function ConfigCard({
  integrationKey,
  title,
  subtitle,
  statusLabel,
  onEdit,
  onDelete,
  variant = "compact",
}) {
  const classes = useStyles();
  const theme = useTheme();
  const isDark = theme.palette.type === "dark";
  const integration = getIntegrationByKey(integrationKey);
  const visual = getBrandVisual(integration);
  const githubOnDark = isDark && integrationKey === "github";
  const connected =
    statusLabel === "Configurado" ||
    statusLabel === "Conta conectada" ||
    statusLabel === "Conectado";
  const isAi = variant === "ai";

  const body = (
    <>
      <Box className={classes.head}>
        {isAi ? (
          <Box
            className={classes.iconWrap}
            style={
              githubOnDark
                ? { background: "transparent", border: "none" }
                : undefined
            }
          >
            <IntegrationBrandIcon
              brandKey={visual.brandKey}
              variant="hub"
              accentColor={githubOnDark ? "#f4f4f5" : visual.accent}
              plain
            />
          </Box>
        ) : (
          <IntegrationBrandIcon
            brandKey={visual.brandKey}
            variant="list"
            accentColor={visual.accent}
            plain
          />
        )}
        <Box className={classes.main}>
          <Typography className={classes.name}>{title}</Typography>
          <Typography className={classes.meta}>{subtitle}</Typography>
          <Chip
            size="small"
            label={statusLabel}
            className={connected ? classes.chipOk : classes.chipWarn}
            icon={connected ? <CheckCircle style={{ fontSize: 14 }} /> : undefined}
          />
        </Box>
        {isAi ? <ChevronRight className={classes.chevron} /> : null}
      </Box>
    </>
  );

  if (isAi) {
    return (
      <Box
        component="button"
        type="button"
        className={classes.card}
        onClick={onEdit}
        aria-label={`Editar ${title}`}
        style={{ position: "relative" }}
      >
        {onDelete ? (
          <IconButton
            size="small"
            className={classes.cardDelete}
            aria-label={`Desconectar ${title}`}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onDelete();
            }}
          >
            <DeleteOutline fontSize="small" />
          </IconButton>
        ) : null}
        {body}
      </Box>
    );
  }

  return (
    <Box
      component="button"
      type="button"
      className={`${classes.card} ${classes.cardCompact}`}
      onClick={onEdit}
      aria-label={`Editar ${title}`}
      style={{ cursor: onEdit ? "pointer" : "default" }}
    >
      {body}
    </Box>
  );
}

export default function IntegrationConfigManage({ integrationKey }) {
  const classes = useStyles();
  const manageClasses = useConnectionsManageStyles();
  const history = useHistory();
  const integrationMeta = getIntegrationByKey(integrationKey);
  const [loading, setLoading] = useState(true);
  const [smtpItems, setSmtpItems] = useState([]);
  const [openAi, setOpenAi] = useState(null);
  const [anthropic, setAnthropic] = useState(null);
  const [gemini, setGemini] = useState(null);
  const [grok, setGrok] = useState(null);
  const [figma, setFigma] = useState(null);
  const [github, setGithub] = useState(null);
  const [platformProvider, setPlatformProvider] = useState(null);
  const [googleItems, setGoogleItems] = useState([]);

  const PLATFORM_KEYS = new Set(["hubspot", "clickup", "pipedrive", "notion", "supabase"]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (integrationKey === "email") {
        const res = await smtpService.list();
        setSmtpItems(res?.items || []);
      } else if (integrationKey === "openai") {
        const { data } = await api.get("/settings/agent_integration");
        let v = null;
        if (data?.value) {
          v =
            typeof data.value === "string"
              ? JSON.parse(data.value)
              : data.value;
        }
        setOpenAi(v);
      } else if (integrationKey === "claude") {
        const { data } = await api.get("/anthropic/integration");
        setAnthropic(data || null);
      } else if (integrationKey === "gemini") {
        const data = await geminiIntegrationService.getIntegration();
        setGemini(data || null);
      } else if (integrationKey === "grok") {
        const data = await grokIntegrationService.getIntegration();
        setGrok(data || null);
      } else if (integrationKey === "figma") {
        const data = await figmaIntegrationService.getIntegration();
        setFigma(data || null);
      } else if (integrationKey === "github") {
        const data = await githubIntegrationService.getIntegration();
        setGithub(data || null);
      } else if (PLATFORM_KEYS.has(integrationKey)) {
        const data = await crmIntegrationService.getProvider(integrationKey);
        setPlatformProvider(data || null);
      } else if ((new Set()).has(integrationKey)) {
        const items = await (async () => [])(integrationKey);
        setGoogleItems(items);
      }
    } catch (err) {
      console.error("[IntegrationConfigManage] load failed:", err);
      toast.error("Não foi possível carregar a configuração.");
    }
    setLoading(false);
  }, [integrationKey]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!PLATFORM_KEYS.has(integrationKey)) return undefined;
    return (() => () => {})((payload) => {
      if (payload.provider !== integrationKey) return;
      if (payload.status === "success") {
        toast.success(`${integrationMeta?.label} conectado.`);
        load();
      }
    });
  }, [integrationKey, integrationMeta?.label, load]);

  useEffect(() => {
    if (integrationMeta?.comingSoon) {
      history.replace("/connections");
    }
  }, [integrationMeta, history]);

  if (integrationMeta?.comingSoon) {
    return null;
  }

  if (loading) {
    return (
      <Box className={classes.aiCenter}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (integrationKey === "email") {
    if (!smtpItems.length) {
      return (
        <Typography className={classes.empty}>
          Nenhum SMTP configurado. Use &quot;Criar conexão&quot; para adicionar.
        </Typography>
      );
    }
    return (
      <Box className={manageClasses.manageGrid}>
        {smtpItems.map((row) => (
          <ConfigCard
            key={row.id}
            integrationKey="email"
            title={row.smtpUsername || row.smtpHost || "SMTP"}
            subtitle={`${row.smtpHost || "—"}:${row.smtpPort || ""} · ${
              (row.smtpEncryption || "tls").toUpperCase()
            }${row.isDefault ? " · Padrão" : ""}`}
            statusLabel="Configurado"
            onEdit={() => history.push(`/connections/email/edit/${row.id}`)}
          />
        ))}
      </Box>
    );
  }

  if (integrationKey === "openai") {
    const hasKey = Boolean(String(openAi?.apiKey || "").trim());
    if (!hasKey) {
      return (
        <Typography className={classes.empty}>
          Open IA ainda não configurada. Use &quot;Criar conexão&quot; para
          informar a API Key.
        </Typography>
      );
    }
    return (
      <Box className={classes.aiCenter}>
        <ConfigCard
          variant="ai"
          integrationKey="openai"
          title="Open IA"
          subtitle={`${openAi?.active !== false ? "Ativa" : "Inativa"}${
            openAi?.responderGrupo ? " · Grupos WhatsApp" : ""
          } · Toque para editar`}
          statusLabel="Configurado"
          onEdit={() => history.push("/connections/openai/edit/settings")}
        />
      </Box>
    );
  }

  if (integrationKey === "claude") {
    const hasKey = Boolean(anthropic?.apiKey?.hasKey);
    if (!hasKey) {
      return (
        <Typography className={classes.empty}>
          Claude ainda não configurada. Use &quot;Criar conexão&quot; para
          informar a API Key da Anthropic.
        </Typography>
      );
    }
    return (
      <Box className={classes.aiCenter}>
        <ConfigCard
          variant="ai"
          integrationKey="claude"
          title="Claude"
          subtitle={`${anthropic?.enabled ? "Ativa" : "Inativa"} · Escopo: ${
            anthropic?.scope || "—"
          } · Toque para editar`}
          statusLabel="Configurado"
          onEdit={() => history.push("/connections/claude/edit/settings")}
        />
      </Box>
    );
  }

  if ((new Set()).has(integrationKey)) {
    const serviceLabel = integrationMeta?.label || "Google";
    if (!googleItems.length) {
      return (
        <Box className={classes.aiCenter}>
          <Typography className={classes.empty}>
            Nenhuma conta Google conectada. Use &quot;Criar conexão&quot; para
            autorizar com OAuth.
          </Typography>
        </Box>
      );
    }
    return (
      <Box className={classes.aiCenter}>
        {googleItems.map((row) => (
          <ConfigCard
            key={row.id}
            variant="ai"
            integrationKey={integrationKey}
            title={row.accountName || row.accountEmail || serviceLabel}
            subtitle={`${row.accountEmail} · Conectado em ${new Date(
              row.connectedAt
            ).toLocaleDateString("pt-BR")} · Toque para editar`}
            statusLabel="Conectado"
            onEdit={() =>
              history.push(`/connections/${integrationKey}/new`)
            }
            onDelete={async () => {
              try {
                await (async () => {})(row.id);
                toast.success("Conta Google desconectada.");
                load();
              } catch {
                toast.error("Não foi possível remover a conexão.");
              }
            }}
          />
        ))}
      </Box>
    );
  }

  if (integrationKey === "gemini") {
    const hasKey = Boolean(gemini?.apiKey?.hasKey);
    if (!hasKey) {
      return (
        <Typography className={classes.empty}>
          Gemini ainda não configurada. Use &quot;Criar conexão&quot; para
          informar a API Key do Google AI Studio.
        </Typography>
      );
    }
    return (
      <Box className={classes.aiCenter}>
        <ConfigCard
          variant="ai"
          integrationKey="gemini"
          title="Gemini"
          subtitle={`${gemini?.enabled ? "Ativa" : "Inativa"} · Escopo: ${
            gemini?.scope || "—"
          } · Toque para editar`}
          statusLabel="Configurado"
          onEdit={() => history.push("/connections/gemini/edit/settings")}
        />
      </Box>
    );
  }

  if (integrationKey === "grok") {
    const hasKey = Boolean(grok?.apiKey?.hasKey);
    if (!hasKey) {
      return (
        <Typography className={classes.empty}>
          Grok ainda não configurada. Use &quot;Criar conexão&quot; para
          informar a API Key da xAI.
        </Typography>
      );
    }
    return (
      <Box className={classes.aiCenter}>
        <ConfigCard
          variant="ai"
          integrationKey="grok"
          title="Grok"
          subtitle={`${grok?.enabled ? "Ativa" : "Inativa"} · Escopo: ${
            grok?.scope || "—"
          } · Toque para editar`}
          statusLabel="Configurado"
          onEdit={() => history.push("/connections/grok/edit/settings")}
        />
      </Box>
    );
  }

  if (integrationKey === "figma") {
    const hasKey = Boolean(figma?.credential?.hasKey);
    const statusLabels = {
      connected: "Conectado",
      disconnected: "Desconectado",
      error: "Erro de Conexão",
      syncing: "Sincronizando",
    };
    const statusLabel =
      statusLabels[figma?.status] || figma?.status || "Desconectado";
    if (!hasKey) {
      return (
        <Typography className={classes.empty}>
          Figma ainda não configurado. Use &quot;Criar conexão&quot; para
          informar sua credencial.
        </Typography>
      );
    }
    const account =
      figma?.figmaAccount?.email || figma?.figmaAccount?.handle || "";
    return (
      <Box className={classes.aiCenter}>
        <ConfigCard
          variant="ai"
          integrationKey="figma"
          title="Figma"
          subtitle={`${statusLabel}${
            account ? ` · ${account}` : ""
          } · Toque para editar`}
          statusLabel={statusLabel}
          onEdit={() => history.push("/connections/figma/edit/settings")}
        />
      </Box>
    );
  }

  if (integrationKey === "github") {
    const isConnected =
      github?.status === "connected" &&
      Boolean(github?.credential?.hasKey || github?.githubAccount?.login);
    if (!isConnected) {
      return (
        <Typography className={classes.empty}>
          GitHub ainda não configurado. Use &quot;Criar conexão&quot; para
          conectar a conta GitHub da organização via OAuth.
        </Typography>
      );
    }
    const account = github?.githubAccount?.login
      ? `@${github.githubAccount.login}`
      : "";
    return (
      <Box className={classes.aiCenter}>
        <ConfigCard
          variant="ai"
          integrationKey="github"
          title={github?.githubAccount?.name || "GitHub"}
          subtitle={`Conectado${account ? ` · ${account}` : ""} · OAuth · Toque para editar`}
          statusLabel="Conectado"
          onEdit={() => history.push("/connections/github/edit/settings")}
          onDelete={async () => {
            try {
              await githubIntegrationService.clearIntegration();
              toast.success("Conta GitHub desconectada.");
              load();
            } catch {
              toast.error("Não foi possível remover a conexão.");
            }
          }}
        />
      </Box>
    );
  }

  if (PLATFORM_KEYS.has(integrationKey)) {
    const isConnected = Boolean(platformProvider?.connected);
    if (!isConnected) {
      return (
        <Box className={classes.aiCenter}>
          <Typography className={classes.empty}>
            {integrationMeta?.label || "Integração"} ainda não conectada. Use &quot;Criar conexão&quot;
            para autorizar via OAuth.
          </Typography>
        </Box>
      );
    }
    return (
      <Box className={classes.aiCenter}>
        <ConfigCard
          variant="ai"
          integrationKey={integrationKey}
          title={platformProvider?.accountLabel || integrationMeta?.label}
          subtitle={`Conectado · ${integrationMeta?.infoLine || "Sync CRM"} · Toque para editar`}
          statusLabel="Conectado"
          onEdit={() => history.push(`/connections/${integrationKey}/new`)}
          onDelete={async () => {
            try {
              await crmIntegrationService.disconnect(integrationKey);
              toast.success(`${integrationMeta?.label} desconectado.`);
              load();
            } catch {
              toast.error("Não foi possível remover a conexão.");
            }
          }}
        />
      </Box>
    );
  }

  return null;
}
