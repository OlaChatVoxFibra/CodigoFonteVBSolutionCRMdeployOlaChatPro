/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useCallback, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Popover,
  Select,
  Switch,
  TextField,
  Typography,
  makeStyles,
  useTheme,
  Portal
} from "@material-ui/core";
import { ExternalLink, Github, Link2, Plug, Plus } from "lucide-react";
import { toast } from "react-toastify";
import {
  getGithubConnection,
  listGithubRepos,
  publishBrainGithubRepo
} from "../../services/brainGithubService";
import githubIntegrationService from "../../services/githubIntegrationService";
import toastError from "../../errors/toastError";

function mapIntegrationConnection(integration) {
  if (!integration) return null;
  const connected =
    integration.status === "connected" &&
    Boolean(integration.credential?.hasKey || integration.githubAccount?.login);
  if (!connected) return null;
  return {
    connected: true,
    source: "organization",
    login: integration.githubAccount?.login,
    name: integration.githubAccount?.name,
    avatarUrl: integration.githubAccount?.avatarUrl,
    authType: integration.authType,
    enablePublish: integration.enablePublish,
    enableReposRead: integration.enableReposRead
  };
}

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const border = isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.12)";
  return {
    paper: {
      width: 340,
      maxWidth: "calc(100vw - 24px)",
      maxHeight: "calc(100vh - 96px)",
      overflow: "auto",
      borderRadius: 14,
      background: isDark ? "rgba(54, 54, 64, 0.98)" : "rgba(255,255,255,0.98)",
      color: isDark ? "#f4f4f5" : undefined,
      border: isDark ? `1px solid ${border}` : "1px solid rgba(15,23,42,0.08)",
      boxShadow: isDark
        ? "0 16px 40px rgba(0,0,0,0.45), 0 0 0 0.5px rgba(255,255,255,0.08)"
        : "0 16px 40px rgba(15,23,42,0.12), 0 0 0 0.5px rgba(0,0,0,0.06)"
    },
    panelHeader: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "12px 14px 8px",
      fontSize: 14,
      fontWeight: 600
    },
    panelBody: {
      padding: "0 14px 10px"
    },
    panelFooter: {
      display: "flex",
      justifyContent: "flex-end",
      gap: 8,
      padding: "10px 14px 12px",
      borderTop: `1px solid ${border}`
    },
    overlay: {
      position: "fixed",
      inset: 0,
      zIndex: 1299,
      backgroundColor: isDark ? "rgba(0, 0, 0, 0.22)" : "rgba(15, 23, 42, 0.16)",
      pointerEvents: "auto"
    },
    field: { marginBottom: theme.spacing(1.5) },
    hint: {
      fontSize: 11,
      color: theme.palette.text.secondary,
      lineHeight: 1.5,
      marginTop: 4
    },
    githubBtn: {
      textTransform: "none",
      borderRadius: 10,
      fontWeight: 600,
      fontSize: 12,
      padding: "6px 12px",
      border: `1px solid ${border}`,
      color: isDark ? "#fafafa" : theme.palette.text.primary,
      background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
      "&:hover": {
        background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.03)"
      }
    },
    githubBtnActive: {
      borderColor: isDark ? "rgba(167,139,250,0.5)" : "rgba(124,58,237,0.35)",
      background: isDark ? "rgba(167,139,250,0.12)" : "rgba(124,58,237,0.06)",
      color: isDark ? "#e9d5ff" : "#6d28d9"
    },
    publishBtn: {
      textTransform: "none",
      borderRadius: 10,
      fontWeight: 600,
      background: isDark ? "#e4e4e7 !important" : "#181717 !important",
      color: isDark ? "#181717 !important" : "#fff !important",
      "&:hover": {
        background: isDark ? "#fafafa !important" : "#24292f !important"
      },
      "&.Mui-disabled": {
        background: isDark ? "rgba(255,255,255,0.08) !important" : "rgba(0,0,0,0.08) !important",
        color: isDark ? "rgba(255,255,255,0.35) !important" : "rgba(0,0,0,0.35) !important"
      }
    },
    connectBox: {
      border: `1px dashed ${border}`,
      borderRadius: 12,
      padding: theme.spacing(2.5),
      textAlign: "center",
      marginBottom: theme.spacing(1.5),
      background: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)"
    },
    accountRow: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 12px",
      borderRadius: 10,
      border: `1px solid ${border}`,
      marginBottom: theme.spacing(1.5),
      background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"
    },
    modeBtn: {
      textTransform: "none",
      borderRadius: 8,
      fontSize: 12,
      fontWeight: 600,
      minHeight: 34
    }
  };
});

