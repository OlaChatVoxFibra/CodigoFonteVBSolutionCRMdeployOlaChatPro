/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  Code2,
  ExternalLink,
  FolderKanban,
  FolderOpen,
  Globe,
  Github,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  SquareTerminal,
  X,
} from "lucide-react";
import { SiSupabase } from "react-icons/si";
import BrainOrgMenu from "../BrainOrgMenu";
import logoBrainAi from "../../assets/logo_brain_ai.png";
import { anchorPopoverStyle, useAnchorRect } from "../../hooks/useBrainAnchorPopover";

function TopIconBtn({ children, title, onClick, active = false }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`brain-lovable-topbar__icon-btn${active ? " brain-lovable-topbar__icon-btn--active" : ""}`}
    >
      {children}
    </button>
  );
}

export default function BrainIdeLovableTopbar({
  ideUser,
  creditsRefreshKey = 0,
  onOpenPlans,
  projectTitle,
  workspaces = [],
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onRemoveWorkspace,
  onBackToCreations,
  brainProjects = [],
  activeBrainProjectId,
  onSelectBrainProject,
  projectLoading = false,
  viewMode,
  onViewMode,
  previewPath = "/",
  onRefreshPreview,
  onCopyPreviewPath,
  onOpenPreviewTab,
  onGithub,
  onSupabase,
  onShare,
  onPublish,
  publishButtonRef,
  supabaseConnected = false,
  chatCollapsed = false,
  onToggleChatPanel,
  isDark = false,
  ui = (x) => x,
}) {
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const workspaceRef = useRef(null);
  const workspaceRect = useAnchorRect(workspaceRef.current, workspaceOpen);

  useEffect(() => {
    if (!workspaceOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setWorkspaceOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [workspaceOpen]);

  const workspacePanel =
    workspaceOpen && typeof document !== "undefined"
      ? createPortal(
          <>
            <div
              className="brain-menu__overlay brain-menu__overlay--workspace"
              onClick={() => setWorkspaceOpen(false)}
              aria-hidden
            />
            <div
              className={`brain-lovable-topbar__workspace-panel${
                isDark ? " brain-lovable-topbar__workspace-panel--dark" : ""
              }`}
              role="menu"
              style={anchorPopoverStyle(workspaceRect, { minWidth: 260, offset: 6 })}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="brain-lovable-topbar__workspace-head">{ui("Projetos IDE")}</div>
              <div className="brain-lovable-topbar__workspace-list">
                {workspaces.map((w) => {
                  const active = w.id === activeWorkspaceId;
                  return (
                    <div
                      key={w.id}
                      className={`brain-lovable-topbar__workspace-row${
                        active ? " brain-lovable-topbar__workspace-row--active" : ""
                      }`}
                    >
                      <button
                        type="button"
                        className="brain-lovable-topbar__workspace-item"
                        onClick={() => {
                          onSelectWorkspace?.(w.id);
                          setWorkspaceOpen(false);
                        }}
                      >
                        <span className="brain-lovable-topbar__workspace-item-title">
                          {w.title || ui("Projeto")}
                        </span>
                      </button>
                      {workspaces.length > 1 ? (
                        <button
                          type="button"
                          className="brain-lovable-topbar__workspace-close"
                          title={ui("Fechar projeto IDE")}
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveWorkspace?.(w.id);
                          }}
                        >
                          <X size={12} strokeWidth={1.75} />
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                className="brain-lovable-topbar__workspace-action"
                disabled={projectLoading}
                onClick={() => {
                  onCreateWorkspace?.();
                  setWorkspaceOpen(false);
                }}
              >
                <Plus size={14} strokeWidth={1.75} />
                {ui("Novo projeto IDE")}
              </button>
              {brainProjects.length > 1 && onSelectBrainProject ? (
                <>
                  <div className="brain-lovable-topbar__workspace-divider" />
                  <div className="brain-lovable-topbar__workspace-head">{ui("Projeto Brain")}</div>
                  <div className="brain-lovable-topbar__workspace-list">
                    {brainProjects.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className={`brain-lovable-topbar__workspace-item${
                          Number(p.id) === Number(activeBrainProjectId)
                            ? " brain-lovable-topbar__workspace-item--active"
                            : ""
                        }`}
                        onClick={() => {
                          onSelectBrainProject(p.id);
                          setWorkspaceOpen(false);
                        }}
                      >
                        <FolderKanban size={14} strokeWidth={1.75} />
                        <span>{p.title}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : null}
              {onBackToCreations ? (
                <>
                  <div className="brain-lovable-topbar__workspace-divider" />
                  <button
                    type="button"
                    className="brain-lovable-topbar__workspace-action brain-lovable-topbar__workspace-action--muted"
                    onClick={() => {
                      setWorkspaceOpen(false);
                      onBackToCreations();
                    }}
                  >
                    {ui("Ver criações")}
                  </button>
                </>
              ) : null}
            </div>
          </>,
          document.body
        )
      : null;

  return (
    <header className="brain-lovable-topbar">
      <div className="brain-lovable-topbar__left">
        <img src={logoBrainAi} alt="" className="brain-lovable-topbar__logo" aria-hidden />
        <BrainOrgMenu
          user={ideUser}
          refreshKey={creditsRefreshKey}
          onOpenPlans={onOpenPlans}
          brandTitle="Brain.IA"
          isDark={isDark}
        />

        <button
          ref={workspaceRef}
          type="button"
          onClick={() => setWorkspaceOpen((v) => !v)}
          className="brain-lovable-topbar__project"
          title={ui("Projetos IDE")}
          aria-expanded={workspaceOpen}
        >
          <span className="brain-lovable-topbar__project-name">
            {projectTitle || ui("Projeto")}
          </span>
          <ChevronDown size={13} strokeWidth={1.75} className="brain-lovable-topbar__project-chevron" />
        </button>

        {onToggleChatPanel ? (
          <TopIconBtn
            title={chatCollapsed ? ui("Mostrar chat") : ui("Ocultar chat")}
            onClick={onToggleChatPanel}
          >
            {chatCollapsed ? (
              <PanelLeftOpen size={14} strokeWidth={1.75} />
            ) : (
              <PanelLeftClose size={14} strokeWidth={1.75} />
            )}
          </TopIconBtn>
        ) : null}
      </div>

      <div className="brain-lovable-topbar__center">
        <div className="brain-lovable-topbar__mode-pill">
          {viewMode === "preview" ? (
            <button
              type="button"
              className="brain-lovable-topbar__mode-active"
              onClick={() => onViewMode("preview")}
            >
              <Globe size={13} strokeWidth={1.75} />
              {ui("Pré-visualização")}
            </button>
          ) : (
            <button
              type="button"
              className="brain-lovable-topbar__mode-idle"
              onClick={() => onViewMode("preview")}
            >
              {ui("Pré-visualização")}
            </button>
          )}

          {viewMode === "code" ? (
            <button
              type="button"
              className="brain-lovable-topbar__mode-active brain-lovable-topbar__mode-active--icon"
              onClick={() => onViewMode("code")}
              title={ui("Código")}
            >
              <Code2 size={14} strokeWidth={1.75} />
            </button>
          ) : (
            <TopIconBtn title={ui("Código")} onClick={() => onViewMode("code")}>
              <Code2 size={14} strokeWidth={1.75} />
            </TopIconBtn>
          )}
        </div>

        <TopIconBtn
          title={ui("Arquivos")}
          active={viewMode === "code"}
          onClick={() => onViewMode("code")}
        >
          <FolderOpen size={14} strokeWidth={1.75} />
        </TopIconBtn>

        <TopIconBtn
          title={ui("Terminal")}
          active={viewMode === "terminal"}
          onClick={() => onViewMode("terminal")}
        >
          <SquareTerminal size={14} strokeWidth={1.75} />
        </TopIconBtn>

        <div className="brain-lovable-topbar__url">
          <button
            type="button"
            onClick={onRefreshPreview}
            className="brain-lovable-topbar__url-refresh"
            title={ui("Atualizar preview")}
          >
            <RefreshCw size={12} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            className="brain-lovable-topbar__url-path"
            title={ui("Copiar caminho")}
            onClick={onCopyPreviewPath}
          >
            {previewPath}
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            if (viewMode !== "preview") onViewMode("preview");
            onOpenPreviewTab?.();
          }}
          className="brain-lovable-topbar__ext-link"
          title={ui("Abrir preview em nova aba")}
        >
          <ExternalLink size={14} strokeWidth={1.75} />
        </button>
      </div>

      <div className="brain-lovable-topbar__right">
        <button
          type="button"
          onClick={onGithub}
          className="brain-lovable-topbar__icon-btn brain-lovable-topbar__icon-btn--ghost"
          title={ui("GitHub")}
        >
          <Github size={15} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={onSupabase}
          className="brain-lovable-topbar__icon-btn brain-lovable-topbar__icon-btn--ghost"
          title={supabaseConnected ? ui("Supabase conectado") : ui("Conectar Supabase")}
        >
          <SiSupabase size={15} color={supabaseConnected ? "#86efac" : "#3ECF8E"} />
        </button>
        <button type="button" onClick={onShare} className="brain-lovable-topbar__share">
          {ui("Compartilhar")}
        </button>
        <button
          type="button"
          ref={publishButtonRef}
          onClick={onPublish}
          className="brain-lovable-topbar__publish"
        >
          {ui("Publicar")}
        </button>
      </div>

      {workspacePanel}
    </header>
  );
}
