/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useContext, useEffect } from "react";
import { useHistory } from "react-router-dom";
import { toast } from "react-toastify";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Typography,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  makeStyles,
} from "@material-ui/core";
import { useTheme } from "@material-ui/core/styles";
import {
  HELVETICA_NEUE,
  getTopbarMain,
  getTopbarContrast,
  getTopbarHover,
  appleSelectMenuProps,
  appleMenuItemProps,
} from "../../utils/appleModalTheme";

const useStyles = makeStyles((theme) => {
  const topbar = getTopbarMain(theme);
  const topbarHover = getTopbarHover(theme);
  const topbarContrast = getTopbarContrast(theme);
  const isDark = theme.palette.type === "dark";

  return {
  paper: {
    borderRadius: 20,
    maxWidth: 380,
    overflow: "hidden",
    fontFamily: HELVETICA_NEUE,
    fontWeight: 400,
    backgroundColor: isDark
      ? "rgba(44,44,46,0.9)"
      : "rgba(255,255,255,0.94)",
    backdropFilter: "saturate(200%) blur(28px)",
    WebkitBackdropFilter: "saturate(200%) blur(28px)",
    boxShadow: isDark
      ? "0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)"
      : "0 24px 64px rgba(15,23,42,0.16), inset 0 1px 0 rgba(255,255,255,0.95)",
    border: isDark
      ? "0.5px solid rgba(255,255,255,0.12)"
      : "0.5px solid rgba(255,255,255,0.8)",
  },
  title: {
    padding: theme.spacing(2, 2.5, 0.5),
    fontFamily: HELVETICA_NEUE,
    "& h2": {
      fontSize: 15,
      fontWeight: 400,
      letterSpacing: "-0.03em",
    },
  },
  content: {
    padding: theme.spacing(0.5, 2.5, 1.5),
    fontFamily: HELVETICA_NEUE,
    fontWeight: 400,
    "& .MuiFormLabel-root": {
      fontFamily: HELVETICA_NEUE,
      fontSize: 11,
      fontWeight: 400,
      letterSpacing: "-0.01em",
    },
    "& .MuiInputBase-root": {
      fontFamily: HELVETICA_NEUE,
      fontSize: 12,
      fontWeight: 400,
      borderRadius: 11,
    },
    "& .MuiInputBase-input": {
      fontSize: 12,
      padding: "9px 11px",
    },
    "& .MuiFormControlLabel-label": {
      fontFamily: HELVETICA_NEUE,
      fontSize: 12,
      fontWeight: 400,
    },
    "& .MuiTypography-root": {
      fontFamily: HELVETICA_NEUE,
      fontWeight: 400,
    },
    "& .MuiFormLabel-root.Mui-focused": {
      fontWeight: 400,
    },
    "& legend.MuiFormLabel-root": {
      fontSize: 12,
      fontWeight: 400,
    },
  },
  actions: {
    display: "flex",
    padding: theme.spacing(1.25, 2, 2),
    gap: theme.spacing(0.75),
    borderTop: isDark
      ? "0.5px solid rgba(255,255,255,0.08)"
      : "0.5px solid rgba(60,60,67,0.1)",
    "& > button": {
      flex: 1,
      textTransform: "none",
      borderRadius: 12,
      fontFamily: HELVETICA_NEUE,
      fontSize: 13,
      fontWeight: 400,
      letterSpacing: "-0.01em",
      minHeight: 36,
      padding: "7px 14px",
      boxShadow: "none",
    },
  },
  actionsPrimary: {
    flex: 1,
    backgroundColor: `${topbar} !important`,
    color: `${topbarContrast} !important`,
    "&:hover": {
      backgroundColor: `${topbarHover} !important`,
    },
  },
  actionsSecondary: {
    flex: 1,
    color: `${theme.palette.text.primary} !important`,
    backgroundColor: isDark
      ? "rgba(120,120,128,0.28) !important"
      : "rgba(120,120,128,0.16) !important",
    border: "none !important",
    "&:hover": {
      backgroundColor:
        theme.palette.type === "dark"
          ? "rgba(120,120,128,0.36) !important"
          : "rgba(120,120,128,0.22) !important",
    },
  },
  };
});

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";

