/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { ChevronDown, Globe, Pause, Play, Check, X } from "lucide-react";
import { PromptBox } from "../ui/chatgpt-prompt-input";
import ComposerAiAssist from "../ComposerAiAssist";
import BrainTooltip from "../BrainTooltip";
import { Spinner } from "../ui/spinner";

export default function BrainPromptInput({
  message,
  setMessage,
  textareaRef,
  inputBoxRef,
  placeholder,
  onSend,
  loading,
  voiceRecording,
  voiceSaving,
  voicePaused,
  voiceDuration,
  formatVoiceDuration,
  onPauseVoice,
  onSaveVoice,
  onCancelVoice,
  onAttachPick,
  onConnectorsClick,
  connectorsCount,
  selectedTool,
  onToolChange,
  attachedFiles,
  onRemoveFile,
  onMicClick,
  voiceInputSupported,
  onModelClick,
  selectedModelName,
  onLanguageClick,
  onStopGeneration,
  disabled,
  isDark,
  ui,
  focusComposer,
}) {
  const voiceRecordingBar = voiceRecording ? (
    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-gray-400">
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
      <span>
        {voicePaused ? "Pausado" : "Gravando"} {formatVoiceDuration(voiceDuration)}
      </span>
      <BrainTooltip title={voicePaused ? "Retomar" : "Pausar"}>
        <button
          type="button"
          onClick={onPauseVoice}
          disabled={voiceSaving}
          className="flex h-5 w-5 items-center justify-center rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 dark:border-gray-600 dark:hover:bg-[#404040]"
        >
          {voicePaused ? <Play size={10} /> : <Pause size={10} />}
        </button>
      </BrainTooltip>
      <BrainTooltip title="Salvar">
        <button
          type="button"
          onClick={onSaveVoice}
          disabled={voiceSaving}
          className="flex h-5 w-5 items-center justify-center rounded border border-green-300 text-green-600 hover:bg-green-50 disabled:opacity-40"
        >
          {voiceSaving ? <Spinner size={10} className="text-green-600" /> : <Check size={10} />}
        </button>
      </BrainTooltip>
      <BrainTooltip title="Cancelar">
        <button
          type="button"
          onClick={onCancelVoice}
          disabled={voiceSaving}
          className="flex h-5 w-5 items-center justify-center rounded border border-red-300 text-red-500 hover:bg-red-50 disabled:opacity-40"
        >
          <X size={10} />
        </button>
      </BrainTooltip>
    </div>
  ) : null;

  const footerLeftExtra = (
    <>
      <ComposerAiAssist
        text={message}
        onTextChange={(next) => setMessage(next)}
        disabled={loading || voiceRecording || voiceSaving}
        popoverAnchorRef={inputBoxRef}
        onFocusInput={focusComposer}
        triggerClassName="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-[#515151] border-0 bg-transparent cursor-pointer"
        iconSize={14}
        useNativeButton
      />
      <button
        type="button"
        onClick={onModelClick}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-100 dark:text-gray-400 dark:hover:bg-[#404040]"
      >
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-stone-500"
        />
        <span>{selectedModelName}</span>
        <ChevronDown size={11} />
      </button>
      <BrainTooltip title={ui("Idioma")}>
        <button
          type="button"
          onClick={onLanguageClick}
          disabled={voiceRecording}
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-[#515151]"
        >
          <Globe size={13} />
        </button>
      </BrainTooltip>
      {loading && (
        <BrainTooltip title={ui("Parar geração")}>
          <button
            type="button"
            onClick={onStopGeneration}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-[#515151]"
          >
            <Pause size={13} />
          </button>
        </BrainTooltip>
      )}
    </>
  );

  return (
    <div ref={inputBoxRef} className="w-full">
      <PromptBox
        ref={textareaRef}
        value={message}
        onValueChange={setMessage}
        placeholder={placeholder}
        onSend={onSend}
        onAttachPick={onAttachPick}
        onConnectorsClick={onConnectorsClick}
        connectorsCount={connectorsCount}
        selectedTool={selectedTool}
        onToolChange={onToolChange}
        attachedFiles={attachedFiles}
        onRemoveFile={onRemoveFile}
        onMicClick={voiceInputSupported ? onMicClick : undefined}
        voiceRecording={voiceRecording}
        voiceRecordingBar={voiceRecordingBar}
        footerLeftExtra={footerLeftExtra}
        loading={loading}
        disabled={disabled || voiceSaving}
        sendDisabled={!message.trim() && attachedFiles.length === 0}
      />
    </div>
  );
}
