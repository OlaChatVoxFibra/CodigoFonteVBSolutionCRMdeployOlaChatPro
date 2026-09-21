/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Check, Plug } from "lucide-react";
import { BRAIN_MCP_OPTIONS, ALL_BRAIN_MCP_IDS } from "../../config/brainMcpCatalog";
import BrainMcpIcon from "../BrainMcpDialog/BrainMcpIcon";
import s from "../../pages/AiBrain/brainSubClassNames";

export default function BrainConnectorsPage({ selectedMcps, onSave }) {
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
    <div className={s.root}>
      <div className={s.inner}>
        <div className={s.headerRow}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 className={s.title}>Conectores e Plugins</h2>
            <p className={s.lead}>
              Conecte ferramentas e CRMs ao Brain.AI. Os conectores ativos aparecem na barra de
              digitação com os ícones oficiais de cada integração.
            </p>
          </div>
          <button
            type="button"
            className={s.btnGhost}
            onClick={() => setDraft(allSelected ? [] : [...ALL_BRAIN_MCP_IDS])}
          >
            {allSelected ? "Desmarcar todos" : "Selecionar todos"}
          </button>
        </div>
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
            Salvar conectores
          </button>
        </div>
      </div>
    </div>
  );
}
