/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(3),
  },
  title: {
    marginBottom: theme.spacing(3),
  },
  card: {
    marginBottom: theme.spacing(2),
  },
  statsCard: {
    textAlign: "center",
    marginBottom: theme.spacing(2),
  },
  statsValue: {
    fontSize: "2rem",
    fontWeight: "bold",
    color: theme.palette.primary.main,
  },
  statsLabel: {
    color: theme.palette.text.secondary,
  },
  filterSection: {
    marginBottom: theme.spacing(3),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
  },
  table: {
    minWidth: 650,
  },
  chip: {
    margin: theme.spacing(0.5),
  },
}));

const RelatorioVendas = () => {
  const classes = useStyles();
  const [loading, setLoading] = useState(false);
  const [relatorio, setRelatorio] = useState(null);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    dateFrom: format(new Date().setDate(1), "yyyy-MM-dd"),
    dateTo: format(new Date(), "yyyy-MM-dd"),
    userId: "",
    motivoNaoVenda: "",
    motivoFinalizacao: "",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get("/users");
      setUsers(data.users);
    } catch (err) {
      toastError(err);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleGenerateReport = async () => {
    if (!filters.dateFrom || !filters.dateTo) {
      toast.error("Por favor, selecione o período");
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      });

      if (filters.userId) {
        params.append("userId", filters.userId);
      }

      const { data } = await api.get(`/ticketreport/vendas?${params}`);
      setRelatorio(data);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Novo: filtrar tickets por motivo
  const filteredTickets = (relatorio?.tickets || []).filter((ticket) => {
    let motivoNaoVendaOk = true;
    let motivoFinalizacaoOk = true;
    if (filters.motivoNaoVenda) {
      motivoNaoVendaOk = ticket.motivoNaoVenda === filters.motivoNaoVenda;
    }
    if (filters.motivoFinalizacao) {
      motivoFinalizacaoOk =
        ticket.motivoFinalizacao === filters.motivoFinalizacao;
    }
    return motivoNaoVendaOk && motivoFinalizacaoOk;
  });

  if (!relatorio) {
    return (
      <div className={classes.root}>
        <Typography variant="h4" className={classes.title}>
          Relatório de Vendas
        </Typography>

        <Paper className={classes.filterSection}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={3}>
              <TextField
                label="Data Inicial"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                label="Data Final"
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Atendente</InputLabel>
                <Select
                  value={filters.userId}
                  onChange={(e) => handleFilterChange("userId", e.target.value)}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleGenerateReport}
                disabled={loading}
                fullWidth
              >
                {loading ? "Gerando..." : "Gerar Relatório"}
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </div>
    );
  }

  return (
    <div className={classes.root}>
      <Typography variant="h4" className={classes.title}>
        Relatório de Vendas
      </Typography>

      <Paper className={classes.filterSection}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              label="Data Inicial"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              label="Data Final"
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange("dateTo", e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>Atendente</InputLabel>
              <Select
                value={filters.userId}
                onChange={(e) => handleFilterChange("userId", e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>Motivo da Não Venda</InputLabel>
              <Select
                value={filters.motivoNaoVenda}
                onChange={(e) =>
                  handleFilterChange("motivoNaoVenda", e.target.value)
                }
              >
                <MenuItem value="">Todos</MenuItem>
                {(relatorio?.motivosNaoVenda || []).map((item, idx) => (
                  <MenuItem key={idx} value={item.motivo}>
                    {item.motivo}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth>
              <InputLabel>Motivo da Finalização</InputLabel>
              <Select
                value={filters.motivoFinalizacao}
                onChange={(e) =>
                  handleFilterChange("motivoFinalizacao", e.target.value)
                }
              >
                <MenuItem value="">Todos</MenuItem>
                {(relatorio?.motivosFinalizacao || []).map((item, idx) => (
                  <MenuItem key={idx} value={item.motivo}>
                    {item.motivo}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleGenerateReport}
              disabled={loading}
              fullWidth
            >
              {loading ? "Gerando..." : "Gerar Relatório"}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Estatísticas Gerais */}
      <Grid container spacing={3} className={classes.card}>
        <Grid item xs={12} sm={3}>
          <Card className={classes.statsCard}>
            <CardContent>
              <Typography className={classes.statsValue}>
                {relatorio.totalVendas}
              </Typography>
              <Typography className={classes.statsLabel}>
                Total de Vendas
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card className={classes.statsCard}>
            <CardContent>
              <Typography className={classes.statsValue}>
                {formatCurrency(relatorio.totalValorVendas)}
              </Typography>
              <Typography className={classes.statsLabel}>
                Valor Total de Vendas
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card className={classes.statsCard}>
            <CardContent>
              <Typography className={classes.statsValue}>
                {relatorio.totalNaoVendas}
              </Typography>
              <Typography className={classes.statsLabel}>Não Vendas</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={3}>
          <Card className={classes.statsCard}>
            <CardContent>
              <Typography className={classes.statsValue}>
                {relatorio.mediaTicketPorAtendente.toFixed(1)}
              </Typography>
              <Typography className={classes.statsLabel}>
                Média de Tickets por Atendente
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Motivos de Não Venda */}
      {relatorio.motivosNaoVenda.length > 0 && (
        <Paper className={classes.card}>
          <Typography variant="h6" style={{ padding: 16 }}>
            Motivos de Não Venda
          </Typography>
          <Box style={{ padding: 16 }}>
            {relatorio.motivosNaoVenda.map((item, index) => (
              <Chip
                key={index}
                label={`${item.motivo} (${item.quantidade})`}
                className={classes.chip}
                color="secondary"
                variant="outlined"
              />
            ))}
          </Box>
        </Paper>
      )}

      {/* Tabela detalhada de tickets */}
      {filteredTickets.length > 0 && (
        <Paper className={classes.card}>
          <Typography variant="h6" style={{ padding: 16 }}>
            Tickets Finalizados
          </Typography>
          <Table className={classes.table}>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Atendente</TableCell>
                <TableCell>Data</TableCell>
                <TableCell>Valor da Venda</TableCell>
                <TableCell>Motivo da Não Venda</TableCell>
                <TableCell>Motivo da Finalização</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredTickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell>{ticket.id}</TableCell>
                  <TableCell>{ticket.user?.name || "-"}</TableCell>
                  <TableCell>
                    {format(new Date(ticket.createdAt), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>
                    {ticket.valorVenda
                      ? formatCurrency(ticket.valorVenda)
                      : "-"}
                  </TableCell>
                  <TableCell>{ticket.motivoNaoVenda || "-"}</TableCell>
                  <TableCell>{ticket.motivoFinalizacao || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Tabela de Atendentes */}
      <Paper className={classes.card}>
        <Typography variant="h6" style={{ padding: 16 }}>
          Desempenho por Atendente
        </Typography>
        <Table className={classes.table}>
          <TableHead>
            <TableRow>
              <TableCell>Atendente</TableCell>
              <TableCell align="right">Total de Vendas</TableCell>
              <TableCell align="right">Valor Total de Vendas</TableCell>
              <TableCell align="right">Não Vendas</TableCell>
              <TableCell align="right">Total de Tickets</TableCell>
              <TableCell align="right">Média de Tickets</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {relatorio.atendentes.map((atendente) => (
              <TableRow key={atendente.id}>
                <TableCell>{atendente.name}</TableCell>
                <TableCell align="right">{atendente.totalVendas}</TableCell>
                <TableCell align="right">
                  {formatCurrency(atendente.totalValorVendas)}
                </TableCell>
                <TableCell align="right">{atendente.totalNaoVendas}</TableCell>
                <TableCell align="right">{atendente.totalTickets}</TableCell>
                <TableCell align="right">{atendente.mediaTicket}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </div>
  );
};

export default RelatorioVendas;
