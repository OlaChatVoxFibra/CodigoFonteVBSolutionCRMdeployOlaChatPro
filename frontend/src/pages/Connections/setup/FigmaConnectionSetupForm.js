/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Switch,
  TextField,
  Typography,
  makeStyles,
} from "@material-ui/core";
import { Visibility, VisibilityOff } from "@material-ui/icons";
import { toast } from "react-toastify";
import IntegrationApiKeyGuidePanel from "../IntegrationApiKeyGuidePanel";
import figmaIntegrationService from "../../../services/figmaIntegrationService";
import { CONNECTIONS_FONT } from "../connectionsTypography";
import { getConnectionsSwitchDarkStyles } from "../connectionsTheme";
import { useSetupHeaderActions } from "../ConnectionsChannelLayout";
import { useIntegrationTabStyles } from "../../Prompts/integrationTabStyles";

const useLayoutStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const border = isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)";
  const inputBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.02)";

  return {
    root: {
      fontFamily: CONNECTIONS_FONT,
      width: "100%",
      maxWidth: "100%",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      padding: theme.spacing(0, 0.5, 2),
      [theme.breakpoints.up("md")]: {
        padding: theme.spacing(0, 1, 2),
      },
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: theme.spacing(2.5),
      flex: 1,
      width: "100%",
      alignItems: "start",
      [theme.breakpoints.up("md")]: {
        gridTemplateColumns: "minmax(0, 1fr) minmax(280px, min(42vw, 400px))",
        gap: theme.spacing(2, 3),
        alignItems: "start",
      },
      [theme.breakpoints.up("lg")]: {
        gridTemplateColumns: "minmax(320px, 1fr) minmax(300px, 420px)",
        gap: theme.spacing(2.5, 4),
      },
    },
    formCol: {
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing(2),
      minWidth: 0,
      width: "100%",
      paddingTop: theme.spacing(1.5),
      [theme.breakpoints.up("sm")]: {
        paddingTop: theme.spacing(2),
      },
    },
    asideCol: {
      minWidth: 0,
      width: "100%",
    },
    fieldPretty: {
      "& .MuiOutlinedInput-root": {
        borderRadius: 12,
        background: inputBg,
        fontSize: "0.875rem",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
        "& fieldset": { borderColor: border },
        "&:hover fieldset": {
          borderColor: isDark ? "rgba(255,255,255,0.22)" : "rgba(15,23,42,0.18)",
        },
        "&.Mui-focused fieldset": {
          borderWidth: 1.5,
          borderColor: theme.palette.primary.main,
        },
        "&.Mui-focused": {
          boxShadow: isDark
            ? "0 0 0 3px rgba(99,102,241,0.2)"
            : "0 0 0 3px rgba(99,102,241,0.12)",
        },
      },
      "& .MuiOutlinedInput-input": {
        padding: "14px 14px",
      },
      "& .MuiInputLabel-outlined": {
        fontSize: "0.8125rem",
      },
    },
    helper: {
      fontSize: "0.8125rem",
      color: theme.palette.text.secondary,
      lineHeight: 1.45,
      marginTop: theme.spacing(0.5),
    },
    switchRow: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: theme.spacing(2),
      padding: theme.spacing(1.25, 1.5),
      borderRadius: 12,
      border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)"}`,
      background: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)",
      ...getConnectionsSwitchDarkStyles(theme),
    },
    switchText: { flex: 1, minWidth: 0 },
    switchTitle: {
      fontSize: "0.875rem",
      fontWeight: 500,
      color: theme.palette.text.primary,
    },
    switchDesc: {
      fontSize: "0.8125rem",
      color: theme.palette.text.secondary,
      marginTop: 4,
      lineHeight: 1.4,
    },
    sectionTitle: {
      fontSize: "0.8125rem",
      fontWeight: 600,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      color: theme.palette.text.secondary,
    },
    statusRow: {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing(1),
      flexWrap: "wrap",
    },
    saveBtn: {
      textTransform: "none",
      boxShadow: "none",
      borderRadius: 8,
      minWidth: 120,
      fontWeight: 500,
      fontSize: "0.8125rem",
      padding: theme.spacing(0.55, 1.5),
      fontFamily: CONNECTIONS_FONT,
    },
  };
});

const STATUS_LABELS = {
  connected: "Conectado",
  disconnected: "Desconectado",
  error: "Erro de Conexão",
  syncing: "Sincronizando",
};

const STATUS_COLORS = {
  connected: { bg: "rgba(37,211,102,0.12)", color: "#15803d" },
  disconnected: { bg: "rgba(120,120,128,0.12)", color: "#71717a" },
  error: { bg: "rgba(244,67,54,0.12)", color: "#b91c1c" },
  syncing: { bg: "rgba(59,130,246,0.12)", color: "#1d4ed8" },
};

const DEFAULT_STATE = {
  credential: "",
  enableBrainAi: true,
  enablePrototypeAnalysis: true,
  enableCommentsSync: false,
  enableDesignSystem: true,
};

const ADVANCED_SWITCHES = [
  {
    key: "enableBrainAi",
    title: "Permitir acesso ao Brain AI",
    desc: "Autoriza o Brain AI a consultar componentes, layouts e contexto visual.",
  },
  {
    key: "enablePrototypeAnalysis",
    title: "Analisar protótipos",
    desc: "Permite leitura de fluxos e links de prototipação.",
  },
  {
    key: "enableCommentsSync",
    title: "Sincronizar comentários",
    desc: "Permite leitura de comentários e observações do projeto.",
  },
  {
    key: "enableDesignSystem",
    title: "Utilizar Design System",
    desc: "Permite acesso a componentes, estilos, variáveis e tokens.",
  },
];

