/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  makeStyles,
  useTheme
} from "@material-ui/core";
import {
  Webhook,
  Code,
  Copy,
  Key,
  Shield,
  Zap,
  Terminal,
  Plug,
  BookOpen,
  ExternalLink,
  Eye,
  EyeOff,
  Trash2
} from "lucide-react";
import { toast } from "react-toastify";
import platformApiService from "../../services/platformApiService";
import { AuthContext } from "../../context/Auth/AuthContext";
import toastError from "../../errors/toastError";
import useAppTranslation from "../../hooks/useAppTranslation";
import ConfirmationModal from "../ConfirmationModal";

const PUBLIC_API_BASE_URL =
  "https://vbsolutioncrmdeploy-production.up.railway.app/api/v1/crm";

const SCOPE_I18N_KEY = (scopeId) =>
  `platformApi.scopes.${String(scopeId).replace(/:/g, "_")}`;

const SCOPE_OPTIONS = [
  { id: "full", label: "Acesso completo" },
  { id: "contacts:read", label: "Ler contatos" },
  { id: "contacts:write", label: "Criar/editar contatos" },
  { id: "activities:read", label: "Ler atividades" },
  { id: "activities:write", label: "Criar/editar atividades" },
  { id: "leads:read", label: "Ler leads" },
  { id: "leads:write", label: "Criar/editar leads" },
  { id: "tickets:read", label: "Ler tickets" },
  { id: "dashboard:read", label: "Dashboard" },
  { id: "organization:read", label: "Dados da organização" },
  { id: "tools:execute", label: "Ferramentas CRM (MCP/IA)" }
];

