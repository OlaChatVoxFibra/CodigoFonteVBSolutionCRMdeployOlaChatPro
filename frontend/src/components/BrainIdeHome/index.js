/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Plus, Sparkles } from "lucide-react";
import { Spinner } from "../ui/spinner";
import {
  createCodeWorkspace,
  ensureBrainProject,
  listBrainProjects,
  listCodeWorkspaces,
} from "../../services/brainProjectService";
import { toast } from "react-toastify";

const TABS = [
  { id: "mine", label: "Minhas criações" },
  { id: "recent", label: "Vistas recentemente" },
  { id: "templates", label: "Templates Brain" },
];

function buildPreviewHtml(files) {
  if (!files || typeof files !== "object") return null;
  const index = files["index.html"];
  if (!index) return null;
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

function titleInitials(title) {
  const parts = String(title || "P").trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0]?.[0] || "P").toUpperCase();
}

function formatEditedAgo(iso, ui) {
  if (!iso) return ui("Editado recentemente");
  const d = new Date(iso);
  const now = new Date();
  const diffMs = Math.max(0, now - d);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) {
    return mins <= 1 ? ui("Editado agora") : ui(`Editado há ${mins} min`);
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return hours === 1 ? ui("Editado há 1 hora") : ui(`Editado há ${hours} horas`);
  }
  const days = Math.floor(hours / 24);
  if (days < 14) {
    return days === 1 ? ui("Editado há 1 dia") : ui(`Editado há ${days} dias`);
  }
  return ui(
    `Editado em ${d.toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`
  );
}

export default function BrainIdeHome({
  activeProjectId,
  onSelectBrainProject,
  onOpenStudio,
  ui = (x) => x,
}) {
  const [loading, setLoading] = useState(true);
  const [creations, setCreations] = useState([]);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState("mine");
  const [showAll, setShowAll] = useState(false);
  const [layoutTick, setLayoutTick] = useState(0);
  const tabRefs = useRef([]);

  const loadCreations = useCallback(async () => {
    setLoading(true);
    try {
      let projects = await listBrainProjects();
      if (!projects?.length) {
        const ensured = await ensureBrainProject();
        projects = ensured ? [ensured] : [];
      }
      const rows = [];
      for (const project of projects) {
        const workspaces = await listCodeWorkspaces(project.id);
        for (const ws of workspaces) {
          rows.push({
            id: ws.id,
            projectId: project.id,
            projectTitle: project.title,
            title: ws.title || ui("Sem título"),
            updatedAt: ws.updatedAt || project.updatedAt,
            files: ws.files || {},
            previewHtml: buildPreviewHtml(ws.files),
          });
        }
      }
      rows.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      setCreations(rows);
    } catch (e) {
      toast.error(e?.response?.data?.error || ui("Falha ao carregar criações."));
      setCreations([]);
    } finally {
      setLoading(false);
    }
  }, [ui]);

  useEffect(() => {
    void loadCreations();
  }, [loadCreations, activeProjectId]);

  useEffect(() => {
    const onResize = () => setLayoutTick((t) => t + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const visibleCreations = useMemo(() => {
    if (activeTab === "templates") return [];
    const list = activeTab === "recent" ? creations.slice(0, 8) : creations;
    if (showAll) return list;
    return list.slice(0, 8);
  }, [activeTab, creations, showAll]);

  const activeTabIndex = Math.max(0, TABS.findIndex((t) => t.id === activeTab));

  const indicatorStyle = useMemo(() => {
    const el = tabRefs.current[activeTabIndex];
    if (!el) return { opacity: 0 };
    return {
      width: el.offsetWidth,
      transform: `translateX(${el.offsetLeft}px)`,
    };
  }, [activeTabIndex, activeTab, layoutTick]);

  const handleNewCreation = async () => {
    setCreating(true);
    try {
      let projectId = activeProjectId;
      if (!projectId) {
        const ensured = await ensureBrainProject();
        projectId = ensured?.id;
        if (projectId && onSelectBrainProject) await onSelectBrainProject(projectId);
      }
      if (!projectId) throw new Error(ui("Projeto Brain não encontrado."));
      const n = creations.filter((c) => c.projectId === projectId).length + 1;
      const ws = await createCodeWorkspace(projectId, { title: `Criação ${n}` });
      onOpenStudio?.({ projectId, workspaceId: ws.id });
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || ui("Erro ao criar."));
    } finally {
      setCreating(false);
    }
  };

  const handleOpen = async (item) => {
    if (item.projectId !== activeProjectId && onSelectBrainProject) {
      await onSelectBrainProject(item.projectId);
    }
    onOpenStudio?.({ projectId: item.projectId, workspaceId: item.id });
  };

  return (
    <div className="brain-ide-home">
      <div className="brain-ide-home__toolbar">
        <div className="brain-ide-home__segmented">
          <div className="brain-ide-home__segment-indicator" style={indicatorStyle} />
          {TABS.map((tab, index) => (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              type="button"
              className={`brain-ide-home__segment${
                activeTab === tab.id ? " brain-ide-home__segment--active" : ""
              }`}
              onClick={() => {
                setActiveTab(tab.id);
                setShowAll(false);
              }}
            >
              {ui(tab.label)}
            </button>
          ))}
        </div>
        <div className="brain-ide-home__toolbar-actions">
          {creations.length > 8 && activeTab !== "templates" ? (
            <button
              type="button"
              className="brain-ide-home__browse"
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? ui("Ver menos") : ui("Ver todas")}
              <ArrowRight size={12} />
            </button>
          ) : null}
          <button
            type="button"
            className="brain-ide-home__new-btn"
            onClick={handleNewCreation}
            disabled={creating}
          >
            {creating ? <Spinner size={12} /> : <Plus size={13} strokeWidth={2.2} />}
            {ui("Novo")}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="brain-ide-home__loading">
          <Spinner size={20} />
        </div>
      ) : activeTab === "templates" ? (
        <div className="brain-ide-home__empty brain-ide-home__empty--templates">
          <Sparkles size={22} strokeWidth={1.5} />
          <p>{ui("Templates em breve.")}</p>
        </div>
      ) : visibleCreations.length === 0 ? (
        <div className="brain-ide-home__empty">
          <p>{ui("Nenhuma criação ainda.")}</p>
          <button
            type="button"
            className="brain-ide-home__empty-btn"
            onClick={handleNewCreation}
            disabled={creating}
          >
            {creating ? <Spinner size={12} /> : <Plus size={12} />}
            {ui("Nova criação")}
          </button>
        </div>
      ) : (
        <div className="brain-ide-home__grid">
          {visibleCreations.map((item) => (
            <button
              key={`${item.projectId}-${item.id}`}
              type="button"
              className="brain-ide-home__card"
              onClick={() => void handleOpen(item)}
            >
              <div className="brain-ide-home__card-thumb">
                {item.previewHtml ? (
                  <iframe
                    title=""
                    className="brain-ide-home__card-iframe"
                    sandbox="allow-scripts allow-same-origin"
                    srcDoc={item.previewHtml}
                    tabIndex={-1}
                  />
                ) : (
                  <div className="brain-ide-home__card-thumb-empty" aria-hidden />
                )}
              </div>
              <div className="brain-ide-home__card-meta">
                <span className="brain-ide-home__card-avatar">{titleInitials(item.title)}</span>
                <div className="brain-ide-home__card-text">
                  <span className="brain-ide-home__card-title">{item.title}</span>
                  <span className="brain-ide-home__card-edited">
                    {formatEditedAgo(item.updatedAt, ui)}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