export default function FigmaConnectionSetupForm({ onSaved }) {
  const layout = useLayoutStyles();
  const field = useIntegrationTabStyles();
  const registerHeaderActions = useSetupHeaderActions();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState(DEFAULT_STATE);
  const [status, setStatus] = useState("disconnected");
  const [showCredential, setShowCredential] = useState(false);
  const [hadKey, setHadKey] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await figmaIntegrationService.getIntegration();
        if (cancelled) return;
        setState({
          credential: "",
          enableBrainAi: data?.enableBrainAi !== false,
          enablePrototypeAnalysis: data?.enablePrototypeAnalysis !== false,
          enableCommentsSync: Boolean(data?.enableCommentsSync),
          enableDesignSystem: data?.enableDesignSystem !== false,
        });
        setStatus(data?.status || "disconnected");
        setHadKey(Boolean(data?.credential?.hasKey));
      } catch {
        if (!cancelled) {
          toast.error("Não foi possível carregar a integração Figma.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const buildPayload = useCallback(
    () => ({
      enableBrainAi: state.enableBrainAi,
      enablePrototypeAnalysis: state.enablePrototypeAnalysis,
      enableCommentsSync: state.enableCommentsSync,
      enableDesignSystem: state.enableDesignSystem,
      ...(String(state.credential || "").trim()
        ? { credential: String(state.credential).trim() }
        : {}),
    }),
    [state]
  );

  const handleSave = useCallback(async () => {
    const payload = buildPayload();
    const newCredential = Boolean(payload.credential);

    if (!hadKey && !newCredential) {
      toast.error("Informe a credencial Figma para salvar a integração.");
      return;
    }

    setSaving(true);
    try {
      if (newCredential) {
        const testResult = await figmaIntegrationService.testIntegration(payload);
        if (!testResult?.ok) {
          setStatus("error");
          toast.error(
            testResult?.error || "Credencial Figma inválida. Verifique o token."
          );
          return;
        }
        setStatus("connected");
      }

      let data;
      if (!hadKey && newCredential) {
        data = await figmaIntegrationService.createIntegration(payload);
      } else {
        data = await figmaIntegrationService.saveIntegration(payload);
      }

      setStatus(data?.status || (newCredential ? "connected" : status));
      setHadKey(Boolean(data?.credential?.hasKey) || newCredential);
      setState((p) => ({ ...p, credential: "" }));
      toast.success("Integração Figma salva.");
      onSaved?.(data);
    } catch (e) {
      setStatus("error");
      toast.error(
        e?.response?.data?.error || "Falha ao salvar integração Figma."
      );
    } finally {
      setSaving(false);
    }
  }, [buildPayload, hadKey, onSaved, status]);

  useEffect(() => {
    if (!registerHeaderActions) return undefined;
    registerHeaderActions(
      <Button
        variant="contained"
        color="primary"
        disableElevation
        disabled={saving}
        onClick={handleSave}
        className={layout.saveBtn}
      >
        {saving ? "Salvando…" : "Salvar Integração"}
      </Button>
    );
    return () => registerHeaderActions(null);
  }, [registerHeaderActions, saving, handleSave, layout.saveBtn]);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={280}
        width="100%"
      >
        <CircularProgress size={28} />
      </Box>
    );
  }

  const statusStyle = STATUS_COLORS[status] || STATUS_COLORS.disconnected;
  const fieldClass = `${field.inputDense} ${layout.fieldPretty}`;

  return (
    <Box className={layout.root}>
      <div className={layout.grid}>
        <div className={layout.formCol}>
          <Box className={layout.statusRow}>
            <Typography variant="body2" color="textSecondary">
              Status:
            </Typography>
            <Chip
              size="small"
              label={STATUS_LABELS[status] || status}
              style={{
                backgroundColor: statusStyle.bg,
                color: statusStyle.color,
                fontWeight: 500,
              }}
            />
          </Box>

          <div>
            <TextField
              className={fieldClass}
              fullWidth
              variant="outlined"
              label="Credencial Figma"
              placeholder="Insira sua Credencial"
              type={showCredential ? "text" : "password"}
              value={state.credential}
              onChange={(e) =>
                setState((p) => ({ ...p, credential: e.target.value }))
              }
              helperText={
                hadKey && !state.credential
                  ? "Credencial já salva. Preencha só para alterar."
                  : undefined
              }
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setShowCredential((s) => !s)}
                      aria-label={showCredential ? "Ocultar" : "Mostrar"}
                    >
                      {showCredential ? (
                        <VisibilityOff fontSize="small" />
                      ) : (
                        <Visibility fontSize="small" />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Typography className={layout.helper}>
              Utilizada para conectar sua conta Figma ao VBsolution e disponibilizar
              contexto para o Brain AI.
            </Typography>
          </div>

          <Typography className={layout.sectionTitle}>
            Configurações avançadas
          </Typography>

          {ADVANCED_SWITCHES.map((sw) => (
            <div key={sw.key} className={layout.switchRow}>
              <div className={layout.switchText}>
                <Typography className={layout.switchTitle}>{sw.title}</Typography>
                <Typography className={layout.switchDesc}>{sw.desc}</Typography>
              </div>
              <Switch
                color="primary"
                checked={Boolean(state[sw.key])}
                onChange={(e) =>
                  setState((p) => ({ ...p, [sw.key]: e.target.checked }))
                }
              />
            </div>
          ))}
        </div>

        <div className={layout.asideCol}>
          <IntegrationApiKeyGuidePanel provider="figma" />
        </div>
      </div>
    </Box>
  );
}
