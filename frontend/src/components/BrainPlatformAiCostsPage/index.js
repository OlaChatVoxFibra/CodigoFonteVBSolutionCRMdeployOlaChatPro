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
import BarChartIcon from "@material-ui/icons/BarChart";
import MemoryIcon from "@material-ui/icons/Memory";
import AttachMoneyIcon from "@material-ui/icons/AttachMoney";
import ListAltIcon from "@material-ui/icons/ListAlt";
import api from "../../services/api";
import useCompanies from "../../hooks/useCompanies";
import WhatsappMetricCard, {
  dashboardIndicatorGridStyles,
  whatsappDashboardPalette
} from "../Dashboard/WhatsappMetricCard";

const font = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const ACTION_LABELS = {
  chat_simples: "Chat",
  consulta_crm: "Consulta CRM",
  acao_crm_simples: "Ação CRM",
  acao_crm_composta: "Ação composta",
  integracao_externa: "Integração",
  imagem_gemini: "Imagem",
  modo_voz: "Voz",
  analise_insights: "Insights",
  relatorio_pdf_excel: "Relatório",
  codigo_ide: "IDE Build",
  figma_prototipo: "Figma",
  transcricao: "Transcrição",
  sintese_voz: "TTS"
};

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("pt-BR");
  } catch {
    return String(value);
  }
}

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)";
  const surface = isDark ? "rgba(255,255,255,0.04)" : "#ffffff";
  const surfaceMuted = isDark ? "rgba(255,255,255,0.02)" : "#fafafa";

  return {
    root: {
      width: "100%",
      fontFamily: font,
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing(1.5)
    },
    indicatorGrid: dashboardIndicatorGridStyles(theme),
    toolbar: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: theme.spacing(1)
    },
    select: {
      fontFamily: font,
      fontSize: 13,
      minWidth: 160,
      height: 36,
      borderRadius: 8,
      background: isDark ? "rgba(255,255,255,0.04)" : "#fff",
      flex: "1 1 160px",
      maxWidth: "100%"
    },
    btn: {
      fontFamily: font,
      fontSize: 13,
      textTransform: "none",
      borderRadius: 8,
      height: 36,
      padding: "0 14px",
      fontWeight: 500
    },
    panel: {
      borderRadius: 12,
      border: `1px solid ${border}`,
      background: surface,
      overflow: "hidden"
    },
    panelHead: {
      padding: theme.spacing(1.25, 1.75),
      borderBottom: `1px solid ${border}`,
      fontFamily: font,
      fontWeight: 600,
      fontSize: 13,
      letterSpacing: "-0.01em"
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
        whiteSpace: "nowrap",
        background: surfaceMuted
      },
      "& td": {
        fontFamily: font,
        fontSize: 13,
        borderBottom: `1px solid ${border}`,
        color: theme.palette.text.primary
      }
    },
    badge: {
      height: 22,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: "0.02em"
    },
    empty: {
      padding: theme.spacing(4, 2),
      textAlign: "center",
      fontFamily: font,
      fontSize: 13,
      color: theme.palette.text.secondary
    },
    footer: {
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      padding: theme.spacing(1.25, 1.75),
      borderTop: `1px solid ${border}`,
      fontFamily: font,
      fontSize: 12,
      color: theme.palette.text.secondary
    },
    pager: { display: "flex", gap: 8 },
    mono: {
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      fontSize: 11
    }
  };
});

