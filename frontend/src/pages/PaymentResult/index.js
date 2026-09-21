/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useMemo } from "react";
import { makeStyles } from "@material-ui/core/styles";
import { Box, Typography, Paper, Button, CircularProgress } from "@material-ui/core";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";
import CancelOutlinedIcon from "@material-ui/icons/CancelOutlined";
import { useHistory, useLocation } from "react-router-dom";
import { openApi } from "../../services/api";
import {
  clearStripeCheckoutReturnPath,
  readStripeCheckoutReturnPath,
  sanitizeStripeReturnPath,
} from "../../utils/stripeCheckoutReturn";

const useStyles = makeStyles(theme => ({
  root: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing(3),
    background: theme.palette.type === "light" ? "#f5f7fb" : theme.palette.background.default
  },
  card: {
    maxWidth: 480,
    width: "100%",
    padding: theme.spacing(4),
    borderRadius: 16,
    textAlign: "center"
  },
  iconOk: { fontSize: 56, color: "#16a34a", marginBottom: theme.spacing(2) },
  iconCancel: { fontSize: 56, color: "#dc2626", marginBottom: theme.spacing(2) }
}));

export function PaymentSuccess() {
  const classes = useStyles();
  const history = useHistory();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const sessionId = params.get("session_id");
  const email = params.get("email");
  const token = localStorage.getItem("token");
  const [autoRedirecting, setAutoRedirecting] = React.useState(false);

  const brainReturn = sessionId
    ? `/brain-ai?payment=success&session_id=${encodeURIComponent(sessionId)}&view=plans`
    : "/brain-ai?payment=success&view=plans";

  useEffect(() => {
    if (token || !email) return undefined;
    let cancelled = false;
    setAutoRedirecting(true);
    const poll = async () => {
      try {
        const r = await openApi.get("/auth/confirm/by-email", { params: { email } });
        if (!cancelled && r?.data?.token) {
          history.replace(`/register?confirmToken=${encodeURIComponent(r.data.token)}`);
        }
      } catch {}
    };
    poll();
    const timer = setInterval(poll, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [email, history, token]);

  return (
    <Box className={classes.root}>
      <Paper elevation={1} className={classes.card}>
        <CheckCircleOutlineIcon className={classes.iconOk} />
        <Typography variant="h5" style={{ fontWeight: 600, marginBottom: 8 }}>
          Pagamento confirmado
        </Typography>
        <Typography variant="body2" color="textSecondary" style={{ marginBottom: 24 }}>
          Recebemos seu pagamento no Stripe.
          {token
            ? " Seus créditos Brain.AI serão liberados automaticamente."
            : autoRedirecting
              ? " Confirmando pagamento e redirecionando para a próxima etapa do cadastro…"
              : sessionId
                ? " Em instantes você receberá o e-mail para concluir o cadastro."
                : " Volte ao cadastro e confirme com o mesmo e-mail usado no checkout."}
        </Typography>
        {autoRedirecting && !token ? (
          <Box display="flex" justifyContent="center" mb={2}>
            <CircularProgress size={28} />
          </Box>
        ) : null}
        {token ? (
          <>
            <Button color="primary" variant="contained" onClick={() => history.push(brainReturn)} style={{ marginRight: 8 }}>
              Ir para Brain.AI
            </Button>
            <Button variant="outlined" onClick={() => history.push("/")}>
              Voltar ao painel
            </Button>
          </>
        ) : (
          <>
            <Button color="primary" variant="contained" onClick={() => history.push("/register")} style={{ marginRight: 8 }}>
              Continuar cadastro
            </Button>
            <Button variant="outlined" onClick={() => history.push("/login")}>
              Ir para login
            </Button>
          </>
        )}
      </Paper>
    </Box>
  );
}

export function PaymentCancel() {
  const classes = useStyles();
  const history = useHistory();
  const location = useLocation();

  const returnPath = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const fromQuery = sanitizeStripeReturnPath(params.get("return"));
    return fromQuery || readStripeCheckoutReturnPath();
  }, [location.search]);

  useEffect(() => {
    clearStripeCheckoutReturnPath();
    history.replace(returnPath);
  }, [history, returnPath]);

  return (
    <Box className={classes.root}>
      <Paper elevation={1} className={classes.card}>
        <CancelOutlinedIcon className={classes.iconCancel} />
        <Typography variant="h5" style={{ fontWeight: 600, marginBottom: 8 }}>
          Pagamento cancelado
        </Typography>
        <Typography variant="body2" color="textSecondary" style={{ marginBottom: 24 }}>
          Voltando para onde você estava…
        </Typography>
        <Box display="flex" justifyContent="center" mb={2}>
          <CircularProgress size={28} />
        </Box>
        <Button color="primary" variant="contained" onClick={() => history.replace(returnPath)}>
          Voltar agora
        </Button>
      </Paper>
    </Box>
  );
}
