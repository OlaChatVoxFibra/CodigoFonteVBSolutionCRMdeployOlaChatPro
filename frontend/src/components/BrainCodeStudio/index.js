/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Drawer,
  IconButton,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
  makeStyles,
  useTheme
} from "@material-ui/core";
import {
  ChevronDown,
  Code2,
  Crosshair,
  ExternalLink,
  FolderKanban,
  FolderOpen,
  Github,
  MessageSquare,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  SquareTerminal,
  Terminal,
  Type,
  X
} from "lucide-react";
import { SiSupabase } from "react-icons/si";
import { toast } from "react-toastify";
import useBrainCodeProject from "../../hooks/useBrainCodeProject";
import BrainCodeTerminal from "./BrainCodeTerminal";
import BrainGithubPublishDialog, { BrainGithubToolbar, BrainGithubPublishButton } from "./BrainGithubConnect";
import BrainSupabaseConnectDialog, { BrainSupabaseConnectButton } from "./BrainSupabaseConnect";
import BrainVscodeTree, { BrainVscodeEditor } from "./brainVscodeTree";
import { useIsDarkMode } from "../../hooks/useMediaQueryBrain";
import BrainIdeLovableTopbar from "./BrainIdeLovableTopbar";
const crmIntegrationService = {
  getProvider: async () => ({ connected: false }),
  disconnect: async () => {},
  getStatus: async () => ({ providers: {} }),
};
import logoBrainAi from "../../assets/logo_brain_ai.png";

const tabLabel = (icon, text) => (
  <Box display="flex" alignItems="center" style={{ gap: 6 }}>
    {icon}
    <span>{text}</span>
  </Box>
);

const REPO_KEY = (userId, projectId, workspaceId) =>
  projectId && workspaceId
    ? `brain-github-repo-${userId || "guest"}-p${projectId}-w${workspaceId}`
    : projectId
      ? `brain-github-repo-${userId || "guest"}-p${projectId}`
      : `brain-github-repo-${userId || "guest"}`;