export function BrainGithubToolbar({
  githubMcpEnabled,
  onToggleGithubMcp,
  linkedRepo
}) {
  const classes = useStyles();
  const theme = useTheme();
  const isDark = theme.palette.type === "dark";

  return (
    <Box display="flex" alignItems="center" flexWrap="wrap" style={{ gap: 6 }}>
      <Button
        size="small"
        className={`${classes.githubBtn} ${githubMcpEnabled ? classes.githubBtnActive : ""}`}
        startIcon={<Plug size={14} />}
        onClick={onToggleGithubMcp}
      >
        MCP GitHub
        {githubMcpEnabled ? (
          <Chip
            label="ON"
            size="small"
            style={{
              height: 16,
              marginLeft: 6,
              fontSize: 9,
              fontWeight: 700,
              background: isDark ? "rgba(167,139,250,0.25)" : "rgba(124,58,237,0.15)",
              color: isDark ? "#e9d5ff" : "#6d28d9"
            }}
          />
        ) : null}
      </Button>
      {linkedRepo ? (
        <Button
          size="small"
          className={classes.githubBtn}
          startIcon={<ExternalLink size={12} />}
          href={linkedRepo}
          target="_blank"
          rel="noopener noreferrer"
          component="a"
        >
          Abrir repo
        </Button>
      ) : null}
    </Box>
  );
}

export function BrainGithubPublishButton({ onClick, buttonRef }) {
  const classes = useStyles();

  return (
    <Button
      ref={buttonRef}
      size="small"
      className={classes.githubBtn}
      startIcon={<Github size={14} />}
      onClick={onClick}
    >
      Publicar no GitHub
    </Button>
  );
}

