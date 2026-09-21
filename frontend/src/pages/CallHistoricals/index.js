/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useReducer, useContext, useCallback } from "react";
import { toast } from "react-toastify";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import IconButton from "@material-ui/core/IconButton";
import SearchIcon from "@material-ui/icons/Search";
import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";
import PhoneIcon from '@material-ui/icons/Phone';
import DownloadIcon from '@material-ui/icons/CloudDownload';
import VisibilityIcon from '@material-ui/icons/Visibility';
import CallMadeIcon from '@material-ui/icons/CallMade';
import CallReceivedIcon from '@material-ui/icons/CallReceived';
import CallEndIcon from '@material-ui/icons/CallEnd';
import DoneIcon from '@material-ui/icons/Done';
import PhoneMissedIcon from '@material-ui/icons/PhoneMissed';
import Chip from '@material-ui/core/Chip';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import toastError from "../../errors/toastError";
import { Grid } from "@material-ui/core";
import { isArray } from "lodash";
import { AuthContext } from "../../context/Auth/AuthContext";

const reducer = (state, action) => {
  if (action.type === "LOAD_CALL_HISTORY") {
    const callHistory = action.payload;
    const newCallHistory = [];
    if (isArray(callHistory)) {
      callHistory.forEach((call) => {
        const callIndex = state.findIndex(
          (c) => c.id === call.id
        );
        if (callIndex !== -1) {
          state[callIndex] = call;
        } else {
          newCallHistory.push(call);
        }
      });
    }
    return [...state, ...newCallHistory];
  }
  if (action.type === "UPDATE_CALL_HISTORY") {
    const call = action.payload;
    const callIndex = state.findIndex((c) => c.id === call.id);
    if (callIndex !== -1) {
      state[callIndex] = call;
      return [...state];
    } else {
      return [call, ...state];
    }
  }
  if (action.type === "RESET") {
    return [];
  }
};

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
    backgroundColor: theme.palette.listScrollArea,
  },
  phoneChip: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
  },
  callButton: {
    backgroundColor: '#4caf50',
    color: 'white',
    '&:hover': {
      backgroundColor: '#45a049',
    },
  },
  statusChip: {
    minWidth: '80px',
  },
  directionIcon: {
    marginRight: theme.spacing(0.5),
  },
  statsCard: {
    minHeight: '80px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
    color: 'white',
    '&.total': {
      background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
    },
    '&.rejected': {
      background: 'linear-gradient(45deg, #f44336 30%, #ff7961 90%)',
    },
    '&.served': {
      background: 'linear-gradient(45deg, #4caf50 30%, #81c784 90%)',
    },
    '&.finished': {
      background: 'linear-gradient(45deg, #ff9800 30%, #ffb74d 90%)',
    },
  },
  statsContent: {
    textAlign: 'center',
    padding: '8px !important',
  },
  statsNumber: {
    fontSize: '2rem',
    fontWeight: 'bold',
  },
  statsLabel: {
    fontSize: '0.875rem',
    opacity: 0.9,
  },
}));

