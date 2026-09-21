/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useState } from "react";
import { Box, CircularProgress } from "@material-ui/core";
import { toast } from "react-toastify";
import AiProviderSetupPanel from "../AiProviderSetupPanel";
import useGrokIntegration from "../../../hooks/useGrokIntegration";

const HIDDEN_DEFAULT_MODEL = "grok-4-1-fast";

const DEFAULT_STATE = {
  enabled: false,
  apiKey: "",
  scope: "Pessoal"
};

/**
 * Nova conexão / editar Grok (xAI) — API Key e ativação (modelos no Agente IA e Brain).
 */
export default function GrokConnectionSetupForm({
  onCancel,
  onSaved,
  hidePageHeader = false,
  isEdit = false
}) {
  const grok = useGrokIntegration();
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
        const data = await grok.getIntegration();
        if (cancelled) return;
        setState({
          enabled: Boolean(data?.enabled),
          apiKey: "",
          scope: data?.scope || "Pessoal"
        });
        setHadKey(Boolean(data?.apiKey?.hasKey));
      } catch {
        if (!cancelled) {
          toast.error("Não foi possível carregar a integração Grok.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [grok]);

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
      const data = await grok.saveIntegration(payload);
      if (data?.saveWarning) {
        toast.warn(data.saveWarning);
      } else {
        toast.success("Integração Grok salva.");
      }
      setHadKey(Boolean(data?.apiKey?.hasKey) || Boolean(payload.apiKey));
      setState((p) => ({ ...p, apiKey: "" }));
      onSaved?.(data);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Falha ao salvar integração Grok.");
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
      provider="grok"
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
