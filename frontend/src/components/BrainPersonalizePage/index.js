/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Save, Sparkles } from "lucide-react";
import {
  BRAIN_CONVERSATION_STYLE_OPTIONS,
  BRAIN_EMOJI_OPTIONS,
  BRAIN_PROACTIVITY_OPTIONS,
  BRAIN_TONE_OPTIONS,
  BRAIN_VERBOSITY_OPTIONS,
  DEFAULT_BRAIN_PERSONALIZATION,
  normalizeBrainPersonalization,
} from "../../config/brainPersonalizationCatalog";
import { buildBrainPersonalizationPrompt } from "../../utils/buildBrainPersonalizationPrompt";
import s from "../../pages/AiBrain/brainSubClassNames";

function OptionPicker({ title, options, value, onChange }) {
  return (
    <div className={s.section}>
      <div className={s.sectionTitle}>{title}</div>
      <div className={s.optionGrid}>
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`${s.optionCard} ${value === opt.id ? s.optionCardActive : ""}`}
            onClick={() => onChange(opt.id)}
          >
            <div className={s.optionLabel}>{opt.label}</div>
            <div className={s.optionHint}>{opt.hint}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ToggleRow({ label, checked, onChange }) {
  return (
    <label className="brain-sub__switch-row">
      <span className="brain-sub__switch-label">{label}</span>
      <input
        type="checkbox"
        className="brain-sub__switch-input"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

export default function BrainPersonalizePage({
  personalization,
  onSave,
  onPersist,
  onReset,
  ui = (x) => x,
}) {
  const [draft, setDraft] = useState(() => normalizeBrainPersonalization(personalization));
  const instructionsTimerRef = useRef(null);

  useEffect(() => {
    setDraft(normalizeBrainPersonalization(personalization));
  }, [personalization]);

  useEffect(
    () => () => {
      if (instructionsTimerRef.current) clearTimeout(instructionsTimerRef.current);
    },
    []
  );

  const preview = useMemo(() => buildBrainPersonalizationPrompt(draft), [draft]);

  const persistDraft = useCallback(
    (next) => {
      const normalized = normalizeBrainPersonalization(next);
      setDraft(normalized);
      onPersist?.(normalized);
      return normalized;
    },
    [onPersist]
  );

  const update = (patch) => {
    persistDraft({ ...draft, ...patch });
  };

  const updateInstructions = (customInstructions) => {
    const next = normalizeBrainPersonalization({ ...draft, customInstructions });
    setDraft(next);
    if (instructionsTimerRef.current) clearTimeout(instructionsTimerRef.current);
    instructionsTimerRef.current = setTimeout(() => {
      onPersist?.(next);
    }, 400);
  };

  const handleSave = () => {
    const normalized = persistDraft(draft);
    onSave?.(normalized);
  };

  const handleReset = () => {
    const defaults = { ...DEFAULT_BRAIN_PERSONALIZATION };
    setDraft(defaults);
    onPersist?.(defaults);
    onReset?.();
  };

  return (
    <div className={s.root}>
      <div className={s.inner}>
        <div className={s.headerRow}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h2 className={s.title}>{ui("Personalizar")}</h2>
            <p className={s.lead}>
              Defina como o Brain.AI deve conversar e se comportar com você. As preferências valem
              para novas mensagens neste navegador.
            </p>
          </div>
          <div className={s.actions}>
            <button type="button" className={s.btnGhost} onClick={handleReset}>
              <RotateCcw size={14} />
              {ui("Restaurar padrão")}
            </button>
            <button type="button" className={s.btnPrimary} onClick={handleSave}>
              <Save size={14} />
              {ui("Salvar preferências")}
            </button>
          </div>
        </div>

        <OptionPicker
          title={ui("Tom de conversa")}
          options={BRAIN_TONE_OPTIONS}
          value={draft.toneStyle}
          onChange={(toneStyle) => update({ toneStyle })}
        />
        <OptionPicker
          title={ui("Nível de detalhe")}
          options={BRAIN_VERBOSITY_OPTIONS}
          value={draft.verbosity}
          onChange={(verbosity) => update({ verbosity })}
        />
        <OptionPicker
          title={ui("Proatividade")}
          options={BRAIN_PROACTIVITY_OPTIONS}
          value={draft.proactivity}
          onChange={(proactivity) => update({ proactivity })}
        />
        <OptionPicker
          title={ui("Estilo de conversa")}
          options={BRAIN_CONVERSATION_STYLE_OPTIONS}
          value={draft.conversationStyle}
          onChange={(conversationStyle) => update({ conversationStyle })}
        />
        <OptionPicker
          title={ui("Uso de emojis")}
          options={BRAIN_EMOJI_OPTIONS}
          value={draft.emojiUsage}
          onChange={(emojiUsage) => update({ emojiUsage })}
        />

        <div className={s.section}>
          <div className={s.sectionTitle}>{ui("Comportamento")}</div>
          <div className="brain-sub__toggles-card">
            <ToggleRow
              label={ui("Fazer perguntas quando faltar informação essencial")}
              checked={draft.askClarifyingQuestions}
              onChange={(askClarifyingQuestions) => update({ askClarifyingQuestions })}
            />
            <ToggleRow
              label={ui("Usar listas e tópicos para organizar respostas")}
              checked={draft.useBulletPoints}
              onChange={(useBulletPoints) => update({ useBulletPoints })}
            />
          </div>
        </div>

        <div className={s.section}>
          <div className={s.sectionTitle}>{ui("Instruções personalizadas")}</div>
          <textarea
            className={s.textarea}
            rows={4}
            placeholder={ui(
              "Ex.: Sempre me chame pelo primeiro nome. Priorize ações do CRM. Evite jargões técnicos..."
            )}
            value={draft.customInstructions}
            onChange={(e) => updateInstructions(e.target.value)}
            onBlur={(e) => {
              if (instructionsTimerRef.current) clearTimeout(instructionsTimerRef.current);
              onPersist?.(
                normalizeBrainPersonalization({ ...draft, customInstructions: e.target.value })
              );
            }}
            maxLength={2000}
          />
        </div>

        <div className={s.preview}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <Sparkles size={14} />
            <strong style={{ fontSize: 12, color: "var(--brain-text)" }}>{ui("Resumo ativo")}</strong>
          </div>
          {preview.summary}
        </div>
      </div>
    </div>
  );
}
