/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  makeStyles,
} from "@material-ui/core";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2),
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  paper: {
    borderRadius: 8,
    overflow: "hidden",
  },
}));

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("pt-BR");
  } catch {
    return String(value);
  }
}

export default function OrgBrainTokenLogsPanel() {
  const classes = useStyles();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/ai-brain/credits/logs", {
        params: { page: 1, limit: 50 },
      });
      setRows(Array.isArray(data?.logs) ? data.logs : []);
    } catch {
      setRows([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Box className={classes.root}>
      <Typography variant="h6">Logs de tokens (organização)</Typography>
      {loading ? (
        <CircularProgress size={28} />
      ) : (
        <Paper className={classes.paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Data</TableCell>
                <TableCell>Ação</TableCell>
                <TableCell>Provedor</TableCell>
                <TableCell align="right">Tokens</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    Nenhum registro ainda.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id || `${row.createdAt}-${row.actionType}`}>
                    <TableCell>{formatDate(row.createdAt)}</TableCell>
                    <TableCell>{row.actionType || "—"}</TableCell>
                    <TableCell>{row.provider || "—"}</TableCell>
                    <TableCell align="right">{row.totalTokens ?? "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}
