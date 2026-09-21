/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useMemo, useState } from "react";
import { FolderKanban, Plus, Search, X } from "lucide-react";
import { Spinner } from "../ui/spinner";
import s from "../../pages/AiBrain/brainSubClassNames";

export default function BrainProjectsPage({
  projects = [],
  activeProjectId,
  loading = false,
  onSelectProject,
  onCreateProject,
  ui = (x) => x,
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => String(p.title || "").toLowerCase().includes(q));
  }, [projects, search]);

  return (
    <div className={s.root}>
      <div className={s.innerWide}>
        <div className={s.header}>
          <button type="button" className={s.btnDark} onClick={onCreateProject}>
            <Plus size={14} />
            {ui("Novo projeto")}
          </button>
        </div>
        <div className={s.searchWrap}>
          <Search size={16} className={s.searchIcon} />
          <input
            className={s.searchInput}
            placeholder={ui("Pesquisar projetos...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search ? (
            <button type="button" className={s.clearBtn} onClick={() => setSearch("")}>
              <X size={14} />
            </button>
          ) : null}
        </div>
        {loading ? (
          <div className={s.loading}>
            <Spinner size={22} />
          </div>
        ) : null}
        {!loading && filtered.length === 0 ? (
          <div className={s.empty}>
            {search.trim()
              ? ui("Nenhum projeto correspondente à busca.")
              : ui("Nenhum projeto Brain ainda.")}
          </div>
        ) : null}
        {!loading && filtered.length > 0 ? (
          <div className={`${s.grid} ${s.grid2}`}>
            {filtered.map((project) => (
              <button
                key={project.id}
                type="button"
                className={`${s.card} ${activeProjectId === project.id ? s.cardActive : ""}`}
                onClick={() => onSelectProject?.(project.id)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <FolderKanban size={16} />
                  <span className={s.cardTitle}>{project.title}</span>
                </div>
                <div className={s.cardMeta}>
                  {project.updatedAt
                    ? new Date(project.updatedAt).toLocaleDateString("pt-BR")
                    : ui("Projeto Brain")}
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