const FinalizacaoVendaModal = ({ open, onClose, ticket, onFinalizar }) => {
  const classes = useStyles();
  const theme = useTheme();
  const history = useHistory();
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [vendaConcluida, setVendaConcluida] = useState(true);
  const [valorVenda, setValorVenda] = useState("");
  const [motivoNaoVenda, setMotivoNaoVenda] = useState("");
  const [motivoFinalizacao, setMotivoFinalizacao] = useState("");
  const [motivosFinalizacao, setMotivosFinalizacao] = useState([]);
  const [informarValorVenda, setInformarValorVenda] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [ticketDataToFinalize, setTicketDataToFinalize] = useState(null);

  const handleClose = () => {
    onClose();
    setVendaConcluida(true);
    setValorVenda("");
    setMotivoNaoVenda("");
    setMotivoFinalizacao("");
  };

  useEffect(() => {
    const fetchConfig = async () => {
      setLoadingConfig(true);
      try {
        const { data } = await api.get("/companySettings");
        // Ajustando a lógica de busca conforme o padrão esperado no banco
        const config = Array.isArray(data) ? data.find((s) => s.column === "informarValorVenda") : null;
        if (config) {
          setInformarValorVenda(config.data === "true" || config.data === true);
        } else {
          setInformarValorVenda(data.informarValorVenda || false);
        }

        const { data: motivos } = await api.get("/ticketFinalizationReasons");
        
        // ✅ ADIÇÃO DE OPÇÕES PADRÃO SE A LISTA ESTIVER VAZIA
        if (!motivos || motivos.length === 0) {
          setMotivosFinalizacao([
            { id: 'default1', name: "Atendimento Concluído" },
            { id: 'default2', name: "Suporte Realizado" },
            { id: 'default3', name: "Venda Finalizada" },
            { id: 'default4', name: "Dúvida Sanada" },
            { id: 'default5', name: "Outros" }
          ]);
        } else {
          setMotivosFinalizacao(motivos);
        }
      } catch (err) {
        console.error("Erro ao carregar configurações de finalização", err);
        // ✅ FALLBACK EM CASO DE ERRO DE API
        setMotivosFinalizacao([
          { id: 'default1', name: "Atendimento Concluído" },
          { id: 'default2', name: "Venda Realizada" },
          { id: 'default3', name: "Suporte Técnico" },
          { id: 'default4', name: "Outros" }
        ]);
      } finally {
        setLoadingConfig(false);
      }
    };

    if (open) {
      fetchConfig();
    }
  }, [open]);

  const handleSubmit = async () => {
    if (informarValorVenda) {
      // Check ativado: lógica antiga
      if (vendaConcluida) {
        if (!valorVenda) {
          toast.error("Por favor, informe o valor da venda.");
          return;
        }
      } else {
        if (!motivoNaoVenda) {
          toast.error("Por favor, selecione o motivo da não venda.");
          return;
        }
      }
    } else {
      // Check desativado: só motivo de finalização
      if (!motivoFinalizacao) {
        toast.error("Por favor, selecione o motivo da finalização.");
        return;
      }
    }

    // Em vez de finalizar aqui, apenas passa os dados para o pai
    const ticketData = {
      status: "closed",
      userId: user?.id || null,
      // sendFarewellMessage e finalizacaoMessage serão definidos no modal seguinte
    };

    if (informarValorVenda) {
      ticketData.finalizadoComVenda = vendaConcluida;
      if (vendaConcluida) {
        ticketData.valorVenda = parseFloat(valorVenda);
        ticketData.motivoNaoVenda = null;
        ticketData.motivoFinalizacao = null;
      } else {
        ticketData.valorVenda = null;
        ticketData.motivoNaoVenda = motivoNaoVenda;
        ticketData.motivoFinalizacao = null;
      }
    } else {
      ticketData.finalizadoComVenda = null;
      ticketData.valorVenda = null;
      ticketData.motivoNaoVenda = null;
      ticketData.motivoFinalizacao = motivoFinalizacao;
    }

    // Chama o callback passando os dados
    if (onFinalizar) onFinalizar(ticketData);
    handleClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ className: classes.paper }}
    >
      <DialogTitle className={classes.title} disableTypography>
        <Typography component="h2" style={{ fontSize: 15, fontWeight: 400, letterSpacing: "-0.03em" }}>
          Finalizar atendimento
        </Typography>
      </DialogTitle>
      {loadingConfig ? (
        <DialogContent className={classes.content}>
          <Typography variant="body2" color="textSecondary">
            Carregando configurações...
          </Typography>
        </DialogContent>
      ) : (
        <DialogContent className={classes.content}>
          <Grid container spacing={2}>
            {informarValorVenda ? (
              <>
                <Grid item xs={12}>
                  <FormControl component="fieldset">
                    <FormLabel component="legend">
                      A venda foi concluída?
                    </FormLabel>
                    <RadioGroup
                      value={vendaConcluida}
                      onChange={(e) =>
                        setVendaConcluida(e.target.value === "true")
                      }
                    >
                      <FormControlLabel
                        value={true}
                        control={<Radio />}
                        label="Sim, venda concluída"
                      />
                      <FormControlLabel
                        value={false}
                        control={<Radio />}
                        label="Não, venda não concluída"
                      />
                    </RadioGroup>
                  </FormControl>
                </Grid>
                {vendaConcluida ? (
                  <Grid item xs={12}>
                    <TextField
                      label="Valor da Venda (R$)"
                      type="number"
                      value={valorVenda}
                      onChange={(e) => setValorVenda(e.target.value)}
                      fullWidth
                      variant="outlined"
                      margin="dense"
                      size="small"
                      inputProps={{
                        step: "0.01",
                        min: "0",
                      }}
                      placeholder="0,00"
                    />
                  </Grid>
                ) : (
                  <Grid item xs={12}>
                    <FormControl
                      fullWidth
                      variant="outlined"
                      margin="dense"
                      size="small"
                      required
                    >
                      <InputLabel>Motivo da Não Venda *</InputLabel>
                      <Select
                        value={motivoNaoVenda}
                        onChange={(e) => setMotivoNaoVenda(e.target.value)}
                        label="Motivo da Não Venda *"
                        MenuProps={appleSelectMenuProps(theme)}
                      >
                        <MenuItem value="" {...appleMenuItemProps}>
                          <em>Selecione um motivo</em>
                        </MenuItem>
                        {motivosFinalizacao.map((motivo) => (
                          <MenuItem
                            key={motivo.id}
                            value={motivo.name}
                            {...appleMenuItemProps}
                          >
                            {motivo.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}
              </>
            ) : (
              <Grid item xs={12}>
                <FormControl
                  fullWidth
                  variant="outlined"
                  margin="dense"
                  size="small"
                  required
                >
                  <InputLabel>Motivo da Finalização *</InputLabel>
                  <Select
                    value={motivoFinalizacao}
                    onChange={(e) => setMotivoFinalizacao(e.target.value)}
                    label="Motivo da Finalização *"
                    MenuProps={appleSelectMenuProps(theme)}
                  >
                    <MenuItem value="" {...appleMenuItemProps}>
                      <em>Selecione um motivo</em>
                    </MenuItem>
                    {motivosFinalizacao.map((motivo) => (
                      <MenuItem
                        key={motivo.id}
                        value={motivo.name}
                        {...appleMenuItemProps}
                      >
                        {motivo.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            )}
          </Grid>
        </DialogContent>
      )}
      <DialogActions className={classes.actions}>
        <Button
          className={classes.actionsSecondary}
          size="small"
          onClick={handleClose}
          disabled={loading}
          disableElevation
        >
          Cancelar
        </Button>
        <Button
          className={classes.actionsPrimary}
          size="small"
          onClick={handleSubmit}
          variant="contained"
          disableElevation
          disabled={loading || loadingConfig}
        >
          {loading ? "Finalizando..." : "Finalizar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FinalizacaoVendaModal;