const CallHistoricals = () => {
  const classes = useStyles();
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [callHistory, dispatch] = useReducer(reducer, []);
  const [statistics, setStatistics] = useState({
    total: 0,
    totalReject: 0,
    totalServed: 0,
    totalFinish: 0
  });
  const { user, socket } = useContext(AuthContext);
  const { profile } = user;

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      fetchCallHistory();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParam, pageNumber]);

  useEffect(() => {
    const companyId = user.companyId;
    const onCallHistoryEvent = (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_CALL_HISTORY", payload: data.record });
      }
    };
    
    if (socket) {
      socket.on(`company-${companyId}-call-history`, onCallHistoryEvent);
    }
    return () => {
      if (socket) {
        socket.off(`company-${companyId}-call-history`, onCallHistoryEvent);
      }
    };
  }, [socket, user.companyId]);

  const fetchCallHistory = async () => {
    try {
      const { data } = await api.get("/call/historical", {
        params: { searchParam, pageNumber },
      });
      dispatch({ type: "LOAD_CALL_HISTORY", payload: data.historical.resultFinal });
      setStatistics({
        total: data.historical.total || 0,
        totalReject: data.historical.totalReject || 0,
        totalServed: data.historical.totalServed || 0,
        totalFinish: data.historical.totalFinish || 0
      });
      setHasMore(data.hasMore);
      setLoading(false);
    } catch (err) {
      const errorMsg = err.response?.data?.error;
      if (errorMsg && (errorMsg.includes("Invalid URL") || errorMsg.includes("TypeError"))) {
          console.warn("Ignored backend error:", errorMsg);
          setLoading(false);
          return;
      }
      toastError(err);
      setLoading(false);
    }
  };

  const handleSearch = (event) => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const buildWavoipUrl = (call) => {
    try {
      if (call?.token_wavoip && (call?.phone_to || call?.phone)) {
        const token = String(call.token_wavoip).trim();
        const phone = String(call.phone_to || call.phone || "").replace(/\D/g, "");
        const name = String(call.name || "").trim();
        const params = new URLSearchParams({
          token,
          phone,
          name,
          start_if_ready: "true",
          close_after_call: "true",
        });
        return `https://app.wavoip.com/call?${params.toString()}`;
      }
    } catch (e) {}
    return call?.url || "";
  };

  const handleMakeCall = (call) => {
    const callUrl = buildWavoipUrl(call);
    if (!callUrl) {
       toast.error("URL de chamada inválida ou vazia.");
       return;
    }
    try {
      // Basic validation to avoid "Invalid URL" errors
      const u = new URL(callUrl);
      if (u.protocol === "http:" || u.protocol === "https:") {
        window.open(callUrl, "_blank");
        return;
      }
    } catch (e) {
      toast.error("URL de chamada inválida.");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPhone = (phone) => {
    // Formato brasileiro: +55 (11) 99999-9999
    if (phone && phone.length >= 10) {
      const cleaned = phone.replace(/\D/g, '');
      if (cleaned.startsWith('55')) {
        const ddd = cleaned.substring(2, 4);
        const number = cleaned.substring(4);
        if (number.length === 9) {
          return `+55 (${ddd}) ${number.substring(0, 5)}-${number.substring(5)}`;
        } else if (number.length === 8) {
          return `+55 (${ddd}) ${number.substring(0, 4)}-${number.substring(4)}`;
        }
      }
    }
    return phone;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ENDED':
        return 'default';
      case 'ACTIVE':
        return 'primary';
      case 'RINGING':
        return 'secondary';
      case 'BUSY':
        return 'error';
      case 'NO_ANSWER':
        return 'warning';
      case 'REJECTED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'ENDED':
        return 'Finalizada';
      case 'ACTIVE':
        return 'Ativa';
      case 'RINGING':
        return 'Tocando';
      case 'BUSY':
        return 'Ocupado';
      case 'NO_ANSWER':
        return 'Não Atendida';
      case 'REJECTED':
        return 'Rejeitada';
      default:
        return status || 'N/A';
    }
  };

  const getDirectionIcon = (direction) => {
    if (direction === 'OUTCOMING') {
      return <CallMadeIcon className={classes.directionIcon} />;
    } else if (direction === 'INCOMING') {
      return <CallReceivedIcon className={classes.directionIcon} />;
    }
    return null;
  };

  const getDirectionLabel = (direction) => {
    switch (direction) {
      case 'OUTCOMING':
        return 'Saída';
      case 'INCOMING':
        return 'Entrada';
      default:
        return direction || 'N/A';
    }
  };

  const formatDuration = (duration) => {
    if (!duration) return 'N/A';
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const loadMore = () => {
    setPageNumber((prevState) => prevState + 1);
  };

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      loadMore();
    }
  };

  return (
    <MainContainer>
      <MainHeader>
        <Grid style={{ width: "99.6%" }} container>
          <Grid xs={12} item>
            <Title>Histórico de Ligações</Title>
          </Grid>
          
          {/* Cards de Estatísticas */}
          <Grid xs={12} item style={{ marginBottom: '16px' }}>
            <Grid container spacing={2}>
              <Grid xs={12} sm={6} md={3} item>
                <Card className={`${classes.statsCard} total`}>
                  <CardContent className={classes.statsContent}>
                    <Typography className={classes.statsNumber}>
                      {statistics.total}
                    </Typography>
                    <Typography className={classes.statsLabel}>
                      Total de Ligações
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid xs={12} sm={6} md={3} item>
                <Card className={`${classes.statsCard} rejected`}>
                  <CardContent className={classes.statsContent}>
                    <Typography className={classes.statsNumber}>
                      {statistics.totalReject}
                    </Typography>
                    <Typography className={classes.statsLabel}>
                      Ligações Rejeitadas
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid xs={12} sm={6} md={3} item>
                <Card className={`${classes.statsCard} served`}>
                  <CardContent className={classes.statsContent}>
                    <Typography className={classes.statsNumber}>
                      {statistics.totalServed}
                    </Typography>
                    <Typography className={classes.statsLabel}>
                      Ligações Atendidas
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid xs={12} sm={6} md={3} item>
                <Card className={`${classes.statsCard} finished`}>
                  <CardContent className={classes.statsContent}>
                    <Typography className={classes.statsNumber}>
                      {statistics.totalFinish}
                    </Typography>
                    <Typography className={classes.statsLabel}>
                      Ligações Finalizadas
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Grid>

          <Grid xs={12} sm={8} item>
            {/* Espaço para título ou outros controles */}
          </Grid>
          <Grid xs={12} sm={4} item>
            <Grid spacing={2} container>
              <Grid xs={12} sm={12} item>
                <TextField
                  fullWidth
                  placeholder="Pesquisar por nome ou telefone..."
                  type="search"
                  value={searchParam}
                  onChange={handleSearch}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon style={{ color: "gray" }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </MainHeader>
      <Paper
        className={classes.mainPaper}
        variant="outlined"
        onScroll={handleScroll}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">
                Nome
              </TableCell>
              <TableCell align="center">
                Telefone
              </TableCell>
              <TableCell align="center">
                Atendente
              </TableCell>
              <TableCell align="center">
                Data/Hora
              </TableCell>
              <TableCell align="center">
                Direção
              </TableCell>
              <TableCell align="center">
                Status
              </TableCell>
              <TableCell align="center">
                Duração
              </TableCell>
              <TableCell align="center">
                Tipo
              </TableCell>
              <TableCell align="center">
                Gravação
              </TableCell>
              <TableCell align="center">
                Ações
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {callHistory.map((call) => (
                <TableRow key={call.id || call.devices?.id}>
                  <TableCell align="center">
                    {call.name || (call.devices?.direction === 'INCOMING' ? 'Ligação Recebida' : 'N/A')}
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={formatPhone(call.phone_to)}
                      className={classes.phoneChip}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    {call.user?.name || 'N/A'}
                  </TableCell>
                  <TableCell align="center">
                    {formatDate(call.createdAt || call.devices?.created_date)}
                  </TableCell>
                  <TableCell align="center">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {getDirectionIcon(call.devices?.direction)}
                      {getDirectionLabel(call.devices?.direction)}
                    </div>
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={getStatusLabel(call.devices?.status)}
                      color={getStatusColor(call.devices?.status)}
                      size="small"
                      className={classes.statusChip}
                    />
                  </TableCell>
                  <TableCell align="center">
                    {formatDuration(call.devices?.duration)}
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={call.devices?.type || 'N/A'}
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                  {call.callSaveUrl && (
                    <IconButton
                      size="small"
                      className={classes.callButton}
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = call.callSaveUrl;
                        link.setAttribute('download', 'audio.mp3');
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      title="Baixar áudio"
                    >
                      <DownloadIcon />
                    </IconButton>
                  )}
                </TableCell>
                  <TableCell align="center">
                    {buildWavoipUrl(call) && (
                      <IconButton
                        size="small"
                        className={classes.callButton}
                        onClick={() => handleMakeCall(call)}
                        title="Fazer ligação"
                      >
                        <PhoneIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {loading && <TableRowSkeleton columns={9} />}
              {!loading && callHistory.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              )}
            </>
          </TableBody>
        </Table>
      </Paper>
    </MainContainer>
  );
};

export default CallHistoricals;
