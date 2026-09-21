/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Plug } from "lucide-react";
import { BRAIN_MCP_OPTIONS, ALL_BRAIN_MCP_IDS } from "../../config/brainMcpCatalog";
import BrainMcpIcon from "../BrainMcpDialog/BrainMcpIcon";
import s from "../../pages/AiBrain/brainSubClassNames";

export default function BrainMcpCatalogPage({
  selectedMcps,
  onSave,
  onBack,
  embedded = false,
  ui = (x) => x,
}) {
  const [draft, setDraft] = useState(selectedMcps || []);

  useEffect(() => {
    setDraft(Array.isArray(selectedMcps) ? [...selectedMcps] : []);
  }, [selectedMcps]);

  const allSelected = useMemo(
    () => ALL_BRAIN_MCP_IDS.every((id) => draft.includes(id)),
    [draft]
  );

  const toggle = (id) => {
    setDraft((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className={embedded ? "brain-pers-hub__mcp-catalog-embedded" : s.root}>
      <div className={embedded ? "" : s.inner}>
        {embedded ? (
          <header className="brain-pers-hub__mcp-header" style={{ marginBottom: 16 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              {onBack ? (
                <button
                  type="button"
                  className="brain-pers-hub__sidebar-back"
                  onClick={onBack}
                  style={{ marginBottom: 8 }}
                >
                  <ArrowLeft size={14} />
                  {ui("Voltar aos conectores")}
                </button>
              ) : null}
              <h2 className={s.title} style={{ marginBottom: 6 }}>
                {ui("MCP prontos")}
              </h2>
              <p className={s.lead} style={{ marginBottom: 0 }}>
                {ui(
                  "Biblioteca de conectores pré-construídos. Ative os que deseja usar no chat e no IDE."
                )}
              </p>
            </div>
            <div className="brain-pers-hub__mcp-header-actions">
              <button
                type="button"
                className={s.btnGhost}
                onClick={() => setDraft(allSelected ? [] : [...ALL_BRAIN_MCP_IDS])}
              >
                {allSelected ? ui("Desmarcar todos") : ui("Selecionar todos")}
              </button>
            </div>
          </header>
        ) : (
          <div className={s.headerRow}>
            <div style={{ minWidth: 0, flex: 1 }}>
              {onBack ? (
                <button type="button" className="brain-pers-hub__sidebar-back" onClick={onBack}>
                  <ArrowLeft size={14} />
                  {ui("Voltar")}
                </button>
              ) : null}
              <h2 className={s.title}>{ui("MCP prontos")}</h2>
              <p className={s.lead}>
                {ui(
                  "Biblioteca de conectores pré-construídos. Ative os que deseja usar no chat e no IDE."
                )}
              </p>
            </div>
            <button
              type="button"
              className={s.btnGhost}
              onClick={() => setDraft(allSelected ? [] : [...ALL_BRAIN_MCP_IDS])}
            >
              {allSelected ? ui("Desmarcar todos") : ui("Selecionar todos")}
            </button>
          </div>
        )}

        <div className={`${s.grid} ${s.grid2}`}>
          {BRAIN_MCP_OPTIONS.map((item) => {
            const selected = draft.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={`${s.card} ${selected ? s.cardActive : ""}`}
                onClick={() => toggle(item.id)}
              >
                <div className={s.cardTop}>
                  <div className={s.cardBrand}>
                    <span className={s.cardIcon}>
                      <BrainMcpIcon id={item.id} size={20} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div className={s.cardTitle}>{item.name}</div>
                      <div className={s.cardProvider}>{item.provider}</div>
                    </div>
                  </div>
                  <span className={`${s.check} ${selected ? s.checkOn : ""}`}>
                    {selected ? <Check size={12} /> : null}
                  </span>
                </div>
                <div className={s.cardDesc}>{item.description}</div>
              </button>
            );
          })}
        </div>

        <div className={s.saveBar}>
          <button type="button" className={s.btnPrimary} onClick={() => onSave?.(draft)}>
            <Plug size={14} />
            {ui("Salvar conectores")}
          </button>
        </div>
      </div>
    </div>
  );
}
