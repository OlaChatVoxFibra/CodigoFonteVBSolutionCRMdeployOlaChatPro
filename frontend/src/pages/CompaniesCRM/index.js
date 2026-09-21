/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useMemo } from "react";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import {
  Dashboard as DashboardIcon,
  List as ListIcon,
  CalendarToday as CalendarIcon,
  ViewWeek as KanbanIcon,
  ExpandMore as ExpandMoreIcon,
} from "@material-ui/icons";
import {
  Popover,
  Typography,
} from "@material-ui/core";

import MainContainer from "../../components/MainContainer";
import { CircularProgress, Chip, Avatar } from "@material-ui/core";
import { toast } from "react-toastify";
import useCompanies from "../../hooks/useCompanies";
import ActivitiesStyleLayout from "../../components/ActivitiesStyleLayout";

// Placeholders for views
import { Grid, Paper, Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@material-ui/core";

const CompaniesBoard = ({ data, loading }) => {
  if (loading) return <CircularProgress />;
  
  return (
    <Grid container spacing={2} style={{ height: '100%', overflowX: 'auto', flexWrap: 'nowrap' }}>
      {['Prospect', 'Cliente', 'Parceiro'].map((status) => (
        <Grid item xs={12} sm={6} md={4} key={status} style={{ minWidth: 300 }}>
          <Paper style={{ height: '100%', padding: 16, backgroundColor: '#f5f5f5' }}>
            <Typography variant="h6" gutterBottom style={{ color: '#333' }}>
              {status}
            </Typography>
            {data && data.length > 0 ? (
                data.filter(item => item.status === status || (!item.status && status === 'Prospect')).map(item => (
                    <Card key={item.id} style={{ marginBottom: 8 }}>
                        <CardContent>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8, gap: 6 }}>
                             <Avatar style={{ width: 30, height: 30 }}>{item.name ? item.name[0] : '?'}</Avatar>
                             <Typography variant="subtitle1" style={{ flex: 1, minWidth: 0 }}>{item.name || "Sem nome"}</Typography>
                             
                        </div>
                        <Typography variant="body2" color="textSecondary">{item.email || "Sem email"}</Typography>
                        <Typography variant="caption" display="block">{item.phone || "Sem telefone"}</Typography>
                        </CardContent>
                    </Card>
                ))
            ) : (
                <div style={{ padding: 10, textAlign: "center", color: "#999" }}>
                    Vazio
                </div>
            )}
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};

const CompaniesList = ({ data, loading }) => {
    if (loading) return <CircularProgress />;
    
    return (
        <TableContainer component={Paper}>
            <Table>
            <TableHead>
                <TableRow>
                <TableCell>Empresa</TableCell>
                <TableCell>CRM</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Telefone</TableCell>
                <TableCell>Status</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {data && data.length > 0 ? (
                    data.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <Avatar style={{ marginRight: 10, width: 30, height: 30 }}>{item.name ? item.name[0] : '?'}</Avatar>
                                    {item.name}
                                </div>
                            </TableCell>
                            <TableCell>
                                
                            </TableCell>
                            <TableCell>{item.email}</TableCell>
                            <TableCell>{item.phone}</TableCell>
                            <TableCell>
                                <Chip label={item.status || "Prospect"} color="primary" size="small" />
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={5} align="center">Nenhuma empresa encontrada</TableCell>
                    </TableRow>
                )}
            </TableBody>
            </Table>
        </TableContainer>
    );
};

const CompaniesCalendar = ({ data }) => (
  <Paper style={{ padding: 16, height: '100%' }}>
    <Typography variant="h6">Agendamentos com Empresas</Typography>
    <div style={{ marginTop: 20, textAlign: 'center', color: '#666' }}>
      Componente de calendário será integrado aqui.
      {data && data.length > 0 && <div>{data.length} empresas listadas.</div>}
    </div>
  </Paper>
);

const CompaniesDashboard = ({ count }) => (
  <Grid container spacing={3}>
    <Grid item xs={12} sm={4}>
      <Paper style={{ padding: 16, textAlign: 'center' }}>
        <Typography variant="h4" color="primary">{count || 0}</Typography>
        <Typography variant="subtitle1">Total de Empresas</Typography>
      </Paper>
    </Grid>
    <Grid item xs={12} sm={4}>
      <Paper style={{ padding: 16, textAlign: 'center' }}>
        <Typography variant="h4" style={{ color: '#f50057' }}>0</Typography>
        <Typography variant="subtitle1">Novos Leads (Mês)</Typography>
      </Paper>
    </Grid>
    <Grid item xs={12} sm={4}>
      <Paper style={{ padding: 16, textAlign: 'center' }}>
        <Typography variant="h4" style={{ color: '#4caf50' }}>0</Typography>
        <Typography variant="subtitle1">Clientes Ativos</Typography>
      </Paper>
    </Grid>
  </Grid>
);

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
  },
  content: {
    flex: 1,
    overflowY: "visible",
    width: "100%",
    maxWidth: "100%",
  },
}));

