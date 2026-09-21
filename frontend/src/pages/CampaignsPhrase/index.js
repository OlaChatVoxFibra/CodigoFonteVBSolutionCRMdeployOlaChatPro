/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/* eslint-disable no-unused-vars */

import React, { useState, useEffect, useReducer, useContext } from "react";
import { toast } from "react-toastify";

import { useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import Typography from "@material-ui/core/Typography";

import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";
import { isArray } from "lodash";
import { AuthContext } from "../../context/Auth/AuthContext";
import CampaignModalPhrase from "../../components/CampaignModalPhrase";
import { AddCircle, TextFields, Link as LinkIcon } from "@mui/icons-material";
import { CircularProgress, Grid, Stack, Chip, Box, Tooltip } from "@mui/material";
import { Can } from "../../components/Can";
import {
  colorBackgroundTable,
  colorLineTable,
  colorLineTableHover,
  colorTopTable,
} from "../../styles/styles";

const reducer = (state, action) => {
  if (action.type === "LOAD_CAMPAIGNS") {
    const campaigns = action.payload;
    const newCampaigns = [];

    if (isArray(campaigns)) {
      campaigns.forEach((campaign) => {
        const campaignIndex = state.findIndex((u) => u.id === campaign.id);
        if (campaignIndex !== -1) {
          state[campaignIndex] = campaign;
        } else {
          newCampaigns.push(campaign);
        }
      });
    }

    return [...state, ...newCampaigns];
  }

  if (action.type === "UPDATE_CAMPAIGNS") {
    const campaign = action.payload;
    const campaignIndex = state.findIndex((u) => u.id === campaign.id);

    if (campaignIndex !== -1) {
      state[campaignIndex] = campaign;
      return [...state];
    } else {
      return [campaign, ...state];
    }
  }

  if (action.type === "DELETE_CAMPAIGN") {
    const campaignId = action.payload;

    const campaignIndex = state.findIndex((u) => u.id === campaignId);
    if (campaignIndex !== -1) {
      state.splice(campaignIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }
};

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    backgroundColor:
      theme.palette.type === "dark"
        ? theme.palette.listScrollArea
        : colorBackgroundTable(),
    borderRadius: 12,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
  whatsappChip: {
    margin: "2px",
    fontSize: "0.75rem",
    height: "20px"
  },
  connectionContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "4px",
    alignItems: "center"
  }
}));

