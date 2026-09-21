/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect, useContext, useCallback } from "react";
import {
  makeStyles,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  IconButton,
  Button,
  InputBase,
  MenuItem,
  Select,
  useMediaQuery,
} from "@material-ui/core";
import { useTheme } from "@material-ui/core/styles";
import * as XLSX from "xlsx";
import ConfirmationModal from "../ConfirmationModal";
import { Edit as EditIcon } from "@material-ui/icons";
import { toast } from "react-toastify";
import useCompanies from "../../hooks/useCompanies";
import ModalUsers from "../ModalUsers";
import ModalCompany from "../ModalCompany";
import api from "../../services/api";
import { useDate } from "../../hooks/useDate";
import moment from "moment";
import { i18n } from "../../translate/i18n";
import {
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  Search as SearchIcon,
  GetApp as ExportIcon,
  Add as AddIcon,
} from "@material-ui/icons";

const UFS = [
  "", "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ",
  "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

const campaignTemplateRows = (records) =>
  records.map((r) => {
    const meta = r.signupMetadata || {};
    const addr = meta.address || {};
    const contacts = meta.contacts || {};
    const legal = contacts.legal || {};
    return {
      nome: legal.name || r.name || "",
      telefone: String(r.phone || legal.phone || "").replace(/\D/g, ""),
      email: r.email || legal.email || "",
      empresa: r.name || "",
      cidade: addr.cidade || "",
      uf: addr.uf || "",
      documento: r.document || "",
      data_cadastro: r.createdAt ? moment(r.createdAt).format("DD/MM/YYYY HH:mm") : "",
      recorrencia: r.recurrence || ""
    };
  });

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const border = isDark ? "rgba(255,255,255,0.08)" : "#eaedf0";
  const surfaceBg = isDark ? "rgba(255,255,255,0.03)" : "#ffffff";
  const hoverBg = isDark ? "rgba(255,255,255,0.05)" : "#f8f9fb";
  const font = '"Helvetica Neue", Helvetica, Arial, sans-serif';

  return {
    root: { width: "100%", fontFamily: font },
    mainPaper: { width: "100%", flex: 1, background: "transparent", boxShadow: "none" },

    /* ── Top bar ── */
    topBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      marginBottom: 12,
      flexWrap: "wrap",
      [theme.breakpoints.down("xs")]: {
        flexDirection: "column",
        alignItems: "stretch",
        gap: 8,
      },
    },
    filterGroup: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      flexWrap: "wrap",
      [theme.breakpoints.down("xs")]: {
        gap: 6,
      },
    },
    searchBox: {
      display: "flex",
      alignItems: "center",
      gap: 5,
      borderRadius: 7,
      background: isDark ? "rgba(255,255,255,0.06)" : "#f3f4f6",
      padding: "3px 8px",
      minWidth: 160,
      height: 30,
      flex: 1,
      maxWidth: 220,
      [theme.breakpoints.down("xs")]: { maxWidth: "100%", minWidth: 0 },
    },
    searchInput: {
      fontSize: 11.5,
      color: theme.palette.text.primary,
      flex: 1,
      "& input": { padding: 0, fontSize: 11.5 },
      "& input::placeholder": { color: isDark ? "rgba(255,255,255,0.35)" : "#9ca3af", opacity: 1 },
    },
    filterPill: {
      height: 28,
      borderRadius: 7,
      fontSize: 11,
      fontWeight: 500,
      border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e5e7eb",
      background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
      color: theme.palette.text.primary,
      "& .MuiSelect-select": { padding: "4px 24px 4px 8px", fontSize: 11 },
      "& .MuiOutlinedInput-notchedOutline": { border: "none" },
      "&:before, &:after": { display: "none" },
      [theme.breakpoints.down("xs")]: { flex: "1 1 0", minWidth: 0 },
    },
    dateInput: {
      height: 28,
      borderRadius: 7,
      fontSize: 11,
      border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e5e7eb",
      background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
      color: theme.palette.text.primary,
      padding: "0 8px",
      outline: "none",
      fontFamily: "inherit",
      width: 120,
      "&::-webkit-calendar-picker-indicator": { opacity: isDark ? 0.5 : 0.6, cursor: "pointer" },
      [theme.breakpoints.down("xs")]: { flex: "1 1 0", width: "auto", minWidth: 0 },
    },
    actionsGroup: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      [theme.breakpoints.down("xs")]: { justifyContent: "flex-end" },
    },
    iconBtn: {
      width: 28,
      height: 28,
      borderRadius: 7,
      border: isDark ? "1px solid rgba(255,255,255,0.1)" : "1px solid #e5e7eb",
      background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
      color: theme.palette.text.secondary,
      "&:hover": { background: isDark ? "rgba(255,255,255,0.08)" : "#f3f4f6" },
    },
    addBtn: {
      height: 28,
      borderRadius: 7,
      textTransform: "none",
      fontSize: 11,
      fontWeight: 600,
      padding: "0 12px",
      boxShadow: "none",
      "&:hover": { boxShadow: "none" },
    },

    /* ── Table (desktop/tablet) ── */
    tableWrap: {
      borderRadius: 10,
      border: `1px solid ${border}`,
      background: surfaceBg,
      overflowX: "auto",
      "&::-webkit-scrollbar": { height: 4 },
      "&::-webkit-scrollbar-thumb": {
        background: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
        borderRadius: 4,
      },
    },
    table: {
      minWidth: 800,
      "& .MuiTableCell-head": {
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
        borderBottom: `1px solid ${border}`,
        padding: "6px 10px",
        whiteSpace: "nowrap",
        fontFamily: font,
        background: isDark ? "rgba(255,255,255,0.02)" : "#fafbfc",
      },
      "& .MuiTableCell-body": {
        fontSize: 12,
        color: theme.palette.text.primary,
        borderBottom: `1px solid ${border}`,
        padding: "6px 10px",
        fontFamily: font,
      },
    },
    tableRow: {
      cursor: "pointer",
      transition: "background 0.12s",
      "&:hover": { background: hoverBg },
    },
    editIcon: {
      fontSize: 14,
      color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.25)",
    },

    /* ── Cards (mobile) ── */
    cardList: {
      display: "flex",
      flexDirection: "column",
      gap: 8,
    },
    card: {
      borderRadius: 10,
      border: `1px solid ${border}`,
      background: surfaceBg,
      padding: "10px 12px",
      cursor: "pointer",
      transition: "background 0.12s",
      "&:active": { background: hoverBg },
    },
    cardHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    cardName: {
      fontSize: 13,
      fontWeight: 600,
      color: theme.palette.text.primary,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      flex: 1,
    },
    cardEmail: {
      fontSize: 11,
      color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
      marginBottom: 6,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    cardRow: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      flexWrap: "wrap",
    },

    /* ── Tags ── */
    tag: {
      display: "inline-flex",
      alignItems: "center",
      height: 18,
      borderRadius: 5,
      padding: "0 6px",
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: "0.02em",
      lineHeight: 1,
      whiteSpace: "nowrap",
      fontFamily: font,
    },
    tagActive: {
      background: isDark ? "rgba(16,185,129,0.15)" : "#ecfdf5",
      color: isDark ? "#6ee7b7" : "#059669",
    },
    tagInactive: {
      background: isDark ? "rgba(239,68,68,0.15)" : "#fef2f2",
      color: isDark ? "#fca5a5" : "#dc2626",
    },
    tagWarning: {
      background: isDark ? "rgba(245,158,11,0.15)" : "#fffbeb",
      color: isDark ? "#fcd34d" : "#d97706",
    },
    tagExpired: {
      background: isDark ? "rgba(239,68,68,0.15)" : "#fef2f2",
      color: isDark ? "#fca5a5" : "#dc2626",
    },
    tagNeutral: {
      background: isDark ? "rgba(11,42,126,0.55)" : "#f3f4f6",
      color: isDark ? "#ffffff" : "#6b7280",
    },
    tagStripe: {
      background: isDark ? "rgba(37,99,235,0.55)" : "rgba(59,130,246,0.14)",
      color: isDark ? "#ffffff" : "#2563eb",
    },

    /* ── User sub-table ── */
    userSection: {
      borderRadius: 10,
      border: `1px solid ${border}`,
      background: surfaceBg,
      padding: 10,
      marginBottom: 12,
    },
    userSectionHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
      flexWrap: "wrap",
      gap: 6,
    },
    userSectionTitle: {
      fontSize: 12,
      fontWeight: 600,
      color: theme.palette.text.primary,
    },
  };
});

