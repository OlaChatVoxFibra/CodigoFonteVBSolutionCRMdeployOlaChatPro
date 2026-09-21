/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect } from "react";
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
  makeStyles
} from "@material-ui/core";
import { Visibility, VisibilityOff } from "@material-ui/icons";
import IntegrationApiKeyGuidePanel from "./IntegrationApiKeyGuidePanel";
import { useIntegrationTabStyles } from "../Prompts/integrationTabStyles";
import { CONNECTIONS_FONT } from "./connectionsTypography";
import { getConnectionsSwitchDarkStyles } from "./connectionsTheme";
import { useSetupHeaderActions } from "./ConnectionsChannelLayout";

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
        padding: theme.spacing(0, 1, 2)
      }
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
        alignItems: "start"
      },
      [theme.breakpoints.up("lg")]: {
        gridTemplateColumns: "minmax(320px, 1fr) minmax(300px, 420px)",
        gap: theme.spacing(2.5, 4)
      }
    },
    formCol: {
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing(2),
      minWidth: 0,
      width: "100%",
      paddingTop: theme.spacing(1.5),
      [theme.breakpoints.up("sm")]: {
        paddingTop: theme.spacing(2)
      }
    },
    asideCol: {
      minWidth: 0,
      width: "100%"
    },
    fieldPretty: {
      "& .MuiOutlinedInput-root": {
        borderRadius: 12,
        background: inputBg,
        fontSize: "0.875rem",
        transition: "border-color 0.15s ease, box-shadow 0.15s ease",
        "& fieldset": { borderColor: border },
        "&:hover fieldset": {
          borderColor: isDark ? "rgba(255,255,255,0.22)" : "rgba(15,23,42,0.18)"
        },
        "&.Mui-focused fieldset": {
          borderWidth: 1.5,
          borderColor: theme.palette.primary.main
        },
        "&.Mui-focused": {
          boxShadow: isDark
            ? "0 0 0 3px rgba(99,102,241,0.2)"
            : "0 0 0 3px rgba(99,102,241,0.12)"
        }
      },
      "& .MuiOutlinedInput-input": {
        padding: "14px 14px"
      },
      "& .MuiInputLabel-outlined": {
        fontSize: "0.8125rem"
      }
    },
    switchRowPretty: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: theme.spacing(1.25, 0.5),
      borderRadius: 12,
      background: isDark ? "rgba(255,255,255,0.03)" : "rgba(15,23,42,0.02)",
      border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.05)"}`,
      ...getConnectionsSwitchDarkStyles(theme),
    },
    switchLabel: {
      fontSize: "0.875rem",
      fontWeight: 500,
      color: theme.palette.text.primary
    },
    warn: {
      fontSize: "0.8125rem",
      color: theme.palette.error.main,
      lineHeight: 1.45,
      padding: theme.spacing(1, 1.25),
      borderRadius: 10,
      background: isDark ? "rgba(244,67,54,0.12)" : "rgba(244,67,54,0.06)"
    },
    footer: {
      display: "flex",
      justifyContent: "flex-end",
      paddingTop: theme.spacing(2.5),
      marginTop: theme.spacing(2),
      borderTop: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(15,23,42,0.06)",
      [theme.breakpoints.up("md")]: {
        gridColumn: "1 / -1"
      }
    },
    saveBtn: {
      textTransform: "none",
      boxShadow: "none",
      borderRadius: 8,
      minWidth: 96,
      fontWeight: 500,
      fontSize: "0.8125rem",
      padding: theme.spacing(0.55, 1.5),
      fontFamily: CONNECTIONS_FONT
    }
  };
});

/**
 * Integração OpenAI / Claude — inputs à esquerda, passo a passo da API Key à direita.
 */
