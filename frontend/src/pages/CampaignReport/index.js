/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useRef, useState, useContext } from "react";
import { useParams } from "react-router-dom";
import { useHistory } from "react-router-dom";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import { 
  Grid, 
  LinearProgress, 
  Typography, 
  Button, 
  Divider, 
  Card, 
  CardHeader, 
  CardContent, 
  Box, 
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Chip,
  Avatar,
  Tooltip
} from "@material-ui/core";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import SendIcon from "@material-ui/icons/Send";
import PhoneIcon from "@material-ui/icons/Phone";
import MessageIcon from "@material-ui/icons/Message";
import ScheduleIcon from "@material-ui/icons/Schedule";
import EventAvailableIcon from "@material-ui/icons/EventAvailable";
import DoneIcon from "@material-ui/icons/Done";
import DoneAllIcon from "@material-ui/icons/DoneAll";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import ErrorIcon from "@material-ui/icons/Error";
import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import ListAltIcon from "@material-ui/icons/ListAlt";
import PieChartIcon from '@material-ui/icons/PieChart';
import BarChartIcon from '@material-ui/icons/BarChart';
import GetAppIcon from "@material-ui/icons/GetApp";
import { useDate } from "../../hooks/useDate";
import usePlans from "../../hooks/usePlans";
import { AuthContext } from "../../context/Auth/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { has, get, isNull } from "lodash";
import api from "../../services/api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title as ChartTitle,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Pie, Doughnut } from 'react-chartjs-2';

// import { SocketContext } from "../../context/Socket/SocketContext";
import { i18n } from "../../translate/i18n";

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  ChartTitle,
  ChartTooltip,
  Legend,
  Filler
);

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(2),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
    marginBottom: theme.spacing(2),
    backgroundColor: theme.palette.listScrollArea,
  },
  textRight: {
    textAlign: "right",
  },
  tabPanelsContainer: {
    padding: theme.spacing(2),
  },
  summaryCards: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  summaryCard: {
    padding: theme.spacing(2),
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  cardHeader: {
    paddingBottom: 0,
  },
  cardIcon: {
    color: theme.palette.primary.main,
    fontSize: 40,
    marginBottom: theme.spacing(1),
  },
  progressContainer: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
  },
  tableContainer: {
    marginTop: theme.spacing(3),
  },
  tableTitle: {
    margin: theme.spacing(2, 0),
    fontWeight: 500,
  },
  chartContainer: {
    height: 300,
    marginBottom: theme.spacing(4),
  },
  chip: {
    margin: theme.spacing(0.5),
  },
  statusChip: {
    color: '#fff',
    fontWeight: 'bold',
  },
  deliveredChip: {
    backgroundColor: theme.palette.success.main,
  },
  pendingChip: {
    backgroundColor: theme.palette.warning.main,
  },
  failedChip: {
    backgroundColor: theme.palette.error.main,
  },
  pieChartContainer: {
    height: 250,
    position: 'relative',
    marginTop: theme.spacing(2),
  },
  sectionTitle: {
    fontWeight: 500,
    margin: theme.spacing(2, 0),
  },
  detailsCard: {
    marginBottom: theme.spacing(2),
  },
  fullWidthGrid: {
    width: '100%',
  },
  avatar: {
    backgroundColor: theme.palette.primary.main,
    color: '#fff',
  },
}));