function DueDateTag({ dueDate, classes }) {
  if (!dueDate || !moment(dueDate).isValid())
    return <span className={`${classes.tag} ${classes.tagNeutral}`}>Sem data</span>;
  const diff = moment(dueDate).diff(moment(), "days");
  if (diff <= 0) return <span className={`${classes.tag} ${classes.tagExpired}`}>Vencido</span>;
  if (diff <= 5) return <span className={`${classes.tag} ${classes.tagWarning}`}>Vence {diff}d</span>;
  return <span className={`${classes.tag} ${classes.tagActive}`}>Em dia</span>;
}

function StatusTag({ status, classes }) {
  return status === false
    ? <span className={`${classes.tag} ${classes.tagInactive}`}>Inativo</span>
    : <span className={`${classes.tag} ${classes.tagActive}`}>Ativo</span>;
}

function PaymentOriginTag({ row, stripeLinks, classes }) {
  const email = String(row.email || "").trim().toLowerCase();
  const linked =
    (row.id && stripeLinks?.byCompanyId?.[Number(row.id)]) ||
    (email && stripeLinks?.byEmail?.[email]);
  if (linked) {
    return <span className={`${classes.tag} ${classes.tagStripe}`}>Stripe</span>;
  }
  return <span className={`${classes.tag} ${classes.tagNeutral}`}>Manual</span>;
}

