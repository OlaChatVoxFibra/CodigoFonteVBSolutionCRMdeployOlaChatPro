/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Paperclip,
  Image,
  Video,
  Mic,
  FileText,
  LayoutGrid,
  Globe,
  BookOpen,
  ChevronRight,
  Check,
  Camera,
  FolderKanban,
  Github,
  GraduationCap,
  Plus,
  Loader2,
  Search,
  ExternalLink,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  anchorPopoverStyle,
  anchorSubmenuStyle,
  useAnchorRect,
} from "../../hooks/useBrainAnchorPopover";
import { GoogleDriveBrandIcon } from "../BrainMcpDialog/BrainMcpBrandIcons";
import { listGithubRepos, getGithubConnection } from "../../services/brainGithubService";
import { listBrainDriveFiles } from "../../services/brainComposerService";
import s from "../../pages/AiBrain/brainSubClassNames";

const ATTACH_TYPES = [
  { id: "image", label: "Imagem", icon: Image, accept: "image/*" },
  { id: "video", label: "Vídeo", icon: Video, accept: "video/*" },
  { id: "audio", label: "Áudio", icon: Mic, accept: "audio/*" },
  {
    id: "document",
    label: "Documento",
    icon: FileText,
    accept:
      ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.md,.json,.xml,.zip,.rar,application/pdf",
  },
];

const FOLDER_MIME = "application/vnd.google-apps.folder";

function SubmenuPanel({ panelRef, rect, children, minWidth = 220, maxHeight = 320, className = "" }) {
  if (!rect) return null;
  return (
    <div
      ref={panelRef}
      className={`brain-menu__panel brain-menu__panel--sub ${className} ${s.menuPanel}`}
      style={anchorSubmenuStyle(rect, { minWidth, maxHeight })}
    >
      <div className="brain-menu__sub-scroll" style={{ maxHeight }}>
        {children}
      </div>
    </div>
  );
}

