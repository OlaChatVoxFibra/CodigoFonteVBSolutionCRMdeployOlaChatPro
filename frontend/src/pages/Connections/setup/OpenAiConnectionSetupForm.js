/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import api from "../../../services/api";
import toastError from "../../../errors/toastError";
import AiProviderSetupPanel from "../AiProviderSetupPanel";

const DEFAULT_STATE = {
  apiKey: "",
  model: "gpt-5.5",
  aplicarTodos: false,
  topP: 1,
  presencePenalty: 0,
  frequencyPenalty: 0,
  stopSequences: "###, FIM",
  active: true,
  scope: "Pessoal",
  responderGrupo: false
};

export default function OpenAiConnectionSetupForm({ onSaved }) {
  const [state, setState] = useState(DEFAULT_STATE);
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hadKey, setHadKey] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/settings/agent_integration");
        if (!alive) return;
        if (data?.value) {
          const v =
            typeof data.value === "string" ? JSON.parse(data.value) : data.value;
          setState((prev) => ({
            ...prev,
            ...v,
            responderGrupo:
              typeof v.responderGrupo === "boolean"
                ? v.responderGrupo
                : prev.responderGrupo
          }));
          setHadKey(Boolean(String(v.apiKey || "").trim()));
        }
      } catch {
        /* ignore */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const save = async () => {
    if (!String(state.apiKey || "").trim() && !hadKey) {
      toast.error("Informe a API Key da OpenAI.");
      return;
    }
    setSaving(true);
    try {
      const { status, ...rest } = state;
      const payload = { ...rest, active: true };
      if (!String(payload.apiKey || "").trim()) {
        delete payload.apiKey;
      }
      await api.put("/settings/agent_integration", { value: payload });
      toast.success("Open IA conectada com sucesso.");
      setHadKey(true);
      onSaved?.();
    } catch (err) {
      if (err?.response?.status === 403) {
        toast.error("Apenas administradores podem salvar esta configuração.");
      } else {
        toastError(err);
      }
    }
    setSaving(false);
  };

  return (
    <AiProviderSetupPanel
      provider="openai"
      loading={loading}
      saving={saving}
      state={state}
      setState={setState}
      showApiKey={showApiKey}
      setShowApiKey={setShowApiKey}
      hadKey={hadKey}
      onSave={save}
    />
  );
}
