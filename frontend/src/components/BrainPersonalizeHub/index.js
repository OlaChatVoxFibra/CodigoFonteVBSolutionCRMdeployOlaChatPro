/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Eye,
  FileText,
  Grid2x2,
  MoreVertical,
  Plug,
  Plus,
  Search,
  Sliders,
  Trash2,
  Wrench,
} from "lucide-react";
import BrainPersonalizePage from "../BrainPersonalizePage";
import BrainMcpCatalogPage from "../BrainMcpCatalogPage";
import useBrainSkills from "../../hooks/useBrainSkills";
import useBrainCustomMcps from "../../hooks/useBrainCustomMcps";
import s from "../../pages/AiBrain/brainSubClassNames";

const SECTIONS = {
  hub: "hub",
  skills: "skills",
  mcp: "mcp",
  mcpCatalog: "mcp-catalog",
  behavior: "behavior",
};

function HubLanding({ onNavigate, ui }) {
  const cards = [
    {
      id: SECTIONS.mcp,
      icon: Grid2x2,
      title: ui("Conecte seus apps"),
      desc: ui("Permita que o Brain leia e escreva nas ferramentas que você já usa."),
    },
    {
      id: SECTIONS.skills,
      icon: FileText,
      title: ui("Criar novas habilidades"),
      desc: ui("Ensine ao Brain seus processos, normas da equipe e conhecimentos."),
    },
    {
      id: SECTIONS.mcpCatalog,
      icon: Plug,
      title: ui("Navegar por MCP prontos"),
      desc: ui("Adicione conectores pré-construídos para sua área."),
    },
  ];

  return (
    <div className="brain-pers-hub__landing">
      <div className="brain-pers-hub__landing-icon">
        <Wrench size={28} strokeWidth={1.5} />
      </div>
      <h2 className="brain-pers-hub__landing-title">{ui("Personalizar o Brain.AI")}</h2>
      <p className="brain-pers-hub__landing-sub">
        {ui("Habilidades, conectores e plugins moldam como o Brain trabalha com você.")}
      </p>
      <div className="brain-pers-hub__cards">
        {cards.map((card) => (
          <button
            key={card.id}
            type="button"
            className="brain-pers-hub__card"
            onClick={() => onNavigate(card.id)}
          >
            <span className="brain-pers-hub__card-icon">
              <card.icon size={18} />
            </span>
            <span className="brain-pers-hub__card-body">
              <strong>{card.title}</strong>
              <span>{card.desc}</span>
            </span>
            <ChevronRight size={16} className="brain-pers-hub__card-arrow" />
          </button>
        ))}
      </div>
    </div>
  );
}

