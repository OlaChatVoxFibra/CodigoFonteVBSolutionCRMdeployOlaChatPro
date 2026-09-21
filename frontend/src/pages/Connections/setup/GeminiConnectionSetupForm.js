/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useState } from "react";
import { Box, CircularProgress } from "@material-ui/core";
import { toast } from "react-toastify";
import AiProviderSetupPanel from "../AiProviderSetupPanel";
import useGeminiIntegration from "../../../hooks/useGeminiIntegration";

const HIDDEN_DEFAULT_MODEL = "gemini-2.5-flash";

const DEFAULT_STATE = {
  enabled: false,
  apiKey: "",
  scope: "Pessoal"
};

/**
 * Nova conexão / editar Gemini — só API Key e ativação (modelos ficam no Agente IA e no Brain).
 */
export default function GeminiConnectionSetupForm({
  onCancel,
  onSaved,
  hidePageHeader = false,
  isEdit = false
}) {
  const gemini = useGeminiIntegration();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState(DEFAULT_STATE);
  const [showApiKey, setShowApiKey] = useState(false);
  const [hadKey, setHadKey] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await gemini.getIntegration();
        if (cancelled) return;
        setState({
          enabled: Boolean(data?.enabled),
          apiKey: "",
          scope: data?.scope || "Pessoal"
        });
        setHadKey(Boolean(data?.apiKey?.hasKey));
      } catch {
        if (!cancelled) {
          toast.error("Não foi possível carregar a integração Gemini.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gemini]);

  const saveIntegration = async () => {
    setSaving(true);
    try {
      const payload = {
        enabled: state.enabled,
        scope: state.scope,
        defaultModel: HIDDEN_DEFAULT_MODEL
      };
      if (String(state.apiKey || "").trim()) {
        payload.apiKey = String(state.apiKey).trim();
      }
      const data = await gemini.saveIntegration(payload);
      if (data?.saveWarning) {
        toast.warn(data.saveWarning);
      } else {
        toast.success("Integração Gemini salva.");
      }
      setHadKey(Boolean(data?.apiKey?.hasKey) || Boolean(payload.apiKey));
      setState((p) => ({ ...p, apiKey: "" }));
      onSaved?.(data);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Falha ao salvar integração Gemini.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={280} width="100%">
        <CircularProgress size={28} />
      </Box>
    );
  }

  return (
    <AiProviderSetupPanel
      provider="gemini"
      loading={false}
      saving={saving}
      state={state}
      setState={setState}
      showApiKey={showApiKey}
      setShowApiKey={setShowApiKey}
      hadKey={hadKey}
      onSave={saveIntegration}
    />
  );
}