export default function BrainPlatformAiCostsPage() {
  const classes = useStyles();
  const theme = useTheme();
  const isDark = theme.palette.type === "dark";
  const palette = useMemo(() => whatsappDashboardPalette(theme), [theme]);
  const { list: listCompanies } = useCompanies();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const rowsPerPage = 25;
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState({ totalCredits: 0, totalTokens: 0, totalCostUsd: 0 });
  const [breakdown, setBreakdown] = useState({ byCompany: [], creditAccounts: [] });
  const [provider, setProvider] = useState("");
  const [actionType, setActionType] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [allCompanies, setAllCompanies] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await listCompanies();
        if (!alive) return;
        const rows = Array.isArray(data) ? data : data?.companies || data?.records || [];
        setAllCompanies(rows);
      } catch {
        if (alive) setAllCompanies([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [listCompanies]);

  const companyOptions = useMemo(() => {
    const map = new Map();
    (allCompanies || []).forEach((c) => {
      const id = Number(c.id);
      if (!id) return;
      map.set(id, { companyId: id, companyName: c.name || `Org #${id}` });
    });
    (breakdown.creditAccounts || []).forEach((row) => {
      const id = Number(row.companyId);
      if (!id) return;
      if (!map.has(id)) {
        map.set(id, { companyId: id, companyName: row.companyName || `Org #${id}` });
      }
    });
    (breakdown.byCompany || []).forEach((row) => {
      const id = Number(row.companyId);
      if (!id) return;
      if (!map.has(id)) {
        map.set(id, { companyId: id, companyName: row.companyName || `Org #${id}` });
      }
    });
    return [...map.values()].sort((a, b) =>
      String(a.companyName).localeCompare(String(b.companyName), "pt-BR")
    );
  }, [allCompanies, breakdown]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/ai-brain/credits/logs/platform", {
        params: {
          page: page + 1,
          limit: rowsPerPage,
          provider: provider || undefined,
          actionType: actionType || undefined,
          companyId: companyId || undefined
        }
      });
      setLogs(Array.isArray(data?.logs) ? data.logs : []);
      setTotal(Number(data?.count || 0));
      setSummary(data?.summary || { totalCredits: 0, totalTokens: 0, totalCostUsd: 0 });
      setBreakdown(data?.breakdown || { byCompany: [], creditAccounts: [] });
    } catch {
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, provider, actionType, companyId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));

  const indicatorMetrics = useMemo(
    () => [
      {
        title: "Créditos",
        subtitle: "Brain.AI",
        value: summary.totalCredits,
        icon: <BarChartIcon style={{ fontSize: 26 }} />,
        accent: palette.blueDark
      },
      {
        title: "Tokens",
        subtitle: "Entrada + saída",
        value: Number(summary.totalTokens).toLocaleString("pt-BR"),
        icon: <MemoryIcon style={{ fontSize: 26 }} />,
        accent: "#8b5cf6"
      },
      {
        title: "USD est.",
        subtitle: "Custo API",
        value: `$${Number(summary.totalCostUsd).toFixed(4)}`,
        icon: <AttachMoneyIcon style={{ fontSize: 26 }} />,
        accent: palette.green
      },
      {
        title: "Requisições",
        subtitle: "Total filtrado",
        value: total,
        icon: <ListAltIcon style={{ fontSize: 26 }} />,
        accent: palette.amber
      }
    ],
    [summary, total, palette]
  );

  return (
    <div className={classes.root}>
      <div data-dashboard-cards className={classes.indicatorGrid}>
        {indicatorMetrics.map((m) => (
          <WhatsappMetricCard
            key={m.title}
            palette={palette}
            isDark={isDark}
            title={m.title}
            subtitle={m.subtitle}
            value={m.value}
            icon={m.icon}
            accent={m.accent}
          />
        ))}
      </div>

      <div className={classes.toolbar}>
        <Select
          value={companyId}
          onChange={(e) => {
            setCompanyId(e.target.value);
            setPage(0);
          }}
          displayEmpty
          variant="outlined"
          className={classes.select}
          disableUnderline
        >
          <MenuItem value="">Todas organizações</MenuItem>
          {companyOptions.map((row) => (
            <MenuItem key={row.companyId} value={String(row.companyId)}>
              {row.companyName}
            </MenuItem>
          ))}
        </Select>
        <Select
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value);
            setPage(0);
          }}
          displayEmpty
          variant="outlined"
          className={classes.select}
          disableUnderline
        >
          <MenuItem value="">Todos provedores</MenuItem>
          <MenuItem value="openai">OpenAI</MenuItem>
          <MenuItem value="anthropic">Anthropic</MenuItem>
          <MenuItem value="gemini">Gemini</MenuItem>
        </Select>
        <Select
          value={actionType}
          onChange={(e) => {
            setActionType(e.target.value);
            setPage(0);
          }}
          displayEmpty
          variant="outlined"
          className={classes.select}
          disableUnderline
        >
          <MenuItem value="">Todas ações</MenuItem>
          {Object.entries(ACTION_LABELS).map(([key, label]) => (
            <MenuItem key={key} value={key}>
              {label}
            </MenuItem>
          ))}
        </Select>
        <Button
          variant="contained"
          color="primary"
          className={classes.btn}
          onClick={fetchLogs}
          disabled={loading}
        >
          Atualizar
        </Button>
      </div>

      {breakdown.byCompany?.length > 0 && (
        <Paper className={classes.panel} elevation={0}>
          <Typography className={classes.panelHead}>Gasto por organização</Typography>
          <div className={classes.tableWrap}>
            <Table size="small" className={classes.table}>
              <TableHead>
                <TableRow>
                  <TableCell>Organização</TableCell>
                  <TableCell align="right">Req.</TableCell>
                  <TableCell align="right">Créditos</TableCell>
                  <TableCell align="right">Tokens</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {breakdown.byCompany.map((row) => (
                  <TableRow key={row.companyId} hover>
                    <TableCell>{row.companyName}</TableCell>
                    <TableCell align="right">{row.requestCount}</TableCell>
                    <TableCell align="right">{row.totalCredits}</TableCell>
                    <TableCell align="right">
                      {Number(row.totalTokens).toLocaleString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Paper>
      )}

      <Paper className={classes.panel} elevation={0}>
        <Typography className={classes.panelHead}>Histórico de requisições</Typography>
        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={24} />
          </Box>
        ) : logs.length === 0 ? (
          <Typography className={classes.empty}>Nenhum registro ainda.</Typography>
        ) : (
          <div className={classes.tableWrap}>
            <Table size="small" className={classes.table}>
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell>Org</TableCell>
                  <TableCell>Usuário</TableCell>
                  <TableCell>Ação</TableCell>
                  <TableCell>Modelo</TableCell>
                  <TableCell align="right">Créd.</TableCell>
                  <TableCell align="right">Tokens</TableCell>
                  <TableCell>Prov.</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {logs.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell className={classes.mono}>{formatDate(row.createdAt)}</TableCell>
                    <TableCell>{row.company?.name || `#${row.companyId}`}</TableCell>
                    <TableCell>{row.user?.name || row.user?.email || "—"}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={ACTION_LABELS[row.actionType] || row.actionType}
                        className={classes.badge}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell className={classes.mono}>{row.model || "—"}</TableCell>
                    <TableCell align="right">{row.creditsUsed}</TableCell>
                    <TableCell align="right">{row.totalTokens || "—"}</TableCell>
                    <TableCell style={{ textTransform: "capitalize" }}>{row.provider}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <div className={classes.footer}>
          <span>
            Página {page + 1} de {totalPages} · {total} registros
          </span>
          <div className={classes.pager}>
            <Button
              size="small"
              variant="outlined"
              className={classes.btn}
              disabled={page <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Anterior
            </Button>
            <Button
              size="small"
              variant="outlined"
              className={classes.btn}
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      </Paper>
    </div>
  );
}