function AutoSizeProjectTitle({ value, onChange, className }) {
  const mirrorRef = useRef(null);
  const [width, setWidth] = useState(120);

  useLayoutEffect(() => {
    const el = mirrorRef.current;
    if (!el) return;
    const measured = el.scrollWidth + 20;
    const cap = Math.floor(window.innerWidth * 0.42);
    setWidth(Math.min(Math.max(measured, 96), cap));
  }, [value]);

  return (
    <Box position="relative" display="inline-flex" maxWidth="42vw" flexShrink={0}>
      <span
        ref={mirrorRef}
        aria-hidden
        style={{
          position: "absolute",
          visibility: "hidden",
          whiteSpace: "pre",
          fontSize: 14,
          fontWeight: 600,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          pointerEvents: "none"
        }}
      >
        {value || " "}
      </span>
      <TextField
        className={className}
        value={value}
        onChange={onChange}
        variant="standard"
        style={{ width }}
        inputProps={{
          style: {
            fontSize: 14,
            fontWeight: 600,
            width: "100%",
            overflow: "visible",
            textOverflow: "clip"
          },
          "aria-label": "Nome do projeto IDE"
        }}
      />
    </Box>
  );
}

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const gray = {
    base: isDark ? "#2e2e36" : "#ffffff",
    raised: isDark ? "#363640" : "#fafafa",
    sunken: isDark ? "#282830" : "#ececef",
    panel: isDark ? "#32323a" : "#f4f4f5",
    editor: isDark ? "#34343e" : "#fafafa"
  };
  const border = isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)";
  const accentMark = isDark ? "#a78bfa" : "#7c3aed";
  return {
    drawerPaper: {
      width: "min(98vw, 1480px)",
      maxWidth: "100%",
      background: gray.base,
      color: isDark ? "#f4f4f5" : undefined
    },
    embeddedRoot: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      minWidth: 0,
      width: "100%",
      overflow: "hidden",
      background: isDark ? "#2d2d2d" : gray.base,
      color: isDark ? "#f4f4f5" : undefined
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: theme.spacing(1, 2),
      borderBottom: `1px solid ${border}`,
      background: gray.sunken,
      flexWrap: "wrap",
      gap: 8
    },
    headerActions: {
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 6
    },
    body: {
      height: "calc(100vh - 130px)",
      minHeight: 360,
      minWidth: 0
    },
    bodyEmbedded: {
      flex: 1,
      minHeight: 0,
      minWidth: 0,
      display: "flex",
      flexDirection: "column"
    },
    bodyIde: {
      display: "grid",
      gridTemplateColumns: "180px minmax(0, 1fr)",
      height: "100%",
      minHeight: 0,
      [theme.breakpoints.down("sm")]: {
        gridTemplateColumns: "1fr",
        gridTemplateRows: "auto 1fr"
      }
    },
    bodyFull: {
      display: "flex",
      flexDirection: "column",
      height: "100%",
      minHeight: 0
    },
    files: {
      borderRight: `1px solid ${border}`,
      overflow: "auto",
      padding: theme.spacing(1),
      minHeight: 0,
      background: gray.sunken
    },
    fileItem: {
      fontSize: 12,
      padding: theme.spacing(0.75, 1),
      borderRadius: 8,
      cursor: "pointer",
      marginBottom: 2,
      wordBreak: "break-all",
      color: isDark ? "rgba(255,255,255,0.72)" : theme.palette.text.primary,
      borderLeft: "3px solid transparent",
      "&:hover": {
        background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
        color: isDark ? "#fafafa" : undefined
      }
    },
    fileActive: {
      background: isDark ? "rgba(255,255,255,0.1)" : "rgba(139,92,246,0.1)",
      color: isDark ? "#ffffff" : theme.palette.text.primary,
      fontWeight: 600,
      borderLeft: `3px solid ${accentMark}`
    },
    tabsRoot: {
      borderBottom: `1px solid ${border}`,
      minHeight: 40,
      "& .MuiTabs-flexContainer": {
        gap: 2
      },
      "& .MuiTab-root": {
        minHeight: 40,
        minWidth: 0,
        maxWidth: 220,
        fontSize: 12,
        textTransform: "none",
        padding: "6px 14px",
        color: isDark ? "rgba(255,255,255,0.55)" : theme.palette.text.secondary
      },
      "& .MuiTab-wrapper": {
        flexDirection: "row",
        alignItems: "center",
        gap: 6
      },
      "& .MuiTab-root.Mui-selected": {
        color: isDark ? "#ffffff" : theme.palette.primary.main
      },
      "& .MuiTabs-indicator": {
        backgroundColor: accentMark,
        height: 2
      }
    },
    headerBtn: {
      textTransform: "none",
      borderRadius: 8,
      fontSize: 12,
      color: isDark ? "rgba(255,255,255,0.88)" : undefined,
      borderColor: isDark ? "rgba(255,255,255,0.18)" : undefined
    },
    projectBar: {
      display: "none"
    },
    workspaceTabsBar: {
      display: "flex",
      alignItems: "stretch",
      minHeight: 34,
      borderBottom: `1px solid ${border}`,
      background: gray.sunken
    },
    workspaceTabsScroll: {
      display: "flex",
      alignItems: "stretch",
      flex: 1,
      minWidth: 0,
      overflowX: "auto",
      ...theme.scrollbarStylesSoft
    },
    workspaceTab: {
      display: "flex",
      alignItems: "center",
      gap: 4,
      padding: "0 8px 0 10px",
      height: 34,
      fontSize: 11.5,
      cursor: "pointer",
      borderRight: `1px solid ${border}`,
      color: isDark ? "rgba(255,255,255,0.55)" : theme.palette.text.secondary,
      maxWidth: 170,
      flexShrink: 0,
      userSelect: "none",
      "&:hover": {
        background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"
      }
    },
    workspaceTabActive: {
      background: gray.panel,
      color: isDark ? "#fafafa" : theme.palette.text.primary,
      boxShadow: isDark ? "inset 0 2px 0 0 #a78bfa" : "inset 0 2px 0 0 #7c3aed"
    },
    workspaceTabLabel: {
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      flex: 1,
      minWidth: 0
    },
    workspaceTabClose: {
      padding: 2,
      opacity: 0.45,
      "&:hover": { opacity: 1 }
    },
    workspaceTabAdd: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 34,
      height: 34,
      border: "none",
      borderRight: `1px solid ${border}`,
      background: "transparent",
      cursor: "pointer",
      color: isDark ? "rgba(255,255,255,0.5)" : theme.palette.text.secondary,
      flexShrink: 0,
      "&:hover": {
        background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"
      },
      "&:disabled": { opacity: 0.35, cursor: "not-allowed" }
    },
    brainChipWrap: {
      display: "flex",
      alignItems: "center",
      gap: 4,
      padding: "0 8px",
      flexShrink: 0,
      borderLeft: `1px solid ${border}`,
      maxWidth: 140
    },
    projectSelect: {
      fontSize: 10,
      fontWeight: 600,
      minWidth: 0,
      maxWidth: 120,
      color: isDark ? "rgba(255,255,255,0.75)" : theme.palette.text.secondary,
      "& .MuiSelect-root": { padding: "4px 22px 4px 6px", fontSize: 10 },
      "& .MuiOutlinedInput-notchedOutline": { border: "none" },
      "& .MuiSvgIcon-root": { color: isDark ? "rgba(255,255,255,0.5)" : undefined, fontSize: 16 }
    },
    projectDot: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      flexShrink: 0
    },
    projectMeta: {
      fontSize: 11,
      color: isDark ? "rgba(255,255,255,0.5)" : theme.palette.text.secondary,
      flex: 1,
      minWidth: 120
    },
    loadingOverlay: {
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: isDark ? "rgba(46, 46, 54, 0.72)" : "rgba(255,255,255,0.72)",
      zIndex: 2
    },
    titleInput: {
      flexShrink: 0,
      "& .MuiInput-input": {
        color: isDark ? "#fafafa" : undefined,
        overflow: "visible",
        textOverflow: "clip"
      },
      "& .MuiInputBase-root": {
        width: "100%"
      }
    },
    editor: {
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      minWidth: 0,
      flex: 1
    },
    textarea: {
      flex: 1,
      width: "100%",
      border: "none",
      resize: "none",
      padding: theme.spacing(1.5),
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      fontSize: 12,
      lineHeight: 1.5,
      outline: "none",
      background: gray.editor,
      color: theme.palette.text.primary
    },
    preview: {
      minHeight: 0,
      flex: 1,
      display: "flex",
      flexDirection: "column"
    },
    iframe: {
      flex: 1,
      border: "none",
      width: "100%",
      background: "#fff"
    },
    filesLabel: {
      padding: "4px 8px",
      color: isDark ? "rgba(255,255,255,0.5)" : theme.palette.text.secondary
    },
    terminalWrap: {
      flex: 1,
      minHeight: 0,
      display: "flex",
      flexDirection: "column"
    }
  };
});

