/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { makeStyles, Box, Typography, IconButton } from "@material-ui/core";
import ArrowUpwardIcon from "@material-ui/icons/ArrowUpward";
import ArrowDownwardIcon from "@material-ui/icons/ArrowDownward";

const useStyles = makeStyles((theme) => ({
  list: {
    display: "flex",
    flexDirection: "column",
    gap: 3,
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 8px",
    borderRadius: 6,
    border: `1px solid ${
      theme.palette.type === "dark" ? "rgba(255,255,255,0.06)" : "#ececf1"
    }`,
    background:
      theme.palette.type === "dark" ? "rgba(255,255,255,0.02)" : "#fff",
  },
  orderBadge: {
    width: 18,
    height: 18,
    borderRadius: 5,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    fontWeight: 700,
    color: "#fff",
    flexShrink: 0,
  },
  name: {
    flex: 1,
    fontSize: 11,
    fontWeight: 500,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  actions: {
    display: "flex",
  },
  actionBtn: {
    padding: 2,
  },
}));

export default function QueueOrderList({ queues = [], onMove }) {
  const classes = useStyles();

  if (queues.length < 2) {
    return null;
  }

  return (
    <Box className={classes.list}>
      {queues.map((queue, index) => (
        <Box key={queue.id} className={classes.item}>
          <Box
            className={classes.orderBadge}
            style={{ backgroundColor: queue.color || "#6366f1" }}
          >
            {index + 1}
          </Box>
          <Typography className={classes.name}>{queue.name}</Typography>
          <Box className={classes.actions}>
            <IconButton
              size="small"
              className={classes.actionBtn}
              disabled={index === 0}
              onClick={() => onMove(index, -1)}
              aria-label="Mover para cima"
            >
              <ArrowUpwardIcon style={{ fontSize: 14 }} />
            </IconButton>
            <IconButton
              size="small"
              className={classes.actionBtn}
              disabled={index === queues.length - 1}
              onClick={() => onMove(index, 1)}
              aria-label="Mover para baixo"
            >
              <ArrowDownwardIcon style={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        </Box>
      ))}
    </Box>
  );
}
