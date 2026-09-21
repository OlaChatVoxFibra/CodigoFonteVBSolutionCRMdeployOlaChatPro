/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect } from "react";
import {
  Box,
  Button,
  Grid,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Typography,
  ListSubheader
} from "@material-ui/core";
import { useTheme } from "@material-ui/core/styles";
import { Visibility, VisibilityOff } from "@material-ui/icons";
import OpenAiApiKeyHint from "../../../components/OpenAiApiKeyHint";
import AnthropicApiKeyHint from "../../../components/AnthropicApiKeyHint";
import { SiOpenai } from "react-icons/si";
import {
  AiProviderGroupHeader,
  AgentModelOptionLabel,
  agentModelSelectMenuProps
} from "../../../components/AiProviderBrandLabels";
import SectionCard from "./shared/SectionCard";
import { claudeModelLabel } from "../../../providers/anthropic/models";
import AnthropicIntegrationSidePanel from "./AnthropicIntegrationSidePanel";
import { formatActiveApiStatus } from "../utils/activeAiApiStatus";

export default function IntegrationTab({
  rootClassName,
  classes,
  provider,
  setIntegrationProvider,
  integrationState,
  setIntegrationState,
  anthropicState,
  setAnthropicState,
  anthropicApiHint = { hasKey: false, last4: "" },
  showApiKey,
  setShowApiKey,
  openAiModels,
  anthropicModels = [],
  modelInfo,
  handleSaveIntegration,
  hideFooterSave = false
}) {
  const theme = useTheme();
  const isDark = theme.palette.type === "dark";
  /** Fonte única: integrationState.model (sem forçar Claude só porque enabled=true). */
  const rawModel = String(integrationState.model || "gpt-5.5").trim() || "gpt-5.5";
  const isAnthropic = rawModel.startsWith("anthropic:");
  let selectValue = rawModel;
  if (isAnthropic) {
    const id = rawModel.slice("anthropic:".length);
    if (!id || !anthropicModels.includes(id)) {
      const dm = anthropicState.defaultModel || "claude-sonnet-4-5-20250929";
      selectValue = `anthropic:${dm}`;
    }
  } else if (!openAiModels.includes(rawModel)) {
    selectValue = "gpt-5.5";
  }

  const anthropicModelId = isAnthropic
    ? selectValue.slice("anthropic:".length)
    : anthropicState.defaultModel;

  const openAiIconColor = isDark ? "#f4f4f5" : "#111827";
  const modelMetaColor = isDark ? theme.palette.text.secondary : "#6b7280";

  const openAiMeta = modelInfo[isAnthropic ? "" : selectValue] || {};
  const hasAnthropicKey =
    Boolean(String(anthropicState.apiKey || "").trim()) || anthropicApiHint.hasKey;
  const hasOpenAiKey = Boolean(String(integrationState.apiKey || "").trim());

  const handleModelChange = (nextRaw) => {
    const nextModel = String(nextRaw || "").trim();
    if (!nextModel) return;
    if (nextModel.startsWith("anthropic:")) {
      const claudeModel = nextModel.slice("anthropic:".length);
      setIntegrationState((prev) => ({
        ...prev,
        model: nextModel,
        lastAiProvider: "anthropic",
        lastAnthropicModel: claudeModel
      }));
      setAnthropicState((prev) => ({ ...prev, defaultModel: claudeModel }));
      setIntegrationProvider?.("anthropic");
      return;
    }
    setIntegrationState((prev) => ({
      ...prev,
      model: nextModel,
      lastAiProvider: "openai"
    }));
    setIntegrationProvider?.("openai");
  };

  const rightPanel = isAnthropic ? (
    <AnthropicIntegrationSidePanel
      classes={classes}
      defaultModel={anthropicModelId}
      scope={anthropicState.scope}
      enabled={anthropicState.enabled}
      hasAnthropicKey={hasAnthropicKey}
      openAiModel={integrationState.model}
      openAiHasKey={hasOpenAiKey}
      openAiActive={integrationState.active !== false}
      wrapPaper={false}
    />
  ) : (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <SiOpenai size={24} color={openAiIconColor} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>
            {openAiMeta.title || integrationState.model}
          </div>
          <div style={{ fontSize: 12, color: modelMetaColor }}>
            {openAiMeta.desc || "Modelo selecionado da OpenAI."} Ideal para: Chat, automação.
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
        <div>
          Contexto: <b>{openAiMeta.context || "-"}</b>
        </div>
        <div>
          Saída Máx.: <b>{openAiMeta.output || "-"}</b>
        </div>
        <div>
          Velocidade: <b>{openAiMeta.speed || "-"}</b>
        </div>
        <div>
          Qualidade: <b>{openAiMeta.quality || "-"}</b>
        </div>
        <div>
          Custo: <b>{openAiMeta.cost || "-"}</b>
        </div>
      </div>
      <div className={classes.rightSection} style={{ fontSize: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Resumo da configuração</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            Modelo: <b>{openAiMeta.title || integrationState.model}</b>
          </div>
          <div>
            Escopo: <b>{integrationState.scope}</b>
          </div>
          <div>
            Status: <b>{integrationState.active ? "Pronto" : "Desativado"}</b>
          </div>
          <div>
            Responder em grupos: <b>{integrationState.responderGrupo ? "Sim" : "Não"}</b>
          </div>
        </div>
      </div>
      <div className={classes.rightSection}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Preços (por 1M tokens)</div>
        <div className={classes.priceRow}>
          <span>Entrada</span>
          <span>$0.15/1M</span>
        </div>
        <div className={classes.priceRow} style={{ marginTop: 4 }}>
          <span>Saída</span>
          <span>$0.60/1M</span>
        </div>
      </div>
      <div className={classes.rightSection} style={{ fontSize: 12 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Conexão ativa</div>
        {(() => {
          const apiStatus = formatActiveApiStatus({
            openAiModel: integrationState.model,
            openAiHasKey: hasOpenAiKey,
            openAiActive: integrationState.active !== false,
            hasAnthropicKey: false,
            claudeEnabled: false,
            claudeModelTitle: ""
          });
          return (
            <div style={{ marginBottom: 10, color: theme.palette.text.primary }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12
                }}
              >
                <span>Status API</span>
                <span style={{ fontWeight: 600, textAlign: "right", maxWidth: "72%" }}>
                  {hasOpenAiKey && integrationState.active !== false
                    ? apiStatus.line
                    : hasOpenAiKey
                      ? `OpenAI (GPT) · ${String(integrationState.model || "—")} (desativada)`
                      : "Nenhuma API ativa"}
                </span>
              </div>
            </div>
          );
        })()}
        <div className={classes.statusRow} style={{ marginTop: 0, marginBottom: 0, flexWrap: "wrap" }}>
          <span className={hasOpenAiKey ? classes.statusBadgeOk : classes.statusBadgeWarn}>
            API Key {hasOpenAiKey ? "informada" : "não informada"}
          </span>
        </div>
      </div>
      <div className={classes.rightSection}>
        <Typography variant="caption" color="textSecondary">
          Para Claude, escolha um modelo no grupo <strong>Anthropic Claude</strong> no seletor. Crie e teste agentes na
          aba <strong>Agentes</strong> (botão + → Anthropic Claude).
        </Typography>
      </div>
    </>
  );

  return (
    <div className={`${classes.mainPaper} ${classes.mainPaperTight} ${rootClassName || ""}`}>
      <SectionCard>
        <Grid container spacing={1} alignItems="flex-start">
          <Grid item xs={12} md={6}>
            <Box>
              <span className={classes.labelSmall}>Modelo</span>
              <Select
                fullWidth
                variant="outlined"
                value={selectValue}
                onChange={(e) => handleModelChange(e.target.value)}
                renderValue={(v) => {
                  const s = String(v || "");
                  if (s.startsWith("anthropic:")) {
                    return (
                      <AgentModelOptionLabel
                        modelId={s.slice("anthropic:".length)}
                        variant="field"
                      />
                    );
                  }
                  return <AgentModelOptionLabel modelId={s} variant="field" />;
                }}
                className={`${classes.inputDense} ${classes.selectWhite}`}
                inputProps={{ "aria-label": "Modelo de IA" }}
                MenuProps={agentModelSelectMenuProps}
              >
                <ListSubheader className={classes.providerSubheader} disableSticky>
                  <AiProviderGroupHeader provider="openai" label="OpenAI" />
                </ListSubheader>
                {openAiModels.map((m) => (
                  <MenuItem
                    key={m}
                    value={m}
                    className={classes.modelMenuItem}
                    onClick={() => handleModelChange(m)}
                  >
                    <AgentModelOptionLabel modelId={m} />
                  </MenuItem>
                ))}
                {anthropicModels.length > 0 ? (
                  <>
                    <ListSubheader className={classes.providerSubheader} disableSticky>
                      <AiProviderGroupHeader provider="anthropic" label="Claude" />
                    </ListSubheader>
                    {anthropicModels.map((m) => {
                      const v = `anthropic:${m}`;
                      return (
                        <MenuItem
                          key={m}
                          value={v}
                          className={classes.modelMenuItem}
                          onClick={() => handleModelChange(v)}
                        >
                          <AgentModelOptionLabel modelId={m} />
                        </MenuItem>
                      );
                    })}
                  </>
                ) : null}
              </Select>

              {isAnthropic ? (
                <Box display="flex" flexDirection="column" style={{ gap: 18, marginTop: 12 }}>
                  <Box className={classes.switchRow} style={{ marginBottom: 4 }}>
                    <span className={classes.labelSmall}>Claude ativo</span>
                    <Switch
                      checked={Boolean(anthropicState.enabled)}
                      onChange={(e) =>
                        setAnthropicState((prev) => ({ ...prev, enabled: e.target.checked }))
                      }
                      color="primary"
                    />
                  </Box>
                  <Box mt={1}>
                  <span className={classes.labelSmall}>API Key Anthropic</span>
                  <TextField
                    placeholder="sk-ant-..."
                    type={showApiKey ? "text" : "password"}
                    value={anthropicState.apiKey}
                    onChange={(e) =>
                      setAnthropicState((prev) => ({ ...prev, apiKey: e.target.value }))
                    }
                    fullWidth
                    variant="outlined"
                    size="small"
                    className={classes.inputDense}
                    helperText={
                      anthropicApiHint.hasKey && !anthropicState.apiKey
                        ? `Chave salva (****${anthropicApiHint.last4 || ""}). Preencha só para trocar.`
                        : ""
                    }
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowApiKey((s) => !s)}
                            aria-label={showApiKey ? "Ocultar chave" : "Mostrar chave"}
                          >
                            {showApiKey ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                  <AnthropicApiKeyHint />
                  <span className={classes.labelSmall}>Escopo</span>
                  <Select
                    fullWidth
                    variant="outlined"
                    value={anthropicState.scope}
                    onChange={(e) =>
                      setAnthropicState((prev) => ({ ...prev, scope: e.target.value }))
                    }
                    className={`${classes.inputDense} ${classes.selectWhite}`}
                  >
                    <MenuItem value="Pessoal">Pessoal</MenuItem>
                    <MenuItem value="Equipe">Equipe</MenuItem>
                    <MenuItem value="Global">Global</MenuItem>
                  </Select>
                  <Typography variant="caption" color="textSecondary" display="block" style={{ marginTop: 8 }}>
                    Modelo salvo: <strong>{claudeModelLabel(anthropicModelId)}</strong>
                  </Typography>
                  <Grid container spacing={1} style={{ marginTop: 8 }}>
                    <Grid item xs={6}>
                      <span className={classes.labelSmall}>Temperature</span>
                      <TextField
                        value={anthropicState.temperature}
                        onChange={(e) =>
                          setAnthropicState((prev) => ({
                            ...prev,
                            temperature: Number(e.target.value)
                          }))
                        }
                        fullWidth
                        variant="outlined"
                        size="small"
                        type="number"
                        inputProps={{ step: "0.1", min: "0", max: "2" }}
                        className={classes.inputDense}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <span className={classes.labelSmall}>Top P</span>
                      <TextField
                        value={anthropicState.topP}
                        onChange={(e) =>
                          setAnthropicState((prev) => ({ ...prev, topP: Number(e.target.value) }))
                        }
                        fullWidth
                        variant="outlined"
                        size="small"
                        type="number"
                        inputProps={{ step: "0.01", min: "0", max: "1" }}
                        className={classes.inputDense}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <span className={classes.labelSmall}>Presence penalty</span>
                      <TextField
                        value={anthropicState.presencePenalty}
                        onChange={(e) =>
                          setAnthropicState((prev) => ({
                            ...prev,
                            presencePenalty: Number(e.target.value)
                          }))
                        }
                        fullWidth
                        variant="outlined"
                        size="small"
                        type="number"
                        className={classes.inputDense}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <span className={classes.labelSmall}>Frequency penalty</span>
                      <TextField
                        value={anthropicState.frequencyPenalty}
                        onChange={(e) =>
                          setAnthropicState((prev) => ({
                            ...prev,
                            frequencyPenalty: Number(e.target.value)
                          }))
                        }
                        fullWidth
                        variant="outlined"
                        size="small"
                        type="number"
                        className={classes.inputDense}
                      />
                    </Grid>
                  </Grid>
                  <Box mt={2}>
                    <span className={classes.labelSmall}>Stop (vírgula)</span>
                    <TextField
                      value={anthropicState.stopSequences}
                      onChange={(e) =>
                        setAnthropicState((prev) => ({ ...prev, stopSequences: e.target.value }))
                      }
                      fullWidth
                      variant="outlined"
                      size="small"
                      placeholder="###, FIM"
                      className={classes.inputDense}
                    />
                  </Box>
                  </Box>
                </Box>
              ) : (
                <>
                  <Grid container spacing={1} style={{ marginTop: 8, marginBottom: 8 }}>
                <Grid item xs={12} sm={6}>
                  <div className={classes.switchRow}>
                    <span className={classes.labelSmall}>Ativo</span>
                    <Switch
                      checked={integrationState.active}
                      onChange={(e) =>
                        setIntegrationState((prev) => ({ ...prev, active: e.target.checked }))
                      }
                      color="primary"
                    />
                  </div>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <div className={classes.switchRow}>
                    <span className={classes.labelSmall}>Responder em grupos</span>
                    <Switch
                      checked={integrationState.responderGrupo}
                      onChange={(e) =>
                            setIntegrationState((prev) => ({
                              ...prev,
                              responderGrupo: e.target.checked
                            }))
                      }
                      color="primary"
                    />
                  </div>
                </Grid>
              </Grid>
                  <span className={classes.labelSmall}>API Key OpenAI</span>
              <TextField
                placeholder="sk-..."
                type={showApiKey ? "text" : "password"}
                value={integrationState.apiKey}
                onChange={(e) =>
                  setIntegrationState((prev) => ({ ...prev, apiKey: e.target.value }))
                }
                fullWidth
                variant="outlined"
                size="small"
                className={classes.inputDense}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowApiKey((s) => !s)}
                        aria-label={showApiKey ? "Ocultar chave" : "Mostrar chave"}
                      >
                        {showApiKey ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
              <OpenAiApiKeyHint />
              <span className={classes.labelSmall}>Escopo</span>
              <Select
                fullWidth
                variant="outlined"
                value={integrationState.scope}
                onChange={(e) =>
                  setIntegrationState((prev) => ({ ...prev, scope: e.target.value }))
                }
                className={`${classes.inputDense} ${classes.selectWhite}`}
              >
                <MenuItem value="Pessoal">Pessoal</MenuItem>
                <MenuItem value="Equipe">Equipe</MenuItem>
                <MenuItem value="Global">Global</MenuItem>
              </Select>
              <Grid container spacing={1} style={{ marginTop: 8 }}>
                <Grid item xs={12} sm={4}>
                  <span className={classes.labelSmall}>top_p</span>
                  <TextField
                    value={integrationState.topP}
                    onChange={(e) =>
                      setIntegrationState((prev) => ({ ...prev, topP: Number(e.target.value) }))
                    }
                    fullWidth
                    variant="outlined"
                    size="small"
                    type="number"
                    inputProps={{ step: "0.01", min: "0", max: "1" }}
                    className={classes.inputDense}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <span className={classes.labelSmall}>presence_penalty</span>
                  <TextField
                    value={integrationState.presencePenalty}
                    onChange={(e) =>
                      setIntegrationState((prev) => ({
                        ...prev,
                        presencePenalty: Number(e.target.value)
                      }))
                    }
                    fullWidth
                    variant="outlined"
                    size="small"
                    type="number"
                    inputProps={{ step: "0.1", min: "-2", max: "2" }}
                    className={classes.inputDense}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <span className={classes.labelSmall}>frequency_penalty</span>
                  <TextField
                    value={integrationState.frequencyPenalty}
                    onChange={(e) =>
                      setIntegrationState((prev) => ({
                        ...prev,
                        frequencyPenalty: Number(e.target.value)
                      }))
                    }
                    fullWidth
                    variant="outlined"
                    size="small"
                    type="number"
                    inputProps={{ step: "0.1", min: "-2", max: "2" }}
                    className={classes.inputDense}
                  />
                </Grid>
              </Grid>
              <Box mt={2}>
                <span className={classes.labelSmall}>stop (separe por vírgula)</span>
                <TextField
                  value={integrationState.stopSequences}
                  onChange={(e) =>
                    setIntegrationState((prev) => ({ ...prev, stopSequences: e.target.value }))
                  }
                  fullWidth
                  variant="outlined"
                  size="small"
                  placeholder="###, FIM"
                  className={classes.inputDense}
                />
              </Box>
              <Box display="flex" alignItems="center" style={{ gap: 8, marginTop: 16 }}>
                <Switch
                  checked={integrationState.aplicarTodos}
                  onChange={(e) =>
                    setIntegrationState((prev) => ({ ...prev, aplicarTodos: e.target.checked }))
                  }
                  color="primary"
                  size="small"
                />
                <Typography variant="body2">Aplicar configurações a todas as filas</Typography>
              </Box>
                </>
              )}

              {!hideFooterSave ? (
                <Box className={classes.formFooterBar}>
                  <Button
                    color="primary"
                    variant="contained"
                    onClick={handleSaveIntegration}
                    size="small"
                  >
                    Salvar Integração
                  </Button>
                </Box>
              ) : null}
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper className={classes.rightModelCard}>{rightPanel}</Paper>
          </Grid>
        </Grid>
      </SectionCard>
    </div>
  );
}
