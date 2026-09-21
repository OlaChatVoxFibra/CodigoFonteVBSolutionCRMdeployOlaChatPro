/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Button,
  TextField,
  IconButton,
  Autocomplete,
  Grid,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from "@mui/material";
import HttpIcon from "@mui/icons-material/Http";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SaveAltIcon from "@mui/icons-material/SaveAlt";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SettingsIcon from "@mui/icons-material/Settings";
import TipsAndUpdatesIcon from "@mui/icons-material/TipsAndUpdates";
import LinearScaleIcon from "@mui/icons-material/LinearScale";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import CloseIcon from "@mui/icons-material/Close";
import WebhookIcon from "@mui/icons-material/Webhook";

import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-github";

import ReactJson from "react-json-view";
import axios from "axios";
import { Handle } from "react-flow-renderer";
import { useNodeStorage } from "../../../stores/useNodeStorage";
import { toast } from "react-toastify";
import api from "../../../services/api";

function getPaths(obj, prefix = "") {
  let paths = [];
  for (let key in obj) {
    const currentPath = prefix ? `${prefix}.${key}` : key;
    paths.push(currentPath);
    if (obj[key] !== null && typeof obj[key] === "object") {
      paths = paths.concat(getPaths(obj[key], currentPath));
    }
  }
  return paths;
}