export default function BrainGithubPublishDialog({
  open,
  anchorEl,
  onClose,
  projectTitle,
  projectFiles,
  onPublished
}) {
  const classes = useStyles();
  const theme = useTheme();
  const isDark = theme.palette.type === "dark";
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  const [connectionLoading, setConnectionLoading] = useState(true);
  const [connection, setConnection] = useState(null);
  const [repos, setRepos] = useState([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [publishMode, setPublishMode] = useState("existing");
  const [selectedRepo, setSelectedRepo] = useState("");
  const [repoName, setRepoName] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);

  const fileCount = Object.keys(projectFiles || {}).length;

  const loadConnection = useCallback(async () => {
    try {
      const status = await getGithubConnection();
      if (status?.connected) {
        setConnection(status);
        return status;
      }
    } catch {
      /* tenta fallback abaixo */
    }

    try {
      const integration = await githubIntegrationService.getIntegration();
      const mapped = mapIntegrationConnection(integration);
      if (mapped) {
        setConnection(mapped);
        return mapped;
      }
    } catch {
      /* sem conexão */
    }

    setConnection(null);
    return null;
  }, []);

  const loadRepos = useCallback(async () => {
    setReposLoading(true);
    try {
      let items = [];
      try {
        items = await listGithubRepos();
      } catch {
        items = await githubIntegrationService.listRepos();
      }
      setRepos(items);
      setSelectedRepo((prev) => prev || (items[0]?.fullName ?? ""));
    } catch (err) {
      toastError(err);
      setRepos([]);
    } finally {
      setReposLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const slug = String(projectTitle || "brain-project")
      .toLowerCase()
      .replace(/[^\w-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
    setRepoName(slug || "brain-project");
  }, [open, projectTitle]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    setPublishMode("existing");
    setSelectedRepo("");
    setConnectionLoading(true);

    (async () => {
      try {
        const conn = await loadConnection();
        if (cancelled) return;
        if (conn) {
          await loadRepos();
        } else {
          setRepos([]);
        }
      } finally {
        if (!cancelled) setConnectionLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, loadConnection, loadRepos]);

  const handlePublish = async () => {
    if (!connection) {
      toast.error("Configure GitHub em Integrações → GitHub.");
      return;
    }
    if (publishMode === "existing" && !selectedRepo) {
      toast.error("Selecione um repositório.");
      return;
    }
    if (publishMode === "new" && !repoName.trim()) {
      toast.error("Informe o nome do novo repositório.");
      return;
    }

    setLoading(true);
    try {
      const result = await publishBrainGithubRepo({
        mode: publishMode,
        repoFullName: publishMode === "existing" ? selectedRepo : undefined,
        repoName: publishMode === "new" ? repoName.trim() : undefined,
        files: projectFiles,
        description: `Projeto ${projectTitle || "Brain AI"} · VB Solution`,
        isPrivate: publishMode === "new" ? isPrivate : undefined
      });
      toast.success(
        publishMode === "new"
          ? `Repositório criado: ${result.htmlUrl}`
          : `Código enviado para ${selectedRepo}`
      );
      onPublished?.(result.htmlUrl);
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "Falha ao publicar no GitHub.");
    } finally {
      setLoading(false);
    }
  };

  const canPublish =
    connection &&
    fileCount > 0 &&
    (publishMode === "new" ? repoName.trim() : selectedRepo);

  return (
    <>
      {open ? (
        <Portal>
          <Box className={classes.overlay} onClick={onClose} aria-hidden />
        </Portal>
      ) : null}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={onClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        marginThreshold={12}
        hideBackdrop
        style={{ zIndex: 1300 }}
        PaperProps={{ className: classes.paper }}
      >
        <Box className={classes.panelHeader}>
          <Github size={16} />
          Publicar no GitHub
        </Box>
        <Box className={classes.panelBody}>
        <Typography variant="body2" color="textSecondary" paragraph style={{ fontSize: 11, marginBottom: 10, lineHeight: 1.45 }}>
          Envie os arquivos do projeto atual ({fileCount} arquivo(s)) para um repositório GitHub
          da organização conectada em Integrações.
        </Typography>

        {connectionLoading ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress size={24} />
          </Box>
        ) : !connection ? (
          <Box className={classes.connectBox}>
            <Link2 size={28} style={{ opacity: 0.7, marginBottom: 8 }} />
            <Typography variant="body2" style={{ fontWeight: 600, marginBottom: 4 }}>
              GitHub da organização não configurado
            </Typography>
            <Typography variant="caption" color="textSecondary" display="block" style={{ marginBottom: 12 }}>
              Conecte a conta GitHub da organização em Integrações para publicar código.
            </Typography>
            <Button
              variant="contained"
              disableElevation
              className={classes.publishBtn}
              onClick={() => {
                onClose();
                history.push("/connections/github/new/settings");
              }}
            >
              Conectar em Integrações
            </Button>
          </Box>
        ) : (
          <>
            <Box className={classes.accountRow}>
              <Avatar src={connection.avatarUrl} alt={connection.login} style={{ width: 32, height: 32 }}>
                {connection.login?.[0]?.toUpperCase()}
              </Avatar>
              <Box flex={1} minWidth={0}>
                <Typography variant="body2" style={{ fontWeight: 600, fontSize: 13 }}>
                  @{connection.login}
                </Typography>
                {connection.name ? (
                  <Typography variant="caption" color="textSecondary" noWrap>
                    {connection.name}
                  </Typography>
                ) : null}
              </Box>
              <Chip
                size="small"
                label="Org"
                style={{ height: 22, fontSize: 10, fontWeight: 600 }}
              />
            </Box>

            <Box display="flex" style={{ gap: 6, marginBottom: 12 }}>
              <Button
                size="small"
                variant={publishMode === "existing" ? "contained" : "outlined"}
                color="primary"
                disableElevation
                className={classes.modeBtn}
                onClick={() => setPublishMode("existing")}
              >
                Repositório existente
              </Button>
              <Button
                size="small"
                variant={publishMode === "new" ? "contained" : "outlined"}
                color="primary"
                disableElevation
                className={classes.modeBtn}
                startIcon={<Plus size={12} />}
                onClick={() => setPublishMode("new")}
              >
                Criar novo
              </Button>
            </Box>

            {publishMode === "existing" ? (
              <>
                {reposLoading ? (
                  <Box display="flex" justifyContent="center" py={2}>
                    <CircularProgress size={22} />
                  </Box>
                ) : repos.length ? (
                  <FormControl variant="outlined" size="small" fullWidth className={classes.field}>
                    <InputLabel>Repositório</InputLabel>
                    <Select
                      value={selectedRepo}
                      onChange={(e) => setSelectedRepo(e.target.value)}
                      label="Repositório"
                    >
                      {repos.map((repo) => (
                        <MenuItem key={repo.id} value={repo.fullName}>
                          {repo.fullName}
                          {repo.private ? " · privado" : ""}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                ) : (
                  <Typography variant="body2" color="textSecondary" style={{ fontSize: 12 }}>
                    Nenhum repositório encontrado. Use &quot;Criar novo&quot; para publicar.
                  </Typography>
                )}
                <Typography className={classes.hint}>
                  Os arquivos serão enviados (criados ou atualizados) na raiz do repositório selecionado.
                </Typography>
              </>
            ) : (
              <>
                <TextField
                  className={classes.field}
                  label="Nome do repositório"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  fullWidth
                  size="small"
                  variant="outlined"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={<Typography variant="body2">Repositório privado</Typography>}
                />
              </>
            )}
          </>
        )}
        </Box>
        <Box className={classes.panelFooter}>
        <Button onClick={onClose} disabled={loading} size="small" style={{ textTransform: "none", fontSize: 12 }}>
          Cancelar
        </Button>
        <Button
          onClick={handlePublish}
          disabled={loading || !canPublish}
          size="small"
          className={classes.publishBtn}
          startIcon={loading ? <CircularProgress size={12} /> : <Github size={13} />}
        >
          {loading
            ? "Publicando…"
            : publishMode === "new"
              ? "Criar e enviar"
              : "Enviar código"}
        </Button>
        </Box>
      </Popover>
    </>
  );
}