export default function AiProviderSetupPanel({
  provider,
  loading,
  saving,
  state,
  setState,
  showApiKey,
  setShowApiKey,
  hadKey,
  onSave,
  conflictMessage
}) {
  const layout = useLayoutStyles();
  const field = useIntegrationTabStyles();
  const registerHeaderActions = useSetupHeaderActions();
  const isOpenAi = provider === "openai";
  const isGemini = provider === "gemini";
  const isGrok = provider === "grok";

  useEffect(() => {
    if (!registerHeaderActions) return undefined;
    registerHeaderActions(
      <Button
        variant="contained"
        color="primary"
        disableElevation
        disabled={saving}
        onClick={onSave}
        className={layout.saveBtn}
      >
        {saving ? "Salvando…" : "Salvar"}
      </Button>
    );
    return () => registerHeaderActions(null);
  }, [registerHeaderActions, saving, onSave, layout.saveBtn]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={280} width="100%">
        <CircularProgress size={28} />
      </Box>
    );
  }

  const fieldClass = `${field.inputDense} ${layout.fieldPretty}`;

  return (
    <Box className={layout.root}>
      <div className={layout.grid}>
        <div className={layout.formCol}>
          {conflictMessage ? (
            <Typography className={layout.warn}>{conflictMessage}</Typography>
          ) : null}

          <TextField
            className={fieldClass}
            placeholder={
              isOpenAi ? "sk-..." : isGemini ? "AIza..." : isGrok ? "xai-..." : "sk-ant-..."
            }
            type={showApiKey ? "text" : "password"}
            label="API Key"
            value={state.apiKey || ""}
            onChange={(e) => setState((p) => ({ ...p, apiKey: e.target.value }))}
            fullWidth
            variant="outlined"
            helperText={
              hadKey && !state.apiKey ? "Chave já salva. Preencha só para alterar." : undefined
            }
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setShowApiKey((s) => !s)}
                    aria-label={showApiKey ? "Ocultar" : "Mostrar"}
                  >
                    {showApiKey ? (
                      <VisibilityOff fontSize="small" />
                    ) : (
                      <Visibility fontSize="small" />
                    )}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />

          {!isOpenAi ? (
            <FormControl
              fullWidth
              variant="outlined"
              className={`${fieldClass} ${field.selectWhite}`}
            >
              <InputLabel>Escopo</InputLabel>
              <Select
                value={state.scope || "Pessoal"}
                onChange={(e) => setState((p) => ({ ...p, scope: e.target.value }))}
                label="Escopo"
              >
                <MenuItem value="Pessoal">Pessoal</MenuItem>
                <MenuItem value="Equipe">Equipe</MenuItem>
                <MenuItem value="Global">Global</MenuItem>
              </Select>
            </FormControl>
          ) : null}

          {isGemini ? (
            <Typography variant="body2" color="textSecondary" style={{ fontSize: "0.8125rem", lineHeight: 1.5 }}>
              Esta API Key é usada pelos <strong>Agentes de IA</strong> no atendimento. O Brain.AI utiliza
              infraestrutura interna da VBSolution (créditos Brain) — não depende da chave cadastrada aqui.
              O modelo Gemini é escolhido em Agente IA → Integração e no seletor do Brain.AI.
            </Typography>
          ) : isGrok ? (
            <Typography variant="body2" color="textSecondary" style={{ fontSize: "0.8125rem", lineHeight: 1.5 }}>
              Esta API Key da xAI alimenta os <strong>Agentes Grok</strong> no atendimento. No Brain.AI, a
              chave da organização também pode ser usada se a plataforma não tiver chave Grok configurada.
              Escolha o modelo em Agente IA → Integração e no seletor do Brain.AI.
            </Typography>
          ) : isOpenAi ? (
            <Typography variant="body2" color="textSecondary" style={{ fontSize: "0.8125rem", lineHeight: 1.5 }}>
              Esta API Key alimenta os <strong>Agentes de IA</strong> (WhatsApp, Telegram, automações). O
              <strong> Brain.AI</strong> usa chaves internas da plataforma — não é necessário cadastrar chave
              aqui para conversar no Brain.
            </Typography>
          ) : !isGemini && !isOpenAi && !isGrok ? (
            <Typography variant="body2" color="textSecondary" style={{ fontSize: "0.8125rem", lineHeight: 1.5 }}>
              Esta API Key Anthropic é usada pelos <strong>Agentes de IA Claude</strong> no atendimento. O
              Brain.AI opera com infraestrutura interna da VBSolution e cobrança via créditos Brain.
            </Typography>
          ) : null}

          <div className={layout.switchRowPretty}>
            <Typography className={layout.switchLabel}>
              {isOpenAi
                ? "Integração ativa"
                : isGemini
                  ? "Gemini ativo"
                  : isGrok
                    ? "Grok ativo"
                    : "Claude ativo"}
            </Typography>
            <Switch
              color="primary"
              checked={Boolean(isOpenAi ? state.active : state.enabled)}
              onChange={(e) =>
                setState((p) =>
                  isOpenAi
                    ? { ...p, active: e.target.checked }
                    : { ...p, enabled: e.target.checked }
                )
              }
            />
          </div>

          {isOpenAi ? (
            <div className={layout.switchRowPretty}>
              <Typography className={layout.switchLabel}>
                Responder em grupos do WhatsApp
              </Typography>
              <Switch
                color="primary"
                checked={Boolean(state.responderGrupo)}
                onChange={(e) =>
                  setState((p) => ({ ...p, responderGrupo: e.target.checked }))
                }
              />
            </div>
          ) : null}
        </div>

        <div className={layout.asideCol}>
          <IntegrationApiKeyGuidePanel
            provider={
              isOpenAi
                ? "openai"
                : isGemini
                  ? "gemini"
                  : isGrok
                    ? "grok"
                    : "anthropic"
            }
          />
        </div>
      </div>

      {!registerHeaderActions ? (
        <div className={layout.footer}>
          <Button
            variant="contained"
            color="primary"
            disableElevation
            disabled={saving}
            onClick={onSave}
            className={layout.saveBtn}
          >
            {saving ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      ) : null}
    </Box>
  );
}