function SkillsManager({ userId, ui }) {
  const { skills, addSkill, updateSkill, removeSkill, toggleSkill } = useBrainSkills(userId);
  const [selectedId, setSelectedId] = useState(skills[0]?.id || null);
  const [search, setSearch] = useState("");
  const [previewMode, setPreviewMode] = useState(true);

  useEffect(() => {
    if (!selectedId && skills[0]) setSelectedId(skills[0].id);
    if (selectedId && !skills.find((s) => s.id === selectedId)) {
      setSelectedId(skills[0]?.id || null);
    }
  }, [skills, selectedId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return skills;
    return skills.filter(
      (sk) =>
        sk.name.toLowerCase().includes(q) || sk.description.toLowerCase().includes(q)
    );
  }, [skills, search]);

  const selected = skills.find((sk) => sk.id === selectedId);

  const handleAdd = () => {
    const created = addSkill();
    setSelectedId(created.id);
  };

  return (
    <div className="brain-pers-hub__split">
      <aside className="brain-pers-hub__skills-list">
        <div className="brain-pers-hub__skills-list-head">
          <span>{ui("Habilidades pessoais")}</span>
          <div className="brain-pers-hub__skills-list-actions">
            <button type="button" aria-label={ui("Buscar")}>
              <Search size={14} />
            </button>
            <button type="button" aria-label={ui("Nova habilidade")} onClick={handleAdd}>
              <Plus size={14} />
            </button>
          </div>
        </div>
        <div className="brain-pers-hub__skills-search">
          <input
            type="search"
            placeholder={ui("Buscar habilidades...")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="brain-pers-hub__skills-items">
          {filtered.map((sk) => (
            <button
              key={sk.id}
              type="button"
              className={`brain-pers-hub__skill-item${selectedId === sk.id ? " brain-pers-hub__skill-item--active" : ""}`}
              onClick={() => setSelectedId(sk.id)}
            >
              <FileText size={14} />
              <span>{sk.name}</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="brain-pers-hub__skill-detail">
        {selected ? (
          <>
            <div className="brain-pers-hub__skill-detail-head">
              <h3>{selected.name}</h3>
              <div className="brain-pers-hub__skill-detail-actions">
                <label className="brain-pers-hub__toggle">
                  <input
                    type="checkbox"
                    checked={selected.enabled}
                    onChange={() => toggleSkill(selected.id)}
                  />
                  <span className="brain-pers-hub__toggle-track" />
                </label>
                <button type="button" className="brain-pers-hub__icon-btn" aria-label="Mais">
                  <MoreVertical size={16} />
                </button>
              </div>
            </div>
            <div className="brain-pers-hub__skill-meta">
              <div>
                <span className="brain-pers-hub__meta-label">{ui("Adicionado por")}</span>
                <span>{selected.addedBy}</span>
              </div>
              <div>
                <span className="brain-pers-hub__meta-label">{ui("Gatilho")}</span>
                <span>{selected.trigger}</span>
              </div>
            </div>
            <div className={s.section}>
              <div className={s.sectionTitle}>{ui("Descrição")}</div>
              <textarea
                className={s.textarea}
                rows={2}
                value={selected.description}
                onChange={(e) => updateSkill(selected.id, { description: e.target.value })}
                placeholder={ui("Descreva quando esta habilidade deve ser usada...")}
              />
            </div>
            <div className="brain-pers-hub__doc-box">
              <div className="brain-pers-hub__doc-box-head">
                <span>{ui("SKILL.md")}</span>
                <div className="brain-pers-hub__doc-box-tools">
                  <button
                    type="button"
                    className={previewMode ? "brain-pers-hub__doc-tool--active" : ""}
                    onClick={() => setPreviewMode(true)}
                    aria-label={ui("Visualizar")}
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    type="button"
                    className={!previewMode ? "brain-pers-hub__doc-tool--active" : ""}
                    onClick={() => setPreviewMode(false)}
                    aria-label={ui("Editar")}
                  >
                    <BookOpen size={14} />
                  </button>
                </div>
              </div>
              {previewMode ? (
                <pre className="brain-pers-hub__doc-preview">{selected.content}</pre>
              ) : (
                <textarea
                  className="brain-pers-hub__doc-editor"
                  value={selected.content}
                  onChange={(e) => updateSkill(selected.id, { content: e.target.value })}
                />
              )}
            </div>
            <div className="brain-pers-hub__skill-footer">
              <input
                className={s.textarea}
                style={{ marginBottom: 8 }}
                value={selected.name}
                onChange={(e) => updateSkill(selected.id, { name: e.target.value })}
                placeholder={ui("Nome da habilidade")}
              />
              <button
                type="button"
                className={`${s.btnGhost} brain-pers-hub__danger-btn`}
                onClick={() => {
                  if (window.confirm(ui("Excluir esta habilidade?"))) {
                    removeSkill(selected.id);
                  }
                }}
              >
                <Trash2 size={14} />
                {ui("Excluir habilidade")}
              </button>
            </div>
          </>
        ) : (
          <div className={s.empty}>{ui("Crie sua primeira habilidade.")}</div>
        )}
      </div>
    </div>
  );
}

function McpManager({ userId, onOpenCatalog, ui }) {
  const { customMcps, addCustomMcp, removeCustomMcp, toggleCustomMcp } =
    useBrainCustomMcps(userId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", url: "", description: "" });

  const canSave = form.name.trim() && form.url.trim();

  const handleAddManual = () => {
    if (!canSave) return;
    addCustomMcp(form);
    setForm({ name: "", url: "", description: "" });
    setShowForm(false);
  };

  const closeForm = () => {
    setShowForm(false);
    setForm({ name: "", url: "", description: "" });
  };

  return (
    <div className="brain-pers-hub__mcp-page">
      <header className="brain-pers-hub__mcp-header">
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2 className={s.title} style={{ marginBottom: 6 }}>
            {ui("Conectores MCP")}
          </h2>
          <p className={s.lead} style={{ marginBottom: 0 }}>
            {ui(
              "Conecte servidores MCP personalizados ou escolha integrações prontas da biblioteca VBSolution."
            )}
          </p>
        </div>
        <div className="brain-pers-hub__mcp-header-actions">
          <button type="button" className={s.btnGhost} onClick={onOpenCatalog}>
            <Plug size={14} />
            {ui("MCP prontos")}
          </button>
          <button
            type="button"
            className={s.btnPrimary}
            onClick={() => setShowForm((v) => !v)}
          >
            <Plus size={14} />
            {showForm ? ui("Fechar formulário") : ui("Adicionar MCP manual")}
          </button>
        </div>
      </header>

      {showForm ? (
        <section className="brain-pers-hub__mcp-form" aria-label={ui("Novo conector MCP")}>
          <h3 className="brain-pers-hub__mcp-form-title">{ui("Novo conector MCP")}</h3>
          <div className={s.field}>
            <label className={s.fieldLabel} htmlFor="brain-mcp-name">
              {ui("Nome")}
            </label>
            <input
              id="brain-mcp-name"
              className={s.input}
              placeholder={ui("Ex.: CRM da empresa, Notion interno...")}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className={s.field}>
            <label className={s.fieldLabel} htmlFor="brain-mcp-url">
              {ui("URL do servidor")}
            </label>
            <input
              id="brain-mcp-url"
              className={s.input}
              type="url"
              placeholder="https://seu-servidor-mcp.exemplo.com"
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            />
            <p className="brain-pers-hub__mcp-url-hint">
              {ui(
                "Somente servidores MCP remotos (HTTP/SSE). Para o CRM VBSolution no Claude Web, use a URL MCP em Mais → API & MCP (termina em /mcp) e cole sua API Key na autorização OAuth."
              )}
            </p>
          </div>
          <div className={s.field} style={{ marginBottom: 4 }}>
            <label className={s.fieldLabel} htmlFor="brain-mcp-desc">
              {ui("Descrição")}
              <span style={{ fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                {" "}
                ({ui("opcional")})
              </span>
            </label>
            <textarea
              id="brain-mcp-desc"
              className={s.textarea}
              rows={2}
              style={{ minHeight: 72 }}
              placeholder={ui("Para que o Brain deve usar este conector?")}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className={s.actions}>
            <button type="button" className={s.btnGhost} onClick={closeForm}>
              {ui("Cancelar")}
            </button>
            <button
              type="button"
              className={s.btnPrimary}
              onClick={handleAddManual}
              disabled={!canSave}
            >
              {ui("Salvar conector")}
            </button>
          </div>
        </section>
      ) : null}

      <section className="brain-pers-hub__mcp-section">
        <h3 className="brain-pers-hub__mcp-section-title">
          {ui("Seus conectores")} ({customMcps.length})
        </h3>

        {customMcps.length > 0 ? (
          <div className="brain-pers-hub__mcp-list">
            {customMcps.map((mcp) => (
              <article
                key={mcp.id}
                className={`brain-pers-hub__mcp-item${mcp.enabled ? "" : " brain-pers-hub__mcp-item--off"}`}
              >
                <div className="brain-pers-hub__mcp-item-icon">
                  <Plug size={18} />
                </div>
                <div className="brain-pers-hub__mcp-item-body">
                  <p className="brain-pers-hub__mcp-item-name">{mcp.name}</p>
                  <p className="brain-pers-hub__mcp-item-url">{mcp.url}</p>
                  {mcp.description ? (
                    <p className="brain-pers-hub__mcp-item-desc">{mcp.description}</p>
                  ) : null}
                </div>
                <div className="brain-pers-hub__mcp-item-actions">
                  <label className="brain-pers-hub__toggle" title={ui("Ativar/desativar")}>
                    <input
                      type="checkbox"
                      checked={mcp.enabled}
                      onChange={() => toggleCustomMcp(mcp.id)}
                    />
                    <span className="brain-pers-hub__toggle-track" />
                  </label>
                  <button
                    type="button"
                    className="brain-pers-hub__icon-btn"
                    aria-label={ui("Remover")}
                    onClick={() => removeCustomMcp(mcp.id)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="brain-pers-hub__mcp-empty">
            <div className="brain-pers-hub__mcp-empty-icon">
              <Plug size={22} />
            </div>
            <p>
              {ui(
                "Nenhum conector manual ainda. Adicione a URL do seu servidor MCP ou escolha um conector pronto da biblioteca."
              )}
            </p>
            <div className="brain-pers-hub__mcp-empty-actions">
              <button type="button" className={s.btnPrimary} onClick={() => setShowForm(true)}>
                <Plus size={14} />
                {ui("Adicionar MCP manual")}
              </button>
              <button type="button" className={s.btnGhost} onClick={onOpenCatalog}>
                {ui("Ver MCP prontos")}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export default function BrainPersonalizeHub({
  userId,
  initialSection = SECTIONS.hub,
  personalization,
  onPersist,
  onSavePersonalization,
  onResetPersonalization,
  selectedMcps,
  onSaveMcps,
  ui = (x) => x,
}) {
  const [section, setSection] = useState(initialSection);

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  const navItems = [
    { id: SECTIONS.skills, icon: FileText, label: ui("Habilidades") },
    { id: SECTIONS.mcp, icon: Plug, label: ui("Conectores") },
    { id: SECTIONS.behavior, icon: Sliders, label: ui("Comportamento") },
  ];

  const showHub = section === SECTIONS.hub;

  return (
    <div className="brain-pers-hub">
      <aside className="brain-pers-hub__sidebar">
        <button
          type="button"
          className="brain-pers-hub__sidebar-back"
          onClick={() => setSection(SECTIONS.hub)}
        >
          <ArrowLeft size={14} />
          {ui("Personalizar")}
        </button>
        <nav className="brain-pers-hub__nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`brain-pers-hub__nav-item${section === item.id ? " brain-pers-hub__nav-item--active" : ""}`}
              onClick={() => setSection(item.id)}
            >
              <item.icon size={15} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="brain-pers-hub__sidebar-footer">
          <div className="brain-pers-hub__sidebar-footer-head">
            <span>{ui("MCP pessoais")}</span>
            <button type="button" onClick={() => setSection(SECTIONS.mcp)} aria-label="+">
              <Plus size={14} />
            </button>
          </div>
          <p>{ui("Dê ao Brain expertise com conectores MCP personalizados.")}</p>
          <button type="button" className="brain-pers-hub__browse-btn" onClick={() => setSection(SECTIONS.mcpCatalog)}>
            {ui("Navegar por MCP prontos")}
          </button>
        </div>
      </aside>

      <main className="brain-pers-hub__main">
        {showHub ? (
          <HubLanding onNavigate={setSection} ui={ui} />
        ) : section === SECTIONS.skills ? (
          <SkillsManager userId={userId} ui={ui} />
        ) : section === SECTIONS.mcp ? (
          <McpManager
            userId={userId}
            onOpenCatalog={() => setSection(SECTIONS.mcpCatalog)}
            ui={ui}
          />
        ) : section === SECTIONS.mcpCatalog ? (
          <div className="brain-pers-hub__mcp-page brain-pers-hub__mcp-catalog-embedded">
            <BrainMcpCatalogPage
              selectedMcps={selectedMcps}
              onSave={onSaveMcps}
              onBack={() => setSection(SECTIONS.mcp)}
              embedded
              ui={ui}
            />
          </div>
        ) : section === SECTIONS.behavior ? (
          <BrainPersonalizePage
            personalization={personalization}
            onPersist={onPersist}
            onSave={onSavePersonalization}
            onReset={onResetPersonalization}
            ui={ui}
          />
        ) : null}
      </main>
    </div>
  );
}

export { SECTIONS as BRAIN_PERSONALIZE_SECTIONS };