const TUTORIAL_STEPS = [
  {
    title: "Credencial da organização",
    body: "Cada organização gera suas próprias chaves. Os dados acessados são somente da sua conta: leads, contatos, atividades e tickets."
  },
  {
    title: "Gerar API Key",
    body: "Clique em Nova API Key, defina um nome e os escopos. Use o ícone de olho na tabela para mostrar ou ocultar a chave quando precisar."
  },
  {
    title: "REST API",
    body: "Use a Base URL com Bearer ou X-API-Key. Ideal para Zapier, Make, n8n e scripts que extraem dados do seu CRM."
  },
  {
    title: "MCP (IA)",
    body: "Copie o JSON abaixo e adicione nas configurações MCP do Claude Desktop, Cursor ou VS Code. Substitua a API Key pela sua credencial. O assistente consulta leads, contatos, atividades e tickets da sua organização em tempo real."
  },
  {
    title: "Brain.AI",
    body: "O conector manual do Brain pede URL de servidores MCP remotos (HTTP/SSE). O CRM VBSolution usa pacote local (@vbsolution/crm-mcp) — não há URL HTTP para colar ali. O Brain já acessa o CRM nativamente no chat; use esta página para integrar Claude, Cursor ou VS Code."
  },
  {
    title: "Revogar",
    body: "Credenciais comprometidas podem ser revogadas a qualquer momento. Gere uma nova e atualize suas integrações."
  }
];

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  const surface = isDark ? "rgba(255,255,255,0.03)" : "#fff";
  const muted = isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.03)";
  const brandSoft = isDark ? "rgba(99,102,241,0.18)" : "rgba(99,102,241,0.1)";
  const brandText = isDark ? "#a5b4fc" : "#4338ca";

  return {
    root: {
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: theme.spacing(2.5),
      width: "100%",
      maxWidth: "100%",
      boxSizing: "border-box",
      padding: theme.spacing(1.5, 2, 10),
      overflow: "visible",
      [theme.breakpoints.up("md")]: {
        gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 340px)",
        alignItems: "start",
        gap: theme.spacing(3),
        padding: theme.spacing(2, 2.5, 10)
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
      background: brandSoft,
      color: brandText
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
      maxWidth: 560
    },
    controls: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing(1.5),
      marginBottom: theme.spacing(2)
    },
    section: {
      marginTop: theme.spacing(2.5),
      paddingTop: theme.spacing(2.5),
      borderTop: `1px solid ${border}`
    },
    sectionTitle: {
      fontSize: "0.88rem",
      fontWeight: 650,
      letterSpacing: "-0.01em",
      marginBottom: theme.spacing(1.25),
      display: "flex",
      alignItems: "center",
      gap: 8
    },
    statusRow: {
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: theme.spacing(1),
      marginTop: theme.spacing(2),
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
    statusLabel: { fontSize: "0.78rem", fontWeight: 650, marginBottom: 2 },
    statusDesc: {
      fontSize: "0.72rem",
      lineHeight: 1.4,
      color: theme.palette.text.secondary
    },
    tableWrap: {
      borderRadius: 12,
      border: `1px solid ${border}`,
      overflow: "hidden",
      background: muted
    },
    table: {
      "& th": {
        fontSize: "0.68rem",
        fontWeight: 650,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        color: theme.palette.text.secondary,
        background: isDark ? "rgba(255,255,255,0.02)" : "rgba(15,23,42,0.02)"
      },
      "& td": { fontSize: "0.8rem" }
    },
    chip: { height: 22, fontSize: 10, fontWeight: 600 },
    codeGrid: {
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: theme.spacing(1.5),
      [theme.breakpoints.up("sm")]: {
        gridTemplateColumns: "1fr 1fr"
      }
    },
    codeBlock: {
      fontFamily: '"Fira Code", "Consolas", monospace',
      fontSize: "0.72rem",
      lineHeight: 1.5,
      background: isDark ? "rgba(0,0,0,0.35)" : "rgba(15,23,42,0.04)",
      border: `1px solid ${border}`,
      borderRadius: 10,
      padding: theme.spacing(1.5, 1.75),
      overflowX: "auto",
      whiteSpace: "pre-wrap",
      wordBreak: "break-all",
      margin: 0,
      position: "relative"
    },
    copyBtn: {
      position: "absolute",
      top: 6,
      right: 6,
      padding: 4,
      opacity: 0.7,
      "&:hover": { opacity: 1 }
    },
    codeLabel: {
      fontSize: "0.72rem",
      fontWeight: 600,
      color: theme.palette.text.secondary,
      marginBottom: 6
    },
    btn: {
      textTransform: "none",
      fontWeight: 600,
      borderRadius: 8,
      boxShadow: "none"
    },
    emptyState: {
      textAlign: "center",
      padding: theme.spacing(4, 2),
      color: theme.palette.text.secondary,
      fontSize: "0.84rem"
    },
    integrationRow: {
      display: "flex",
      gap: 10,
      alignItems: "flex-start",
      padding: theme.spacing(1.25, 0),
      borderBottom: `1px solid ${border}`,
      "&:last-child": { borderBottom: "none" }
    },
    aside: {
      borderRadius: 14,
      border: `1px solid ${border}`,
      background: surface,
      padding: theme.spacing(2, 2.25),
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
      background: brandSoft,
      color: brandText
    },
    stepTitle: { fontSize: "0.8rem", fontWeight: 600, marginBottom: 2 },
    stepBody: {
      fontSize: "0.74rem",
      lineHeight: 1.45,
      color: theme.palette.text.secondary
    },
    quickLink: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: "0.74rem",
      color: theme.palette.text.secondary
    },
    keyReveal: {
      background: isDark ? "rgba(34,197,94,0.1)" : "rgba(34,197,94,0.08)",
      border: `1px solid ${isDark ? "rgba(34,197,94,0.3)" : "rgba(34,197,94,0.25)"}`,
      borderRadius: 10,
      padding: theme.spacing(2)
    },
    keyCell: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      minWidth: 0
    },
    keyValue: {
      fontFamily: '"Fira Code", "Consolas", monospace',
      fontSize: "0.72rem",
      wordBreak: "break-all",
      flex: 1,
      minWidth: 0
    }
  };
});

function CodeSnippet({ code, label }) {
  const classes = useStyles();
  const copy = () => {
    navigator.clipboard.writeText(code);
    toast.success(label ? `${label} copiado!` : "Copiado!");
  };
  return (
    <Box>
      {label && <Typography className={classes.codeLabel}>{label}</Typography>}
      <Box position="relative">
        <pre className={classes.codeBlock}>{code}</pre>
        <IconButton size="small" className={classes.copyBtn} onClick={copy}>
          <Copy size={14} />
        </IconButton>
      </Box>
    </Box>
  );
}