const CampaignsPhrase = () => {
  const classes = useStyles();
  const history = useHistory();
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deletingContact, setDeletingContact] = useState(null);

  // Estados das campanhas
  const [campaignflows, setCampaignFlows] = useState([]);
  const [ModalOpenPhrase, setModalOpenPhrase] = useState(false);
  const [campaignflowSelected, setCampaignFlowSelected] = useState();

  // Estado para lista de WhatsApps (para exibir nomes)
  const [whatsApps, setWhatsApps] = useState([]);

  const handleDeleteCampaign = async (campaignId) => {
    try {
      await api.delete(`/flowcampaign/${campaignId}`);
      toast.success("Campanha deletada com sucesso");
      getCampaigns();
    } catch (err) {
      toastError(err);
    }
    setConfirmModalOpen(false);
    setDeletingContact(null);
  };

  // Buscar lista de WhatsApps para mostrar nomes
  const getWhatsApps = async () => {
    try {
      const response = await api.get("/whatsapp");
      setWhatsApps(response.data || []);
    } catch (error) {
      console.error('Erro ao buscar WhatsApps:', error);
    }
  };

  const getCampaigns = async () => {
    try {
      setLoading(true);
      const response = await api.get("/flowcampaign");
      
      console.log('Resposta completa da API:', response.data);
      
      // Verificar diferentes estruturas de resposta possíveis
      let flowData = [];
      
      if (response.data) {
        if (Array.isArray(response.data.flow)) {
          flowData = response.data.flow;
        }
        else if (response.data.data && Array.isArray(response.data.data.flow)) {
          flowData = response.data.data.flow;
        }
        else if (Array.isArray(response.data.data)) {
          flowData = response.data.data;
        }
        else if (Array.isArray(response.data)) {
          flowData = response.data;
        }
        else {
          const dataKeys = Object.keys(response.data);
          for (const key of dataKeys) {
            if (Array.isArray(response.data[key])) {
              flowData = response.data[key];
              break;
            }
          }
        }
      }
      
      console.log('Dados das campanhas extraídos:', flowData);
      setCampaignFlows(flowData);
      
    } catch (error) {
      console.error('Erro ao buscar campanhas:', error);
      toastError(error);
      setCampaignFlows([]);
    } finally {
      setLoading(false);
    }
  };

  const onSaveModal = () => {
    getCampaigns();
  };

  // NOVA FUNÇÃO: Renderizar chips das conexões
  const renderWhatsAppConnections = (whatsappIds) => {
    if (!whatsappIds || !Array.isArray(whatsappIds) || whatsappIds.length === 0) {
      return <Typography variant="body2" color="textSecondary">Nenhuma conexão</Typography>;
    }

    // Se há muitas conexões, mostrar resumo
    if (whatsappIds.length > 3) {
      const firstTwo = whatsappIds.slice(0, 2);
      const remaining = whatsappIds.length - 2;

      return (
        <Box className={classes.connectionContainer}>
          {firstTwo.map((whatsappId) => {
            const whatsapp = whatsApps.find(w => w.id === whatsappId);
            return (
              <Tooltip key={whatsappId} title={whatsapp ? `${whatsapp.name} (${whatsapp.status})` : `ID: ${whatsappId}`}>
                <Chip 
                  label={whatsapp ? whatsapp.name : `ID: ${whatsappId}`}
                  className={classes.whatsappChip}
                  size="small"
                  color={whatsapp?.status === "CONNECTED" ? "success" : "default"}
                  variant="outlined"
                />
              </Tooltip>
            );
          })}
          <Tooltip title={`Mais ${remaining} conexão(ões)`}>
            <Chip 
              label={`+${remaining}`}
              className={classes.whatsappChip}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Tooltip>
        </Box>
      );
    }

    // Mostrar todas as conexões se forem poucas
    return (
      <Box className={classes.connectionContainer}>
        {whatsappIds.map((whatsappId) => {
          const whatsapp = whatsApps.find(w => w.id === whatsappId);
          return (
            <Tooltip key={whatsappId} title={whatsapp ? `${whatsapp.name} (${whatsapp.status})` : `ID: ${whatsappId}`}>
              <Chip 
                label={whatsapp ? whatsapp.name : `ID: ${whatsappId}`}
                className={classes.whatsappChip}
                size="small"
                color={whatsapp?.status === "CONNECTED" ? "success" : "default"}
                variant="outlined"
              />
            </Tooltip>
          );
        })}
      </Box>
    );
  };

  useEffect(() => {
    getCampaigns();
    getWhatsApps(); // Carregar lista de WhatsApps
  }, []);

  return (
    <MainContainer>
      <ConfirmationModal
        title={
          deletingContact &&
          `${i18n.t("campaigns.confirmationModal.deleteTitle")} ${
            deletingContact.name
          }?`
        }
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => handleDeleteCampaign(deletingContact.id)}
      >
        {i18n.t("campaigns.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <CampaignModalPhrase
        open={ModalOpenPhrase}
        onClose={() => setModalOpenPhrase(false)}
        FlowCampaignId={campaignflowSelected}
        onSave={onSaveModal}
      />
      <MainHeader>
        <Grid style={{ width: "99.6%" }} container>
          <Grid xs={12} sm={8} item>
            <Title>Campanhas de Fluxo</Title>
          </Grid>
          <Grid xs={12} sm={4} item>
            <Grid spacing={2} container>
              <Grid xs={6} sm={6} item>
                {/* Campo de busca comentado */}
              </Grid>
              <Grid xs={6} sm={6} item>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => {
                    setCampaignFlowSelected(undefined);
                    setModalOpenPhrase(true);
                  }}
                  color="primary"
                  style={{ textTransform: "none" }}
                >
                  <Stack direction={"row"} gap={1}>
                    <AddCircle />
                    {"Nova Campanha"}
                  </Stack>
                </Button>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </MainHeader>
      <Paper
        className={classes.mainPaper}
        variant="outlined"
      >
        <Stack>
          {/* ALTERAÇÃO: Header da tabela com nova coluna de conexões */}
          <Grid container style={{ padding: "8px" }}>
            <Grid item xs={3} style={{ color: colorTopTable() }}>
              Nome
            </Grid>
            <Grid item xs={3} style={{ color: colorTopTable() }} align="center">
              Conexões
            </Grid>
            <Grid item xs={3} style={{ color: colorTopTable() }} align="center">
              Status
            </Grid>
            <Grid item xs={3} align="end" style={{ color: colorTopTable() }}>
              {i18n.t("contacts.table.actions")}
            </Grid>
          </Grid>
          
          {loading ? (
            <Stack
              justifyContent={"center"}
              alignItems={"center"}
              minHeight={"50vh"}
            >
              <CircularProgress />
            </Stack>
          ) : (
            <>
              {campaignflows && Array.isArray(campaignflows) && campaignflows.length > 0 ? (
                campaignflows.map((flow) => (
                  <Grid
                    container
                    key={flow.id}
                    sx={{
                      padding: "8px",
                      backgroundColor: colorLineTable(),
                      borderRadius: 4,
                      marginTop: 0.5,
                      "&:hover": {
                        backgroundColor: colorLineTableHover(),
                      },
                    }}
                  >
                    {/* Coluna do Nome */}
                    <Grid item xs={3}>
                      <Stack
                        justifyContent={"center"}
                        height={"100%"}
                        style={{ color: "#ededed" }}
                      >
                        <Stack direction={"row"} alignItems="center">
                          <TextFields />
                          <Stack justifyContent={"center"} marginLeft={1}>
                            <Typography variant="body2" style={{ fontWeight: 500 }}>
                              {flow.name || 'Nome não definido'}
                            </Typography>
                            {/* Exibir número de frases como informação adicional */}
                            {flow.phrase && Array.isArray(flow.phrase) && (
                              <Typography variant="caption" style={{ color: "#bbb" }}>
                                {flow.phrase.length} frase(s) configurada(s)
                              </Typography>
                            )}
                          </Stack>
                        </Stack>
                      </Stack>
                    </Grid>

                    {/* NOVA COLUNA: Conexões WhatsApp */}
                    <Grid item xs={3} align="center">
                      <Stack justifyContent={"center"} height={"100%"}>
                        {renderWhatsAppConnections(flow.whatsappIds)}
                      </Stack>
                    </Grid>

                    {/* Coluna do Status */}
                    <Grid item xs={3} align="center" style={{ color: "#ededed" }}>
                      <Stack justifyContent={"center"} height={"100%"}>
                        <Chip 
                          label={flow.status ? "Ativo" : "Desativado"}
                          size="small"
                          color={flow.status ? "success" : "default"}
                          variant={flow.status ? "filled" : "outlined"}
                        />
                      </Stack>
                    </Grid>

                    {/* Coluna das Ações */}
                    <Grid item xs={3} align="end">
                      <Stack direction="row" justifyContent="flex-end" alignItems="center">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setCampaignFlowSelected(flow.id);
                            setModalOpenPhrase(true);
                          }}
                          title="Editar campanha"
                        >
                          <EditIcon style={{ color: "#ededed" }} />
                        </IconButton>
                        <Can
                          role={user.profile}
                          perform="contacts-page:deleteContact"
                          yes={() => (
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                setConfirmModalOpen(true);
                                setDeletingContact(flow);
                              }}
                              title="Excluir campanha"
                            >
                              <DeleteOutlineIcon style={{ color: "#ededed" }} />
                            </IconButton>
                          )}
                        />
                      </Stack>
                    </Grid>
                  </Grid>
                ))
              ) : (
                <Stack
                  justifyContent={"center"}
                  alignItems={"center"}
                  minHeight={"20vh"}
                  style={{ color: "#ededed" }}
                >
                  <Typography variant="body1">
                    Nenhuma campanha encontrada
                  </Typography>
                  <Typography variant="body2" style={{ marginTop: "8px", color: "#bbb" }}>
                    Clique em "Nova Campanha" para criar sua primeira campanha de fluxo
                  </Typography>
                </Stack>
              )}
            </>
          )}
        </Stack>
      </Paper>
    </MainContainer>
  );
};

export default CampaignsPhrase;