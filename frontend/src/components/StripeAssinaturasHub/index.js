/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputBase,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery
} from "@material-ui/core";
import { useTheme } from "@material-ui/core/styles";
import {
  Add as AddIcon,
  Edit as EditIcon,
  ExpandMore as ExpandMoreIcon,
  GetApp as ExportIcon,
  OpenInNew as OpenInNewIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon
} from "@material-ui/icons";
import * as XLSX from "xlsx";
import moment from "moment";
import { toast } from "react-toastify";
import api from "../../services/api";
import { formatStripeMoney } from "../../utils/stripeCatalogMerge";
import { useDate } from "../../hooks/useDate";
import useCompanies from "../../hooks/useCompanies";
import ModalCompany from "../ModalCompany";
import ConfirmationModal from "../ConfirmationModal";
import {
  EntitlementTags,
  PlanTypeTag,
  StatusTag as StripeSubStatusTag
} from "../StripeAdminHub/StripeAdminTags";
import { BillingCell } from "../StripeAdminHub/StripePriceCells";
import { useStripeSettingsPageStyles } from "../StripeAdminHub/stripeSettingsPageStyles";

const UFS = [
  "", "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ",
  "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

function rowKey(row, index) {
  return row.stripe?.subscriptionId || (row.id ? `c-${row.id}` : `r-${index}`);
}

function DueDateTag({ dueDate, classes }) {
  if (!dueDate || !moment(dueDate).isValid()) {
    return <span className={`${classes.tag} ${classes.tagNeutral}`}>Sem data</span>;
  }
  const diff = moment(dueDate).diff(moment(), "days");
  if (diff <= 0) return <span className={`${classes.tag} ${classes.tagExpired}`}>Vencido</span>;
  if (diff <= 5) return <span className={`${classes.tag} ${classes.tagWarning}`}>Vence {diff}d</span>;
  return <span className={`${classes.tag} ${classes.tagActive}`}>Em dia</span>;
}

function LocalStatusTag({ status, classes }) {
  return status === false
    ? <span className={`${classes.tag} ${classes.tagInactive}`}>Inativo</span>
    : <span className={`${classes.tag} ${classes.tagActive}`}>Ativo</span>;
}

function OriginTag({ origin, classes }) {
  if (origin === "stripe") {
    return <span className={`${classes.tag} ${classes.tagStripe}`}>Stripe</span>;
  }
  if (origin === "stripe_plan") {
    return <span className={`${classes.tag} ${classes.tagStripePlan}`}>Plano Stripe</span>;
  }
  return <span className={`${classes.tag} ${classes.tagNeutral}`}>Manual</span>;
}

function normalizeSubscriber(row) {
  return {
    ...row,
    plan: {
      name: row.planName,
      amount: row.planAmount
    }
  };
}

function StripeDetailPanel({ row, classes, onConfirm }) {
  const stripe = row.stripe;
  if (!stripe?.subscriptionId) return null;

  const canCancel =
    stripe.status === "active" ||
    stripe.status === "trialing" ||
    stripe.status === "past_due";

  return (
    <div className={classes.detailBox}>
      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fit, minmax(160px, 1fr))"
        gap={2}
      >
        <div>
          <Typography className={classes.sectionLabel}>Status Stripe</Typography>
          <StripeSubStatusTag
            status={stripe.status}
            cancelAtPeriodEnd={stripe.cancelAtPeriodEnd}
          />
        </div>
        <div>
          <Typography className={classes.sectionLabel}>Cobrança</Typography>
          <div className={classes.planName}>
            {stripe.amountCents != null
              ? `${formatStripeMoney(stripe.amountCents, stripe.currency)}${
                  stripe.interval === "annual" ? "/ano" : "/mês"
                }`
              : "—"}
          </div>
        </div>
        <div>
          <Typography className={classes.sectionLabel}>Próx. vencimento</Typography>
          <div>
            {stripe.currentPeriodEnd
              ? moment.unix(stripe.currentPeriodEnd).format("DD/MM/YYYY")
              : "—"}
          </div>
        </div>
        <div>
          <Typography className={classes.sectionLabel}>Próxima cobrança</Typography>
          <div>
            {stripe.upcomingInvoice?.amountDue != null
              ? formatStripeMoney(
                  stripe.upcomingInvoice.amountDue,
                  stripe.upcomingInvoice.currency
                )
              : "—"}
          </div>
        </div>
        <div>
          <Typography className={classes.sectionLabel}>Sync local</Typography>
          <div>
            {stripe.localSubscriptionActive == null
              ? "—"
              : stripe.localSubscriptionActive
              ? "Ativa"
              : "Inativa"}
          </div>
        </div>
        <div>
          <Typography className={classes.sectionLabel}>IDs Stripe</Typography>
          <div className={classes.mono}>
            sub: {stripe.subscriptionId}
            {stripe.customerId ? ` · cus: ${stripe.customerId}` : ""}
          </div>
        </div>
      </Box>

      <Box mt={0.5} display="flex" alignItems="center" gap={1} flexWrap="wrap">
        <Typography className={classes.sectionLabel} style={{ marginTop: 8, marginBottom: 0 }}>
          Plano
        </Typography>
        <PlanTypeTag type={stripe.productType} soft />
      </Box>
      <Box mt={0.5}>
        <EntitlementTags ent={stripe.entitlements} soft />
      </Box>

      {stripe.pendingInvoices?.length > 0 ? (
        <>
          <Typography className={classes.sectionLabel}>Faturas pendentes</Typography>
          <Table size="small" className={classes.table}>
            <TableHead>
              <TableRow>
                <TableCell>Fatura</TableCell>
                <TableCell>Valor</TableCell>
                <TableCell>Venc.</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stripe.pendingInvoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>{inv.number || inv.id}</TableCell>
                  <TableCell>{formatStripeMoney(inv.amountDue, inv.currency)}</TableCell>
                  <TableCell>
                    {inv.dueDate ? moment.unix(inv.dueDate).format("DD/MM/YY") : "—"}
                  </TableCell>
                  <TableCell align="right">
                    {inv.hostedInvoiceUrl ? (
                      <Button
                        size="small"
                        className={classes.actionBtn}
                        href={inv.hostedInvoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        startIcon={<OpenInNewIcon style={{ fontSize: 13 }} />}
                      >
                        Pagar
                      </Button>
                    ) : null}
                    <Button
                      size="small"
                      className={classes.actionBtn}
                      style={{ color: "#dc2626", marginLeft: 6 }}
                      onClick={() =>
                        onConfirm({
                          type: "void_invoice",
                          invoiceId: inv.id,
                          title: "Anular fatura?",
                          body: "A fatura será anulada na Stripe e não poderá ser paga."
                        })
                      }
                    >
                      Anular
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      ) : null}

      {stripe.paidInvoices?.length > 0 ? (
        <>
          <Typography className={classes.sectionLabel}>Pagamentos recentes</Typography>
          <Table size="small" className={classes.table}>
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Fatura</TableCell>
                <TableCell>Valor</TableCell>
                <TableCell align="right">PDF</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stripe.paidInvoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    {inv.created ? moment.unix(inv.created).format("DD/MM/YYYY") : "—"}
                  </TableCell>
                  <TableCell>{inv.number || inv.id}</TableCell>
                  <TableCell>{formatStripeMoney(inv.amountPaid, inv.currency)}</TableCell>
                  <TableCell align="right">
                    {inv.invoicePdf || inv.hostedInvoiceUrl ? (
                      <Button
                        size="small"
                        className={classes.actionBtn}
                        href={inv.invoicePdf || inv.hostedInvoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Ver
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      ) : null}

      <div className={classes.actions}>
        {canCancel && !stripe.cancelAtPeriodEnd ? (
          <Button
            size="small"
            variant="outlined"
            className={classes.actionBtn}
            style={{ color: "#dc2626", borderColor: "rgba(239,68,68,0.35)" }}
            onClick={() =>
              onConfirm({
                type: "cancel_end",
                subscriptionId: stripe.subscriptionId,
                title: "Cancelar no fim do ciclo?",
                body: "A assinatura permanece ativa até o vencimento e depois cancela na Stripe."
              })
            }
          >
            Cancelar no fim do ciclo
          </Button>
        ) : null}
        {canCancel ? (
          <Button
            size="small"
            variant="outlined"
            className={classes.actionBtn}
            style={{ color: "#dc2626", borderColor: "rgba(239,68,68,0.35)" }}
            onClick={() =>
              onConfirm({
                type: "cancel_now",
                subscriptionId: stripe.subscriptionId,
                title: "Cancelar imediatamente?",
                body: "Encerra a assinatura agora na Stripe e desativa no sistema local."
              })
            }
          >
            Cancelar agora
          </Button>
        ) : null}
        {stripe.cancelAtPeriodEnd ? (
          <Button
            size="small"
            color="primary"
            variant="outlined"
            className={classes.actionBtn}
            onClick={() =>
              onConfirm({
                type: "reactivate",
                subscriptionId: stripe.subscriptionId,
                title: "Reativar assinatura?",
                body: "Remove o cancelamento agendado na Stripe."
              })
            }
          >
            Reativar
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default function StripeAssinaturasHub() {
  const classes = useStripeSettingsPageStyles();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("xs"));
  const isLgDown = useMediaQuery(theme.breakpoints.down("lg"));
  const isMdDown = useMediaQuery(theme.breakpoints.down("md"));
  const { dateToClient, datetimeToClient } = useDate();
  const { save, update, remove } = useCompanies();

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [originFilter, setOriginFilter] = useState("all");
  const [natureFilter, setNatureFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [ufFilter, setUfFilter] = useState("");
  const [companyModalOpen, setCompanyModalOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [record, setRecord] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [stripeConfirm, setStripeConfirm] = useState(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (natureFilter && natureFilter !== "all") params.nature = natureFilter;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (ufFilter) params.uf = ufFilter;
      const { data } = await api.get("/subscription/stripe/admin/subscribers", { params });
      setRecords(Array.isArray(data?.subscribers) ? data.subscribers.map(normalizeSubscriber) : []);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Erro ao carregar assinaturas");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [natureFilter, dateFrom, dateTo, ufFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = records;
    if (originFilter !== "all") {
      list = list.filter((r) => r.origin === originFilter);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      list = list.filter(
        (r) =>
          (r.name || "").toLowerCase().includes(q) ||
          (r.email || "").toLowerCase().includes(q) ||
          (r.phone || "").includes(q) ||
          (r.document || "").includes(q)
      );
    }
    return list;
  }, [records, originFilter, searchText]);

  const handleSelect = (row) => {
    if (!row.id) {
      toast.info("Assinatura só na Stripe — vincule uma organização local para editar.");
      return;
    }
    setRecord({
      id: row.id,
      name: row.name || "",
      email: row.email || "",
      phone: row.phone || "",
      planId: row.planId || "",
      stripeProductKey: row.stripeProductKey || "",
      status: row.status !== false,
      dueDate: row.dueDate || "",
      recurrence: row.recurrence || "MENSAL",
      password: "",
      document: row.document || "",
      paymentMethod: row.paymentMethod || "",
      generateInvoice: row.generateInvoice !== false
    });
    setCompanyModalOpen(true);
  };

  const handleAdd = () => {
    setRecord(null);
    setCompanyModalOpen(true);
  };

  const handleSubmit = async (data) => {
    setLoading(true);
    try {
      if (data.id !== undefined) await update(data);
      else await save(data);
      await load();
      setCompanyModalOpen(false);
      setRecord(null);
      toast.success("Operação realizada com sucesso!");
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.response?.data?.message || "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!record?.id) return;
    setLoading(true);
    try {
      await remove(record.id);
      await load();
      setShowConfirmDialog(false);
      setRecord(null);
      toast.success("Removido com sucesso!");
    } catch {
      toast.error("Não foi possível remover.");
    } finally {
      setLoading(false);
    }
  };

  const runStripeAction = async () => {
    if (!stripeConfirm) return;
    setActing(true);
    try {
      const { type, subscriptionId, invoiceId } = stripeConfirm;
      if (type === "cancel_end") {
        await api.post(`/subscription/stripe/admin/subscriptions/${subscriptionId}/cancel`, {
          immediately: false
        });
        toast.success("Cancelamento agendado para o fim do ciclo");
      } else if (type === "cancel_now") {
        await api.post(`/subscription/stripe/admin/subscriptions/${subscriptionId}/cancel`, {
          immediately: true
        });
        toast.success("Assinatura cancelada imediatamente na Stripe");
      } else if (type === "reactivate") {
        await api.post(`/subscription/stripe/admin/subscriptions/${subscriptionId}/reactivate`);
        toast.success("Cancelamento revertido na Stripe");
      } else if (type === "void_invoice") {
        await api.post(`/subscription/stripe/admin/invoices/${invoiceId}/void`);
        toast.success("Fatura anulada na Stripe");
      }
      setStripeConfirm(null);
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.error || "Erro na operação");
    } finally {
      setActing(false);
    }
  };

  const exportExcel = () => {
    try {
      const rows = filtered.map((r) => ({
        nome: r.name || "",
        email: r.email || "",
        plano: r.planName || "",
        valor: r.planAmount != null ? r.planAmount : "",
        status: r.status === false ? "Inativo" : "Ativo",
        origem: r.origin || "",
        vencimento: r.dueDate ? moment(r.dueDate).format("DD/MM/YYYY") : "",
        recorrencia: r.recurrence || ""
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Assinaturas");
      XLSX.writeFile(wb, `assinaturas_${moment().format("YYYYMMDD_HHmm")}.xlsx`);
      toast.success("Planilha gerada.");
    } catch {
      toast.error("Não foi possível exportar.");
    }
  };

  const toggleExpand = (key, e) => {
    e.stopPropagation();
    setExpanded((prev) => (prev === key ? null : key));
  };

  const colCount = 12 - (isLgDown ? 3 : 0) - (isMdDown ? 1 : 0);

  const tableCols = (
    <colgroup>
      <col style={{ width: "2.5%" }} />
      <col style={{ width: "2.5%" }} />
      <col style={{ width: isLgDown ? "14%" : "11%" }} />
      <col style={{ width: isLgDown ? "16%" : "12%" }} />
      <col style={{ width: "8%" }} />
      <col style={{ width: "9%" }} />
      <col style={{ width: "7%" }} />
      <col style={{ width: isLgDown ? "9%" : "8%" }} />
      {!isLgDown && <col style={{ width: "7%" }} />}
      <col style={{ width: isLgDown ? "10%" : "9%" }} />
      {!isMdDown && <col style={{ width: "7%" }} />}
      {!isLgDown && <col style={{ width: "8%" }} />}
      {!isLgDown && <col style={{ width: "8%" }} />}
    </colgroup>
  );

  const tableHeadRow = (
    <TableRow className={classes.headRow}>
      <TableCell padding="checkbox" align="center">
        <IconButton
          size="small"
          className={classes.headRefreshIcon}
          onClick={load}
          disabled={loading}
          title="Atualizar"
        >
          <RefreshIcon style={{ fontSize: 14 }} />
        </IconButton>
      </TableCell>
      <TableCell />
      <TableCell>Nome</TableCell>
      <TableCell>E-mail</TableCell>
      <TableCell align="center">Plano</TableCell>
      <TableCell align="center">Cobrança</TableCell>
      <TableCell align="center">Status</TableCell>
      {!isLgDown && <TableCell align="center">Origem</TableCell>}
      <TableCell align="center">Vencimento</TableCell>
      {!isMdDown && <TableCell align="center">Recorrência</TableCell>}
      {!isLgDown && <TableCell align="center">Criado em</TableCell>}
      {!isLgDown && <TableCell align="center">Último login</TableCell>}
    </TableRow>
  );

  const filtersBar = (
    <div className={classes.filterBar}>
      <div className={classes.filterGroup}>
        <div className={classes.searchBox}>
          <SearchIcon style={{ fontSize: 14, opacity: 0.4 }} />
          <InputBase
            placeholder="Buscar…"
            className={classes.searchInput}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <Select
          value={originFilter}
          onChange={(e) => setOriginFilter(e.target.value)}
          className={classes.filterPill}
          disableUnderline
          displayEmpty
        >
          <MenuItem value="all">Todas origens</MenuItem>
          <MenuItem value="stripe">Stripe</MenuItem>
          <MenuItem value="stripe_plan">Plano Stripe</MenuItem>
          <MenuItem value="manual">Manual</MenuItem>
        </Select>
        <Select
          value={natureFilter}
          onChange={(e) => setNatureFilter(e.target.value)}
          className={classes.filterPill}
          disableUnderline
          displayEmpty
        >
          <MenuItem value="all">Todas</MenuItem>
          <MenuItem value="freemium">Teste grátis</MenuItem>
          <MenuItem value="cadastro_gratis">Cadastro grátis</MenuItem>
        </Select>
        {!isLgDown && (
          <>
            <input
              type="date"
              className={classes.dateInput}
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              title="De"
            />
            <input
              type="date"
              className={classes.dateInput}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              title="Até"
            />
            <Select
              value={ufFilter}
              onChange={(e) => setUfFilter(e.target.value)}
              className={classes.filterPill}
              disableUnderline
              displayEmpty
              renderValue={(v) => v || "UF"}
            >
              {UFS.map((u) => (
                <MenuItem key={u || "all"} value={u}>
                  {u || "Todos"}
                </MenuItem>
              ))}
            </Select>
          </>
        )}
      </div>
      <Box className={classes.filterActions}>
        <IconButton
          className={classes.iconBtn}
          onClick={exportExcel}
          disabled={!filtered.length}
          title="Exportar Excel"
        >
          <ExportIcon style={{ fontSize: 14 }} />
        </IconButton>
        <Button
          variant="contained"
          color="primary"
          className={classes.btn}
          onClick={handleAdd}
          startIcon={!isMobile ? <AddIcon style={{ fontSize: 14 }} /> : undefined}
        >
          {isMobile ? <AddIcon style={{ fontSize: 16 }} /> : "Nova Assinatura"}
        </Button>
      </Box>
    </div>
  );

  return (
    <div className={classes.root}>
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" flex={1} py={6}>
          <CircularProgress size={24} thickness={4} />
        </Box>
      ) : isMobile ? (
        <div className={classes.listBlockFull}>
          <div className={classes.filterBarMobile}>{filtersBar}</div>
          <div className={`${classes.cardList} ${classes.cardListScroll}`} style={{ padding: 10 }}>
            {filtered.map((row, i) => {
              const key = rowKey(row, i);
              const hasStripe = Boolean(row.stripe?.subscriptionId);
              const isOpen = expanded === key;
              return (
                <div key={key} className={classes.card}>
                  <div
                    onClick={() => handleSelect(row)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && handleSelect(row)}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span className={classes.cardName}>{row.name || "—"}</span>
                      <LocalStatusTag status={row.status} classes={classes} />
                    </div>
                    <div className={classes.cardEmail}>{row.email || "—"}</div>
                    <div className={classes.cardRow}>
                      <span className={`${classes.tag} ${classes.tagNeutral}`}>{row.planName || "—"}</span>
                      <OriginTag origin={row.origin} classes={classes} />
                      <BillingCell
                        stripe={row.stripe}
                        planAmount={row.planAmount}
                        recurrence={row.recurrence}
                        classes={classes}
                        formatStripeMoney={formatStripeMoney}
                      />
                      <DueDateTag dueDate={row.dueDate} classes={classes} />
                    </div>
                  </div>
                  {hasStripe ? (
                    <>
                      <Button
                        size="small"
                        className={classes.actionBtn}
                        onClick={(e) => toggleExpand(key, e)}
                        endIcon={
                          <ExpandMoreIcon
                            style={{
                              transform: isOpen ? "rotate(180deg)" : "none",
                              transition: "transform 0.2s ease",
                              fontSize: 16
                            }}
                          />
                        }
                        style={{ marginTop: 8, width: "100%", justifyContent: "space-between" }}
                      >
                        Detalhes Stripe
                      </Button>
                      <Collapse in={isOpen} timeout={220}>
                        <div className={classes.cardDetail}>
                          <StripeDetailPanel
                            row={row}
                            classes={classes}
                            onConfirm={setStripeConfirm}
                          />
                        </div>
                      </Collapse>
                    </>
                  ) : null}
                </div>
              );
            })}
            {!filtered.length && (
              <Typography align="center" style={{ padding: 24, opacity: 0.5, fontSize: 12 }}>
                Nenhuma assinatura encontrada.
              </Typography>
            )}
          </div>
        </div>
      ) : (
        <div className={classes.listBlockFull}>
          <div className={classes.filterBarFixed}>{filtersBar}</div>
          <div className={classes.tableHeadFixed}>
            <Table className={classes.table} size="small">
              {tableCols}
              <TableHead>{tableHeadRow}</TableHead>
            </Table>
          </div>
          <div className={classes.tableScrollArea}>
            <Table className={classes.table} size="small">
              {tableCols}
              <TableBody>
                {filtered.map((row, index) => {
                  const key = rowKey(row, index);
                  const hasStripe = Boolean(row.stripe?.subscriptionId);
                  const isOpen = expanded === key;
                  return (
                    <React.Fragment key={key}>
                      <TableRow className={classes.tableRow} onClick={() => handleSelect(row)}>
                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          {hasStripe ? (
                            <IconButton
                              size="small"
                              className={classes.expandBtn}
                              onClick={(e) => toggleExpand(key, e)}
                            >
                              <ExpandMoreIcon
                                style={{
                                  transform: isOpen ? "rotate(180deg)" : "none",
                                  fontSize: 18,
                                  transition: "transform 0.2s ease"
                                }}
                              />
                            </IconButton>
                          ) : null}
                        </TableCell>
                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          <IconButton
                            size="small"
                            style={{ padding: 3 }}
                            onClick={() => handleSelect(row)}
                            title="Editar"
                          >
                            <EditIcon className={classes.editIcon} />
                          </IconButton>
                        </TableCell>
                        <TableCell>
                          <span className={classes.cellClip}>{row.name || "—"}</span>
                        </TableCell>
                        <TableCell>
                          <span className={classes.cellClip}>{row.email || "—"}</span>
                        </TableCell>
                        <TableCell align="center">
                          <span className={`${classes.tag} ${classes.tagNeutral}`}>{row.planName || "—"}</span>
                        </TableCell>
                        <TableCell align="center">
                          <BillingCell
                            stripe={row.stripe}
                            planAmount={row.planAmount}
                            recurrence={row.recurrence}
                            classes={classes}
                            formatStripeMoney={formatStripeMoney}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <LocalStatusTag status={row.status} classes={classes} />
                        </TableCell>
                        {!isLgDown && (
                          <TableCell align="center">
                            <OriginTag origin={row.origin} classes={classes} />
                          </TableCell>
                        )}
                        <TableCell align="center">
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                            <span style={{ fontSize: 11 }}>{dateToClient(row.dueDate)}</span>
                            <DueDateTag dueDate={row.dueDate} classes={classes} />
                          </div>
                        </TableCell>
                        {!isMdDown && (
                          <TableCell align="center">
                            <span className={`${classes.tag} ${classes.tagNeutral}`}>{row.recurrence || "—"}</span>
                          </TableCell>
                        )}
                        {!isLgDown && (
                          <TableCell align="center" style={{ fontSize: 11 }}>
                            {dateToClient(row.createdAt)}
                          </TableCell>
                        )}
                        {!isLgDown && (
                          <TableCell align="center" style={{ fontSize: 11, opacity: 0.65 }}>
                            {datetimeToClient(row.lastLogin)}
                          </TableCell>
                        )}
                      </TableRow>
                      {hasStripe ? (
                        <TableRow>
                          <TableCell colSpan={colCount} style={{ padding: 0, border: 0 }}>
                            <Collapse in={isOpen} timeout={220}>
                              <StripeDetailPanel
                                row={row}
                                classes={classes}
                                onConfirm={setStripeConfirm}
                              />
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </React.Fragment>
                  );
                })}
                {!filtered.length && (
                  <TableRow>
                    <TableCell colSpan={colCount} align="center" style={{ padding: 28, opacity: 0.5, fontSize: 12 }}>
                      Nenhuma assinatura encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <ModalCompany
        open={companyModalOpen}
        onClose={() => {
          setCompanyModalOpen(false);
          setRecord(null);
        }}
        company={record}
        onSave={handleSubmit}
      />

      <ConfirmationModal
        title="Exclusão"
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleDelete}
      >
        Deseja realmente excluir esse registro?
      </ConfirmationModal>

      <Dialog
        open={Boolean(stripeConfirm)}
        onClose={() => !acting && setStripeConfirm(null)}
        PaperProps={{ className: classes.dialogPaper }}
      >
        <DialogTitle style={{ fontWeight: 400, fontSize: 15 }}>{stripeConfirm?.title}</DialogTitle>
        <DialogContent>
          <DialogContentText style={{ fontSize: 13 }}>{stripeConfirm?.body}</DialogContentText>
        </DialogContent>
        <DialogActions style={{ padding: "12px 20px 20px" }}>
          <Button onClick={() => setStripeConfirm(null)} disabled={acting} className={classes.actionBtn}>
            Voltar
          </Button>
          <Button
            onClick={runStripeAction}
            variant="contained"
            disabled={acting}
            className={classes.actionBtn}
            style={{ background: "#dc2626", color: "#fff" }}
          >
            {acting ? <CircularProgress size={16} color="inherit" /> : "Confirmar"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
