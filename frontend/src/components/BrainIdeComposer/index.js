/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { ArrowUp, Mic, Plus, Square } from "lucide-react";
import BrainTooltip from "../BrainTooltip";

const BrainIdeComposer = forwardRef(function BrainIdeComposer(
  {
    value = "",
    onChange,
    onSend,
    onStop,
    loading = false,
    disabled = false,
    placeholder = "Comece a editar seu projeto",
    ui = (x) => x,
    attachBtnRef,
    onAttachClick,
    modelSelector = null,
    voiceInputSupported = false,
    voiceRecording = false,
    onVoiceClick,
    voiceSaving = false,
  },
  ref
) {
  const textareaRef = useRef(null);

  useImperativeHandle(ref, () => textareaRef.current);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (loading) onStop?.();
      else if (value.trim()) onSend?.();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  return (
    <div className="brain-ide-composer">
      <textarea
        ref={textareaRef}
        className="brain-ide-composer__input"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder={ui(placeholder)}
        rows={1}
        disabled={disabled || voiceSaving}
      />
      <div className="brain-ide-composer__footer">
        <div className="brain-ide-composer__footer-left">
          <BrainTooltip title={ui("Anexar")}>
            <button
              ref={attachBtnRef}
              type="button"
              className="brain-ide-composer__icon-btn"
              onClick={onAttachClick}
              disabled={voiceRecording || voiceSaving}
            >
              <Plus size={14} />
            </button>
          </BrainTooltip>
          {modelSelector}
        </div>
        <div className="brain-ide-composer__footer-right">
          {voiceInputSupported ? (
            <BrainTooltip title={voiceRecording ? ui("Cancelar ditado") : ui("Ditado por voz")}>
              <button
                type="button"
                className={`brain-ide-composer__icon-btn${
                  voiceRecording ? " brain-ide-composer__icon-btn--recording" : ""
                }`}
                onClick={onVoiceClick}
                disabled={loading || voiceSaving}
              >
                <Mic size={14} />
              </button>
            </BrainTooltip>
          ) : null}
          {loading ? (
            <button
              type="button"
              className="brain-ide-composer__send-btn brain-ide-composer__send-btn--stop"
              onClick={onStop}
              title={ui("Parar")}
            >
              <Square size={12} fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              className="brain-ide-composer__send-btn"
              onClick={() => value.trim() && onSend?.()}
              disabled={!value.trim() || disabled || voiceRecording || voiceSaving}
              title={ui("Enviar")}
            >
              <ArrowUp size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

export default BrainIdeComposer;
