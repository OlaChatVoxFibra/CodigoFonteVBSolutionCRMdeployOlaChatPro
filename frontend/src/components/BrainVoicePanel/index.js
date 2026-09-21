/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Settings2, X } from "lucide-react";
import BrainTooltip from "../BrainTooltip";
import s from "../../pages/AiBrain/brainSubClassNames";

const BAR_DELAYS = [0, 0.12, 0.24, 0.36, 0.48];

function MicIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" fill="white" fillOpacity="0.95" />
      <path d="M6 11a6 6 0 0012 0" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 17v3" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 20h6" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const PHASE_LABELS = {
  listening: "Ouvindo você…",
  thinking: "Pensando…",
  speaking: "Falando…",
  idle: "Ativo",
};

const PHASE_HINTS = {
  listening: "Ouvindo… junto sua fala completa antes de enviar.",
  thinking: "Executando no CRM…",
  speaking: "Brain respondendo em voz alta…",
  idle: "Iniciando assistente Jarvis…",
};

export default function BrainVoicePanel({
  open,
  phase,
  liveTranscript,
  lastSpoken,
  error,
  onClose,
  onChangeVoice,
}) {
  if (!open) return null;

  const barMod =
    phase === "speaking"
      ? "brain-voice__bar--speak"
      : phase === "thinking"
        ? "brain-voice__bar--think"
        : "brain-voice__bar--listen";

  const showPulse = phase === "listening" || phase === "speaking";

  return (
    <div className={s.voicePanel} role="region" aria-label="Conversa por voz Brain.AI">
      <div className={s.voiceHeader}>
        <span className={s.voiceTitle}>Voz</span>
        <div style={{ display: "flex", gap: 2 }}>
          <BrainTooltip title="Trocar voz">
            <button type="button" className="brain-voice__icon-btn" onClick={onChangeVoice}>
              <Settings2 size={13} />
            </button>
          </BrainTooltip>
          <BrainTooltip title="Encerrar">
            <button type="button" className="brain-voice__icon-btn" onClick={onClose}>
              <X size={13} />
            </button>
          </BrainTooltip>
        </div>
      </div>

      <div className={s.voiceOrb}>
        {showPulse ? (
          <>
            <span className="brain-voice__pulse" />
            <span className="brain-voice__pulse brain-voice__pulse--2" />
          </>
        ) : null}
        <div className="brain-voice__mic-core">
          <MicIcon />
        </div>
      </div>

      <div className="brain-voice__bars" aria-hidden>
        {BAR_DELAYS.map((delay, i) => (
          <span
            key={i}
            className={`brain-voice__bar ${barMod}`}
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </div>

      <div className="brain-voice__status">{PHASE_LABELS[phase] || PHASE_LABELS.idle}</div>
      <div className="brain-voice__hint">
        {phase === "speaking" && lastSpoken
          ? `🔊 ${lastSpoken.length > 90 ? `${lastSpoken.slice(0, 90)}…` : lastSpoken}`
          : liveTranscript
            ? `“${liveTranscript.length > 72 ? `${liveTranscript.slice(0, 72)}…` : liveTranscript}”`
            : PHASE_HINTS[phase] || PHASE_HINTS.listening}
      </div>
      {error ? <div className="brain-voice__error">{error}</div> : null}
    </div>
  );
}