function MobileCard({ row, classes, onSelect, dateToClient }) {
  const plan = row.planId !== null && row.plan ? row.plan.name : "—";
  return (
    <div className={classes.card} onClick={() => onSelect(row)}>
      <div className={classes.cardHeader}>
        <span className={classes.cardName}>{row.name || "—"}</span>
        <StatusTag status={row.status} classes={classes} />
      </div>
      <div className={classes.cardEmail}>{row.email || "—"}</div>
      <div className={classes.cardRow}>
        <span className={`${classes.tag} ${classes.tagNeutral}`}>{plan}</span>
        <DueDateTag dueDate={row.dueDate} classes={classes} />
        <span className={`${classes.tag} ${classes.tagNeutral}`}>{row.recurrence || "—"}</span>
        <span style={{ fontSize: 10, opacity: 0.5, marginLeft: "auto" }}>{dateToClient(row.dueDate)}</span>
      </div>
    </div>
  );
}

export function CompaniesManagerGrid(props) {
  const { records, onSelect, stripeLinks } = props;
  const classes = useStyles();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("xs"));
  const { dateToClient, datetimeToClient } = useDate();

  const renderPlan = (row) => row.planId !== null && row.plan ? row.plan.name : "—";
  const renderPlanValue = (row) =>
    row.planId !== null && row.plan?.amount
      ? row.plan.amount.toLocaleString("pt-br", { minimumFractionDigits: 2 })
      : "—";

  if (isMobile) {
    return (
      <div className={classes.cardList}>
        {records.map((row, i) => (
          <MobileCard key={i} row={row} classes={classes} onSelect={onSelect} dateToClient={dateToClient} />
        ))}
        {records.length === 0 && (
          <div style={{ textAlign: "center", padding: 24, opacity: 0.5, fontSize: 12 }}>
            Nenhuma assinatura encontrada.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={classes.tableWrap}>
      <Table className={classes.table} aria-label="subscriptions table">
        <TableHead>
          <TableRow>
            <TableCell style={{ width: 36 }}></TableCell>
            <TableCell>Nome</TableCell>
            <TableCell>E-mail</TableCell>
            <TableCell align="center">Plano</TableCell>
            <TableCell align="center">Valor</TableCell>
            <TableCell align="center">Status</TableCell>
            <TableCell align="center">Origem</TableCell>
            <TableCell align="center">Vencimento</TableCell>
            <TableCell align="center">Recorrência</TableCell>
            <TableCell align="center">Criado em</TableCell>
            <TableCell align="center">Último login</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {records.map((row, key) => (
            <TableRow key={key} className={classes.tableRow} onClick={() => onSelect(row)}>
              <TableCell align="center" style={{ width: 36 }}>
                <IconButton size="small" style={{ padding: 3 }}>
                  <EditIcon className={classes.editIcon} />
                </IconButton>
              </TableCell>
              <TableCell style={{ fontWeight: 500, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {row.name || "—"}
              </TableCell>
              <TableCell style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {row.email || "—"}
              </TableCell>
              <TableCell align="center">
                <span className={`${classes.tag} ${classes.tagNeutral}`}>{renderPlan(row)}</span>
              </TableCell>
              <TableCell align="center" style={{ whiteSpace: "nowrap" }}>
                R$ {renderPlanValue(row)}
              </TableCell>
              <TableCell align="center">
                <StatusTag status={row.status} classes={classes} />
              </TableCell>
              <TableCell align="center">
                <PaymentOriginTag row={row} stripeLinks={stripeLinks} classes={classes} />
              </TableCell>
              <TableCell align="center">
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <span style={{ fontSize: 11 }}>{dateToClient(row.dueDate)}</span>
                  <DueDateTag dueDate={row.dueDate} classes={classes} />
                </div>
              </TableCell>
              <TableCell align="center">
                <span className={`${classes.tag} ${classes.tagNeutral}`}>{row.recurrence || "—"}</span>
              </TableCell>
              <TableCell align="center" style={{ fontSize: 11 }}>{dateToClient(row.createdAt)}</TableCell>
              <TableCell align="center" style={{ fontSize: 10.5, opacity: 0.6 }}>{datetimeToClient(row.lastLogin)}</TableCell>
            </TableRow>
          ))}
          {records.length === 0 && (
            <TableRow>
              <TableCell colSpan={11} align="center" style={{ padding: 28, opacity: 0.5, fontSize: 12 }}>
                Nenhuma assinatura encontrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default function CompaniesManager({ stripeLinks = null }) {
  const classes = useStyles();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("xs"));
  const { list, save, update, remove } = useCompanies();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [natureFilter, setNatureFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [ufFilter, setUfFilter] = useState("");
  const [users, setUsers] = useState([]);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(undefined);
  const [record, setRecord] = useState({
    name: "", email: "", phone: "", planId: "", status: true,
    dueDate: "", recurrence: "MENSAL", password: "", document: "",
    paymentMethod: "", generateInvoice: true,
  });

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (natureFilter && natureFilter !== "all") params.nature = natureFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (ufFilter) params.uf = ufFilter;
      const companyList = await list(params);
      setRecords(Array.isArray(companyList) ? companyList : []);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.response?.data?.error ||
        (typeof e?.message === "string" ? e.message : null);
      toast.error(msg && String(msg).length < 220 ? String(msg) : "Não foi possível carregar a lista");
    }
    setLoading(false);
  }, [list, natureFilter, dateFrom, dateTo, ufFilter]);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  useEffect(() => {
    if (record?.id) loadCompanyUsers(record.id);
    else setUsers([]);
  }, [record.id]);

  const exportExcel = () => {
    try {
      const rows = campaignTemplateRows(records);
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Contatos");
      XLSX.writeFile(wb, `assinaturas_${moment().format("YYYYMMDD_HHmm")}.xlsx`);
      toast.success("Planilha gerada.");
    } catch { toast.error("Não foi possível exportar."); }
  };

  const loadCompanyUsers = async (companyId) => {
    try {
      const { data } = await api.get("/users/list", { params: { companyId } });
      setUsers(Array.isArray(data) ? data : []);
    } catch { setUsers([]); }
  };

  const handleSubmit = async (data) => {
    setLoading(true);
    try {
      if (data.id !== undefined) await update(data);
      else await save(data);
      await loadPlans();
      handleCancel();
      setCompanyModalOpen(false);
      toast.success("Operação realizada com sucesso!");
    } catch (e) {
      const msg = e?.response?.data?.error || e?.response?.data?.message || e?.message || "Erro";
      toast.error(`Falha: ${msg}`);
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await remove(record.id);
      await loadPlans();
      handleCancel();
      setShowConfirmDialog(false);
      toast.success("Removido com sucesso!");
    } catch { toast.error("Não foi possível remover."); }
    setLoading(false);
  };

  const handleCancel = () => {
    setRecord({
      id: undefined, name: "", email: "", phone: "", planId: "", status: true,
      dueDate: "", recurrence: "MENSAL", password: "", document: "",
      paymentMethod: "", generateInvoice: true,
    });
  };

  const handleSelect = (data) => {
    setRecord({
      id: data.id, name: data.name || "", phone: data.phone || "",
      email: data.email || "", planId: data.planId || "",
      status: data.status !== false, dueDate: data.dueDate || "",
      recurrence: data.recurrence || "MENSAL", password: "",
      document: data.document || "", paymentMethod: data.paymentMethod || "",
      generateInvoice: data.generateInvoice !== undefined ? data.generateInvoice : true,
    });
    setCompanyModalOpen(true);
  };

  const handleAddCompany = () => { handleCancel(); setCompanyModalOpen(true); };

  const filteredRecords = searchText.trim()
    ? records.filter((r) => {
        const q = searchText.toLowerCase();
        return (r.name || "").toLowerCase().includes(q) ||
          (r.email || "").toLowerCase().includes(q) ||
          (r.phone || "").includes(q) || (r.document || "").includes(q);
      })
    : records;

  return (
    <Paper className={classes.mainPaper} elevation={0}>
      {/* ── Filters ── */}
      <div className={classes.topBar}>
        <div className={classes.filterGroup}>
          <div className={classes.searchBox}>
            <SearchIcon style={{ fontSize: 14, color: "inherit", opacity: 0.4 }} />
            <InputBase
              placeholder="Buscar..."
              className={classes.searchInput}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>

          <Select
            value={natureFilter}
            onChange={(e) => setNatureFilter(e.target.value)}
            className={classes.filterPill}
            disableUnderline displayEmpty
            MenuProps={{
              anchorOrigin: { vertical: "bottom", horizontal: "left" },
              transformOrigin: { vertical: "top", horizontal: "left" },
              getContentAnchorEl: null,
            }}
          >
            <MenuItem value="all">Todas</MenuItem>
            <MenuItem value="freemium">Teste grátis</MenuItem>
            <MenuItem value="cadastro_gratis">Cadastro grátis</MenuItem>
          </Select>

          {!isMobile && (
            <>
              <input type="date" className={classes.dateInput} value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)} title="De" />
              <input type="date" className={classes.dateInput} value={dateTo}
                onChange={(e) => setDateTo(e.target.value)} title="Até" />
              <Select
                value={ufFilter}
                onChange={(e) => setUfFilter(e.target.value)}
                className={classes.filterPill}
                disableUnderline displayEmpty
                renderValue={(v) => v || "UF"}
                MenuProps={{
                  anchorOrigin: { vertical: "bottom", horizontal: "left" },
                  transformOrigin: { vertical: "top", horizontal: "left" },
                  getContentAnchorEl: null,
                  PaperProps: { style: { maxHeight: 260 } },
                }}
              >
                {UFS.map((u) => <MenuItem key={u || "all"} value={u}>{u || "Todos"}</MenuItem>)}
              </Select>
            </>
          )}

          <Button variant="text" size="small" onClick={() => loadPlans()} disabled={loading}
            style={{ fontSize: 11, textTransform: "none", fontWeight: 500, minWidth: "auto", padding: "3px 8px" }}>
            Aplicar
          </Button>
        </div>

        <div className={classes.actionsGroup}>
          <IconButton className={classes.iconBtn} onClick={exportExcel}
            disabled={!records.length} title="Exportar Excel">
            <ExportIcon style={{ fontSize: 14 }} />
          </IconButton>
          <Button variant="contained" color="primary" className={classes.addBtn}
            onClick={handleAddCompany}
            startIcon={!isMobile ? <AddIcon style={{ fontSize: 13 }} /> : undefined}>
            {isMobile ? <AddIcon style={{ fontSize: 16 }} /> : "Nova Assinatura"}
          </Button>
        </div>
      </div>

      <ModalCompany open={companyModalOpen} onClose={() => setCompanyModalOpen(false)}
        company={record.id ? record : null} onSave={handleSubmit} />

      <ModalUsers open={userModalOpen}
        onClose={() => { setUserModalOpen(false); setEditingUserId(undefined); if (record?.id) loadCompanyUsers(record.id); }}
        userId={editingUserId} companyId={record?.id} />

      {/* ── User sub-section ── */}
      {record?.id && (
        <div className={classes.userSection}>
          <div className={classes.userSectionHeader}>
            <span className={classes.userSectionTitle}>Usuários — {record.name}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <Button size="small" variant="outlined"
                onClick={() => { setEditingUserId(undefined); setUserModalOpen(true); }}
                startIcon={<PersonAddIcon style={{ fontSize: 12 }} />}
                style={{ fontSize: 10, textTransform: "none", borderRadius: 7, height: 26 }}>
                Adicionar
              </Button>
              <Button size="small" variant="outlined" color="secondary"
                onClick={() => setShowConfirmDialog(true)} disabled={record.id === 1}
                style={{ fontSize: 10, textTransform: "none", borderRadius: 7, height: 26 }}>
                Excluir
              </Button>
            </div>
          </div>
          <div className={classes.tableWrap}>
            <Table className={classes.table} aria-label="users-table">
              <TableHead>
                <TableRow>
                  <TableCell style={{ width: 36 }}>#</TableCell>
                  <TableCell>Nome</TableCell>
                  {!isMobile && <TableCell>Email</TableCell>}
                  <TableCell align="center">Perfil</TableCell>
                  <TableCell align="center" style={{ width: 80 }}>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className={classes.tableRow}>
                    <TableCell>{u.id}</TableCell>
                    <TableCell>{u.name}</TableCell>
                    {!isMobile && <TableCell>{u.email}</TableCell>}
                    <TableCell align="center">
                      <span className={`${classes.tag} ${classes.tagNeutral}`}>{u.profile}</span>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" style={{ padding: 3 }} title="Editar"
                        onClick={() => { setEditingUserId(u.id); setUserModalOpen(true); }}>
                        <EditIcon className={classes.editIcon} />
                      </IconButton>
                      <IconButton size="small" style={{ padding: 3 }} title="Excluir"
                        onClick={async () => {
                          try { await api.delete(`/users/${u.id}`); loadCompanyUsers(record.id); toast.success("Removido"); }
                          catch { toast.error("Erro ao remover"); }
                        }}>
                        <DeleteIcon className={classes.editIcon} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isMobile ? 4 : 5} align="center" style={{ padding: 20, opacity: 0.5, fontSize: 11 }}>
                      Nenhum usuário.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── Main list ── */}
      <CompaniesManagerGrid
        records={filteredRecords}
        onSelect={handleSelect}
        stripeLinks={stripeLinks}
      />

      <ConfirmationModal title="Exclusão" open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)} onConfirm={() => handleDelete()}>
        Deseja realmente excluir esse registro?
      </ConfirmationModal>
    </Paper>
  );
}
