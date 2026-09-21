/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

// src/components/TriggerFlowModal/index.js

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Typography,
  Box,
  makeStyles,
} from "@material-ui/core";
import { green } from "@material-ui/core/colors";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  dialogPaper: {
    minWidth: 400,
  },
  formControl: {
    minWidth: "100%",
    marginBottom: theme.spacing(2),
  },
  loadingWrapper: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
  },
  flowDescription: {
    marginTop: theme.spacing(1),
    color: theme.palette.text.secondary,
    fontSize: "0.875rem",
  },
  noFlowsMessage: {
    textAlign: "center",
    color: theme.palette.text.secondary,
    padding: theme.spacing(2),
  },
  successIcon: {
    color: green[500],
    marginRight: theme.spacing(1),
  },
}));

const TriggerFlowModal = ({ 
  open, 
  onClose, 
  ticketId, 
  ticketStatus,
  onFlowTriggered,
  onFlowProcessing
}) => {
  const classes = useStyles();
  const [flows, setFlows] = useState([]);
  const [selectedFlow, setSelectedFlow] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingFlows, setLoadingFlows] = useState(true);

  // Carregar fluxos disponíveis
  useEffect(() => {
    const fetchFlows = async () => {
      if (!open) return;
      
      setLoadingFlows(true);
      try {
        const response = await api.get("/flowbuilder");
        
        // A resposta tem a estrutura: { flows: [...] }
        const flowsData = response.data.flows || [];
        
        console.log("Resposta da API flowbuilder:", flowsData);
        
        // Filtrar apenas fluxos ativos
        const activeFlows = flowsData.filter(flow => flow.active === true);
        setFlows(activeFlows);
        
        console.log("Fluxos ativos encontrados:", activeFlows);
      } catch (error) {
        console.error("Erro ao carregar fluxos:", error);
        toastError("Erro ao carregar fluxos disponíveis");
      } finally {
        setLoadingFlows(false);
      }
    };

    fetchFlows();
  }, [open]);

  // Reset ao abrir/fechar modal
  useEffect(() => {
    if (open) {
      setSelectedFlow("");
    }
  }, [open]);

  // ✅ NOVO: Informar o componente pai sobre o estado de processamento
  useEffect(() => {
    if (onFlowProcessing) {
      onFlowProcessing(loading);
    }
  }, [loading, onFlowProcessing]);

  const handleFlowChange = (event) => {
    setSelectedFlow(event.target.value);
  };

  const handleTriggerFlow = async () => {
    if (!selectedFlow) {
      toast.warning("Selecione um fluxo para disparar");
      return;
    }

    setLoading(true);
    try {
      console.log("🎯 Disparando fluxo:", selectedFlow, "para ticket:", ticketId);
      
      const response = await api.post(`/tickets/${ticketId}/trigger-flow`, {
        flowId: selectedFlow
      });

      if (response.data.success) {
        toast.success("Fluxo disparado com sucesso!");
        
        console.log("✅ Fluxo disparado com sucesso:", response.data.data);
        
        // Callback para notificar o componente pai
        if (onFlowTriggered) {
          onFlowTriggered(response.data.data);
        }
        
        onClose();
      }
    } catch (error) {
      console.error("❌ Erro ao disparar fluxo:", error);
      const errorMessage = error.response?.data?.error || "Erro ao disparar fluxo";
      toastError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const getSelectedFlowInfo = () => {
    if (!selectedFlow) return null;
    return flows.find(flow => flow.id === selectedFlow);
  };

  const selectedFlowInfo = getSelectedFlowInfo();

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      classes={{ paper: classes.dialogPaper }}
    >
      <DialogTitle>
        {i18n.t("triggerFlowModal.title")}
      </DialogTitle>
      
      <DialogContent>
        {loadingFlows ? (
          <div className={classes.loadingWrapper}>
            <CircularProgress />
          </div>
        ) : flows.length === 0 ? (
          <div className={classes.noFlowsMessage}>
            <Typography variant="body1">
              {i18n.t("triggerFlowModal.noFlows")}
            </Typography>
          </div>
        ) : (
          <>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              {i18n.t("triggerFlowModal.description")}
            </Typography>
            
            <FormControl className={classes.formControl}>
              <InputLabel id="flow-select-label">
                {i18n.t("triggerFlowModal.selectFlow")}
              </InputLabel>
              <Select
                labelId="flow-select-label"
                value={selectedFlow}
                onChange={handleFlowChange}
                disabled={loading}
              >
                {flows.map((flow) => (
                  <MenuItem key={flow.id} value={flow.id}>
                    {flow.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {selectedFlowInfo && (
              <Box className={classes.flowDescription}>
                <Typography variant="caption" display="block">
                  <strong>{i18n.t("triggerFlowModal.selectedFlow")}:</strong> {selectedFlowInfo.name}
                </Typography>
                <Typography variant="caption" display="block">
                  <strong>{i18n.t("triggerFlowModal.flowId")}:</strong> {selectedFlowInfo.id}
                </Typography>
              </Box>
            )}

            {/* ✅ NOVO: Indicador visual quando fluxo está sendo processado */}
            {loading && (
              <Box 
                display="flex" 
                alignItems="center" 
                justifyContent="center" 
                mt={2}
                p={2}
                bgcolor="action.hover"
                borderRadius={1}
              >
                <CircularProgress size={20} style={{ marginRight: 8 }} />
                <Typography variant="body2" color="textSecondary">
                  Disparando fluxo... Campo de mensagem temporariamente desabilitado.
                </Typography>
              </Box>
            )}
          </>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={handleClose} 
          color="secondary"
          disabled={loading}
        >
          {i18n.t("triggerFlowModal.cancel")}
        </Button>
        <Button
          onClick={handleTriggerFlow}
          color="primary"
          variant="contained"
          disabled={loading || !selectedFlow || loadingFlows || flows.length === 0}
          startIcon={loading && <CircularProgress size={20} />}
        >
          {loading 
            ? i18n.t("triggerFlowModal.triggering")
            : i18n.t("triggerFlowModal.trigger")
          }
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TriggerFlowModal;