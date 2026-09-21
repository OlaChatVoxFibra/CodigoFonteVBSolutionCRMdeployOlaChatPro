/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useReducer, useContext } from "react";

import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import Table from "@material-ui/core/Table";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableHead from "@material-ui/core/TableHead";
import TableRow from "@material-ui/core/TableRow";
import Paper from "@material-ui/core/Paper";
import Button from "@material-ui/core/Button";
import Pagination from "@material-ui/lab/Pagination";
import * as XLSX from "xlsx";

import api from "../../services/api";
import TableRowSkeleton from "../../components/TableRowSkeleton";

import { i18n } from "../../translate/i18n";
import ActivitiesStyleLayout from "../../components/ActivitiesStyleLayout";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";

import {
  CircularProgress,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@material-ui/core";
import { UsersFilter } from "../../components/UsersFilter";
import { TagsFilter } from "../../components/TagsFilter";
import { WhatsappsFilter } from "../../components/WhatsappsFilter";
import { StatusFilter } from "../../components/StatusFilter";
import useDashboard from "../../hooks/useDashboard";

import QueueSelectCustom from "../../components/QueueSelectCustom";
import moment from "moment";
import ShowTicketLogModal from "../../components/ShowTicketLogModal";

import { blue, green } from "@material-ui/core/colors";
import {
  Facebook,
  Forward,
  History,
  Instagram,
  SaveAlt,
  Visibility,
  WhatsApp,
} from "@material-ui/icons";
import Autocomplete, {
  createFilterOptions,
} from "@material-ui/lab/Autocomplete";
import { Field } from "formik";

const useStyles = makeStyles((theme) => ({
  mainContainer: {
    background: theme.palette.fancyBackground,
  },
  formControl: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  mainPaper: {
    flex: 1,
    marginTop: 40,
    borderRadius: 20,
    border: "0px !important",
    marginBottom: 40,
    overflow: "hidden",
    backgroundColor: theme.palette.listScrollArea,
  },
  mainPaperTable: {
    flex: 1,
    overflow: "auto",
    height: "68vh",
    ...theme.scrollbarStylesSoftBig,
  },
  mainPaperFilter: {
    flex: 1,
    overflow: "auto",
    height: "20vh",
    ...theme.scrollbarStylesSoftBig,
  },
  mainHeaderBlock: {
    [theme.breakpoints.down("md")]: {
      display: "flex",
      flexWrap: "wrap",
    },
  },
  filterItem: {
    width: 200,
    [theme.breakpoints.down("md")]: {
      width: "45%",
    },
  },
}));

const Reports = ({ renderAsTab }) => {
  const classes = useStyles();
  const history = useHistory();
  const { getReport } = useDashboard();

  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Defina o tamanho da página

  const [searchParam, setSearchParam] = useState("");
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [selectedWhatsapp, setSelectedWhatsapp] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);

  const Container = ({ children }) => <>{children}</>;

  // const [tagIds, setTagIds] = useState([]);
  const [queueIds, setQueueIds] = useState([]);
  const [userIds, setUserIds] = useState([]);
  const [options, setOptions] = useState([]);
  const [dateFrom, setDateFrom] = useState(
    moment("1", "D").format("YYYY-MM-DD")
  );
  const [dateTo, setDateTo] = useState(moment().format("YYYY-MM-DD"));
  const [onlyRated, setOnlyRated] = useState(false);
  const [totalTickets, setTotalTickets] = useState(0);
  const [tickets, setTickets] = useState([]);

  const [openTicketMessageDialog, setOpenTicketMessageDialog] = useState(false);
  const [ticketOpen, setTicketOpen] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchContacts = async () => {
        try {
          const { data } = await api.get("contacts", {
            params: { searchParam },
          });
          setOptions(data.contacts);
          setLoading(false);
        } catch (err) {
          setLoading(false);
          toastError(err);
        }
      };
      fetchContacts();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam]);

  // const handleSelectedTags = (selecteds) => {
  //   const tags = selecteds.map((t) => t.id);
  //   setTagIds(tags);
  // };

  const exportarGridParaExcel = async () => {
    setLoading(true); // Define o estado de loading como true durante o carregamento

    try {
      const data = await getReport({
        searchParam,
        contactId: selectedContactId,
        whatsappId: JSON.stringify(selectedWhatsapp),
        // tags: JSON.stringify(tagIds),
        users: JSON.stringify(userIds),
        queueIds: JSON.stringify(queueIds),
        status: JSON.stringify(selectedStatus),
        // tags: tagIds,
        dateFrom,
        dateTo,
        page: 1, // Passa o número da página para a API
        pageSize: 9999999, // Passa o tamanho da página para a API
        onlyRated: onlyRated ? "true" : "false",
      });

      const ticketsData = data.tickets.map((ticket) => {
        const formatDate = (dateString) => {
          if (!dateString || dateString === null) {
            return { date: "", time: "" };
          }

          if (dateString.includes("/") && dateString.includes(" ")) {
            const [datePart, timePart] = dateString.split(" ");
            return {
              date: datePart,
              time: timePart,
            };
          }

          const date = new Date(dateString);
          if (isNaN(date.getTime())) {
            return { date: "", time: "" };
          }

          return {
            date: date.toLocaleDateString("pt-BR"),
            time: date.toLocaleTimeString("pt-BR"),
          };
        };

        const formatSupportTime = (timeString) => {
          if (!timeString) return "";

          if (timeString === "0") return "0min";

          const match = timeString.match(
            /(\d+)\s*d,?\s*(\d+)\s*hr?s?\s*e?\s*(\d+)\s*m/
          );
          if (!match) return timeString;

          const days = parseInt(match[1]);
          const hours = parseInt(match[2]);
          const minutes = parseInt(match[3]);

          let result = "";
          if (days > 0) result += `${days}d`;
          if (hours > 0) result += `${hours}h`;
          if (minutes > 0) result += `${minutes}min`;

          return result || "0min";
        };

        const createdAtFormatted = formatDate(ticket.createdAt);
        const closedAtFormatted = formatDate(ticket.closedAt);

        return {
          id: ticket.id,
          Conexão: ticket.whatsappName,
          Contato: ticket.contactName,
          Usuário: ticket.userName,
          Fila: ticket.queueName,
          Status: ticket.status,
          ÚltimaMensagem: ticket.lastMessage,
          DataAbertura: createdAtFormatted.date,
          HoraAbertura: createdAtFormatted.time,
          DataFechamento: closedAtFormatted.date,
          HoraFechamento: closedAtFormatted.time,
          TempoDeAtendimento: formatSupportTime(ticket.supportTime),
          nps: ticket.NPS || "",
          ValorDaVenda:
            ticket.valorVenda !== undefined && ticket.valorVenda !== null
              ? ticket.valorVenda
              : "-",
          MotivoDaNaoVenda: ticket.motivoNaoVenda || "-",
          FinalizadoComVenda:
            ticket.finalizadoComVenda === true
              ? "Sim"
              : ticket.finalizadoComVenda === false
              ? "Não"
              : "-",
        };
      });

      console.log(ticketsData);

      // RDS.CHAT - preparando os dados aqui...
      const getTranslation = (key, fallback) => {
        const translation = i18n.t(key);
        return translation !== key ? translation : fallback;
      };

      const formatDateBR = (dateStr) => {
        if (!dateStr)
          return getTranslation(
            "reports.exportExcel.notInformed",
            "Não informado"
          );
        const [year, month, day] = dateStr.split("-");
        return `${day}/${month}/${year}`;
      };

      const translations = {
        title: getTranslation(
          "reports.exportExcel.title",
          "Relatórios de Atendimentos"
        ),
        startDate: getTranslation(
          "reports.exportExcel.startDate",
          "Data inicial"
        ),
        endDate: getTranslation("reports.exportExcel.endDate", "Data final"),
        columns: {
          id: getTranslation("reports.exportExcel.columns.id", "ID"),
          connection: getTranslation(
            "reports.exportExcel.columns.connection",
            "Conexão"
          ),
          contact: getTranslation(
            "reports.exportExcel.columns.contact",
            "Contato"
          ),
          user: getTranslation("reports.exportExcel.columns.user", "Usuário"),
          queue: getTranslation("reports.exportExcel.columns.queue", "Fila"),
          status: getTranslation(
            "reports.exportExcel.columns.status",
            "Status"
          ),
          lastMessage: getTranslation(
            "reports.exportExcel.columns.lastMessage",
            "Última Mensagem"
          ),
          openDate: getTranslation(
            "reports.exportExcel.columns.openDate",
            "Data Abertura"
          ),
          openTime: getTranslation(
            "reports.exportExcel.columns.openTime",
            "Hora Abertura"
          ),
          closeDate: getTranslation(
            "reports.exportExcel.columns.closeDate",
            "Data Fechamento"
          ),
          closeTime: getTranslation(
            "reports.exportExcel.columns.closeTime",
            "Hora Fechamento"
          ),
          supportTime: getTranslation(
            "reports.exportExcel.columns.supportTime",
            "Tempo de Atendimento"
          ),
          nps: getTranslation("reports.exportExcel.columns.nps", "NPS"),
          valorVenda: getTranslation(
            "reports.exportExcel.columns.valorVenda",
            "Valor da Venda"
          ),
          motivoNaoVenda: getTranslation(
            "reports.exportExcel.columns.motivoNaoVenda",
            "Motivo da Não Venda"
          ),
          finalizadoComVenda: getTranslation(
            "reports.exportExcel.columns.finalizadoComVenda",
            "Finalizado com Venda"
          ),
        },
      };

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([
        [translations.title],
        [`${translations.startDate}: ${formatDateBR(dateFrom)}`],
        [`${translations.endDate}: ${formatDateBR(dateTo)}`],
        [],
        [
          translations.columns.id,
          translations.columns.connection,
          translations.columns.contact,
          translations.columns.user,
          translations.columns.queue,
          translations.columns.status,
          translations.columns.lastMessage,
          translations.columns.openDate,
          translations.columns.openTime,
          translations.columns.closeDate,
          translations.columns.closeTime,
          translations.columns.supportTime,
          translations.columns.nps,
          translations.columns.valorVenda,
          translations.columns.motivoNaoVenda,
          translations.columns.finalizadoComVenda,
        ],
      ]);

      XLSX.utils.sheet_add_json(ws, ticketsData, {
        origin: "A6",
        skipHeader: true,
      });

      if (!ws["!merges"]) ws["!merges"] = [];
      ws["!merges"].push({ s: { c: 0, r: 0 }, e: { c: 12, r: 0 } });

      if (!ws["!cols"]) ws["!cols"] = [];
      ws["!cols"] = [
        { wch: 8 },
        { wch: 15 },
        { wch: 25 },
        { wch: 20 },
        { wch: 15 },
        { wch: 12 },
        { wch: 30 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
        { wch: 18 },
        { wch: 8 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
      ];

      if (!ws["!rows"]) ws["!rows"] = [];
      ws["!rows"] = [
        { hpt: 25 },
        { hpt: 20 },
        { hpt: 20 },
        { hpt: 10 },
        { hpt: 25 },
      ];

      const range = XLSX.utils.decode_range(ws["!ref"]);

      for (let rowNum = range.s.r; rowNum <= range.e.r; rowNum++) {
        for (let colNum = range.s.c; colNum <= range.e.c; colNum++) {
          const cellAddress = XLSX.utils.encode_cell({ r: rowNum, c: colNum });
          if (!ws[cellAddress]) continue;

          if (!ws[cellAddress].s) ws[cellAddress].s = {};

          if (rowNum === 0) {
            ws[cellAddress].s = {
              font: { bold: true, sz: 16, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "4472C4" } },
              alignment: { horizontal: "center", vertical: "center" },
            };
          } else if (rowNum === 1 || rowNum === 2) {
            ws[cellAddress].s = {
              font: { bold: true, sz: 12 },
              fill: { fgColor: { rgb: "E7E6E6" } },
            };
          } else if (rowNum === 4) {
            ws[cellAddress].s = {
              font: { bold: true, color: { rgb: "FFFFFF" } },
              fill: { fgColor: { rgb: "70AD47" } },
              alignment: { horizontal: "center", vertical: "center" },
            };
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, "RelatorioDeAtendimentos");
      XLSX.writeFile(wb, "relatorio-de-atendimentos.xlsx", {
        cellStyles: true,
        bookType: "xlsx",
      });

      setPageNumber(pageNumber);
    } catch (error) {
      toastError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = async (pageNumber) => {
    setLoading(true); // Define o estado de loading como true durante o carregamento
    console.log(onlyRated);
    try {
      const data = await getReport({
        searchParam,
        contactId: selectedContactId,
        whatsappId: JSON.stringify(selectedWhatsapp),
        // tags: JSON.stringify(tagIds),
        users: JSON.stringify(userIds),
        queueIds: JSON.stringify(queueIds),
        status: JSON.stringify(selectedStatus),
        // tags: tagIds,
        dateFrom,
        dateTo,
        page: pageNumber, // Passa o número da página para a API
        pageSize: pageSize, // Passa o tamanho da página para a API
        onlyRated: onlyRated ? "true" : "false",
      });

      setTotalTickets(data.totalTickets.total);

      // Verifica se há mais resultados para definir hasMore
      setHasMore(data.tickets.length === pageSize);

      setTickets(data.tickets); // Se for a primeira página, substitua os tickets

      setPageNumber(pageNumber); // Atualiza o estado da página atual
    } catch (error) {
      toastError(error);
    } finally {
      setLoading(false); // Define o estado de loading como false após o carregamento
    }
  };

  const handleSelectedUsers = (selecteds) => {
    const users = selecteds.map((t) => t.id);
    setUserIds(users);
  };

  const handleSelectedWhatsapps = (selecteds) => {
    const whatsapp = selecteds.map((t) => t.id);
    setSelectedWhatsapp(whatsapp);
  };

  const handleSelectedStatus = (selecteds) => {
    const statusFilter = selecteds.map((t) => t.status);

    setSelectedStatus(statusFilter);
  };
  const IconChannel = (channel) => {
    switch (channel) {
      case "facebook":
        return (
          <Facebook style={{ color: "#3b5998", verticalAlign: "middle" }} />
        );
      case "instagram":
        return (
          <Instagram style={{ color: "#e1306c", verticalAlign: "middle" }} />
        );
      case "whatsapp":
        return (
          <WhatsApp style={{ color: "#25d366", verticalAlign: "middle" }} />
        );
      default:
        return "error";
    }
  };

  const renderOption = (option) => {
    if (option.number) {
      return (
        <>
          {IconChannel(option.channel)}
          <Typography
            component="span"
            style={{
              fontSize: 14,
              marginLeft: "10px",
              display: "inline-flex",
              alignItems: "center",
              lineHeight: "2",
            }}
          >
            {option.name} - {option.number}
          </Typography>
        </>
      );
    } else {
      return `${i18n.t("newTicketModal.add")} ${option.name}`;
    }
  };

  const handleSelectOption = (e, newValue) => {
    setSelectedContactId(newValue.id);
    setSearchParam("");
  };

  const renderOptionLabel = (option) => {
    if (option.number) {
      return `${option.name} - ${option.number}`;
    } else {
      return `${option.name}`;
    }
  };
  const filter = createFilterOptions({
    trim: true,
  });

  const createAddContactOption = (filterOptions, params) => {
    const filtered = filter(filterOptions, params);
    if (params.inputValue !== "" && !loading && searchParam.length >= 3) {
      filtered.push({
        name: `${params.inputValue}`,
      });
    }
    return filtered;
  };
  const renderContactAutocomplete = () => {
    return (
      <Grid xs={12} item>
        <Autocomplete
          fullWidth
          options={options}
          loading={loading}
          clearOnBlur
          autoHighlight
          freeSolo
          size="small"
          clearOnEscape
          getOptionLabel={renderOptionLabel}
          renderOption={renderOption}
          filterOptions={createAddContactOption}
          onChange={(e, newValue) => handleSelectOption(e, newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label={i18n.t("newTicketModal.fieldLabel")}
              variant="outlined"
              autoFocus
              size="small"
              onChange={(e) => setSearchParam(e.target.value)}
              // onKeyPress={(e, newValue) => handleSelectOption(e, newValue)}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <React.Fragment>
                    {loading ? (
                      <CircularProgress color="inherit" size={20} />
                    ) : null}
                    {params.InputProps.endAdornment}
                  </React.Fragment>
                ),
              }}
            />
          )}
        />
      </Grid>
    );
  };

  const content = (
    <>
      {openTicketMessageDialog && (
        <ShowTicketLogModal
          isOpen={openTicketMessageDialog}
          handleClose={() => setOpenTicketMessageDialog(false)}
          ticketId={ticketOpen.id}
        />
      )}
      <Paper className={classes.mainPaperTable} variant="outlined">
        <Table size="small" id="grid-attendants">
          <TableHead>
            <TableRow>
              {/* <TableCell padding="checkbox" /> */}
              <TableCell align="center">{i18n.t("reports.table.id")}</TableCell>
              <TableCell align="left">
                {i18n.t("reports.table.whatsapp")}
              </TableCell>
              <TableCell align="left">
                {i18n.t("reports.table.contact")}
              </TableCell>
              <TableCell align="left">{i18n.t("reports.table.user")}</TableCell>
              <TableCell align="left">
                {i18n.t("reports.table.queue")}
              </TableCell>
              <TableCell align="left">{i18n.t("wallets.wallet")}</TableCell>
              <TableCell align="center">
                {i18n.t("reports.table.status")}
              </TableCell>
              <TableCell align="left">
                {i18n.t("reports.table.lastMessage")}
              </TableCell>
              <TableCell align="center">
                {i18n.t("reports.table.dateOpen")}
              </TableCell>
              <TableCell align="center">
                {i18n.t("reports.table.dateClose")}
              </TableCell>
              <TableCell align="center">
                {i18n.t("reports.table.supportTime")}
              </TableCell>
              <TableCell align="center">
                {i18n.t("reports.table.NPS")}
              </TableCell>
              <TableCell align="center">Valor da Venda</TableCell>
              <TableCell align="center">Motivo da Não Venda</TableCell>
              <TableCell align="center">Finalizado com Venda</TableCell>
              <TableCell align="center">
                {i18n.t("reports.table.actions")}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell align="center">{ticket.id}</TableCell>
                  <TableCell align="left">{ticket?.whatsappName}</TableCell>
                  <TableCell align="left">{ticket?.contactName}</TableCell>
                  <TableCell align="left">{ticket?.userName}</TableCell>
                  <TableCell align="left">{ticket?.queueName}</TableCell>
                  <TableCell align="left">
                    {ticket?.walletName || "-"}
                  </TableCell>
                  <TableCell align="center">{ticket?.status}</TableCell>
                  <TableCell align="left">{ticket?.lastMessage}</TableCell>
                  <TableCell align="center">{ticket?.createdAt}</TableCell>
                  <TableCell align="center">{ticket?.closedAt}</TableCell>
                  <TableCell align="center">{ticket?.supportTime}</TableCell>
                  <TableCell align="center">{ticket?.NPS}</TableCell>
                  <TableCell align="center">
                    {ticket?.valorVenda !== undefined &&
                    ticket?.valorVenda !== null
                      ? ticket.valorVenda
                      : "-"}
                  </TableCell>
                  <TableCell align="center">
                    {ticket?.motivoNaoVenda || "-"}
                  </TableCell>
                  <TableCell align="center">
                    {ticket?.finalizadoComVenda === true
                      ? "Sim"
                      : ticket?.finalizadoComVenda === false
                      ? "Não"
                      : "-"}
                  </TableCell>
                  <TableCell align="center">
                    <Typography
                      noWrap
                      component="span"
                      variant="body2"
                      color="textPrimary"
                    >
                      <Tooltip title="Logs do Ticket">
                        <History
                          onClick={() => {
                            setOpenTicketMessageDialog(true);
                            setTicketOpen(ticket);
                          }}
                          fontSize="small"
                          style={{
                            color: blue[700],
                            cursor: "pointer",
                            marginLeft: 10,
                            verticalAlign: "middle",
                          }}
                        />
                      </Tooltip>
                      <Tooltip title="Acessar Ticket">
                        <Forward
                          onClick={() => {
                            history.push(`/tickets/${ticket.uuid}`);
                          }}
                          fontSize="small"
                          style={{
                            color: green[700],
                            cursor: "pointer",
                            marginLeft: 10,
                            verticalAlign: "middle",
                          }}
                        />
                      </Tooltip>
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
              {loading && <TableRowSkeleton avatar columns={3} />}
            </>
          </TableBody>
        </Table>
      </Paper>

      <div>
        <Grid container>
          <Grid item xs={12} sm={10} md={10}>
            <Pagination
              count={Math.ceil(totalTickets / pageSize)} // Calcula o nmero total de páginas com base no nmero total de tickets e no tamanho da página
              page={pageNumber} // Define a página atual
              onChange={(event, value) => handleFilter(value)} // Função de callback para mudanças de página
            />
          </Grid>
          <Grid item xs={12} sm={2} md={2}>
            <FormControl margin="dense" variant="outlined" fullWidth>
              <InputLabel>{i18n.t("tickets.search.ticketsPerPage")}</InputLabel>
              <Select
                labelId="dialog-select-prompt-label"
                id="dialog-select-prompt"
                name="pageSize"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(e.target.value);
                }}
                label={i18n.t("tickets.search.ticketsPerPage")}
                fullWidth
                MenuProps={{
                  anchorOrigin: {
                    vertical: "center",
                    horizontal: "left",
                  },
                  transformOrigin: {
                    vertical: "center",
                    horizontal: "left",
                  },
                  getContentAnchorEl: null,
                }}
              >
                <MenuItem value={5}>{"5"}</MenuItem>
                <MenuItem value={10}>{"10"}</MenuItem>
                <MenuItem value={20}>{"20"}</MenuItem>
                <MenuItem value={50}>{"50"}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </div>
    </>
  );

  if (renderAsTab) {
    return <Container>{content}</Container>;
  }

  return (
    <ActivitiesStyleLayout
      viewModes={[{ value: "list", label: i18n.t("reports.title") }]}
      currentViewMode="list"
      searchPlaceholder={i18n.t("chatIndex.search") || "Buscar..."}
      searchValue={searchParam}
      onSearchChange={(v) => setSearchParam(v)}
      hideDefaultRightFilters
    >
      {content}
    </ActivitiesStyleLayout>
  );
};

export default Reports;