function buildPreviewHtml(files) {
  const index = files["index.html"];
  if (index) {
    let html = index;
    if (!/<html[\s>]/i.test(html)) {
      html = `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body>${html}</body></html>`;
    }
    return html
      .replace(/<\/head>/i, `<style>${files["styles.css"] || ""}</style></head>`)
      .replace(
        /<\/body>/i,
        `<script>${(files["app.js"] || "").replace(/<\/script>/gi, "")}<\/script></body>`
      );
  }
  const first = Object.keys(files)[0];
  return files[first] || "<p>Sem preview</p>";
}

function readLinkedRepo(userId, projectId, workspaceId) {
  try {
    return localStorage.getItem(REPO_KEY(userId, projectId, workspaceId)) || "";
  } catch {
    return "";
  }
}

function saveLinkedRepo(userId, projectId, workspaceId, url) {
  try {
    if (url) localStorage.setItem(REPO_KEY(userId, projectId, workspaceId), url);
    else localStorage.removeItem(REPO_KEY(userId, projectId, workspaceId));
  } catch {
    /* ignore */
  }
}

export default function BrainCodeStudio({
  open,
  embedded = false,
  onClose,
  userId,
  brainProject,
  brainProjects = [],
  onSelectBrainProject,
  incomingFiles,
  incomingTitle,
  liveSession,
  selectedMcps = [],
  onToggleMcp,
  preferredWorkspaceId = null,
  onBackToCreations,
  onActiveWorkspaceChange,
  chatPanel = null,
  ideUser = null,
  creditsRefreshKey = 0,
  onOpenPlans,
  ui: uiProp
}) {
  const ui = uiProp || ((x) => x);
  const classes = useStyles();
  const theme = useTheme();
  const isDarkShell = useIsDarkMode();
  const isDark = isDarkShell || theme.palette.type === "dark";
  const {
    brainProjectId: loadedProjectId,
    workspaces,
    activeWorkspaceId,
    project,
    loading: projectLoading,
    loadError,
    setProject,
    selectWorkspace,
    createWorkspace,
    removeWorkspace,
    reloadWorkspaces,
    mergeFiles,
    openFolderFromInput,
    resetProject,
    reloadActiveWorkspace
  } = useBrainCodeProject(userId, brainProject, preferredWorkspaceId);
  const folderRef = useRef(null);
  const filesRef = useRef(null);
  const wasOpenRef = useRef(false);
  const [tab, setTab] = useState(0);
  const [viewMode, setViewMode] = useState("preview");
  const previewIframeRef = useRef(null);
  const [githubDialogOpen, setGithubDialogOpen] = useState(false);
  const [githubPublishAnchor, setGithubPublishAnchor] = useState(null);
  const publishButtonRef = useRef(null);
  const [supabaseDialogOpen, setSupabaseDialogOpen] = useState(false);
  const [supabaseAnchor, setSupabaseAnchor] = useState(null);
  const [supabaseConnected, setSupabaseConnected] = useState(false);
  const supabaseButtonRef = useRef(null);
  const activeBrainProjectId = brainProject?.id ?? null;
  const [linkedRepo, setLinkedRepo] = useState("");
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const chatBeforeCodeFocusRef = useRef(false);
  const prevViewModeRef = useRef(viewMode);
  const [openTabs, setOpenTabs] = useState([]);
  const previewBaselineRef = useRef("");
  const [previewDirty, setPreviewDirty] = useState(false);

  const githubMcpEnabled = selectedMcps.includes("github");
  const fileCount = Object.keys(project.files || {}).length;

  React.useEffect(() => {
    setLinkedRepo(readLinkedRepo(userId, activeBrainProjectId, activeWorkspaceId));
  }, [userId, activeBrainProjectId, activeWorkspaceId]);

  React.useEffect(() => {
    if (activeWorkspaceId) onActiveWorkspaceChange?.(activeWorkspaceId);
  }, [activeWorkspaceId, onActiveWorkspaceChange]);

  React.useEffect(() => {
    setTab(0);
    setViewMode("preview");
    setOpenTabs([]);
    previewBaselineRef.current = "";
    setPreviewDirty(false);
  }, [activeBrainProjectId, activeWorkspaceId]);

  React.useEffect(() => {
    const ap = project.activePath;
    if (!ap) return;
    setOpenTabs((prev) => (prev.includes(ap) ? prev : [...prev, ap]));
  }, [project.activePath]);

  React.useEffect(() => {
    setOpenTabs((prev) => prev.filter((p) => Object.prototype.hasOwnProperty.call(project.files, p)));
  }, [project.files]);

  React.useEffect(() => {
    const prev = prevViewModeRef.current;
    prevViewModeRef.current = viewMode;
    const enteringFocus = (viewMode === "code" || viewMode === "terminal") && prev === "preview";
    const leavingFocus =
      viewMode === "preview" && (prev === "code" || prev === "terminal");

    if (enteringFocus) {
      setChatCollapsed((wasCollapsed) => {
        chatBeforeCodeFocusRef.current = wasCollapsed;
        return true;
      });
    } else if (leavingFocus) {
      setChatCollapsed(chatBeforeCodeFocusRef.current);
    }
  }, [viewMode]);

  React.useEffect(() => {
    if (incomingFiles?.length) {
      mergeFiles(incomingFiles, incomingTitle);
      setTab(0);
      setViewMode("preview");
    }
  }, [incomingFiles, incomingTitle, mergeFiles]);

  React.useEffect(() => {
    if (!liveSession?.tick) return;

    if (liveSession.activePath && liveSession.streamingPaths?.[liveSession.activePath] !== undefined) {
      const partial = liveSession.streamingPaths[liveSession.activePath];
      setProject((p) => ({
        ...p,
        activePath: liveSession.activePath,
        files: { ...p.files, [liveSession.activePath]: partial }
      }));
      setTab(0);
      setViewMode("preview");
      return;
    }

    if (!liveSession.filesForMerge?.length) return;
    mergeFiles(liveSession.filesForMerge, liveSession.projectTitle);
    if (liveSession.activePath) {
      setProject((p) => ({ ...p, activePath: liveSession.activePath }));
    }
    if (liveSession.isActive) {
      setTab(0);
      setViewMode("preview");
    }
  }, [liveSession?.tick, liveSession, mergeFiles, setProject]);

  React.useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const row = await crmIntegrationService.getProvider("supabase");
        if (!cancelled) setSupabaseConnected(Boolean(row?.connected));
      } catch {
        if (!cancelled) setSupabaseConnected(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, supabaseDialogOpen]);

  React.useEffect(() => {
    if (open && activeWorkspaceId && (!wasOpenRef.current || liveSession?.savedTick)) {
      reloadActiveWorkspace().catch(() => {});
    }
    wasOpenRef.current = open;
  }, [open, activeWorkspaceId, liveSession?.savedTick, reloadActiveWorkspace]);

  const paths = useMemo(() => Object.keys(project.files).sort(), [project.files]);
  const activeContent = project.files[project.activePath] ?? "";
  const previewSrcDoc = useMemo(() => buildPreviewHtml(project.files), [project.files]);

  React.useEffect(() => {
    const snapshot = JSON.stringify(project.files || {});
    if (!previewBaselineRef.current) {
      previewBaselineRef.current = snapshot;
      setPreviewDirty(false);
      return;
    }
    setPreviewDirty(snapshot !== previewBaselineRef.current);
  }, [project.files]);

  const updateActive = (value) => {
    setProject((prev) => ({
      ...prev,
      files: { ...prev.files, [prev.activePath]: value }
    }));
  };

  const handleSelectPath = (path) => {
    setOpenTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
    setProject((p) => ({ ...p, activePath: path }));
  };

  const handleSelectTab = (path) => {
    setProject((p) => ({ ...p, activePath: path }));
  };

  const handleCloseTab = (path) => {
    setOpenTabs((prev) => {
      const next = prev.filter((p) => p !== path);
      if (path === project.activePath) {
        const fallback = next[next.length - 1] || paths[0] || "";
        if (fallback) {
          setProject((p) => ({ ...p, activePath: fallback }));
          return next.length ? next : [fallback];
        }
      }
      if (!next.length && paths[0]) {
        setProject((p) => ({ ...p, activePath: paths[0] }));
        return [paths[0]];
      }
      return next;
    });
  };

  const handleRenameFile = (oldPath, newName) => {
    const trimmed = String(newName || "").trim().replace(/^\/+/, "");
    if (!trimmed) return;
    const segments = String(oldPath || "").split("/");
    segments[segments.length - 1] = trimmed;
    const newPath = segments.join("/");
    if (newPath === oldPath) return;
    if (Object.prototype.hasOwnProperty.call(project.files, newPath)) {
      toast.info(ui("Arquivo já existe."));
      return;
    }
    setProject((p) => {
      const nextFiles = { ...p.files };
      nextFiles[newPath] = nextFiles[oldPath] ?? "";
      delete nextFiles[oldPath];
      return {
        ...p,
        files: nextFiles,
        activePath: p.activePath === oldPath ? newPath : p.activePath,
      };
    });
    setOpenTabs((prev) => prev.map((tabPath) => (tabPath === oldPath ? newPath : tabPath)));
    toast.success(ui("Arquivo renomeado."));
  };

  const handleDeleteFile = (path) => {
    if (!path) return;
    const keys = Object.keys(project.files || {});
    if (keys.length <= 1) {
      toast.info(ui("Mantenha pelo menos um arquivo no projeto."));
      return;
    }
    setProject((p) => {
      const nextFiles = { ...p.files };
      delete nextFiles[path];
      const remaining = Object.keys(nextFiles);
      const nextActive =
        p.activePath === path ? remaining[0] || "" : p.activePath;
      return { ...p, files: nextFiles, activePath: nextActive };
    });
    setOpenTabs((prev) => prev.filter((tabPath) => tabPath !== path));
    toast.success(ui("Arquivo excluído."));
  };

  const readFileListAsEntries = async (fileList) => {
    if (!fileList?.length) return [];
    const readers = [];
    for (let i = 0; i < fileList.length; i += 1) {
      const file = fileList[i];
      const path = String(file.webkitRelativePath || file.name || "").replace(/^\/+/, "");
      if (!path || file.size > 800000) continue;
      if (/\.(png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot|zip|pdf)$/i.test(path)) continue;
      readers.push(
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ path, content: String(reader.result || "") });
          reader.onerror = () => resolve(null);
          reader.readAsText(file);
        })
      );
    }
    return (await Promise.all(readers)).filter(Boolean);
  };

  const handleImportFiles = () => {
    filesRef.current?.click();
  };

  const handleImportFolder = () => {
    folderRef.current?.click();
  };

  const handleFilesInputChange = async (e) => {
    const entries = await readFileListAsEntries(e.target.files);
    e.target.value = "";
    if (!entries.length) {
      toast.info(ui("Nenhum arquivo de texto válido selecionado."));
      return;
    }
    mergeFiles(entries, project.title);
    setViewMode("code");
    toast.success(ui("Arquivos importados."));
  };

  const handleFolderInputChange = async (e) => {
    const entries = await readFileListAsEntries(e.target.files);
    e.target.value = "";
    if (!entries.length) {
      toast.info(ui("Nenhum arquivo de texto válido na pasta."));
      return;
    }
    mergeFiles(entries, entries[0]?.path?.split("/")[0] || project.title);
    setViewMode("code");
    toast.success(ui("Pasta importada."));
  };

  const handleRefreshWorkspace = () => {
    reloadActiveWorkspace()
      .then(() => toast.success(ui("Projeto atualizado.")))
      .catch(() => toast.error(ui("Não foi possível atualizar o projeto.")));
  };

  const toggleGithubMcp = () => {
    if (!onToggleMcp) return;
    const next = githubMcpEnabled
      ? selectedMcps.filter((id) => id !== "github")
      : [...selectedMcps, "github"];
    onToggleMcp(next);
    toast.info(
      githubMcpEnabled
        ? "MCP GitHub desativado no Brain."
        : "MCP GitHub ativo — repos, PRs e publicação disponíveis nas conversas."
    );
  };

  const openGithubPublish = (event) => {
    if (onToggleMcp && !githubMcpEnabled) {
      onToggleMcp([...new Set([...selectedMcps, "github"])]);
    }
    setGithubPublishAnchor(event?.currentTarget || publishButtonRef.current);
    setGithubDialogOpen(true);
  };

  const closeGithubPublish = () => {
    setGithubDialogOpen(false);
    setGithubPublishAnchor(null);
  };

  const openSupabaseConnect = (event) => {
    setSupabaseAnchor(event?.currentTarget || supabaseButtonRef.current);
    setSupabaseDialogOpen(true);
  };

  const closeSupabaseConnect = () => {
    setSupabaseDialogOpen(false);
    setSupabaseAnchor(null);
  };

  const idePopoverOpen = githubDialogOpen || supabaseDialogOpen;

  const handleCreateWorkspace = async () => {
    try {
      const n = workspaces.length + 1;
      await createWorkspace(`Projeto ${n}`);
      toast.success("Novo projeto IDE aberto.");
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "Erro ao criar projeto IDE.");
    }
  };

  const handleRemoveWorkspace = async (workspaceId) => {
    const id = workspaceId || activeWorkspaceId;
    if (!id || workspaces.length <= 1) return;
    try {
      await removeWorkspace(id);
      toast.info("Projeto IDE fechado.");
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "Erro ao remover.");
    }
  };

  const handleSelectProject = async (nextId) => {
    if (!nextId || Number(nextId) === Number(activeBrainProjectId)) return;
    if (onSelectBrainProject) {
      await onSelectBrainProject(Number(nextId));
      toast.info("IDE Build trocado para outro projeto Brain.");
    }
  };

  const isIdeTab = tab === 0;
  const isPreviewTab = tab === 1;
  const isTerminalTab = tab === 2;
  const isLovableLayout = embedded && chatPanel;
  const previewPath = project.files["index.html"] ? "/" : "/preview";

  React.useEffect(() => {
    if (viewMode !== "preview") return;
    const iframe = previewIframeRef.current;
    if (!iframe) return;
    iframe.srcdoc = previewSrcDoc;
  }, [previewSrcDoc, viewMode]);

  const refreshPreview = () => {
    const iframe = previewIframeRef.current;
    if (!iframe) return;
    const current = iframe.srcdoc;
    iframe.srcdoc = "";
    requestAnimationFrame(() => {
      iframe.srcdoc = current || previewSrcDoc;
    });
  };

  const handleRefreshPreview = () => {
    if (viewMode !== "preview") {
      setViewMode("preview");
      requestAnimationFrame(() => {
        refreshPreview();
        toast.info(ui("Preview atualizado."));
      });
      return;
    }
    refreshPreview();
    toast.info(ui("Preview atualizado."));
  };

  const handleCopyPreviewPath = async () => {
    try {
      await navigator.clipboard.writeText(previewPath);
      toast.success(ui("Caminho copiado."));
    } catch {
      toast.info(previewPath);
    }
  };

  const handleRunPreview = () => {
    previewBaselineRef.current = JSON.stringify(project.files || {});
    setPreviewDirty(false);
    setViewMode("preview");
    requestAnimationFrame(() => refreshPreview());
    toast.success(ui("Preview executado."));
  };

  const openPreviewInNewTab = () => {
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(previewSrcDoc);
      w.document.close();
    }
  };

  const handleShareProject = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado para a área de transferência.");
    } catch {
      toast.info("Não foi possível copiar o link.");
    }
  };

  const handleCreateFile = (rawName) => {
    const name = String(rawName || "").trim();
    if (!name) return;
    const filePath = name.replace(/^\/+/, "");
    if (Object.prototype.hasOwnProperty.call(project.files, filePath)) {
      toast.info(ui("Arquivo já existe."));
      handleSelectPath(filePath);
      return;
    }
    setProject((p) => ({
      ...p,
      files: { ...p.files, [filePath]: "" },
      activePath: filePath,
    }));
    setOpenTabs((prev) => (prev.includes(filePath) ? prev : [...prev, filePath]));
    setViewMode("code");
  };

  const renderFileTree = () => (
    <BrainVscodeTree
      paths={paths}
      activePath={project.activePath}
      onSelectPath={handleSelectPath}
      projectTitle={project.title}
      onUploadFiles={handleImportFiles}
      onUploadFolder={handleImportFolder}
      onCreateFile={handleCreateFile}
      onRenameFile={handleRenameFile}
      onDeleteFile={handleDeleteFile}
      ui={ui}
    />
  );

  const renderCodeEditor = () => (
    <BrainVscodeEditor
      openTabs={openTabs}
      activePath={project.activePath}
      value={activeContent}
      onChange={updateActive}
      onSelectTab={handleSelectTab}
      onCloseTab={handleCloseTab}
      isDark={isDark}
      showRun={previewDirty}
      onRun={handleRunPreview}
      runLabel={ui("Run")}
    />
  );

  const lovableTopbar = (
    <BrainIdeLovableTopbar
      ideUser={ideUser}
      creditsRefreshKey={creditsRefreshKey}
      onOpenPlans={onOpenPlans}
      projectTitle={project.title || ui("Projeto")}
      workspaces={workspaces}
      activeWorkspaceId={activeWorkspaceId}
      onSelectWorkspace={selectWorkspace}
      onCreateWorkspace={handleCreateWorkspace}
      onRemoveWorkspace={handleRemoveWorkspace}
      onBackToCreations={onBackToCreations}
      brainProjects={brainProjects}
      activeBrainProjectId={activeBrainProjectId}
      onSelectBrainProject={handleSelectProject}
      projectLoading={projectLoading}
      viewMode={viewMode}
      onViewMode={setViewMode}
      previewPath={previewPath}
      onRefreshPreview={handleRefreshPreview}
      onCopyPreviewPath={handleCopyPreviewPath}
      onOpenPreviewTab={openPreviewInNewTab}
      onGithub={openGithubPublish}
      onSupabase={openSupabaseConnect}
      onShare={handleShareProject}
      onPublish={openGithubPublish}
      publishButtonRef={publishButtonRef}
      supabaseConnected={supabaseConnected}
      chatCollapsed={chatCollapsed}
      onToggleChatPanel={() => setChatCollapsed((v) => !v)}
      isDark={isDark}
      ui={ui}
    />
  );

  const isCodeFocus = viewMode === "code" || viewMode === "terminal";

  const lovableStudioPanel = (
    <div className="brain-ide-build">
      <input
        ref={folderRef}
        type="file"
        multiple
        webkitdirectory=""
        directory=""
        style={{ display: "none" }}
        onChange={handleFolderInputChange}
      />
      <input
        ref={filesRef}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={handleFilesInputChange}
      />
      {lovableTopbar}
      <div
        className={`brain-ide-build__body${
          chatCollapsed ? " brain-ide-build__body--chat-collapsed" : ""
        }${isCodeFocus ? " brain-ide-build__body--code-focus" : ""}`}
      >
      <div className="brain-ide-build__chat-col">
        {chatPanel}
      </div>
      <div className="brain-ide-build__workspace">
        <div className="brain-ide-build__content" style={{ position: "relative" }}>
          {projectLoading ? (
            <div className={classes.loadingOverlay}>
              <Box textAlign="center">
                <CircularProgress size={28} style={{ color: isDark ? "#a78bfa" : "#7c3aed" }} />
                <Typography variant="caption" display="block" style={{ marginTop: 8, opacity: 0.7 }}>
                  Carregando código do projeto…
                </Typography>
              </Box>
            </div>
          ) : null}

          {viewMode === "preview" ? (
            <div className="brain-ide-build__preview-wrap">
              <iframe
                ref={previewIframeRef}
                title="Preview"
                className="brain-ide-build__iframe"
                sandbox="allow-scripts allow-same-origin"
                srcDoc={previewSrcDoc}
              />
              <div className="brain-ide-build__preview-toolbar">
                <button type="button" className="brain-ide-build__preview-tool" title="Inspecionar">
                  <Crosshair size={14} />
                </button>
                <button type="button" className="brain-ide-build__preview-tool" title="Texto">
                  <Type size={14} />
                </button>
                <button
                  type="button"
                  className="brain-ide-build__preview-tool"
                  title="Editar código"
                  onClick={() => setViewMode("code")}
                >
                  <Pencil size={14} />
                </button>
                <button type="button" className="brain-ide-build__preview-tool" title="Comentar">
                  <MessageSquare size={14} />
                </button>
              </div>
            </div>
          ) : viewMode === "code" ? (
            <div className="brain-ide-build__code-shell">
              {renderFileTree()}
              {renderCodeEditor()}
            </div>
          ) : (
            <div className="brain-ide-build__terminal-wrap">
              <BrainCodeTerminal
                userId={userId}
                projectFiles={project.files}
                projectId={activeBrainProjectId}
                codeWorkspaceId={activeWorkspaceId}
                visible
                fullWidth
              />
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );

  const studioPanel = isLovableLayout ? (
    lovableStudioPanel
  ) : (
    <>
        <div className={classes.header}>
          <Box display="flex" alignItems="center" style={{ gap: 8, minWidth: 0 }}>
            {onBackToCreations ? (
              <IconButton size="small" onClick={onBackToCreations} title="Criações">
                <FolderKanban size={16} />
              </IconButton>
            ) : null}
            <Code2 size={18} color={isDark ? "#e4e4e7" : undefined} />
            <AutoSizeProjectTitle
              className={classes.titleInput}
              value={project.title}
              onChange={(e) => setProject((p) => ({ ...p, title: e.target.value }))}
            />
          </Box>
          <div className={classes.headerActions}>
            <BrainGithubToolbar
              githubMcpEnabled={githubMcpEnabled}
              onToggleGithubMcp={toggleGithubMcp}
              linkedRepo={linkedRepo}
            />
            <input
              ref={folderRef}
              type="file"
              multiple
              webkitdirectory=""
              directory=""
              style={{ display: "none" }}
              onChange={(e) => {
                openFolderFromInput(e.target.files);
                e.target.value = "";
              }}
            />
            <Button
              size="small"
              variant="outlined"
              className={classes.headerBtn}
              startIcon={<FolderOpen size={14} />}
              onClick={() => folderRef.current?.click()}
            >
              Abrir pasta
            </Button>
            <BrainGithubPublishButton
              buttonRef={publishButtonRef}
              onClick={openGithubPublish}
            />
            <BrainSupabaseConnectButton
              buttonRef={supabaseButtonRef}
              connected={supabaseConnected}
              onClick={openSupabaseConnect}
            />
            <IconButton size="small" onClick={onClose} aria-label="Fechar">
              <X size={18} color={isDark ? "#e4e4e7" : undefined} />
            </IconButton>
          </div>
        </div>

        <div className={classes.workspaceTabsBar}>
          <div className={classes.workspaceTabsScroll}>
            {workspaces.map((w) => {
              const active = w.id === activeWorkspaceId;
              return (
                <div
                  key={w.id}
                  className={`${classes.workspaceTab} ${active ? classes.workspaceTabActive : ""}`}
                  onClick={() => selectWorkspace(w.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={() => {}}
                >
                  <span className={classes.workspaceTabLabel}>{w.title || `Projeto ${w.id}`}</span>
                  {workspaces.length > 1 ? (
                    <IconButton
                      size="small"
                      className={classes.workspaceTabClose}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveWorkspace(w.id);
                      }}
                      aria-label="Fechar projeto IDE"
                    >
                      <X size={10} />
                    </IconButton>
                  ) : null}
                </div>
              );
            })}
            <button
              type="button"
              className={classes.workspaceTabAdd}
              onClick={handleCreateWorkspace}
              disabled={projectLoading || !activeBrainProjectId}
              title="Novo projeto IDE"
            >
              <Plus size={13} />
            </button>
          </div>
          {brainProjects.length > 0 && onSelectBrainProject ? (
            <div className={classes.brainChipWrap}>
              <FolderKanban size={11} color={isDark ? "#71717a" : "#94a3b8"} />
              <Select
                value={activeBrainProjectId || ""}
                onChange={(e) => handleSelectProject(e.target.value)}
                variant="outlined"
                className={classes.projectSelect}
                displayEmpty
                disabled={projectLoading}
              >
                {brainProjects.map((p) => (
                  <MenuItem key={p.id} value={p.id} dense style={{ fontSize: 12 }}>
                    {p.title}
                  </MenuItem>
                ))}
              </Select>
            </div>
          ) : null}
        </div>

        {loadError ? (
          <Box px={2} py={0.75} display="flex" alignItems="center" justifyContent="space-between" style={{ background: isDark ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.06)", borderBottom: `1px solid ${isDark ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.15)"}` }}>
            <Typography variant="caption" style={{ color: isDark ? "#fca5a5" : "#dc2626", fontSize: 11 }}>
              {loadError}
            </Typography>
            <Button size="small" onClick={() => reloadWorkspaces().catch(() => {})} style={{ fontSize: 10, textTransform: "none" }}>
              Tentar de novo
            </Button>
          </Box>
        ) : null}

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          className={classes.tabsRoot}
          TabIndicatorProps={{ style: { display: "block" } }}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab
            label={tabLabel(
              <img src={logoBrainAi} alt="" style={{ width: 14, height: 14, objectFit: "contain" }} />,
              "BrainAI IDE Build"
            )}
          />
          <Tab label={tabLabel(<Play size={12} />, "Preview")} />
          <Tab label={tabLabel(<Terminal size={12} />, "Terminal")} />
        </Tabs>

        <div className={embedded ? classes.bodyEmbedded : classes.body} style={{ position: "relative" }}>
          {projectLoading ? (
            <div className={classes.loadingOverlay}>
              <Box textAlign="center">
                <CircularProgress size={28} style={{ color: isDark ? "#a78bfa" : "#7c3aed" }} />
                <Typography variant="caption" display="block" style={{ marginTop: 8, opacity: 0.7 }}>
                  Carregando código do projeto…
                </Typography>
              </Box>
            </div>
          ) : null}
          {isIdeTab ? (
            <div className={classes.bodyIde}>
              <div className={classes.files}>
                <Typography variant="caption" className={classes.filesLabel}>
                  Arquivos
                </Typography>
                {paths.map((path) => (
                  <div
                    key={path}
                    className={`${classes.fileItem} ${path === project.activePath ? classes.fileActive : ""}`}
                    onClick={() => setProject((p) => ({ ...p, activePath: path }))}
                    role="button"
                    tabIndex={0}
                    onKeyDown={() => {}}
                  >
                    {path}
                  </div>
                ))}
              </div>

              <div className={classes.editor}>
                <textarea
                  className={classes.textarea}
                  value={activeContent}
                  onChange={(e) => updateActive(e.target.value)}
                  spellCheck={false}
                />
              </div>
            </div>
          ) : null}

          {isPreviewTab ? (
            <div className={classes.bodyFull}>
              <div className={classes.preview}>
                <iframe
                  title="Preview"
                  className={classes.iframe}
                  sandbox="allow-scripts allow-same-origin"
                  srcDoc={previewSrcDoc}
                />
              </div>
            </div>
          ) : null}

          <div
            className={classes.bodyFull}
            style={{ display: isTerminalTab ? "flex" : "none", flexDirection: "column", minHeight: 0 }}
          >
            <div className={classes.terminalWrap}>
              <BrainCodeTerminal
                userId={userId}
                projectFiles={project.files}
                projectId={activeBrainProjectId}
                codeWorkspaceId={activeWorkspaceId}
                visible={isTerminalTab}
                fullWidth
              />
            </div>
          </div>
        </div>
    </>
  );

  return (
    <>
      {embedded ? (
        <div className={classes.embeddedRoot}>{studioPanel}</div>
      ) : (
        <Drawer
          anchor="right"
          open={open}
          onClose={onClose}
          classes={{ paper: classes.drawerPaper }}
          ModalProps={{ hideBackdrop: idePopoverOpen }}
          BackdropProps={
            idePopoverOpen
              ? { invisible: true, style: { backgroundColor: "transparent" } }
              : {
                  style: {
                    backgroundColor: isDark ? "rgba(0,0,0,0.32)" : "rgba(15,23,42,0.28)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)"
                  }
                }
          }
        >
          {studioPanel}
        </Drawer>
      )}

      <BrainGithubPublishDialog
        open={githubDialogOpen}
        anchorEl={githubPublishAnchor}
        onClose={closeGithubPublish}
        projectTitle={project.title}
        projectFiles={project.files}
        onPublished={(url) => {
          saveLinkedRepo(userId, activeBrainProjectId, activeWorkspaceId, url);
          setLinkedRepo(url);
        }}
      />
      <BrainSupabaseConnectDialog
        open={supabaseDialogOpen}
        anchorEl={supabaseAnchor}
        onClose={closeSupabaseConnect}
        projectTitle={project.title}
        fileCount={fileCount}
      />
    </>
  );
}