export default function BrainComposerPlusMenu({
  open,
  anchorRef,
  docked = false,
  compact = false,
  onClose,
  onPickAttach,
  onOpenConnectors,
  selectedWebTool,
  onSelectWebTool,
  onSelectDocsTool,
  onScreenshot,
  projects = [],
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onGithubRepoSelect,
  onLearnUrl,
  onDriveFileSelect,
}) {
  const [submenuAnchor, setSubmenuAnchor] = useState(null);
  const [submenuType, setSubmenuType] = useState(null);
  const [learnUrl, setLearnUrl] = useState("");
  const [learnLoading, setLearnLoading] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState("");
  const [creatingProject, setCreatingProject] = useState(false);
  const [githubRepos, setGithubRepos] = useState([]);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubConnected, setGithubConnected] = useState(null);
  const [driveFiles, setDriveFiles] = useState([]);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveConnected, setDriveConnected] = useState(null);
  const [driveQuery, setDriveQuery] = useState("");
  const mainPanelRef = useRef(null);
  const subPanelRef = useRef(null);
  const menuOpen = open || Boolean(submenuAnchor);
  const [resolvedBtn, setResolvedBtn] = useState(null);

  useLayoutEffect(() => {
    if (!open) {
      setResolvedBtn(null);
      return;
    }
    setResolvedBtn(anchorRef?.current ?? null);
  }, [open, anchorRef]);

  const mainRect = useAnchorRect(resolvedBtn, open);
  const subRect = useAnchorRect(submenuAnchor, Boolean(submenuAnchor));

  const closeAll = useCallback(() => {
    setSubmenuAnchor(null);
    setSubmenuType(null);
    setLearnUrl("");
    setNewProjectTitle("");
    setDriveQuery("");
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      setSubmenuAnchor(null);
      setSubmenuType(null);
      setLearnUrl("");
      setNewProjectTitle("");
      setDriveQuery("");
    }
  }, [open]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const onPointerDown = (event) => {
      const target = event.target;
      if (anchorRef?.current?.contains(target)) return;
      if (mainPanelRef.current?.contains(target)) return;
      if (subPanelRef.current?.contains(target)) return;
      closeAll();
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen, anchorRef, closeAll]);

  const openSubmenu = (e, type) => {
    const el = e.currentTarget;
    setSubmenuAnchor(el);
    setSubmenuType(type);
  };

  const loadGithubRepos = useCallback(async () => {
    setGithubLoading(true);
    try {
      const conn = await getGithubConnection();
      const connected = Boolean(conn?.connected);
      setGithubConnected(connected);
      if (!connected) {
        setGithubRepos([]);
        return;
      }
      const repos = await listGithubRepos();
      setGithubRepos(Array.isArray(repos) ? repos : []);
    } catch {
      setGithubConnected(false);
      setGithubRepos([]);
    } finally {
      setGithubLoading(false);
    }
  }, []);

  const loadDriveFiles = useCallback(async (query = "") => {
    setDriveLoading(true);
    try {
      const data = await listBrainDriveFiles(query);
      setDriveConnected(Boolean(data?.connected));
      setDriveFiles(
        (data?.files || []).filter((f) => f.mimeType !== FOLDER_MIME)
      );
    } catch {
      setDriveConnected(false);
      setDriveFiles([]);
    } finally {
      setDriveLoading(false);
    }
  }, []);

  useEffect(() => {
    if (submenuType === "github") loadGithubRepos();
    if (submenuType === "drive") loadDriveFiles(driveQuery);
  }, [submenuType, loadGithubRepos, loadDriveFiles]);

  useEffect(() => {
    if (submenuType !== "drive") return undefined;
    const t = window.setTimeout(() => loadDriveFiles(driveQuery), 300);
    return () => window.clearTimeout(t);
  }, [driveQuery, submenuType, loadDriveFiles]);

  const handleAttach = (accept) => {
    onPickAttach?.(accept);
    closeAll();
  };

  const handleCreateProject = async () => {
    const title = newProjectTitle.trim();
    if (!title) {
      toast.error("Informe o nome do projeto.");
      return;
    }
    setCreatingProject(true);
    try {
      await onCreateProject?.({ title });
      setNewProjectTitle("");
      closeAll();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Erro ao criar projeto.");
    } finally {
      setCreatingProject(false);
    }
  };

  const handleLearnSubmit = async () => {
    const url = learnUrl.trim();
    if (!url) {
      toast.error("Informe uma URL.");
      return;
    }
    setLearnLoading(true);
    try {
      await onLearnUrl?.(url);
      closeAll();
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "Não foi possível ler a URL.");
    } finally {
      setLearnLoading(false);
    }
  };

  const renderAttachSubmenu = () => (
    <>
      {ATTACH_TYPES.map((type) => {
        const Icon = type.icon;
        return (
          <button
            key={type.id}
            type="button"
            className={s.menuRow}
            style={{ padding: "8px 12px", fontSize: 12.5 }}
            onClick={() => handleAttach(type.accept)}
          >
            <span className={s.menuRowIcon}>
              <Icon size={15} strokeWidth={1.75} />
            </span>
            {type.label}
          </button>
        );
      })}
    </>
  );

  const renderProjectSubmenu = () => (
    <>
      {(projects || []).map((p) => {
        const active = p.id === activeProjectId;
        return (
          <button
            key={p.id}
            type="button"
            className={s.menuRow}
            style={{ padding: "8px 12px", fontSize: 12.5 }}
            onClick={() => {
              onSelectProject?.(p.id);
              closeAll();
            }}
          >
            <span
              className={s.menuRowIcon}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: p.accentColor || "#78716c",
              }}
            />
            <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.title}
            </span>
            {active ? (
              <span className={s.menuRowRight}>
                <Check size={13} />
              </span>
            ) : null}
          </button>
        );
      })}
      <div className={s.menuDivider} />
      <div className="brain-menu__inline-form">
        <input
          type="text"
          className="brain-menu__inline-input"
          placeholder="Novo projeto…"
          value={newProjectTitle}
          onChange={(e) => setNewProjectTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreateProject();
          }}
        />
        <button
          type="button"
          className="brain-menu__inline-btn"
          onClick={handleCreateProject}
          disabled={creatingProject}
          aria-label="Criar projeto"
        >
          {creatingProject ? <Loader2 size={14} className="brain-menu__spin" /> : <Plus size={14} />}
        </button>
      </div>
    </>
  );

  const renderGithubSubmenu = () => {
    if (githubLoading) {
      return (
        <div className="brain-menu__sub-empty">
          <Loader2 size={16} className="brain-menu__spin" />
          Carregando repositórios…
        </div>
      );
    }
    if (!githubConnected) {
      return (
        <div className="brain-menu__sub-empty">
          <p>GitHub não conectado.</p>
          <button
            type="button"
            className="brain-menu__sub-link"
            onClick={() => {
              onOpenConnectors?.();
              closeAll();
            }}
          >
            Conectar em Conectores
            <ExternalLink size={12} />
          </button>
        </div>
      );
    }
    if (!githubRepos.length) {
      return <div className="brain-menu__sub-empty">Nenhum repositório encontrado.</div>;
    }
    return githubRepos.map((repo) => (
      <button
        key={repo.fullName || repo.id}
        type="button"
        className={s.menuRow}
        style={{ padding: "8px 12px", fontSize: 12.5 }}
        onClick={() => {
          onGithubRepoSelect?.(repo);
          closeAll();
        }}
      >
        <span className={s.menuRowIcon}>
          <Github size={14} strokeWidth={1.75} />
        </span>
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {repo.fullName || repo.name}
        </span>
        {repo.private ? (
          <span className="brain-menu__badge">privado</span>
        ) : null}
      </button>
    ));
  };

  const renderDriveSubmenu = () => {
    if (driveConnected === false) {
      return (
        <div className="brain-menu__sub-empty">
          <p>Google Drive não conectado.</p>
          <button
            type="button"
            className="brain-menu__sub-link"
            onClick={() => {
              window.location.href = "/connections?channel=google-drive";
            }}
          >
            Conectar em Integrações
            <ExternalLink size={12} />
          </button>
        </div>
      );
    }
    return (
      <>
        <div className="brain-menu__search-wrap">
          <Search size={13} className="brain-menu__search-icon" />
          <input
            type="text"
            className="brain-menu__search-input"
            placeholder="Buscar arquivos…"
            value={driveQuery}
            onChange={(e) => setDriveQuery(e.target.value)}
          />
        </div>
        {driveLoading ? (
          <div className="brain-menu__sub-empty">
            <Loader2 size={16} className="brain-menu__spin" />
            Carregando arquivos…
          </div>
        ) : !driveFiles.length ? (
          <div className="brain-menu__sub-empty">Nenhum arquivo encontrado.</div>
        ) : (
          driveFiles.map((file) => (
            <button
              key={file.id}
              type="button"
              className={`${s.menuRow} brain-menu__drive-row`}
              style={{ padding: "8px 12px", fontSize: 12.5, alignItems: "flex-start" }}
              disabled={driveLoading}
              onClick={async () => {
                try {
                  await onDriveFileSelect?.(file);
                  closeAll();
                } catch (e) {
                  toast.error(e?.response?.data?.error || "Erro ao anexar arquivo.");
                }
              }}
            >
              <span className={s.menuRowIcon}>
                <GoogleDriveBrandIcon size={14} />
              </span>
              <span className="brain-menu__drive-name">
                {file.name}
              </span>
            </button>
          ))
        )}
      </>
    );
  };

  const renderLearnSubmenu = () => (
    <div className="brain-menu__learn">
      <p className="brain-menu__learn-hint">
        Cole uma URL para o Brain ler e usar como aprendizado em contexto.
      </p>
      <input
        type="url"
        className="brain-menu__inline-input brain-menu__inline-input--full"
        placeholder="https://exemplo.com/artigo"
        value={learnUrl}
        onChange={(e) => setLearnUrl(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleLearnSubmit();
        }}
        autoFocus
      />
      <button
        type="button"
        className="brain-menu__learn-btn"
        onClick={handleLearnSubmit}
        disabled={learnLoading || !learnUrl.trim()}
      >
        {learnLoading ? <Loader2 size={14} className="brain-menu__spin" /> : <GraduationCap size={14} />}
        Aprender desta URL
      </button>
    </div>
  );

  const renderSubmenuContent = () => {
    if (submenuType === "attach") return renderAttachSubmenu();
    if (submenuType === "project") return renderProjectSubmenu();
    if (submenuType === "github") return renderGithubSubmenu();
    if (submenuType === "drive") return renderDriveSubmenu();
    if (submenuType === "learn") return renderLearnSubmenu();
    return null;
  };

  if (!menuOpen) return null;

  const mainPanelStyle = (() => {
    if (!open || !mainRect) return { visibility: "hidden" };
    const offset = 6;
    const viewportPad = 12;
    const menuWidth = compact ? 200 : 224;
    if (docked) {
      const availableAbove = Math.max(120, mainRect.top - viewportPad - offset);
      const anchored = anchorPopoverStyle(mainRect, { minWidth: menuWidth, placement: "above", offset });
      let left = mainRect.left;
      if (left + menuWidth > window.innerWidth - viewportPad) {
        left = window.innerWidth - menuWidth - viewportPad;
      }
      left = Math.max(viewportPad, left);
      return {
        ...anchored,
        left,
        width: menuWidth,
        maxHeight: Math.min(compact ? 280 : 340, availableAbove),
        overflowY: "auto",
      };
    }
    const anchored = anchorPopoverStyle(mainRect, { minWidth: menuWidth, placement: "below", offset });
    const top = mainRect.bottom + offset;
    const availableBelow = Math.max(100, window.innerHeight - top - viewportPad);
    return {
      ...anchored,
      width: menuWidth,
      maxHeight: Math.min(compact ? 280 : 340, availableBelow),
    };
  })();

  const showMainPanel = open && mainRect;

  const mainPanel = showMainPanel ? (
    <div
      ref={mainPanelRef}
      className={`brain-menu__panel brain-menu__panel--composer ${s.menuPanel}`}
      style={mainPanelStyle}
    >
      <button
        type="button"
        className={s.menuRow}
        onMouseEnter={(e) => openSubmenu(e, "attach")}
        onClick={(e) => openSubmenu(e, "attach")}
      >
        <span className={s.menuRowIcon}>
          <Paperclip size={16} strokeWidth={1.75} />
        </span>
        Adicionar arquivos ou fotos
        <span className={s.menuRowRight}>
          <ChevronRight size={14} />
        </span>
      </button>
      <button
        type="button"
        className={s.menuRow}
        onClick={() => {
          onScreenshot?.();
          closeAll();
        }}
      >
        <span className={s.menuRowIcon}>
          <Camera size={16} strokeWidth={1.75} />
        </span>
        Fazer uma Captura de Tela
      </button>
      <button
        type="button"
        className={s.menuRow}
        onMouseEnter={(e) => openSubmenu(e, "project")}
        onClick={(e) => openSubmenu(e, "project")}
      >
        <span className={s.menuRowIcon}>
          <FolderKanban size={16} strokeWidth={1.75} />
        </span>
        Adicionar ao Projeto
        <span className={s.menuRowRight}>
          <ChevronRight size={14} />
        </span>
      </button>
      <button
        type="button"
        className={s.menuRow}
        onMouseEnter={(e) => openSubmenu(e, "github")}
        onClick={(e) => openSubmenu(e, "github")}
      >
        <span className={s.menuRowIcon}>
          <Github size={16} strokeWidth={1.75} />
        </span>
        Adicionar ao Github
        <span className={s.menuRowRight}>
          <ChevronRight size={14} />
        </span>
      </button>
      <div className={s.menuDivider} />
      <button
        type="button"
        className={s.menuRow}
        onMouseEnter={(e) => openSubmenu(e, "learn")}
        onClick={(e) => openSubmenu(e, "learn")}
      >
        <span className={s.menuRowIcon}>
          <GraduationCap size={16} strokeWidth={1.75} />
        </span>
        Aprender
        <span className={s.menuRowRight}>
          <ChevronRight size={14} />
        </span>
      </button>
      <button
        type="button"
        className={s.menuRow}
        onMouseEnter={(e) => openSubmenu(e, "drive")}
        onClick={(e) => openSubmenu(e, "drive")}
      >
        <span className={s.menuRowIcon}>
          <GoogleDriveBrandIcon size={16} />
        </span>
        Anexe Via Google Drive
        <span className={s.menuRowRight}>
          <ChevronRight size={14} />
        </span>
      </button>
      <div className={s.menuDivider} />
      <button
        type="button"
        className={s.menuRow}
        onClick={() => {
          onOpenConnectors?.();
          closeAll();
        }}
      >
        <span className={s.menuRowIcon}>
          <LayoutGrid size={16} strokeWidth={1.75} />
        </span>
        Conectores
        <span className={s.menuRowRight}>
          <ChevronRight size={14} />
        </span>
      </button>
      <div className={s.menuDivider} />
      <button
        type="button"
        className={s.menuRow}
        onClick={() => {
          onSelectWebTool?.();
          closeAll();
        }}
      >
        <span className={s.menuRowIcon}>
          <Globe size={16} strokeWidth={1.75} />
        </span>
        Buscar na web
        {selectedWebTool === "searchWeb" ? (
          <span className={s.menuRowRight}>
            <Check size={14} />
          </span>
        ) : null}
      </button>
      <button
        type="button"
        className={s.menuRow}
        onClick={() => {
          onSelectDocsTool?.();
          closeAll();
        }}
      >
        <span className={s.menuRowIcon}>
          <BookOpen size={16} strokeWidth={1.75} />
        </span>
        Buscar em documentos
        {selectedWebTool === "searchDocs" ? (
          <span className={s.menuRowRight}>
            <Check size={14} />
          </span>
        ) : null}
      </button>
    </div>
  ) : null;

  return (
    <>
      {mainPanel && createPortal(mainPanel, document.body)}
      {submenuAnchor && subRect && submenuType
        ? createPortal(
            <SubmenuPanel
              panelRef={subPanelRef}
              rect={subRect}
              minWidth={
                submenuType === "drive" ? 320 : submenuType === "learn" ? 280 : 220
              }
              maxHeight={submenuType === "learn" ? 200 : 360}
              className={submenuType === "drive" ? "brain-menu__panel--drive" : ""}
            >
              {renderSubmenuContent()}
            </SubmenuPanel>,
            document.body
          )
        : null}
    </>
  );
}
