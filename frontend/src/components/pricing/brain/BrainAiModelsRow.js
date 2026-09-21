/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { LobeClaudeIcon, LobeGeminiIcon, LobeGrokIcon, LobeOpenAIIcon } from "../../LobeBrandIcon";
import { cn } from "../../../lib/utils";
import { BRAIN_MODEL_PROVIDERS } from "./constants";

const ICON_SIZE = 13;

const PROVIDER_ICONS = {
  openai: LobeOpenAIIcon,
  claude: LobeClaudeIcon,
  gemini: LobeGeminiIcon,
  grok: LobeGrokIcon
};

function ModelChip({ provider, isDark }) {
  const Icon = PROVIDER_ICONS[provider.id];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5",
        isDark ? "bg-stone-900/50" : "bg-white"
      )}
      title={provider.label}
    >
      <Icon size={ICON_SIZE} />
      <span
        className={cn(
          "hidden text-[10px] font-medium sm:inline",
          isDark ? "text-stone-300" : "text-stone-600"
        )}
      >
        {provider.label}
      </span>
    </span>
  );
}

export default function BrainAiModelsRow({ isDark }) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-col gap-2 rounded-xl px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between",
        isDark
          ? "border border-stone-700/60 bg-stone-800/80"
          : "border border-stone-200/80 bg-stone-50"
      )}
    >
      <span
        className={cn(
          "text-[11px] font-medium uppercase tracking-wide",
          isDark ? "text-stone-400" : "text-stone-500"
        )}
      >
        Modelos inclusos
      </span>
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {BRAIN_MODEL_PROVIDERS.map((provider) => (
          <ModelChip key={provider.id} provider={provider} isDark={isDark} />
        ))}
      </div>
    </div>
  );
}
