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
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import IconButton from "@material-ui/core/IconButton";
import SearchIcon from "@material-ui/icons/Search";
import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";
import Tooltip from "@material-ui/core/Tooltip";
import Chip from "@material-ui/core/Chip";

import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import EditIcon from "@material-ui/icons/Edit";
import DescriptionIcon from "@material-ui/icons/Description";
import PlayCircleOutlineIcon from "@material-ui/icons/PlayCircleOutline";
import PauseCircleOutlineIcon from "@material-ui/icons/PauseCircleOutline";
import RepeatIcon from "@material-ui/icons/Repeat";
import StopIcon from "@material-ui/icons/Stop";
import AddIcon from "@material-ui/icons/Add";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ActivitiesStyleLayout from "../../components/ActivitiesStyleLayout";
import { useCampaignSending } from "../../context/CampaignSendingContext";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import CampaignModal from "../../components/CampaignModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import toastError from "../../errors/toastError";
import { Grid, FormControl, InputLabel, Select, MenuItem, TablePagination, Pagination, Box, Menu, Card, CardContent, Typography } from "@material-ui/core";
import { isArray } from "lodash";
import { useDate } from "../../hooks/useDate";
import ForbiddenPage from "../../components/ForbiddenPage";
import usePlans from "../../hooks/usePlans";
import { AuthContext } from "../../context/Auth/AuthContext";
import useCampaignsPageTabs from "./useCampaignsPageTabs";

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
    padding: theme.padding,
    overflowY: "scroll",
    ...theme.scrollbarStyles,
    backgroundColor: theme.palette.listScrollArea,
  },
  fab: {
    position: 'fixed',
    bottom: theme.spacing(3),
    right: theme.spacing(3),
    width: 56,
    height: 56,
    borderRadius: '50%',
    backgroundColor: theme.palette.primary.main,
    color: '#fff',
    boxShadow: `0 8px 24px ${theme.palette.primary.main}4D`
  },
  recurringChip: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    fontSize: '0.75rem',
  },
  statusChip: {
    fontSize: '0.75rem',
  },
  nextExecutionCell: {
    fontWeight: 500,
    color: theme.palette.text.secondary,
  },
  filterContainer: {
    marginBottom: theme.spacing(2),
  },
  tableHeader: {
    fontWeight: 500,
    backgroundColor:
      theme.palette.type === "dark"
        ? theme.palette.dashboardCard || "#252526"
        : theme.palette.grey[100],
    color: theme.palette.text.primary,
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  recurrenceMeta: {
    fontSize: "0.75rem",
    color:
      theme.palette.type === "dark"
        ? theme.palette.text.secondary
        : "#666",
  },
  mutedCaption: {
    fontSize: "0.875rem",
    color:
      theme.palette.type === "dark"
        ? theme.palette.text.secondary
        : "#666",
  },
  metricsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  metricCard: {
    borderRadius: 12,
    background:
      theme.palette.type === "dark"
        ? theme.palette.dashboardCard || theme.palette.background.paper
        : "linear-gradient(180deg, rgba(99,102,241,0.06) 0%, rgba(255,255,255,0.92) 100%)",
    border: `1px solid ${
      theme.palette.type === "dark"
        ? "rgba(255,255,255,0.12)"
        : "#E2E8F0"
    }`,
    boxShadow:
      theme.palette.type === "dark"
        ? "0 4px 16px rgba(0,0,0,0.35)"
        : "0 2px 8px rgba(2,6,23,0.06)",
    transition: "box-shadow 0.2s ease, transform 0.15s ease",
    "&:hover": {
      boxShadow:
        theme.palette.type === "dark"
          ? "0 8px 24px rgba(0,0,0,0.45)"
          : "0 8px 24px rgba(2,6,23,0.1)",
      transform: "translateY(-2px)",
    },
  },
  metricCardContent: {
    padding: theme.spacing(2, 2.5),
    "&:last-child": { paddingBottom: theme.spacing(2) },
  },
  metricLabel: {
    fontSize: "0.75rem",
    fontWeight: 400,
    color: theme.palette.text.secondary,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  metricValue: {
    fontSize: "1.75rem",
    fontWeight: 500,
    marginTop: theme.spacing(0.5),
    color: theme.palette.text.primary,
  },
  metricValueAccent: {
    fontSize: "1.75rem",
    fontWeight: 600,
    marginTop: theme.spacing(0.5),
    color: theme.palette.primary.main,
  },
}));

