/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from "@material-ui/core";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import moment from "moment";
import api from "../../services/api";
import { formatStripeMoney } from "../../utils/stripeCatalogMerge";

const font = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const STATUS_COLORS = {
  active: "primary",
  trialing: "primary",
  past_due: "secondary",
  canceled: "default",
  unpaid: "secondary",
  incomplete: "default"
};

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  const surface = isDark ? "rgba(255,255,255,0.04)" : "#ffffff";

  return {
    root: { width: "100%", fontFamily: font, marginBottom: theme.spacing(2) },
    paper: {
      borderRadius: 12,
      border: `1px solid ${border}`,
      background: surface,
      overflow: "hidden"
    },
    head: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: theme.spacing(1.75, 2),
      borderBottom: `1px solid ${border}`,
      flexWrap: "wrap"
    },
    title: {
      fontFamily: font,
      fontWeight: 600,
      fontSize: 15,
      letterSpacing: "-0.02em"
    },
    meta: {
      fontFamily: font,
      fontSize: 12,
      color: theme.palette.text.secondary
    },
    filters: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap"
    },
    select: {
      fontFamily: font,
      fontSize: 13,
      minWidth: 140,
      height: 36,
      borderRadius: 8,
      background: isDark ? "rgba(255,255,255,0.04)" : "#fff"
    },
    tableWrap: { overflowX: "auto" },
    table: {
      fontFamily: font,
      "& th": {
        fontFamily: font,
        fontWeight: 500,
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        color: theme.palette.text.secondary,
        borderBottom: `1px solid ${border}`,
        whiteSpace: "nowrap"
      },
      "& td": {
        fontFamily: font,
        fontSize: 13,
        borderBottom: `1px solid ${border}`,
        verticalAlign: "middle"
      }
    },
    empty: {
      padding: theme.spacing(4, 2),
      textAlign: "center",
      fontFamily: font,
      fontSize: 13,
      color: theme.palette.text.secondary
    },
    mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 11 }
  };
});

function statusLabel(status) {
  const map = {
    active: "Ativa",
    trialing: "Trial",
    past_due: "Em atraso",
    canceled: "Cancelada",
    unpaid: "Não paga",
    incomplete: "Incompleta"
  };
  return map[status] || status;
}

export default function StripeSubscriptionsAdminPanel() {
  const classes = useStyles();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [configured, setConfigured] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/subscription/stripe/subscriptions/platform", {
        params: { limit: 100, status: statusFilter }
      });
      setRows(Array.isArray(data?.subscriptions) ? data.subscriptions : []);
      setConfigured(data?.configured !== false);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || "Erro ao carregar assinaturas");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (typeFilter === "all") return rows;
    return rows.filter((r) => r.productType === typeFilter);
  }, [rows, typeFilter]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.status === "active" || r.status === "trialing").length;
    const mrr = rows
      .filter((r) => r.status === "active" && r.interval === "monthly" && r.amountCents)
      .reduce((s, r) => s + Number(r.amountCents), 0);
    return { total: rows.length, active, mrr };
  }, [rows]);

  return (
    <div className={classes.root}>
      <Paper className={classes.paper} elevation={0}>
        <div className={classes.head}>
          <div>
            <Typography className={classes.title}>Assinaturas Stripe</Typography>
            <Typography className={classes.meta}>
              {stats.active} ativa(s) · {stats.total} no total
              {stats.mrr > 0
                ? ` · MRR ${formatStripeMoney(stats.mrr, "brl")}`
                : ""}
            </Typography>
          </div>
          <div className={classes.filters}>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              variant="outlined"
              className={classes.select}
              disableUnderline
            >
              <MenuItem value="all">Todos status</MenuItem>
              <MenuItem value="active">Ativas</MenuItem>
              <MenuItem value="trialing">Trial</MenuItem>
              <MenuItem value="past_due">Em atraso</MenuItem>
              <MenuItem value="canceled">Canceladas</MenuItem>
            </Select>
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              variant="outlined"
              className={classes.select}
              disableUnderline
            >
              <MenuItem value="all">CRM + Brain</MenuItem>
              <MenuItem value="crm">CRM</MenuItem>
              <MenuItem value="brain">Brain.AI</MenuItem>
            </Select>
            <Button size="small" variant="outlined" onClick={load} disabled={loading}>
              Atualizar
            </Button>
          </div>
        </div>

        {!configured ? (
          <div className={classes.empty}>Stripe não configurado neste ambiente.</div>
        ) : loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <div className={classes.empty}>{error}</div>
        ) : filtered.length === 0 ? (
          <div className={classes.empty}>Nenhuma assinatura encontrada na Stripe.</div>
        ) : (
          <div className={classes.tableWrap}>
            <Table size="small" className={classes.table}>
              <TableHead>
                <TableRow>
                  <TableCell>Cliente</TableCell>
                  <TableCell>Organização</TableCell>
                  <TableCell>Plano</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Valor</TableCell>
                  <TableCell>Vencimento</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.subscriptionId} hover>
                    <TableCell>
                      <div>{row.customerName || row.customerEmail || "—"}</div>
                      {row.customerEmail ? (
                        <div className={classes.mono}>{row.customerEmail}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {row.companyName || (row.companyId ? `#${row.companyId}` : "—")}
                    </TableCell>
                    <TableCell>{row.planLabel || row.productKey || "—"}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={row.productType === "brain" ? "Brain" : row.productType === "crm" ? "CRM" : "—"}
                        variant="outlined"
                        style={{ height: 22, fontSize: 10 }}
                      />
                    </TableCell>
                    <TableCell>
                      {row.amountCents != null
                        ? `${formatStripeMoney(row.amountCents, row.currency || "brl")}${
                            row.interval === "annual" ? "/ano" : "/mês"
                          }`
                        : "—"}
                    </TableCell>
                    <TableCell>
                      {row.currentPeriodEnd
                        ? moment.unix(row.currentPeriodEnd).format("DD/MM/YYYY")
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={statusLabel(row.status)}
                        color={STATUS_COLORS[row.status] || "default"}
                        variant={row.status === "active" ? "default" : "outlined"}
                        style={{ height: 22, fontSize: 10 }}
                      />
                      {row.cancelAtPeriodEnd ? (
                        <Typography className={classes.meta} style={{ marginTop: 2 }}>
                          Cancela no fim do ciclo
                        </Typography>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Paper>
    </div>
  );
}
