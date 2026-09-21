/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useMemo } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { Box, Typography, Paper } from "@material-ui/core";
import { useLocation } from "react-router-dom";
import { buildStripeCrmCheckoutUrl } from "../../utils/stripeCheckout";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";
import Button from "@material-ui/core/Button";

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing(2, 0.5),
    background: theme.palette.type === "light" ? "#f5f7fb" : theme.palette.background.default,
  },
  frameWrap: {
    width: "calc(100vw - 8px)",
    height: 720,
    maxWidth: "100vw",
    maxHeight: "80vh",
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    border: `1px solid ${theme.palette.divider}`,
    background: theme.palette.background.paper,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  loader: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    gap: 8,
    background: theme.palette.type === "light" ? "rgba(255,255,255,0.85)" : "rgba(0,0,0,0.35)",
    zIndex: 2,
  },
  iframe: {
    width: "100%",
    height: "100%",
    border: "none",
  },
  placeholder: {
    padding: theme.spacing(3),
    textAlign: "center",
    color: theme.palette.text.secondary,
  },
}));

export default function Payment() {
  const classes = useStyles();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const cycle = params.get("cycle"); // mensal|semestral|anual
  const tier = params.get("tier"); // starter|essencial|pro
  const directUrl = params.get("url");
  const email = params.get("email");

  const url = useMemo(() => {
    if (directUrl) return directUrl;
    return buildStripeCrmCheckoutUrl(cycle, tier, email);
  }, [directUrl, cycle, tier, email]);

  return (
    <Box className={classes.root}>
      <Paper elevation={1} className={classes.frameWrap} style={{ flexDirection: "column", padding: 32, height: "auto", minHeight: 280 }}>
        {url ? (
          <>
            <Typography variant="h6" style={{ fontWeight: 600, marginBottom: 8 }}>
              Checkout Stripe
            </Typography>
            <Typography variant="body2" color="textSecondary" style={{ marginBottom: 20, textAlign: "center", maxWidth: 420 }}>
              Clique abaixo para concluir o pagamento na página segura do Stripe.
            </Typography>
            <Button
              component="a"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              color="primary"
              size="large"
              endIcon={<OpenInNewIcon />}
            >
              Pagar agora
            </Button>
          </>
        ) : (
          <div className={classes.placeholder}>
            <Typography variant="subtitle1" style={{ fontWeight: 600, marginBottom: 8 }}>
              Selecione um plano para prosseguir com o pagamento
            </Typography>
            <Typography variant="body2">
              Volte à página de planos e escolha o ciclo e o plano desejados.
            </Typography>
          </div>
        )}
      </Paper>
    </Box>
  );
}