const HttpRequestNode = React.memo(({ data, id, selected }) => {
  // Estados existentes
  const [url, setUrl] = useState(data?.url || "");
  const [method, setMethod] = useState(data?.method || "GET");
  const [requestBody, setRequestBody] = useState(data?.requestBody || "{}");
  const [headersString, setHeadersString] = useState(data?.headersString || "");
  const [queryParams, setQueryParams] = useState(data?.queryParams || []);
  const [saveVariables, setSaveVariables] = useState(data?.saveVariables || []);
  const [timeout, setTimeout] = useState(data?.timeout || 10000);
  const [savedStatus, setSavedStatus] = useState('');
  const [response, setResponse] = useState(null);
  const [jsonPaths, setJsonPaths] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showMapping, setShowMapping] = useState(saveVariables && saveVariables.length > 0);
  const [showSavePopup, setShowSavePopup] = useState(false);
  const [showFullEditor, setShowFullEditor] = useState(false);
  const [showFullResponse, setShowFullResponse] = useState(false);

  // Novos estados para presets
  const [presets, setPresets] = useState([]);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [presetMode, setPresetMode] = useState(false);
  const [loadingPresets, setLoadingPresets] = useState(false);

  const storageItems = useNodeStorage();

  // Carregar presets disponíveis para a empresa
  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    try {
      setLoadingPresets(true);
      // A API já filtra por companyId baseado no token JWT
      const response = await api.get('/preset-webhooks?isActive=true&includeSystem=true');
      setPresets(response.data.presets || []);
    } catch (error) {
      console.error('Erro ao carregar presets:', error);
    } finally {
      setLoadingPresets(false);
    }
  };

  const handlePresetChange = async (event, preset) => {
    if (!preset) {
      setSelectedPreset(null);
      setPresetMode(false);
      return;
    }

    try {
      setSelectedPreset(preset);
      setPresetMode(true);
      
      // Aplicar configuração do preset
      const config = preset.configuration;
      
      setUrl(config.url || "");
      setMethod(config.method || "GET");
      setHeadersString(config.headers ? JSON.stringify(config.headers, null, 2) : "");
      setQueryParams(config.queryParams || []);
      setRequestBody(config.requestBody || "{}");
      setTimeout(config.timeout || 30000);
      
      // Configurar variáveis de resposta do preset
      if (config.responseVariables && config.responseVariables.length > 0) {
        const mappedVariables = config.responseVariables.map(rv => ({
          path: rv.path,
          variable: rv.variableName
        }));
        setSaveVariables(mappedVariables);
        setShowMapping(true);
      }
      
      // Atualizar dados do node
      data.url = config.url || "";
      data.method = config.method || "GET";
      data.headersString = config.headers ? JSON.stringify(config.headers, null, 2) : "";
      data.queryParams = config.queryParams || [];
      data.requestBody = config.requestBody || "{}";
      data.responseVariables = config.responseVariables || [];
      data.timeout = config.timeout || 30000;
      data.presetId = preset.id;
      data.presetName = preset.name;
      data.presetProvider = preset.provider;
      
    } catch (error) {
      console.error('Erro ao aplicar preset:', error);
      toast.error('Erro ao aplicar configuração do preset');
    }
  };

  const clearPreset = () => {
    setSelectedPreset(null);
    setPresetMode(false);
    data.presetId = null;
    data.presetName = null;
    data.presetProvider = null;
  };

  const updateNodeData = useCallback(() => {
    data.url = url;
    data.method = method;
    data.requestBody = requestBody;
    data.headersString = headersString;
    data.queryParams = queryParams;
    data.timeout = timeout;

    if (saveVariables && saveVariables.length > 0) {
      data.saveVariables = saveVariables.map(item => ({
        path: item.path,
        variable: item.variable
      }));

      data.responseVariables = saveVariables.map(item => ({
        path: item.path,
        variableName: item.variable
      }));
    } else {
      data.saveVariables = [];
      data.responseVariables = [];
    }

    if (!data.responseVariables || !Array.isArray(data.responseVariables)) {
      data.responseVariables = data.saveVariables?.map(item => ({
        path: item.path,
        variableName: item.variable
      })) || [];
    }

    if (!data.saveVariables || !Array.isArray(data.saveVariables)) {
      data.saveVariables = data.responseVariables?.map(item => ({
        path: item.path,
        variable: item.variableName
      })) || [];
    }
  }, [url, method, requestBody, headersString, queryParams, saveVariables, data, timeout]);

  useEffect(() => {
    if (saveVariables && saveVariables.length > 0 && !showMapping) {
      setShowMapping(true);
    }
  }, [saveVariables, showMapping]);

  useEffect(() => {
    let timer;
    if (showSavePopup) {
      timer = setTimeout(() => {
        setShowSavePopup(false);
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [showSavePopup]);

  const hasBody = ["POST", "PUT", "DELETE"].includes(method);

  let customHeaders = {};
  try {
    customHeaders = headersString ? JSON.parse(headersString) : {};
  } catch (err) { }

  useEffect(() => {
    if (response && typeof response === "object") {
      setJsonPaths(getPaths(response));
    } else {
      setJsonPaths([]);
    }
  }, [response]);

  const buildUrlWithParams = useCallback((baseUrl = url) => {
    if (!queryParams.length) return baseUrl;

    const processedParams = queryParams.map(param => {
      let value = param.value;

      if (window.flowVariables && value.includes('${')) {
        const regex = /\${([^}]+)}/g;
        value = value.replace(regex, (match, varName) => {
          return window.flowVariables[varName] !== undefined ?
            window.flowVariables[varName] : match;
        });
      }

      return { key: param.key, value };
    });

    const queryString = processedParams
      .filter((param) => param.key && param.value)
      .map(
        (param) =>
          `${encodeURIComponent(param.key)}=${encodeURIComponent(param.value)}`
      )
      .join("&");
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }, [url, queryParams]);

  const addQueryParam = useCallback(
    () => setQueryParams([...queryParams, { key: "", value: "" }]),
    [queryParams]
  );

  const updateQueryParam = useCallback(
    (index, field, value) => {
      const newParams = [...queryParams];
      newParams[index][field] = value;
      setQueryParams(newParams);
    },
    [queryParams]
  );

  const removeQueryParam = useCallback(
    (index) => setQueryParams(queryParams.filter((_, i) => i !== index)),
    [queryParams]
  );

  const addSaveVariable = useCallback(
    () => setSaveVariables([...saveVariables, { path: "", variable: "" }]),
    [saveVariables]
  );

  const updateSaveVariable = useCallback(
    (index, field, value) => {
      const newVars = [...saveVariables];
      newVars[index][field] = value;
      setSaveVariables(newVars);
    },
    [saveVariables]
  );

  const removeSaveVariable = useCallback(
    (index) => setSaveVariables(saveVariables.filter((_, i) => i !== index)),
    [saveVariables]
  );

  useEffect(() => {
    updateNodeData();
  }, [url, method, requestBody, headersString, queryParams, saveVariables, timeout, updateNodeData]);

  const testRequest = useCallback(async () => {
    try {
      let processedUrl = url;

      if (window.flowVariables && url.includes('${')) {
        const regex = /\${([^}]+)}/g;
        processedUrl = url.replace(regex, (match, varName) => {
          return window.flowVariables[varName] !== undefined ?
            window.flowVariables[varName] : match;
        });
      }
      let processedRequestBody;
      const finalUrl = buildUrlWithParams(processedUrl);
      const config = {
        method,
        url: finalUrl,
        headers: { "Content-Type": "application/json", ...customHeaders },
        timeout: timeout,
      };

      if (hasBody) {
        try {
          processedRequestBody = requestBody;

          if (window.flowVariables && requestBody.includes('${')) {
            const regex = /\${([^}]+)}/g;
            processedRequestBody = requestBody.replace(regex, (match, varName) => {
              return window.flowVariables[varName] !== undefined ?
                JSON.stringify(window.flowVariables[varName]) : match;
            });
          }

          config.data = JSON.parse(processedRequestBody || "{}");
        } catch (err) {
          config.data = processedRequestBody;
        }
      }

      const res = await axios(config);
      setResponse(res.data);

      if (window.setFlowVariable) {
        window.setFlowVariable('apiResponse', res.data);
      }

      if (saveVariables.length > 0) {
        const variablesToProcess = [...saveVariables];

        const responseVariables = variablesToProcess.map(item => ({
          path: item.path,
          variableName: item.variable
        }));

        for (let index = 0; index < responseVariables.length; index++) {
          const extractor = responseVariables[index];

          if (extractor && extractor.path && extractor.variableName) {
            const parts = extractor.path.split(".");
            let valueToSave = res.data;

            let currentPath = '';
            let pathValid = true;

            for (let part of parts) {
              currentPath = currentPath ? `${currentPath}.${part}` : part;
              if (valueToSave && typeof valueToSave === 'object' && part in valueToSave) {
                valueToSave = valueToSave[part];
              } else {
                pathValid = false;
                break;
              }
            }

            if (pathValid && valueToSave !== undefined && valueToSave !== null) {
              data[extractor.variableName] = valueToSave;

              if (window.setFlowVariable) {
                window.setFlowVariable(extractor.variableName, valueToSave);

                const event = new CustomEvent('flowVariableUpdate', {
                  detail: { name: extractor.variableName, value: valueToSave }
                });
                window.dispatchEvent(event);
              } else {
                if (!window.flowVariables) window.flowVariables = {};
                window.flowVariables[extractor.variableName] = valueToSave;

                const event = new CustomEvent('flowVariableUpdate', {
                  detail: { name: extractor.variableName, value: valueToSave }
                });
                window.dispatchEvent(event);
              }
            }
          }
        }

        data.responseVariables = responseVariables;
        data.saveVariables = variablesToProcess;

        updateNodeData();
      }
    } catch (error) {
      setResponse(error.response ? error.response.data : "Erro na requisição");

      if (window.setFlowVariable) {
        window.setFlowVariable('apiError', error.response ? error.response.data : error.message);
      }
    }
  }, [
    url,
    buildUrlWithParams,
    method,
    requestBody,
    customHeaders,
    hasBody,
    saveVariables,
    timeout,
    data,
  ]);

  return (
    <Box
      sx={{
        backgroundColor: "#fff",
        borderRadius: 2,
        boxShadow: 2,
        p: 3,
        width: 320,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        position: "relative",
      }}
    >
      <Handle
        type="target"
        position="left"
        id="httpRequest-in"
        style={{
          left: -8,
          top: "50%",
          transform: "translateY(-50%)",
          background: "#555",
          width: 12,
          height: 12,
        }}
      />

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <HttpIcon fontSize="small" sx={{ color: '#1976d2' }} />
          <Typography variant="subtitle1" fontWeight="bold">
            Requisição HTTP
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <IconButton
            size="small"
            onClick={() => {
              storageItems.setNodesStorage(id);
              storageItems.setAct("duplicate");
            }}
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>

          <IconButton
            size="small"
            onClick={() => {
              storageItems.setNodesStorage(id);
              storageItems.setAct("delete");
            }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Seção de Presets */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WebhookIcon fontSize="small" sx={{ color: '#9c27b0' }} />
          <Typography variant="body2" fontWeight="bold">
            Webhooks Pré-configurados
          </Typography>
        </Box>
        
        <Autocomplete
          options={presets}
          getOptionLabel={(option) => `${option.name} (${option.provider})`}
          value={selectedPreset}
          onChange={handlePresetChange}
          loading={loadingPresets}
          renderInput={(params) => (
            <TextField 
              {...params} 
              label="Selecionar preset" 
              size="small"
              placeholder="Escolha uma configuração pronta..."
            />
          )}
          renderOption={(props, option) => (
            <Box component="li" {...props}>
              <Box>
                <Typography variant="body2" fontWeight="bold">
                  {option.name}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {option.description}
                </Typography>
                <Box sx={{ mt: 0.5 }}>
                  <Chip 
                    label={option.provider.toUpperCase()} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                  />
                  {option.isSystem && (
                    <Chip 
                      label="SISTEMA" 
                      size="small" 
                      color="secondary" 
                      variant="outlined"
                      sx={{ ml: 0.5 }}
                    />
                  )}
                </Box>
              </Box>
            </Box>
          )}
          clearOnEscape
        />

        {presetMode && selectedPreset && (
          <Alert 
            severity="info" 
            action={
              <Button size="small" onClick={clearPreset}>
                Remover
              </Button>
            }
          >
            Usando preset: <strong>{selectedPreset.name}</strong>
          </Alert>
        )}
      </Box>

      {/* URL Field - sempre visível mas readonly se usando preset */}
      <TextField
        label={presetMode ? "URL (do preset)" : "URL"}
        variant="outlined"
        size="small"
        value={url}
        onChange={(e) => {
          setUrl(e.target.value);
          data.url = e.target.value;
        }}
        fullWidth
        placeholder="https://api.exemplo.com/webhook"
        helperText={presetMode ? "Você pode editar a URL base do preset se necessário" : ""}
        disabled={presetMode && selectedPreset?.isSystem} // Só permite editar se não for preset do sistema
      />

      {/* Method Field - sempre visível */}
      <Autocomplete
        options={["GET", "POST", "PUT", "DELETE"]}
        value={method}
        onChange={(event, newValue) => {
          if (newValue) {
            setMethod(newValue);
            data.method = newValue;
          }
        }}
        renderInput={(params) => (
          <TextField {...params} label="Método" size="small" />
        )}
        disabled={presetMode && selectedPreset?.isSystem}
        clearOnEscape
      />

      {/* Test Button */}
      <Button
        variant="contained"
        startIcon={<PlayArrowIcon />}
        onClick={testRequest}
        disabled={!url}
        sx={{
          bgcolor: "#2e7d32",
          "&:hover": { bgcolor: "#1b5e20" },
          textTransform: "none"
        }}
      >
        Testar Requisição
      </Button>

      {/* Response Display */}
      {response && (
        <Box sx={{ mt: 1 }}>
          <Typography variant="body2" fontWeight="bold" mb={1}>
            Resposta da API:
          </Typography>
          <Box
            sx={{
              maxHeight: 150,
              overflow: "auto",
              border: 1,
              borderColor: "grey.300",
              borderRadius: 1,
              p: 1,
              bgcolor: "grey.50",
            }}
          >
            {typeof response === "object" ? (
              <ReactJson
                src={response}
                theme="rjv-default"
                displayDataTypes={false}
                displayObjectSize={false}
                enableClipboard={false}
                collapsed={1}
                name={false}
              />
            ) : (
              <Typography variant="body2" fontFamily="monospace">
                {String(response)}
              </Typography>
            )}
          </Box>
          <Button
            size="small"
            onClick={() => setShowFullResponse(true)}
            sx={{ mt: 1, textTransform: "none" }}
          >
            Ver resposta completa
          </Button>
        </Box>
      )}

      <Button
        variant="text"
        size="small"
        onClick={() => setShowAdvanced(!showAdvanced)}
        sx={{ textTransform: "none", alignSelf: "flex-start" }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <SettingsIcon fontSize="small" />
          {showAdvanced ? "Ocultar avançado" : "Mostrar avançado"}
        </Box>
      </Button>

      {showAdvanced && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {presetMode && (
            <Alert severity="warning" sx={{ mb: 1 }}>
              Configurações avançadas podem sobrescrever as configurações do preset
            </Alert>
          )}

          <Typography variant="body2" fontWeight="bold">
            Timeout (ms)
          </Typography>
          <TextField
            type="number"
            size="small"
            value={timeout}
            onChange={(e) => setTimeout(parseInt(e.target.value) || 10000)}
            inputProps={{ min: 1000, max: 60000 }}
            fullWidth
          />

          <Typography variant="body2" fontWeight="bold">
            Parâmetros de Query
          </Typography>
          {queryParams.map((param, index) => (
            <Grid container spacing={1} key={index}>
              <Grid item xs={5}>
                <TextField
                  size="small"
                  label="Chave"
                  value={param.key}
                  onChange={(e) =>
                    updateQueryParam(index, "key", e.target.value)
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={5}>
                <TextField
                  size="small"
                  label="Valor"
                  value={param.value}
                  onChange={(e) =>
                    updateQueryParam(index, "value", e.target.value)
                  }
                  fullWidth
                />
              </Grid>
              <Grid item xs={2} sx={{ display: "flex", alignItems: "center" }}>
                <IconButton size="small" onClick={() => removeQueryParam(index)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Grid>
            </Grid>
          ))}
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddCircleOutlineIcon />}
            onClick={addQueryParam}
            sx={{ textTransform: "none", width: "100%" }}
          >
            Adicionar Parâmetro
          </Button>

          <Typography variant="body2" fontWeight="bold" mt={1}>
            Cabeçalhos (JSON)
          </Typography>
          <TextField
            variant="outlined"
            size="small"
            multiline
            minRows={2}
            value={headersString}
            onChange={(e) => setHeadersString(e.target.value)}
            placeholder='{"Authorization": "Bearer token", "Custom-Header": "XYZ"}'
            fullWidth
          />

          {hasBody && (
            <>
              <Typography variant="body2" fontWeight="bold" mt={1}>
                Corpo da requisição (JSON)
              </Typography>
              <Box sx={{ position: 'relative' }}>
                <AceEditor
                  mode="json"
                  theme="github"
                  name="requestBodyEditor"
                  fontSize={12}
                  showPrintMargin={false}
                  showGutter
                  highlightActiveLine
                  width="100%"
                  height="100px"
                  value={requestBody}
                  onChange={(value) => setRequestBody(value)}
                  setOptions={{ useWorker: false, tabSize: 2 }}
                  style={{ borderRadius: 4, border: "1px solid #ddd" }}
                />
                <IconButton
                  size="small"
                  onClick={() => setShowFullEditor(true)}
                  sx={{
                    position: 'absolute',
                    right: 5,
                    top: 5,
                    bgcolor: 'rgba(255,255,255,0.8)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                  }}
                >
                  <OpenInFullIcon fontSize="small" />
                </IconButton>
              </Box>

              <Dialog
                open={showFullEditor}
                onClose={() => setShowFullEditor(false)}
                maxWidth="md"
                fullWidth
              >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">Editar corpo da requisição</Typography>
                  <IconButton onClick={() => setShowFullEditor(false)}>
                    <CloseIcon />
                  </IconButton>
                </DialogTitle>
                <DialogContent>
                  <AceEditor
                    mode="json"
                    theme="github"
                    name="requestBodyEditorFull"
                    fontSize={14}
                    showPrintMargin={false}
                    showGutter
                    highlightActiveLine
                    width="100%"
                    height="400px"
                    value={requestBody}
                    onChange={(value) => setRequestBody(value)}
                    setOptions={{ useWorker: false, tabSize: 2 }}
                    style={{ borderRadius: 4, border: "1px solid #ddd" }}
                  />
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setShowFullEditor(false)}>
                    Fechar
                  </Button>
                </DialogActions>
              </Dialog>
            </>
          )}
        </Box>
      )}

      {/* Mapping Variables Section */}
      <Button
        variant="outlined"
        size="small"
        startIcon={<LinearScaleIcon />}
        onClick={() => setShowMapping(!showMapping)}
        sx={{
          textTransform: "none",
          borderColor: "#673ab7",
          color: "#673ab7",
          "&:hover": {
            borderColor: "#5e35b1",
            bgcolor: "rgba(103, 58, 183, 0.04)",
          },
        }}
      >
        {showMapping ? "Ocultar" : "Mapear"} Variáveis da Resposta
      </Button>

      {showMapping && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Typography variant="body2" fontWeight="bold" color="#673ab7">
            Mapear dados da resposta para variáveis
          </Typography>

          {saveVariables.map((variable, index) => (
            <Grid container spacing={1} key={index} alignItems="center">
              <Grid item xs={5}>
                <Autocomplete
                  options={jsonPaths}
                  freeSolo
                  size="small"
                  value={variable.path}
                  onChange={(_, newValue) =>
                    updateSaveVariable(index, "path", newValue || "")
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Caminho"
                      placeholder="ex: data.user.id"
                      size="small"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={5}>
                <TextField
                  size="small"
                  label="Nome da variável"
                  value={variable.variable}
                  onChange={(e) =>
                    updateSaveVariable(index, "variable", e.target.value)
                  }
                  placeholder="ex: userId"
                  fullWidth
                />
              </Grid>
              <Grid item xs={2} sx={{ display: "flex", alignItems: "center" }}>
                <IconButton
                  size="small"
                  onClick={() => removeSaveVariable(index)}
                  sx={{ color: "#f44336" }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Grid>
            </Grid>
          ))}

          <Button
            variant="contained"
            size="small"
            startIcon={<AddCircleOutlineIcon />}
            onClick={addSaveVariable}
            sx={{
              bgcolor: "#673ab7",
              "&:hover": {
                bgcolor: "#5e35b1",
                boxShadow: '0 4px 8px rgba(103, 58, 183, 0.3)'
              },
              boxShadow: '0 2px 4px rgba(103, 58, 183, 0.2)',
              borderRadius: 2,
              py: 1,
              mb: 2,
              fontSize: '0.9rem',
              fontWeight: 500,
              letterSpacing: '0.2px'
            }}
          >
            Adicionar variável
          </Button>

          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 1.5,
              mt: 2,
              p: 2,
              borderRadius: 2,
              bgcolor: 'rgba(255, 193, 7, 0.08)',
              border: '1px solid rgba(255, 193, 7, 0.2)',
              transition: 'all 0.2s ease',
              '&:hover': {
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                bgcolor: 'rgba(255, 193, 7, 0.1)'
              }
            }}>
            <TipsAndUpdatesIcon fontSize="small" sx={{ color: '#f57c00', mt: 0.3 }} />
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: 'text.primary',
                  fontWeight: 500,
                  fontSize: '0.8rem',
                  display: 'block',
                  mb: 0.5
                }}
              >
                Dicas úteis:
              </Typography>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 1, lineHeight: 1.4 }}
              >
                • A resposta completa da API é salva automaticamente na variável global <strong>apiResponse</strong>
              </Typography>

              <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                Você pode usar ${"{nomeDaVariavel}"} no URL e corpo da requisição para incluir valores de variáveis.
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* Dialog para visualizar resposta completa */}
      <Dialog
        open={showFullResponse}
        onClose={() => setShowFullResponse(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Resposta completa da API</Typography>
          <IconButton onClick={() => setShowFullResponse(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {response && typeof response === "object" ? (
            <ReactJson
              src={response}
              theme="rjv-default"
              displayDataTypes={true}
              displayObjectSize={true}
              enableClipboard={true}
              collapsed={false}
              name="response"
              style={{
                padding: "15px",
                borderRadius: "8px",
                backgroundColor: "#f8f9fa"
              }}
            />
          ) : (
            <Box
              sx={{
                fontFamily: "monospace",
                whiteSpace: "pre-wrap",
                bgcolor: "#f8f9fa",
                p: 2,
                borderRadius: 1,
                border: "1px solid #dee2e6"
              }}
            >
              {String(response)}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowFullResponse(false)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Popup de salvamento */}
      {showSavePopup && (
        <Box
          sx={{
            position: 'absolute',
            top: -40,
            right: 0,
            bgcolor: 'success.main',
            color: 'white',
            px: 2,
            py: 1,
            borderRadius: 1,
            fontSize: '0.875rem',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          <SaveAltIcon fontSize="small" />
          Configuração salva!
        </Box>
      )}

      <Handle
        type="source"
        position="right"
        id="httpRequest-out"
        style={{
          right: -8,
          top: "50%",
          transform: "translateY(-50%)",
          background: "#555",
          width: 12,
          height: 12,
        }}
      />
    </Box>
  );
});

export default HttpRequestNode;