const CompaniesCRM = ({ renderAsTab }) => {
  const classes = useStyles();
  const theme = useTheme();
  const isDark = theme.palette.type === "dark";
  const [activeTab, setActiveTab] = useState("board");
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(0);
  const [searchParam, setSearchParam] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [anchorStatus, setAnchorStatus] = useState(null);
  
  const { findAll } = useCompanies();

  useEffect(() => {
    setLoading(true);
    const fetchCompanies = async () => {
      try {
        const data = await findAll();
        setCompanies(data);
        setCount(data.length);
      } catch (err) {
        toast.error("Erro ao carregar empresas");
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, []); // Executa apenas na montagem, pois useCompanies não tem dependências de paginação no findAll por padrão aqui

  const viewModes = [
    { label: "Dashboard", value: "dashboard", icon: <DashboardIcon /> },
    { label: "Kanban", value: "board", icon: <KanbanIcon /> },
    { label: "Lista", value: "list", icon: <ListIcon /> },
    { label: "Calendário", value: "calendar", icon: <CalendarIcon /> },
  ];

  const filteredCompanies = useMemo(() => {
    const q = String(searchParam || "").trim().toLowerCase();
    return (companies || []).filter((item) => {
      const itemStatus = String(item?.status || "Prospect");
      const statusOk = !statusFilter || itemStatus === statusFilter;
      if (!statusOk) return false;
      if (!q) return true;
      const name = String(item?.name || "").toLowerCase();
      const email = String(item?.email || "").toLowerCase();
      const phone = String(item?.phone || "").toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [companies, searchParam, statusFilter]);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <CompaniesDashboard count={filteredCompanies.length} />;
      case "board":
        return <CompaniesBoard data={filteredCompanies} loading={loading} />;
      case "list":
        return <CompaniesList data={filteredCompanies} loading={loading} />;
      case "calendar":
        return <CompaniesCalendar data={filteredCompanies} />;
      default:
        return <CompaniesBoard data={filteredCompanies} loading={loading} />;
    }
  };

  const Container = renderAsTab ? ({ children }) => <>{children}</> : MainContainer;

  const rightFilters = ({ classes: layout }) => (
    <>
      <div className={layout.filterItem} onClick={(e) => setAnchorStatus(e.currentTarget)}>
        <Typography className={layout.filterLabel}>
          {statusFilter ? `Status: ${statusFilter}` : "Status"}
        </Typography>
        <ExpandMoreIcon className={layout.chevronIcon} style={{ fontSize: 11 }} />
      </div>
      <Popover
        open={Boolean(anchorStatus)}
        anchorEl={anchorStatus}
        onClose={() => setAnchorStatus(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <div style={{ padding: 8, minWidth: 200, backgroundColor: isDark ? (theme.palette.dashboardCard || "#252526") : "#fff" }}>
          {["", "Prospect", "Cliente", "Parceiro"].map((s) => (
            <div
              key={s || "all"}
              onClick={() => {
                setStatusFilter(s);
                setAnchorStatus(null);
              }}
              style={{
                padding: "6px 10px",
                borderRadius: 4,
                cursor: "pointer",
                fontSize: 13,
                color: !s ? (statusFilter ? theme.palette.text.primary : theme.palette.primary.main) : (statusFilter === s ? theme.palette.primary.main : theme.palette.text.primary),
                fontWeight: statusFilter === s || (!statusFilter && !s) ? 600 : 400,
                backgroundColor: (statusFilter === s || (!statusFilter && !s))
                  ? (isDark ? "rgba(96,165,250,0.12)" : "rgba(59,130,246,0.06)")
                  : "transparent",
              }}
            >
              {!s ? "Todos" : s}
            </div>
          ))}
        </div>
      </Popover>
    </>
  );

  return (
    <Container>
      <div className={classes.root}>  
        <ActivitiesStyleLayout
          description="Empresas"
          viewModes={viewModes}
          currentViewMode={activeTab}
          onViewModeChange={setActiveTab}
          searchPlaceholder="Buscar empresa..."
          searchValue={searchParam}
          onSearchChange={setSearchParam}
          rightFilters={rightFilters}
          navActions={null}
        >
        <div className={classes.content}>
          {renderContent()}
        </div>
        </ActivitiesStyleLayout>
      </div>
    </Container>
  );
};

export default CompaniesCRM;