export default function PlatformApiHubPanel({ createDialogOpen, onCreateDialogChange }) {
  const classes = useStyles();
  const theme = useTheme();
  const accentIcon = theme.palette.type === "dark" ? "#a5b4fc" : "#4338ca";
  const { user, loading: authLoading } = useContext(AuthContext);
  const { t } = useAppTranslation();

  const companyId = user?.companyId ?? user?.company?.id;

  const [config, setConfig] = useState(null);
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState(null);
  const [keyCache, setKeyCache] = useState({});
  const [visibleKeys, setVisibleKeys] = useState({});
  const [revealingId, setRevealingId] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [form, setForm] = useState({
    name: "API CRM",
    scopes: ["full"]
  });

  const translateScope = useCallback(
    (scopeId) => {
      const i18nKey = SCOPE_I18N_KEY(scopeId);
      const translated = t(i18nKey, { defaultValue: "" });
      if (translated && translated !== i18nKey) return translated;
      const fromConfig = (config?.scopes || []).find((s) => s.id === scopeId)?.label;
      if (fromConfig) return fromConfig;
      const fromLocal = SCOPE_OPTIONS.find((s) => s.id === scopeId)?.label;
      return fromLocal || scopeId;
    },
    [config, t]
  );

  const dialogOpen = Boolean(createDialogOpen);
  const setDialogOpen = onCreateDialogChange || (() => {});

  const apiBaseUrl =
    config?.apiBaseUrl ||
    (config?.backendUrl ? `${String(config.backendUrl).replace(/\/+$/, "")}/api/v1/crm` : null) ||
    PUBLIC_API_BASE_URL;

  const loadData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [configRes, credsRes] = await Promise.all([
        platformApiService.getConfig(),
        platformApiService.listCredentials()
      ]);
      setConfig(configRes.data);
      const rows = Array.isArray(credsRes.data) ? credsRes.data : [];
      setCredentials(rows);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (authLoading || !companyId) return;
    loadData();
  }, [authLoading, companyId, loadData]);

  const handleCreate = async () => {
    try {
      const { data } = await platformApiService.createCredential({
        name: form.name,
        scopes: form.scopes
      });
      setNewKey(data.key);
      if (data.credential?.id) {
        setKeyCache((prev) => ({ ...prev, [data.credential.id]: data.key }));
        setVisibleKeys((prev) => ({ ...prev, [data.credential.id]: true }));
        setCredentials((prev) => [
          data.credential,
          ...prev.filter((c) => c.id !== data.credential.id)
        ]);
      }
      toast.success("API Key criada com sucesso!");
    } catch (err) {
      toastError(err);
    }
  };

  const toggleKeyVisibility = async (credential) => {
    const id = credential.id;
    const next = !visibleKeys[id];
    setVisibleKeys((prev) => ({ ...prev, [id]: next }));
    if (!next) return;

    if (keyCache[id]) return;

    if (!credential.canReveal) {
      toast.info("Chave completa indisponível para credenciais antigas. Gere uma nova API Key.");
      setVisibleKeys((prev) => ({ ...prev, [id]: false }));
      return;
    }

    setRevealingId(id);
    try {
      const { data } = await platformApiService.revealCredential(id);
      if (data?.key) {
        setKeyCache((prev) => ({ ...prev, [id]: data.key }));
      }
    } catch (err) {
      toastError(err);
      setVisibleKeys((prev) => ({ ...prev, [id]: false }));
    } finally {
      setRevealingId(null);
    }
  };

  const getDisplayKey = (credential) => {
    if (visibleKeys[credential.id] && keyCache[credential.id]) {
      return keyCache[credential.id];
    }
    return credential.maskedKey || `${credential.keyPrefix}••••••••••••••••••••••••`;
  };

  const handleRevoke = async (id) => {
    try {
      await platformApiService.revokeCredential(id);
      toast.success("Credencial revogada.");
      setRevokeTarget(null);
      loadData();
    } catch (err) {
      toastError(err);
    }
  };

  const openRevokeDialog = (credential) => {
    setRevokeTarget(credential);
  };

  const openCreateDialog = () => {
    setForm({ name: "API CRM", scopes: ["full"] });
    setNewKey(null);
    setDialogOpen(true);
  };

  useEffect(() => {
    if (createDialogOpen) {
      setForm({ name: "API CRM", scopes: ["full"] });
      setNewKey(null);
    }
  }, [createDialogOpen]);

  const mcpHttpUrl =
    config?.mcpHttpUrl ||
    (config?.backendUrl
      ? `${String(config.backendUrl).replace(/\/+$/, "")}/mcp`
      : "https://vbsolutioncrmdeploy-production.up.railway.app/mcp");

  const mcpConfig = JSON.stringify(
    config?.mcpConfigExample || {
      mcpServers: {
        "vbsolution-crm": {
          command: "npx",
          args: ["-y", "@vbsolution/crm-mcp@latest"],
          env: {
            VBSOLUTION_API_KEY: "<sua_api_key>",
            VBSOLUTION_API_URL: apiBaseUrl
          }
        }
      }
    },
    null,
    2
  );

  const curlExample = `curl -X GET "${apiBaseUrl}/contacts" \\
  -H "Authorization: Bearer vb_live_xxxxxxxx_your_key"`;

  if (authLoading || !companyId) {
    return (
      <Box display="flex" justifyContent="center" py={6} width="100%">
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <>
      <Box className={classes.root}>
        <Paper className={classes.main} elevation={0}>
          <Box className={classes.hero}>
            <Box className={classes.heroIcon}>
              <Webhook size={24} />
            </Box>
            <Box>
              <Typography className={classes.heroTitle}>
                API & MCP — VBSolution CRM
              </Typography>
              <Typography className={classes.heroSub}>
                Gere credenciais REST API e MCP da sua organização para extrair leads,
                contatos, atividades, tickets e métricas. Envie contexto ao Claude Code,
                Cursor, VS Code, Zapier, Make e outras plataformas.
              </Typography>
            </Box>
          </Box>

          <Box className={classes.controls}>
            <Typography className={classes.statusDesc} style={{ flex: 1 }}>
              Credenciais da sua organização — acessam apenas os dados da sua conta.
            </Typography>
            <Button
              variant="contained"
              color="primary"
              className={classes.btn}
              startIcon={<Key size={16} />}
              onClick={openCreateDialog}
            >
              Nova API Key
            </Button>
          </Box>

          <Box className={classes.tableWrap}>
            {loading ? (
              <Box display="flex" justifyContent="center" py={5}>
                <CircularProgress size={28} />
              </Box>
            ) : credentials.length === 0 ? (
              <Typography className={classes.emptyState}>
                Nenhuma credencial criada. Use &quot;Nova API Key&quot; para começar.
              </Typography>
            ) : (
              <Table size="small" className={classes.table}>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Credencial</TableCell>
                    <TableCell>Escopos</TableCell>
                    <TableCell>Último uso</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {credentials.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>
                        <Box className={classes.keyCell}>
                          <code className={classes.keyValue}>{getDisplayKey(c)}</code>
                          <Tooltip title={visibleKeys[c.id] ? "Ocultar" : "Mostrar"}>
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => toggleKeyVisibility(c)}
                                disabled={revealingId === c.id}
                              >
                                {revealingId === c.id ? (
                                  <CircularProgress size={14} />
                                ) : visibleKeys[c.id] ? (
                                  <EyeOff size={14} />
                                ) : (
                                  <Eye size={14} />
                                )}
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Copiar">
                            <IconButton
                              size="small"
                              onClick={() => {
                                const value = keyCache[c.id];
                                if (!value) {
                                  toast.info("Mostre a credencial antes de copiar.");
                                  return;
                                }
                                navigator.clipboard.writeText(value);
                                toast.success("API Key copiada!");
                              }}
                            >
                              <Copy size={14} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell>
                        {(c.scopes || []).slice(0, 2).map((s) => (
                          <Chip
                            key={s}
                            label={translateScope(s)}
                            size="small"
                            className={classes.chip}
                            style={{ marginRight: 4 }}
                          />
                        ))}
                        {(c.scopes || []).length > 2 && (
                          <Chip
                            label={`+${c.scopes.length - 2}`}
                            size="small"
                            className={classes.chip}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {c.lastUsedAt
                          ? new Date(c.lastUsedAt).toLocaleString("pt-BR")
                          : "—"}
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Revogar">
                          <IconButton
                            size="small"
                            onClick={() => openRevokeDialog(c)}
                            aria-label="Revogar credencial"
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Box>

          <Box className={classes.statusRow}>
            <Box className={classes.statusCard}>
              <Zap size={18} style={{ marginTop: 2, color: accentIcon }} />
              <Box>
                <Typography className={classes.statusLabel}>REST API</Typography>
                <Typography className={classes.statusDesc}>
                  HTTP para contatos, leads, tickets e métricas.
                </Typography>
              </Box>
            </Box>
            <Box className={classes.statusCard}>
              <Code size={18} style={{ marginTop: 2, color: accentIcon }} />
              <Box>
                <Typography className={classes.statusLabel}>MCP Server</Typography>
                <Typography className={classes.statusDesc}>
                  @vbsolution/crm-mcp para Claude, Cursor e VS Code.
                </Typography>
              </Box>
            </Box>
            <Box className={classes.statusCard}>
              <Shield size={18} style={{ marginTop: 2, color: accentIcon }} />
              <Box>
                <Typography className={classes.statusLabel}>Segurança</Typography>
                <Typography className={classes.statusDesc}>
                  Bearer ou X-API-Key com escopos granulares.
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box className={classes.section}>
            <Typography className={classes.sectionTitle}>
              <Terminal size={16} /> Conexão e autenticação
            </Typography>
            {config?.backendUrl && (
              <Typography className={classes.statusDesc} style={{ marginBottom: 10 }}>
                Servidor API: <code>{config.backendUrl}</code>
              </Typography>
            )}
            <Box className={classes.codeGrid}>
              <CodeSnippet code={`Base URL\n${apiBaseUrl}`} label="REST API" />
              <CodeSnippet code={curlExample} label="Exemplo cURL" />
            </Box>
          </Box>

          <Box className={classes.section}>
            <Typography className={classes.sectionTitle}>
              <Code size={16} /> Configuração MCP
            </Typography>
            <Typography className={classes.statusDesc} style={{ marginBottom: 8 }}>
              <strong>Claude Web (claude.ai):</strong> adicione conector personalizado com a URL
              MCP HTTP abaixo (não use <code>/api/v1/crm</code>). Clique em Vincular e cole sua API
              Key na tela de autorização.
            </Typography>
            <Typography className={classes.statusDesc} style={{ marginBottom: 8 }}>
              <strong>Ícone no Claude:</strong> o Claude usa o favicon do domínio raiz da URL.
              Em <code>*.railway.app</code> aparece o logo do Railway. Para mostrar o favicon da
              VBSolution, aponte um domínio próprio (ex.: <code>api.vbsolution.com.br</code>) no
              Railway e use essa URL no conector.
            </Typography>
            <Box className={classes.codeGrid} style={{ marginBottom: 12 }}>
              <CodeSnippet code={mcpHttpUrl} label="URL MCP (Claude Web)" />
            </Box>
            <Typography className={classes.statusDesc} style={{ marginBottom: 8 }}>
              <strong>Claude Desktop, Cursor e VS Code:</strong> pacote{" "}
              <code>@vbsolution/crm-mcp</code> via <code>npx</code> (stdio).
            </Typography>
            <Box className={classes.codeGrid}>
              <CodeSnippet code={apiBaseUrl} label="VBSOLUTION_API_URL" />
              <CodeSnippet code="<sua_api_key>" label="VBSOLUTION_API_KEY" />
            </Box>
            <Typography className={classes.statusDesc} style={{ margin: "12px 0" }}>
              Copie o JSON abaixo para Claude Desktop / Cursor / VS Code e substitua{" "}
              <code>&lt;sua_api_key&gt;</code> pela chave gerada acima.
            </Typography>
            <CodeSnippet code={mcpConfig} label="JSON MCP (Claude Desktop / Cursor / VS Code)" />
          </Box>

          {(config?.integrations || []).length > 0 && (
            <Box className={classes.section}>
              <Typography className={classes.sectionTitle}>
                <Plug size={16} /> Onde integrar
              </Typography>
              {(config.integrations || []).map((item) => (
                <Box key={item.name} className={classes.integrationRow}>
                  <Zap size={16} style={{ marginTop: 2, flexShrink: 0, color: accentIcon }} />
                  <Box>
                    <Typography style={{ fontWeight: 600, fontSize: "0.8rem" }}>
                      {item.name}
                    </Typography>
                    <Typography className={classes.statusDesc}>
                      {item.description}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          {(config?.endpoints || []).length > 0 && (
            <Box className={classes.section}>
              <Typography className={classes.sectionTitle}>
                <BookOpen size={16} /> Endpoints disponíveis
              </Typography>
              <Box className={classes.tableWrap}>
                <Table size="small" className={classes.table}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Método</TableCell>
                      <TableCell>Path</TableCell>
                      <TableCell>Escopo</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(config.endpoints || []).map((ep) => (
                      <TableRow key={`${ep.method}-${ep.path}`}>
                        <TableCell>
                          <Chip label={ep.method} size="small" className={classes.chip} />
                        </TableCell>
                        <TableCell>
                          <code>/api/v1/crm{ep.path}</code>
                        </TableCell>
                        <TableCell>{ep.scope ? translateScope(ep.scope) : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Box>
          )}
        </Paper>

        <Paper className={classes.aside} elevation={0}>
          <Box className={classes.asideHead}>
            <Box className={classes.heroIcon} style={{ width: 36, height: 36 }}>
              <BookOpen size={18} />
            </Box>
            <Box>
              <Typography className={classes.asideTitle}>Como integrar</Typography>
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

          <Box mt={2.5} display="flex" flexDirection="column" style={{ gap: 10 }}>
            <Typography className={classes.asideSub} style={{ fontWeight: 600 }}>
              Ferramentas compatíveis
            </Typography>
            <Box className={classes.quickLink}>
              <Zap size={14} color={theme.palette.primary.main} />
              <span>Zapier / Make / n8n — REST API</span>
            </Box>
            <Box className={classes.quickLink}>
              <Code size={14} color={theme.palette.primary.main} />
              <span>Claude Desktop / Claude Code — MCP</span>
            </Box>
            <Box className={classes.quickLink}>
              <ExternalLink size={14} color={theme.palette.primary.main} />
              <span>Cursor / VS Code — configurações MCP do editor</span>
            </Box>
            <Box className={classes.quickLink}>
              <Zap size={14} color={theme.palette.primary.main} />
              <span>Brain.AI — CRM nativo no chat (sem URL MCP manual)</span>
            </Box>
          </Box>
        </Paper>
      </Box>

      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setNewKey(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Nova API Key</DialogTitle>
        <DialogContent>
          {newKey ? (
            <Box className={classes.keyReveal}>
              <Typography style={{ fontWeight: 600, fontSize: 13, marginBottom: 8 }}>
                Sua API Key foi criada. Use o ícone de olho na tabela para exibir ou ocultar quando precisar.
              </Typography>
              <CodeSnippet code={newKey} label="API Key" />
            </Box>
          ) : (
            <>
              <Typography className={classes.statusDesc} style={{ marginBottom: 12 }}>
                Esta chave acessa somente os dados da sua organização no VBSolution CRM.
              </Typography>
              <TextField
                fullWidth
                margin="dense"
                label="Nome da credencial"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="API CRM"
                variant="outlined"
              />
              <FormControl fullWidth margin="dense" variant="outlined">
                <InputLabel>Escopos</InputLabel>
                <Select
                  multiple
                  value={form.scopes}
                  onChange={(e) => setForm({ ...form, scopes: e.target.value })}
                  label="Escopos"
                  renderValue={(selected) =>
                    selected.map((scopeId) => translateScope(scopeId)).join(", ")
                  }
                >
                  {SCOPE_OPTIONS.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {translateScope(s.id)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDialogOpen(false);
              setNewKey(null);
            }}
            className={classes.btn}
          >
            {newKey ? "Fechar" : "Cancelar"}
          </Button>
          {!newKey && (
            <Button
              color="primary"
              variant="contained"
              className={classes.btn}
              disabled={!form.name}
              onClick={handleCreate}
            >
              Criar credencial
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <ConfirmationModal
        title={
          revokeTarget
            ? `Revogar credencial "${revokeTarget.name}"?`
            : "Revogar credencial?"
        }
        open={Boolean(revokeTarget)}
        onClose={() => setRevokeTarget(null)}
        onConfirm={() => handleRevoke(revokeTarget.id)}
      >
        Revogar esta credencial? Integrações que usam esta API Key deixarão de funcionar.
        Esta ação não pode ser desfeita.
      </ConfirmationModal>
    </>
  );
}
