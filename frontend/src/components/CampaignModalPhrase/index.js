/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useContext, useRef, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogActions,
  Button,
  TextField,
  Stack,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  IconButton,
  Box,
  Autocomplete,
  ListItemText,
  Divider,
  Alert,
  Chip
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Help as HelpIcon
} from "@mui/icons-material";
import { makeStyles } from "@mui/styles";
import { green, red } from "@mui/material/colors";
import { AuthContext } from "../../context/Auth/AuthContext";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import { toast } from "react-toastify";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
  },
  textField: {
    marginRight: 8,
    flex: 1,
  },
  btnWrapper: {
    position: "relative",
  },
  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
  online: {
    color: green[500],
  },
  offline: {
    color: red[500],
  },
  phraseContainer: {
    border: "1px solid #e0e0e0",
    borderRadius: "8px",
    padding: "16px",
    marginBottom: "8px",
    backgroundColor: "#fafafa"
  },
  addButton: {
    alignSelf: 'flex-start',
    marginTop: "8px"
  },
  whatsappChip: {
    margin: "2px"
  }
}));

const CampaignModalPhrase = ({ open, onClose, FlowCampaignId, onSave }) => {
  const classes = useStyles();
  const isMounted = useRef(true);
  const { user } = useContext(AuthContext);
  
  const companyId = user?.companyId;

  // Estados básicos
  const [campaignEditable, setCampaignEditable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(true);

  // Estados do formulário
  const [dataItem, setDataItem] = useState({
    name: "",
  });

  const [dataItemError, setDataItemError] = useState({
    name: false,
    flowId: false,
    phrases: false,
    whatsappIds: false, // NOVA VALIDAÇÃO
  });

  // Estado para múltiplas frases
  const [phrases, setPhrases] = useState([
    { text: "", type: "exact" }
  ]);

  // Estados para flows e whatsapp
  const [flowSelected, setFlowSelected] = useState(null);
  const [flowsData, setFlowsData] = useState([]);
  const [flowsDataComplete, setFlowsDataComplete] = useState([]);
  
  // ALTERAÇÃO: Estado para múltiplas conexões
  const [selectedWhatsapps, setSelectedWhatsapps] = useState([]);
  const [whatsApps, setWhatsApps] = useState([]);

  // Buscar flows
  const getFlows = async () => {
    try {
      const flows = await api.get("/flowbuilder");
      if (isMounted.current) {
        setFlowsDataComplete(flows.data.flows || []);
        setFlowsData((flows.data.flows || []).map((flow) => flow.name));
      }
      return flows.data.flows || [];
    } catch (error) {
      console.error("Erro ao buscar flows:", error);
      if (isMounted.current) {
        toast.error("Erro ao carregar fluxos");
      }
      return [];
    }
  };

  // Buscar WhatsApps
  const getWhatsApps = async () => {
    try {
      const response = await api.get("/whatsapp");
      if (isMounted.current) {
        setWhatsApps(response.data || []);
      }
    } catch (error) {
      console.error("Erro ao buscar WhatsApps:", error);
      if (isMounted.current) {
        toast.error("Erro ao carregar conexões");
      }
    }
  };

  // Carregar dados se for edição
  const detailsPhrase = async (flows) => {
    if (!FlowCampaignId || !isMounted.current) return;
    
    setLoading(true);
    try {
      console.log(`Buscando dados da campanha ID: ${FlowCampaignId}`);
      const response = await api.get(`/flowcampaign/${FlowCampaignId}`);
      console.log("Resposta da API detailsPhrase:", response.data);
      
      const details = response.data;
      
      if (!isMounted.current) return;
      
      // Preencher nome da campanha
      setDataItem({
        name: details.name || "",
      });
      
      // Preencher status
      setActive(details.status !== false);
      
      // ALTERAÇÃO: Preencher WhatsApps selecionados (múltiplos)
      if (details.whatsappIds && Array.isArray(details.whatsappIds)) {
        setSelectedWhatsapps(details.whatsappIds);
      } else if (details.whatsappId) {
        // Compatibilidade com formato antigo
        setSelectedWhatsapps([details.whatsappId]);
      }
      
      // Processar frases
      let parsedPhrases = [];
      try {
        if (details.phrase) {
          if (typeof details.phrase === 'string') {
            try {
              const parsed = JSON.parse(details.phrase);
              if (Array.isArray(parsed)) {
                parsedPhrases = parsed;
              } else {
                parsedPhrases = [{ text: details.phrase, type: 'exact' }];
              }
            } catch {
              parsedPhrases = [{ text: details.phrase, type: 'exact' }];
            }
          } else if (Array.isArray(details.phrase)) {
            parsedPhrases = details.phrase;
          } else if (typeof details.phrase === 'object') {
            parsedPhrases = [details.phrase];
          }
        }
        
        parsedPhrases = parsedPhrases.map(phrase => ({
          text: phrase.text || phrase,
          type: phrase.type || 'exact'
        }));
        
        if (parsedPhrases.length === 0) {
          parsedPhrases = [{ text: "", type: "exact" }];
        }
        
        console.log("Frases processadas:", parsedPhrases);
        setPhrases(parsedPhrases);
      } catch (error) {
        console.error("Erro ao processar frases:", error);
        setPhrases([{ text: "", type: "exact" }]);
      }
      
      // Selecionar flow
      if (details.flowId && flows && flows.length > 0) {
        const foundFlow = flows.find((flow) => flow.id === details.flowId);
        if (foundFlow) {
          console.log("Flow encontrado:", foundFlow.name);
          setFlowSelected(foundFlow.name);
        } else {
          console.warn("Flow não encontrado para ID:", details.flowId);
        }
      }
      
    } catch (error) {
      console.error("Erro ao carregar detalhes:", error);
      if (isMounted.current) {
        toast.error("Erro ao carregar dados da campanha");
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  // Resetar estados quando modal abre/fecha
  const resetForm = () => {
    setDataItem({ name: "" });
    setPhrases([{ text: "", type: "exact" }]);
    setFlowSelected(null);
    setSelectedWhatsapps([]); // ALTERAÇÃO: Resetar array
    setActive(true);
    clearErrors();
  };

  // Inicialização
  useEffect(() => {
    isMounted.current = true;
    
    const initData = async () => {
      if (open) {
        console.log("Modal aberto. FlowCampaignId:", FlowCampaignId);
        
        resetForm();
        
        const flows = await getFlows();
        await getWhatsApps();
        
        if (FlowCampaignId) {
          await detailsPhrase(flows);
        }
      }
    };
    
    initData();

    return () => {
      isMounted.current = false;
    };
  }, [open, FlowCampaignId]);

  // Função para adicionar nova frase
  const addPhraseField = () => {
    setPhrases(prevPhrases => [...prevPhrases, { text: "", type: "exact" }]);
  };

  // Função para remover frase
  const removePhraseField = (index) => {
    if (phrases.length > 1) {
      setPhrases(prevPhrases => prevPhrases.filter((_, i) => i !== index));
    }
  };

  // Função para atualizar frase específica
  const updatePhrase = (index, field, value) => {
    setPhrases(prevPhrases => {
      const newPhrases = [...prevPhrases];
      if (newPhrases[index]) {
        newPhrases[index] = { ...newPhrases[index], [field]: value };
      }
      return newPhrases;
    });
  };

  // Validação
  const validateForm = () => {
    const errors = {
      name: !dataItem.name.trim(),
      flowId: !flowSelected,
      phrases: phrases.length === 0 || phrases.some(p => !p.text.trim()),
      whatsappIds: selectedWhatsapps.length === 0 // NOVA VALIDAÇÃO
    };
    
    setDataItemError(errors);
    return !Object.values(errors).some(error => error);
  };

  // Limpar erros
  const clearErrors = () => {
    setDataItemError({
      name: false,
      flowId: false,
      phrases: false,
      whatsappIds: false,
    });
  };

  // Handler para mudanças no campo nome
  const handleNameChange = (event) => {
    const value = event.target.value;
    setDataItem(prev => ({ ...prev, name: value }));
    
    if (value.trim() && dataItemError.name) {
      setDataItemError(prev => ({ ...prev, name: false }));
    }
  };

  // NOVA FUNÇÃO: Handler para mudanças na seleção de WhatsApps
  const handleWhatsappChange = (event) => {
    const value = event.target.value;
    setSelectedWhatsapps(typeof value === 'string' ? value.split(',') : value);
    
    if (value.length > 0 && dataItemError.whatsappIds) {
      setDataItemError(prev => ({ ...prev, whatsappIds: false }));
    }
  };

  // Salvar
  const handleSave = async () => {
    if (!validateForm()) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);
    
    try {
      const flowIdSelected = flowsDataComplete.find(flow => flow.name === flowSelected)?.id;
      
      if (!flowIdSelected) {
        toast.error("Fluxo selecionado não encontrado");
        return;
      }

      // Filtrar frases vazias
      const validPhrases = phrases.filter(p => p.text.trim());
      
      const payload = {
        name: dataItem.name.trim(),
        flowId: flowIdSelected,
        phrases: validPhrases,
        whatsappIds: selectedWhatsapps, // ALTERAÇÃO: Enviar array
        status: active,
        ...(FlowCampaignId && { id: FlowCampaignId })
      };

      console.log("Payload para salvar:", payload);

      if (FlowCampaignId) {
        await api.put("/flowcampaign", payload);
        toast.success("Campanha atualizada com sucesso!");
      } else {
        await api.post("/flowcampaign", payload);
        toast.success("Campanha criada com sucesso!");
      }

      onSave && onSave();
      handleClose();
      
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar campanha");
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  };

  // Fechar modal
  const handleClose = () => {
    if (!isMounted.current) return;
    
    resetForm();
    onClose();
  };

  // Verificação de segurança antes de renderizar
  if (!user || !companyId) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      scroll="paper"
      disableEscapeKeyDown={loading}
    >
      <DialogTitle>
        {campaignEditable ? (
          <>
            {FlowCampaignId
              ? `${i18n.t("campaignsPhrase.editCampaignWithFlowByPhrase")}`
              : `${i18n.t("campaignsPhrase.newCampaignWithFlowByPhrase")}`}
          </>
        ) : (
          <>{`${i18n.t("campaigns.dialog.readonly")}`}</>
        )}
      </DialogTitle>

      {!loading && (
        <Stack sx={{ padding: "24px", gap: "20px" }}>
          {/* Nome da Campanha */}
          <Stack gap={1}>
            <Typography variant="subtitle1" fontWeight={500}>
              {i18n.t("campaignsPhrase.phraseTriggerName")}
            </Typography>
            <TextField
              label="Nome da campanha"
              name="name"
              variant="outlined"
              error={dataItemError.name}
              value={dataItem.name}
              margin="dense"
              onChange={handleNameChange}
              className={classes.textField}
              style={{ width: "100%" }}
              helperText={dataItemError.name ? "Nome é obrigatório" : ""}
              disabled={loading}
            />
          </Stack>

          {/* Seleção do Fluxo */}
          <Stack gap={1}>
            <Typography variant="subtitle1" fontWeight={500}>
              {i18n.t("campaignsPhrase.chooseAStream")}
            </Typography>
            <Autocomplete
              value={flowSelected}
              onChange={(event, newValue) => {
                setFlowSelected(newValue);
                if (newValue && dataItemError.flowId) {
                  setDataItemError(prev => ({ ...prev, flowId: false }));
                }
              }}
              options={flowsData}
              disabled={loading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Selecione um fluxo"
                  variant="outlined"
                  error={dataItemError.flowId}
                  helperText={dataItemError.flowId ? "Fluxo é obrigatório" : ""}
                />
              )}
              style={{ width: "100%" }}
            />
          </Stack>

          {/* ALTERAÇÃO: Seleção de Múltiplas Conexões WhatsApp */}
          <Stack gap={1}>
            <Typography variant="subtitle1" fontWeight={500}>
              {i18n.t("campaignsPhrase.selectAConnection")} (Múltiplas)
            </Typography>
            <FormControl fullWidth variant="outlined" error={dataItemError.whatsappIds}>
              <InputLabel>Conexões WhatsApp</InputLabel>
              <Select
                multiple
                value={selectedWhatsapps}
                onChange={handleWhatsappChange}
                label="Conexões WhatsApp"
                disabled={loading}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((whatsappId) => {
                      const whatsapp = whatsApps.find(w => w.id === whatsappId);
                      return (
                        <Chip 
                          key={whatsappId} 
                          label={whatsapp ? whatsapp.name : `ID: ${whatsappId}`}
                          className={classes.whatsappChip}
                          size="small"
                          color={whatsapp?.status === "CONNECTED" ? "success" : "default"}
                        />
                      );
                    })}
                  </Box>
                )}
              >
                {whatsApps?.length > 0 &&
                  whatsApps.map((whatsapp) => (
                    <MenuItem key={whatsapp.id} value={whatsapp.id}>
                      <Checkbox checked={selectedWhatsapps.indexOf(whatsapp.id) > -1} />
                      <ListItemText
                        primary={
                          <Typography component="span" style={{ fontSize: 14 }}>
                            {whatsapp.name} &nbsp;
                            <span
                              className={
                                whatsapp.status === "CONNECTED"
                                  ? classes.online
                                  : classes.offline
                              }
                            >
                              ({whatsapp.status})
                            </span>
                          </Typography>
                        }
                      />
                    </MenuItem>
                  ))}
              </Select>
              {dataItemError.whatsappIds && (
                <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                  Pelo menos uma conexão deve ser selecionada
                </Typography>
              )}
            </FormControl>
            
            {/* Informação sobre conexões selecionadas */}
            {selectedWhatsapps.length > 0 && (
              <Alert severity="info" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  <strong>{selectedWhatsapps.length} conexão(ões) selecionada(s):</strong><br/>
                  A campanha será executada quando qualquer uma dessas conexões receber mensagens que façam match com as frases configuradas.
                </Typography>
              </Alert>
            )}
          </Stack>

          <Divider />

          {/* Seção de Frases Múltiplas */}
          <Stack gap={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="subtitle1" fontWeight={500}>
                Frases/Palavras que disparam o fluxo
              </Typography>
              <IconButton size="small">
                <HelpIcon fontSize="small" />
              </IconButton>
            </Box>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Correspondência Exata:</strong> A mensagem deve ser idêntica à frase configurada.<br/>
                <strong>Correspondência Parcial:</strong> A frase pode estar contida em qualquer parte da mensagem.
              </Typography>
            </Alert>

            {phrases.map((phrase, index) => (
              <Box key={index} className={classes.phraseContainer}>
                <Stack direction="row" gap={2} alignItems="flex-start">
                  <TextField
                    label={`Frase ${index + 1}`}
                    value={phrase.text}
                    onChange={(e) => {
                      updatePhrase(index, 'text', e.target.value);
                      if (e.target.value.trim() && dataItemError.phrases) {
                        setDataItemError(prev => ({ ...prev, phrases: false }));
                      }
                    }}
                    variant="outlined"
                    fullWidth
                    placeholder="Digite a frase ou palavra-chave"
                    error={dataItemError.phrases && !phrase.text.trim()}
                    helperText={
                      dataItemError.phrases && !phrase.text.trim() 
                        ? "Frase é obrigatória" 
                        : ""
                    }
                    disabled={loading}
                  />
                  
                  <FormControl sx={{ minWidth: 140 }}>
                    <InputLabel>Tipo</InputLabel>
                    <Select
                      value={phrase.type}
                      onChange={(e) => updatePhrase(index, 'type', e.target.value)}
                      label="Tipo"
                      disabled={loading}
                    >
                      <MenuItem value="exact">Exata</MenuItem>
                      <MenuItem value="partial">Parcial</MenuItem>
                    </Select>
                  </FormControl>
                  
                  {phrases.length > 1 && (
                    <IconButton 
                      onClick={() => removePhraseField(index)}
                      color="error"
                      sx={{ mt: 1 }}
                      disabled={loading}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Stack>
              </Box>
            ))}
            
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addPhraseField}
              className={classes.addButton}
              disabled={loading}
            >
              Adicionar Frase
            </Button>
          </Stack>

          <Divider />

          {/* Status */}
          <Stack direction="row" gap={2} alignItems="center">
            <Typography variant="subtitle1" fontWeight={500}>
              {i18n.t("campaignsPhrase.status")}
            </Typography>
            <Checkbox
              checked={active}
              onChange={() => setActive(prev => !prev)}
              disabled={loading}
            />
            <Typography variant="body2" color="textSecondary">
              {active ? "Ativa" : "Inativa"}
            </Typography>
          </Stack>
        </Stack>
      )}

      <DialogActions sx={{ padding: "16px 24px" }}>
        <Button
          variant="outlined"
          onClick={handleClose}
          disabled={loading}
        >
          {i18n.t("campaignsPhrase.cancel")}
        </Button>
        
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? "Salvando..." : FlowCampaignId ? "Atualizar" : "Criar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CampaignModalPhrase;