/** Conteúdo do relatório (reutilizado na página completa e no modal de campanhas). */
export function CampaignReportView({
  campaignId,
  embedded = false,
  compact = false,
}) {
  const classes = useStyles();
  const theme = useTheme();

  const [campaign, setCampaign] = useState({});
  const [validContacts, setValidContacts] = useState(0);
  const [delivered, setDelivered] = useState(0);
  const [confirmationRequested, setConfirmationRequested] = useState(0);
  const [confirmed, setConfirmed] = useState(0);
  const [percent, setPercent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [messageRows, setMessageRows] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [shippingPage, setShippingPage] = useState(1);
  const [totalShippingPages, setTotalShippingPages] = useState(1);
  const [uniqueNumbers, setUniqueNumbers] = useState(0);
  const [failedMessages, setFailedMessages] = useState(0);
  const [totalMessagesSent, setTotalMessagesSent] = useState(0);
  const mounted = useRef(true);
  const { user, socket } = useContext(AuthContext);

  const { datetimeToClient } = useDate();
  const { getPlanCompany } = usePlans();
  
  // Dados para o gráfico de pizza
  const [chartData, setChartData] = useState({
    labels: ['Entregues', 'Aguardando', 'Falhas'],
    datasets: [
      {
        data: [0, 0, 0],
        backgroundColor: [
          'rgba(75, 192, 192, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(255, 99, 132, 0.7)',
        ],
        borderColor: [
          'rgba(75, 192, 192, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  });
  
  // Opções para o gráfico de pizza
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  useEffect(() => {
    if (embedded) return;
    async function fetchData() {
      const companyId = user.companyId;
      const planConfigs = await getPlanCompany(undefined, companyId);
      if (!planConfigs.plan.useCampaigns) {
        toast.error("Esta empresa não possui permissão para acessar essa página! Estamos lhe redirecionando.");
        setTimeout(() => {
          window.location.assign("/");
        }, 1000);
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded]);

  useEffect(() => {
    mounted.current = true;
    if (campaignId) {
      findCampaign();
    }
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  useEffect(() => {
    if (mounted.current) {
      if (has(campaign, "contactList") && has(campaign.contactList, "contacts")) {
        const contactList = get(campaign, "contactList");
        const valids = contactList.contacts.filter((c) => c.isWhatsappValid);
        setValidContacts(valids.length);
      } else if (has(campaign, "tagListId")) {
        // Se estamos usando tags em vez de listas de contato
        setValidContacts(delivered); // Usamos as entregas como contatos válidos
      }

      if (has(campaign, "shipping") && Array.isArray(campaign.shipping)) {
        const contacts = get(campaign, "shipping");
        const delivered = contacts.filter((c) => !isNull(c.deliveredAt));
        const confirmationRequested = contacts.filter(
          (c) => !isNull(c.confirmationRequestedAt)
        );
        const confirmed = contacts.filter(
          (c) => !isNull(c.deliveredAt) && !isNull(c.confirmationRequestedAt)
        );
        setDelivered(delivered.length);
        setConfirmationRequested(confirmationRequested.length);
        setConfirmed(confirmed.length);
      }
    }
  }, [campaign]);

  useEffect(() => {
    // Evitar divisão por zero
    if (validContacts > 0) {
      setPercent((delivered / validContacts) * 100);
    } else {
      setPercent(0);
    }
  }, [delivered, validContacts]);

  useEffect(() => {
    const companyId = user.companyId;
    // const socket = socketManager.GetSocket();

    const onCampaignEvent = (data) => {

      if (data.record.id === +campaignId) {
        setCampaign(data.record);

        if (data.record.status === "FINALIZADA") {
          setTimeout(() => {
            findCampaign();
          }, 5000);
        }
      }
    };
    socket.on(`company-${companyId}-campaign`, onCampaignEvent);

    return () => {
      socket.off(`company-${companyId}-campaign`, onCampaignEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const findCampaign = async () => {
    try {
      setLoading(true);
      
      // Buscar dados básicos da campanha (sem shipping para evitar estouro de memória)
      const { data: campaign } = await api.get(`/campaigns/${campaignId}`);
      setCampaign(campaign);
      
      // Buscar estatísticas separadamente usando o novo endpoint
      try {
        const { data: stats } = await api.get(`/campaigns/${campaignId}/stats`);
        setDelivered(stats.deliveredMessages);
        setValidContacts(stats.totalMessages); // Total da lista/tag
        setUniqueNumbers(stats.uniqueNumbers); // Destinatários únicos processados
        setFailedMessages(stats.failedMessages);
        setTotalMessagesSent(stats.totalMessages); // Total de mensagens (mesmo que total da lista)
        
        // Atualizar dados do gráfico com estatísticas do servidor
        setChartData({
          labels: ['Entregues', 'Aguardando', 'Falhas'],
          datasets: [
            {
              data: [stats.deliveredMessages, stats.pendingMessages, stats.failedMessages],
              backgroundColor: [
                'rgba(75, 192, 192, 0.7)',
                'rgba(255, 206, 86, 0.7)',
                'rgba(255, 99, 132, 0.7)',
              ],
              borderColor: [
                'rgba(75, 192, 192, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(255, 99, 132, 1)',
              ],
              borderWidth: 1,
            },
          ],
        });
      } catch (statsError) {
        console.error("Erro ao buscar estatísticas:", statsError);
        // Fallback para valores padrão
        setDelivered(0);
        setValidContacts(0);
        setUniqueNumbers(0);
        setFailedMessages(0);
        setTotalMessagesSent(0);
      }
      
      // Buscar dados de shipping com paginação usando o novo endpoint
      try {
        const { data: shippingResponse } = await api.get(`/campaigns/${campaignId}/shipping?page=1&pageSize=${rowsPerPage}`);
        
        if (shippingResponse && shippingResponse.shipping) {
          const shippingData = shippingResponse.shipping;
          
          // Processar dados para a tabela
          const formattedRows = shippingData.map(item => ({
            id: item.id,
            jobId: item.jobId,
            number: item.number,
            message: item.message ? item.message.substring(0, 50) + (item.message.length > 50 ? '...' : '') : '',
            fullMessage: item.message || '',
            deliveredAt: item.deliveredAt ? datetimeToClient(item.deliveredAt) : null,
            createdAt: item.createdAt ? datetimeToClient(item.createdAt) : null,
            status: item.deliveredAt ? 'delivered' : 'pending'
          }));
          
          setMessageRows(formattedRows);
          
          // Armazenar informações de paginação
          setTotalShippingPages(shippingResponse.totalPages || 1);
          setShippingPage(shippingResponse.currentPage || 1);
        }
      } catch (shippingError) {
        console.error("Erro ao buscar dados de envio:", shippingError);
        // Manter array vazio em caso de erro
        setMessageRows([]);
      }
      
    } catch (error) {
      console.error("Erro ao buscar campanha:", error);
      toast.error(i18n.t("campaignReport.fetchError"));
    } finally {
      setLoading(false);
    }
  };

  const formatStatus = (val) => {
    switch (val) {
      case "INATIVA":
        return i18n.t("campaignReport.inactive");
      case "PROGRAMADA":
        return i18n.t("campaignReport.scheduled");
      case "EM_ANDAMENTO":
        return i18n.t("campaignReport.process");
      case "CANCELADA":
        return i18n.t("campaignReport.cancelled");
      case "FINALIZADA":
        return i18n.t("campaignReport.finished");
      default:
        return val;
    }
  };
  
  // Manipuladores para a paginação da tabela
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
    // Carregar dados com novo tamanho de página
    loadMoreShipping(1, parseInt(event.target.value, 10));
  };
  
  // Função para carregar mais dados de shipping
  const loadMoreShipping = async (newPage = 1, pageSize = 50) => {
    try {
      setLoading(true);
      
      const url = `/campaigns/${campaignId}/shipping?page=${newPage}&pageSize=${pageSize}`;
      const { data: shippingResponse } = await api.get(url);
      
      if (shippingResponse && shippingResponse.shipping) {
        const shippingData = shippingResponse.shipping;
        
        // Processar dados para a tabela
        const formattedRows = shippingData.map(item => ({
          id: item.id,
          jobId: item.jobId,
          number: item.number,
          message: item.message ? item.message.substring(0, 50) + (item.message.length > 50 ? '...' : '') : '',
          fullMessage: item.message || '',
          deliveredAt: item.deliveredAt ? datetimeToClient(item.deliveredAt) : null,
          createdAt: item.createdAt ? datetimeToClient(item.createdAt) : null,
          status: item.deliveredAt ? 'delivered' : 'pending'
        }));
        
        setMessageRows(formattedRows);
        setTotalShippingPages(shippingResponse.totalPages || 1);
        setShippingPage(shippingResponse.currentPage || 1);
        
      } else {
        setMessageRows([]);
      }
    } catch (error) {
      console.error("Erro ao carregar mais dados de envio:", error);
      toast.error("Erro ao carregar dados de envio");
      setMessageRows([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Função para formatar o número de telefone
  const formatPhoneNumber = (number) => {
    if (!number) return '';
    
    // Verifica se é um ID de grupo (normalmente começa com números grandes)
    if (number.length > 15) {
      return `Grupo (${number.substring(0, 6)}...)`;
    }
    
    // Formata número normal
    if (number.length === 12 && number.startsWith('55')) {
      const ddd = number.substring(2, 4);
      const firstPart = number.substring(4, 9);
      const lastPart = number.substring(9);
      return `+55 (${ddd}) ${firstPart}-${lastPart}`;
    }
    
    return number;
  };
  
  // Função para obter o status do envio
  const getMessageStatusChip = (status) => {
    switch (status) {
      case 'delivered':
        return (
          <Chip 
            label="Entregue" 
            size="small" 
            icon={<DoneAllIcon fontSize="small" />} 
            className={`${classes.statusChip} ${classes.deliveredChip}`} 
          />
        );
      case 'pending':
        return (
          <Chip 
            label="Pendente" 
            size="small" 
            icon={<ScheduleIcon fontSize="small" />} 
            className={`${classes.statusChip} ${classes.pendingChip}`} 
          />
        );
      case 'failed':
        return (
          <Chip 
            label="Falha" 
            size="small" 
            icon={<ErrorIcon fontSize="small" />} 
            className={`${classes.statusChip} ${classes.failedChip}`} 
          />
        );
      default:
        return (
          <Chip 
            label="Desconhecido" 
            size="small" 
            variant="outlined" 
          />
        );
    }
  };

  // Função para exportar dados para Excel
  const exportToExcel = async () => {
    try {
      toast.info("Gerando relatório Excel, aguarde...");
      
      // Buscar todos os dados de shipping em lotes (máximo 1000 por página)
      let allShippingData = [];
      let currentPage = 1;
      let hasMoreData = true;
      const pageSize = 1000; // Limite máximo do backend
      
      while (hasMoreData) {
        const { data: shippingResponse } = await api.get(`/campaigns/${campaignId}/shipping?page=${currentPage}&pageSize=${pageSize}`);
        
        if (!shippingResponse || !shippingResponse.shipping) {
          break;
        }
        
        allShippingData = [...allShippingData, ...shippingResponse.shipping];
        
        // Verificar se há mais páginas
        hasMoreData = currentPage < shippingResponse.totalPages;
        currentPage++;
        
        // Atualizar progresso
        toast.info(`Carregando dados... ${allShippingData.length} registros encontrados`);
      }
      
      if (allShippingData.length === 0) {
        toast.error("Nenhum dado encontrado para exportar");
        return;
      }

      const shippingData = allShippingData;
      
      // Preparar dados para Excel
      const excelData = [
        // Cabeçalho
        ["Relatório de Campanha", "", "", "", "", ""],
        [`Campanha: ${campaign.name}`, "", "", "", "", ""],
        [`Data de Geração: ${new Date().toLocaleString('pt-BR')}`, "", "", "", "", ""],
        ["", "", "", "", "", ""],
        // Cabeçalhos das colunas
        ["ID", "Destinatário", "Mensagem", "Enviado em", "Entregue em", "Status"],
      ];

      // Adicionar dados das mensagens
      shippingData.forEach(item => {
        excelData.push([
          item.jobId || '',
          item.number || '',
          item.message || '',
          item.createdAt ? new Date(item.createdAt).toLocaleString('pt-BR') : '',
          item.deliveredAt ? new Date(item.deliveredAt).toLocaleString('pt-BR') : '',
          item.deliveredAt ? 'Entregue' : 'Pendente'
        ]);
      });

      // Criar workbook e worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(excelData);

      // Configurar larguras das colunas
      ws['!cols'] = [
        { wch: 15 }, // ID
        { wch: 20 }, // Destinatário
        { wch: 50 }, // Mensagem
        { wch: 20 }, // Enviado em
        { wch: 20 }, // Entregue em
        { wch: 15 }  // Status
      ];

      // Mesclar células do cabeçalho
      ws['!merges'] = [
        { s: { c: 0, r: 0 }, e: { c: 5, r: 0 } }, // Título
        { s: { c: 0, r: 1 }, e: { c: 5, r: 1 } }, // Nome da campanha
        { s: { c: 0, r: 2 }, e: { c: 5, r: 2 } }  // Data de geração
      ];

      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(wb, ws, "Relatório de Campanha");

      // Gerar nome do arquivo
      const fileName = `relatorio_campanha_${campaign.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Fazer download
      XLSX.writeFile(wb, fileName);
      
      toast.success(`Relatório Excel gerado com sucesso! ${shippingData.length} registros exportados.`);
      
    } catch (error) {
      console.error("Erro ao exportar para Excel:", error);
      toast.error("Erro ao gerar relatório Excel");
    }
  };

  const isDark = theme.palette.type === "dark";
  const kpiCardStyle = {
    borderRadius: 12,
    border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "#E2E8F0"}`,
    boxShadow: isDark ? "0 4px 16px rgba(0,0,0,0.35)" : "0 2px 8px rgba(2,6,23,0.06)",
    background: isDark
      ? theme.palette.dashboardCard || "#252526"
      : "linear-gradient(180deg, rgba(99,102,241,0.06) 0%, rgba(255,255,255,0.92) 100%)",
    height: "100%",
  };
  const pieH = compact ? 190 : 250;
  const statTitleVariant = compact ? "body2" : "h6";
  const statNumVariant = compact ? "h5" : "h4";
  const nameVariant = compact ? "subtitle1" : "h5";

  return (
      <Paper
        className={classes.mainPaper}
        variant="outlined"
        style={embedded ? { marginBottom: 0 } : undefined}
      >
        <Box mb={compact ? 1.5 : 2}>
          <Typography variant={nameVariant} component="h2" gutterBottom>
            {campaign.name || i18n.t("campaignReport.campaign")}
          </Typography>
          <Chip
            label={formatStatus(campaign.status)}
            color={campaign.status === "FINALIZADA" ? "primary" : "default"}
            size={compact ? "small" : "medium"}
            style={{ fontWeight: "bold", marginRight: 8 }}
          />
        </Box>

        <Grid container spacing={compact ? 2 : 3} className={classes.summaryCards}>
          <Grid item xs={12} md={6} lg={3}>
            <Card className={classes.summaryCard} variant="outlined" style={kpiCardStyle}>
              <CardContent style={{ padding: compact ? 12 : undefined }}>
                <Typography variant={statTitleVariant} color="textSecondary" gutterBottom>
                  Status de Entrega
                </Typography>
                <Box style={{ height: pieH, position: "relative", marginTop: compact ? 8 : 16 }}>
                  <Doughnut data={chartData} options={chartOptions} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <Card className={classes.summaryCard} variant="outlined" style={kpiCardStyle}>
              <CardContent style={{ padding: compact ? 12 : undefined }}>
                <SendIcon className={classes.cardIcon} style={{ fontSize: compact ? 32 : 40 }} />
                <Typography variant={statNumVariant} component="div">
                  {delivered}
                </Typography>
                <Typography color="textSecondary" variant={compact ? "caption" : "body1"}>
                  Mensagens Enviadas
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <Card className={classes.summaryCard} variant="outlined" style={kpiCardStyle}>
              <CardContent style={{ padding: compact ? 12 : undefined }}>
                <PhoneIcon className={classes.cardIcon} style={{ fontSize: compact ? 32 : 40 }} />
                <Typography variant={statNumVariant} component="div">
                  {uniqueNumbers}
                </Typography>
                <Typography color="textSecondary" variant={compact ? "caption" : "body1"}>
                  Destinatários Únicos
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6} lg={3}>
            <Card className={classes.summaryCard} variant="outlined" style={kpiCardStyle}>
              <CardContent style={{ padding: compact ? 12 : undefined }}>
                <CheckCircleIcon className={classes.cardIcon} style={{ fontSize: compact ? 32 : 40 }} />
                <Typography variant={statNumVariant} component="div">
                  {delivered}
                </Typography>
                <Typography color="textSecondary" variant={compact ? "caption" : "body1"}>
                  Mensagens Entregues
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Barra de progresso */}
        <Box className={classes.progressContainer}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs>
              <Typography variant="body2" color="textSecondary">{i18n.t("campaignReport.deliver")}</Typography>
            </Grid>
            <Grid item>
              <Typography variant="body2" color="textPrimary">
                {delivered} de {totalMessagesSent}
              </Typography>
            </Grid>
          </Grid>
          <LinearProgress
            variant="determinate"
            style={{ height: 10, borderRadius: 5, margin: "8px 0" }}
            value={(delivered / (totalMessagesSent || 1)) * 100}
          />
        </Box>
        
        {/* Informações adicionais da campanha */}
        <Grid container spacing={3}>
          {campaign.whatsappId && (
            <Grid item xs={12} md={4}>
              <Card variant="outlined" className={classes.detailsCard}>
                <CardHeader
                  avatar={
                    <Avatar className={classes.avatar}>
                      <WhatsAppIcon />
                    </Avatar>
                  }
                  title="Conexão WhatsApp"
                  subheader={campaign.whatsapp?.name || "Não especificado"}
                />
              </Card>
            </Grid>
          )}
          
          {campaign.tagListId && (
            <Grid item xs={12} md={4}>
              <Card variant="outlined" className={classes.detailsCard}>
                <CardHeader
                  avatar={
                    <Avatar className={classes.avatar}>
                      <ListAltIcon />
                    </Avatar>
                  }
                  title="Tag Utilizada"
                  subheader={`ID: ${campaign.tagListId}`}
                />
              </Card>
            </Grid>
          )}
          
          {campaign.contactListId && (
            <Grid item xs={12} md={4}>
              <Card variant="outlined" className={classes.detailsCard}>
                <CardHeader
                  avatar={
                    <Avatar className={classes.avatar}>
                      <ListAltIcon />
                    </Avatar>
                  }
                  title={i18n.t("campaignReport.contactLists")}
                  subheader={campaign.contactList?.name || "Não especificado"}
                />
              </Card>
            </Grid>
          )}
          
          <Grid item xs={12} md={4}>
            <Card variant="outlined" className={classes.detailsCard}>
              <CardHeader
                avatar={
                  <Avatar className={classes.avatar}>
                    <ScheduleIcon />
                  </Avatar>
                }
                title={i18n.t("campaignReport.schedule")}
                subheader={datetimeToClient(campaign.scheduledAt) || "Não agendado"}
              />
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card variant="outlined" className={classes.detailsCard}>
              <CardHeader
                avatar={
                  <Avatar className={classes.avatar}>
                    <EventAvailableIcon />
                  </Avatar>
                }
                title={i18n.t("campaignReport.conclusion")}
                subheader={datetimeToClient(campaign.completedAt) || "Não concluído"}
              />
            </Card>
          </Grid>
        </Grid>
        
        {/* Seção de detalhes de mensagens */}
        <Box mt={4}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" className={classes.sectionTitle}>
              <MessageIcon style={{ verticalAlign: 'middle', marginRight: 8 }} />
              Detalhes das Mensagens
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<GetAppIcon />}
              onClick={exportToExcel}
              style={{
                borderRadius: 20,
                textTransform: 'none',
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                background: 'linear-gradient(45deg, #4CAF50 30%, #45a049 90%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #45a049 30%, #4CAF50 90%)',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
                }
              }}
            >
              Exportar Excel
            </Button>
          </Box>
          <Divider />
          
          <TableContainer className={classes.tableContainer}>
            <Table aria-label="tabela de mensagens">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Destinatário</TableCell>
                  <TableCell>Mensagem</TableCell>
                  <TableCell>Enviado em</TableCell>
                  <TableCell>Entregue em</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {messageRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.jobId}</TableCell>
                    <TableCell>
                      <Tooltip title={row.number}>
                        <span>{formatPhoneNumber(row.number)}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={row.fullMessage}>
                        <span>{row.message}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell>{row.createdAt}</TableCell>
                    <TableCell>{row.deliveredAt || '-'}</TableCell>
                    <TableCell>{getMessageStatusChip(row.status)}</TableCell>
                  </TableRow>
                ))}
                {messageRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      {loading ? "Carregando..." : "Nenhuma mensagem encontrada"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[10, 25, 50, 100]}
              component="div"
              count={totalMessagesSent}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(event, newPage) => {
                setPage(newPage);
                // Calcular qual página de dados carregar do servidor
                const serverPage = newPage + 1;
                loadMoreShipping(serverPage, rowsPerPage);
              }}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Linhas por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
            />
          </TableContainer>
        </Box>
      </Paper>
  );
}

export default function CampaignReport() {
  const { campaignId } = useParams();
  const history = useHistory();
  return (
    <MainContainer>
      <MainHeader>
        <Grid style={{ width: "99.6%" }} container>
          <Grid xs={12} item style={{ display: "flex", alignItems: "center" }}>
            <Button
              variant="outlined"
              color="primary"
              style={{ marginRight: 10 }}
              onClick={() => history.push("/campaigns")}
              startIcon={<ArrowBackIcon />}
            >
              {i18n.t("campaignReport.backButton")}
            </Button>
          </Grid>
        </Grid>
      </MainHeader>
      <CampaignReportView campaignId={campaignId} />
    </MainContainer>
  );
}
