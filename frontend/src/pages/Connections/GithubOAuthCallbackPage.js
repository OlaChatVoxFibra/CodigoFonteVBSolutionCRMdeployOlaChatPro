/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Box, Typography, makeStyles } from "@material-ui/core";
import { CheckCircle, Github, XCircle } from "lucide-react";

const useStyles = makeStyles(() => ({
  root: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    background: "linear-gradient(160deg, #0f0f12 0%, #1a1a22 45%, #12121a 100%)",
    color: "#fafafa",
    fontFamily: "'Inter', system-ui, sans-serif",
    textAlign: "center"
  },
  iconOk: { color: "#4ade80", marginBottom: 16 },
  iconErr: { color: "#f87171", marginBottom: 16 },
  title: { fontSize: 18, fontWeight: 600, marginBottom: 8 },
  sub: {
    fontSize: 13,
    color: "#a1a1aa",
    maxWidth: 320,
    lineHeight: 1.5
  }
}));

/**
 * Callback OAuth GitHub — UI branded antes de notificar a janela pai e fechar.
 */
export default function GithubOAuthCallbackPage() {
  const location = useLocation();
  const classes = useStyles();
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get("status") || "error";
    const login = params.get("login") || "";
    const name = params.get("name") || "";
    const message = params.get("message") || "";

    const payload = {
      type: "github-oauth-callback",
      status,
      login,
      name,
      message
    };

    const origin = window.location.origin;
    const delay = status === "success" ? 900 : 2200;

    const timer = setTimeout(() => {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(payload, origin);
      } else if (window.parent && window.parent !== window) {
        window.parent.postMessage(payload, origin);
      }
      setDone(true);
      try {
        window.close();
      } catch {
        /* ignore */
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [location.search]);

  const params = new URLSearchParams(location.search);
  const status = params.get("status") || "error";
  const login = params.get("login") || "";
  const isSuccess = status === "success";

  return (
    <Box className={classes.root}>
      {isSuccess ? (
        <CheckCircle size={48} className={classes.iconOk} />
      ) : (
        <XCircle size={48} className={classes.iconErr} />
      )}
      <Github size={28} color="#71717a" style={{ marginBottom: 12 }} />
      <Typography className={classes.title}>
        {isSuccess
          ? login
            ? `Conta @${login} conectada`
            : "GitHub conectado"
          : "Não foi possível conectar"}
      </Typography>
      <Typography className={classes.sub}>
        {isSuccess
          ? done
            ? "Pode fechar esta janela."
            : "VBSolution CRM · Finalizando…"
          : "Verifique em Integrações → GitHub e tente novamente."}
      </Typography>
    </Box>
  );
}