const Campaigns = () => {
  const classes = useStyles();
  const history = useHistory();

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [deletingCampaign, setDeletingCampaign] = useState(null);
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [stopRecurrenceModalOpen, setStopRecurrenceModalOpen] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [recurrenceFilter, setRecurrenceFilter] = useState("");
  const [campaigns, dispatch] = useReducer(reducer, []);
  const { user, socket } = useContext(AuthContext);
  const { setCampaignSending } = useCampaignSending();

  const { datetimeToClient } = useDate();
  const { getPlanCompany } = usePlans();
  const { viewModes, currentViewMode, onViewModeChange } = useCampaignsPageTabs();

  const [anchorStatus, setAnchorStatus] = useState(null);
  const [anchorRecurrence, setAnchorRecurrence] = useState(null);
  const [metrics, setMetrics] = useState({ total: 0, byStatus: {} });
  useEffect(() => {
    async function fetchData() {
      const companyId = user.companyId;
      const planConfigs = await getPlanCompany(undefined, companyId);
      if (!planConfigs.plan.useCampaigns) {
        toast.error("Esta empresa não possui permissão para acessar essa página! Estamos lhe redirecionando.");
        setTimeout(() => {
          history.push(`/`)
        }, 1000);
      }
    }
    fetchData();
  }, []);


  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam, statusFilter, recurrenceFilter, pageSize]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      fetchCampaigns();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber, statusFilter, recurrenceFilter, pageSize]);

  useEffect(() => {
    const companyId = user.companyId;

    const onCompanyCampaign = (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_CAMPAIGNS", payload: data.record });
      }
      if (data.action === "delete") {
        dispatch({ type: "DELETE_CAMPAIGN", payload: +data.id });
      }
    }

    socket.on(`company-${companyId}-campaign`, onCompanyCampaign);
    return () => {
      socket.off(`company-${companyId}-campaign`, onCompanyCampaign);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.companyId, socket]);

  const fetchCampaigns = async () => {
    try {
      const { data } = await api.get("/campaigns/", {
        params: { 
          searchParam, 
          pageNumber, 
          pageSize,
          status: statusFilter,
          isRecurring: recurrenceFilter 
        },
      });
      
      // Para paginação real, substituir os dados em vez de adicionar
      if (pageNumber === 1) {
        dispatch({ type: "RESET" });
      }
      dispatch({ type: "LOAD_CAMPAIGNS", payload: data.records });
      
      setHasMore(data.hasMore);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.count || 0);
      setLoading(false);
      try {
        const m = await api.get("/campaigns/metrics");
        if (m.data) {
          setMetrics({ total: m.data.total || 0, byStatus: m.data.byStatus || {} });
        }
      } catch {
        /* métricas opcionais */
      }
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenCampaignModal = () => {
    setSelectedCampaign(null);
    setCampaignModalOpen(true);
  };

  const handleCloseCampaignModal = () => {
    setSelectedCampaign(null);
    setCampaignModalOpen(false);
  };

  const handleSearch = (vOrEvent) => {
    const v = typeof vOrEvent === "string" ? vOrEvent : vOrEvent.target.value;
    setSearchParam(v.toLowerCase());
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
  };

  const handleRecurrenceFilterChange = (event) => {
    setRecurrenceFilter(event.target.value);
  };

  const handleEditCampaign = (campaign) => {
    setSelectedCampaign(campaign);
    setCampaignModalOpen(true);
  };

  const handleDeleteCampaign = async (campaignId) => {
    try {
      await api.delete(`/campaigns/${campaignId}`);
      toast.success(i18n.t("campaigns.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setDeletingCampaign(null);
    setSearchParam("");
    setPageNumber(1);
  };

  const handleStopRecurrence = async (campaignId) => {
    try {
      await api.post(`/campaigns/${campaignId}/stop-recurrence`);
      toast.success("Recorrência interrompida com sucesso!");
      setPageNumber(1);
      fetchCampaigns();
    } catch (err) {
      toastError(err);
    }
    setStopRecurrenceModalOpen(false);
    setSelectedCampaign(null);
  };

  const handlePageChange = (event, newPage) => {
    setPageNumber(newPage + 1); // Material-UI usa índice baseado em 0
  };

  const handlePageSizeChange = (event) => {
    setPageSize(parseInt(event.target.value, 10));
    setPageNumber(1);
  };

  const formatStatus = (val) => {
    switch (val) {
      case "INATIVA":
        return "Inativa";
      case "PROGRAMADA":
        return "Programada";
      case "EM_ANDAMENTO":
        return "Em Andamento";
      case "CANCELADA":
        return "Cancelada";
      case "FINALIZADA":
        return "Finalizada";
      default:
        return val;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "INATIVA":
        return "default";
      case "PROGRAMADA":
        return "primary";
      case "EM_ANDAMENTO":
        return "primary";
      case "CANCELADA":
        return "default";
      case "FINALIZADA":
        return "default";
      default:
        return "default";
    }
  };

  const formatRecurrenceType = (type) => {
    switch (type) {
      case "minutely":
        return "Por Minuto";
      case "hourly":
        return "Por Hora";
      case "daily":
        return "Diário";
      case "weekly":
        return "Semanal";
      case "biweekly":
        return "Quinzenal";
      case "monthly":
        return "Mensal";
      case "yearly":
        return "Anual";
      default:
        return type;
    }
  };

  const cancelCampaign = async (campaign) => {
    try {
      await api.post(`/campaigns/${campaign.id}/cancel`);
      toast.success(i18n.t("campaigns.toasts.cancel"));
      setPageNumber(1);
      fetchCampaigns();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const restartCampaign = async (campaign) => {
    try {
      await api.post(`/campaigns/${campaign.id}/restart`);
      toast.success(i18n.t("campaigns.toasts.restart"));
      setPageNumber(1);
      fetchCampaigns();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <ActivitiesStyleLayout
      viewModes={viewModes}
      currentViewMode={currentViewMode}
      onViewModeChange={onViewModeChange}
      searchPlaceholder={i18n.t("campaigns.searchPlaceholder")}
      searchValue={searchParam}
      onSearchChange={handleSearch}
      rightFilters={({ classes }) => (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div
            className={classes.filterItem}
            onClick={(e) => setAnchorStatus(e.currentTarget)}
          >
            <span className={classes.filterLabel}>
              {statusFilter ? `Status: ${formatStatus(statusFilter)}` : "Filtrar por Status"}
            </span>
            <ExpandMoreIcon className={classes.chevronIcon} style={{ fontSize: 11 }} />
          </div>
          <Menu
            anchorEl={anchorStatus}
            keepMounted
            open={Boolean(anchorStatus)}
            onClose={() => setAnchorStatus(null)}
            getContentAnchorEl={null}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
          >
            <MenuItem onClick={() => { setStatusFilter(""); setAnchorStatus(null); }}>Todos</MenuItem>
            <MenuItem onClick={() => { setStatusFilter("INATIVA"); setAnchorStatus(null); }}>Inativa</MenuItem>
            <MenuItem onClick={() => { setStatusFilter("PROGRAMADA"); setAnchorStatus(null); }}>Programada</MenuItem>
            <MenuItem onClick={() => { setStatusFilter("EM_ANDAMENTO"); setAnchorStatus(null); }}>Em Andamento</MenuItem>
            <MenuItem onClick={() => { setStatusFilter("CANCELADA"); setAnchorStatus(null); }}>Cancelada</MenuItem>
            <MenuItem onClick={() => { setStatusFilter("FINALIZADA"); setAnchorStatus(null); }}>Finalizada</MenuItem>
          </Menu>

          <div
            className={classes.filterItem}
            onClick={(e) => setAnchorRecurrence(e.currentTarget)}
          >
            <span className={classes.filterLabel}>
              {recurrenceFilter === "true"
                ? "Recorrentes"
                : recurrenceFilter === "false"
                ? "Únicas"
                : "Filtrar por Recorrência"}
            </span>
            <ExpandMoreIcon className={classes.chevronIcon} style={{ fontSize: 11 }} />
          </div>
          <Menu
            anchorEl={anchorRecurrence}
            keepMounted
            open={Boolean(anchorRecurrence)}
            onClose={() => setAnchorRecurrence(null)}
            getContentAnchorEl={null}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
          >
            <MenuItem onClick={() => { setRecurrenceFilter(""); setAnchorRecurrence(null); }}>Todas</MenuItem>
            <MenuItem onClick={() => { setRecurrenceFilter("true"); setAnchorRecurrence(null); }}>Recorrentes</MenuItem>
            <MenuItem onClick={() => { setRecurrenceFilter("false"); setAnchorRecurrence(null); }}>Únicas</MenuItem>
          </Menu>
        </div>
      )}
      navActions={
        <>
          <Grid spacing={2} container style={{ width: 420 }}>
            <Grid xs={12} item>
            </Grid>
          </Grid>
        </>
      }
      onCreateClick={handleOpenCampaignModal}
    >
      <ConfirmationModal
        title={
          deletingCampaign &&
          `${i18n.t("campaigns.confirmationModal.deleteTitle")} ${deletingCampaign.name}?`
        }
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={() => handleDeleteCampaign(deletingCampaign.id)}
      >
        {i18n.t("campaigns.confirmationModal.deleteMessage")}
      </ConfirmationModal>

      <ConfirmationModal
        title="Interromper Recorrência"
        open={stopRecurrenceModalOpen}
        onClose={() => setStopRecurrenceModalOpen(false)}
        onConfirm={() => handleStopRecurrence(selectedCampaign?.id)}
      >
        Tem certeza que deseja interromper a recorrência desta campanha? 
        A campanha atual continuará sendo executada, mas não haverão mais execuções futuras.
      </ConfirmationModal>

      {campaignModalOpen && (
        <CampaignModal
          onSendNowStart={({ campaignId, total }) => {
            setCampaignSending({
              visible: true,
              total: total || 0,
              delivered: 0,
              campaignId: campaignId || null,
              minimized: false
            });
          }}
          resetPagination={() => {
            setPageNumber(1);
            fetchCampaigns();
          }}
          open={campaignModalOpen}
          onClose={handleCloseCampaignModal}
          aria-labelledby="form-dialog-title"
          campaignId={selectedCampaign && selectedCampaign.id}
        />
      )}
      {
        user.profile === "user" && user?.showCampaign === "disabled" ?
          <ForbiddenPage />
          :
          <>
            <Paper
              className={classes.mainPaper}
              variant="outlined"
            >
              <Box className={classes.metricsRow} px={2} pt={2}>
                <Card elevation={0} className={classes.metricCard}>
                  <CardContent className={classes.metricCardContent}>
                    <Typography className={classes.metricLabel}>Campanhas</Typography>
                    <Typography className={classes.metricValueAccent}>{metrics.total}</Typography>
                  </CardContent>
                </Card>
                <Card elevation={0} className={classes.metricCard}>
                  <CardContent className={classes.metricCardContent}>
                    <Typography className={classes.metricLabel}>Em andamento</Typography>
                    <Typography className={classes.metricValue}>{metrics.byStatus.EM_ANDAMENTO || 0}</Typography>
                  </CardContent>
                </Card>
                <Card elevation={0} className={classes.metricCard}>
                  <CardContent className={classes.metricCardContent}>
                    <Typography className={classes.metricLabel}>Programadas</Typography>
                    <Typography className={classes.metricValue}>{metrics.byStatus.PROGRAMADA || 0}</Typography>
                  </CardContent>
                </Card>
                <Card elevation={0} className={classes.metricCard}>
                  <CardContent className={classes.metricCardContent}>
                    <Typography className={classes.metricLabel}>Finalizadas</Typography>
                    <Typography className={classes.metricValue}>{metrics.byStatus.FINALIZADA || 0}</Typography>
                  </CardContent>
                </Card>
                <Card elevation={0} className={classes.metricCard}>
                  <CardContent className={classes.metricCardContent}>
                    <Typography className={classes.metricLabel}>Canceladas</Typography>
                    <Typography className={classes.metricValue}>{metrics.byStatus.CANCELADA || 0}</Typography>
                  </CardContent>
                </Card>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell align="center" className={classes.tableHeader}>
                      {i18n.t("campaigns.table.name")}
                    </TableCell>
                    <TableCell align="center" className={classes.tableHeader}>
                      {i18n.t("campaigns.table.status")}
                    </TableCell>
                    <TableCell align="center" className={classes.tableHeader}>
                      Recorrência
                    </TableCell>
                    <TableCell align="center" className={classes.tableHeader}>
                      {i18n.t("campaigns.table.contactList")}
                    </TableCell>
                    <TableCell align="center" className={classes.tableHeader}>
                      {i18n.t("campaigns.table.whatsapp")}
                    </TableCell>
                    <TableCell align="center" className={classes.tableHeader}>
                      {i18n.t("campaigns.table.scheduledAt")}
                    </TableCell>
                    <TableCell align="center" className={classes.tableHeader}>
                      {i18n.t("campaigns.table.completedAt")}
                    </TableCell>
                    <TableCell align="center" className={classes.tableHeader}>
                      {i18n.t("campaigns.table.actions")}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <>
                    {campaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell align="center">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            {campaign.isRecurring && (
                              <Tooltip title="Campanha Recorrente">
                                <RepeatIcon color="primary" fontSize="small" />
                              </Tooltip>
                            )}
                            {campaign.name}
                          </div>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={formatStatus(campaign.status)}
                            color={getStatusColor(campaign.status)}
                            size="small"
                            className={classes.statusChip}
                          />
                        </TableCell>
                        <TableCell align="center">
                          {campaign.isRecurring ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                              <Chip
                                label={formatRecurrenceType(campaign.recurrenceType)}
                                className={classes.recurringChip}
                                size="small"
                              />
                              <span className={classes.recurrenceMeta}>
                                {campaign.executionCount || 0} execuções
                              </span>
                            </div>
                          ) : (
                            <Chip
                              label="Única"
                              variant="outlined"
                              size="small"
                              className={classes.statusChip}
                            />
                          )}
                        </TableCell>
                        <TableCell align="center">
                          {campaign.contactListId
                            ? campaign.contactList?.name || "Lista removida"
                            : campaign.tagListId && campaign.tagListId !== "Nenhuma"
                            ? `Tag: ${campaign.tagListId}`
                            : "Não definida"}
                        </TableCell>
                        <TableCell align="center">
                          {campaign.whatsappId
                            ? campaign.whatsapp?.name || "WhatsApp removido"
                            : "Não definido"}
                        </TableCell>
                        <TableCell align="center">
                          {campaign.scheduledAt
                            ? datetimeToClient(campaign.scheduledAt)
                            : "Sem agendamento"}
                        </TableCell>
                        <TableCell align="center">
                          {campaign.completedAt
                            ? datetimeToClient(campaign.completedAt)
                            : "Não concluída"}
                        </TableCell>
                        <TableCell align="center">
                          <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                            {campaign.status === "EM_ANDAMENTO" && (
                              <Tooltip title="Parar Campanha">
                                <IconButton
                                  onClick={() => cancelCampaign(campaign)}
                                  size="small"
                                >
                                  <PauseCircleOutlineIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            {(campaign.status === "CANCELADA" || campaign.status === "FINALIZADA") && (
                              <Tooltip title="Reiniciar Campanha">
                                <IconButton
                                  onClick={() => restartCampaign(campaign)}
                                  size="small"
                                  color="primary"
                                >
                                  <PlayCircleOutlineIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            {campaign.isRecurring && campaign.status !== "FINALIZADA" && (
                              <Tooltip title="Interromper Recorrência">
                                <IconButton
                                  onClick={() => {
                                    setSelectedCampaign(campaign);
                                    setStopRecurrenceModalOpen(true);
                                  }}
                                  size="small"
                                  color="secondary"
                                >
                                  <StopIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Relatório">
                              <IconButton
                                onClick={() => history.push(`/campaign/${campaign.id}/report`)}
                                size="small"
                              >
                                <DescriptionIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Editar">
                              <IconButton
                                size="small"
                                onClick={() => handleEditCampaign(campaign)}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Excluir">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  setConfirmModalOpen(true);
                                  setDeletingCampaign(campaign);
                                }}
                              >
                                <DeleteOutlineIcon />
                              </IconButton>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {loading && <TableRowSkeleton columns={8} />}
                  </>
                </TableBody>
              </Table>
              
              {/* Paginação */}
              <Box display="flex" justifyContent="space-between" alignItems="center" p={2}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box color="text.secondary" fontSize="0.875rem">
                    Total: {totalCount} campanhas
                  </Box>
                </Box>
                
                <TablePagination
                  component="div"
                  count={totalCount}
                  page={pageNumber - 1} // Material-UI usa índice baseado em 0
                  onPageChange={handlePageChange}
                  rowsPerPage={pageSize}
                  onRowsPerPageChange={handlePageSizeChange}
                  rowsPerPageOptions={[5, 10, 25, 50, 100]}
                  labelRowsPerPage="Linhas por página:"
                  labelDisplayedRows={({ from, to, count }) => 
                    `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
                  }
                />
              </Box>
            </Paper>
          </>}

    </ActivitiesStyleLayout>
  );
};

export default Campaigns;
