/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useState } from "react";
import { Box, CircularProgress, Typography, makeStyles } from "@material-ui/core";
import { openApi } from "../../services/api";

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
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 24
  },
  vbBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 16
  },
  googleBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  title: { fontSize: 18, fontWeight: 600, marginBottom: 8 },
  sub: {
    fontSize: 13,
    color: "#a1a1aa",
    maxWidth: 340,
    lineHeight: 1.5,
    marginBottom: 20
  },
  error: { fontSize: 13, color: "#fca5a5", maxWidth: 360, lineHeight: 1.5 }
}));

function GoogleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function GoogleOAuthConnectPage() {
  const classes = useStyles();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const { data } = await openApi.get("/auth/google/authorize");
        if (cancelled) return;
        if (!data?.authorizeUrl) {
          setError("Não foi possível iniciar a autorização com Google.");
          return;
        }
        window.location.replace(data.authorizeUrl);
      } catch (e) {
        if (cancelled) return;
        const msg =
          e?.response?.data?.error ||
          e?.response?.data?.message ||
          e?.message ||
          "";
        if (/GOOGLE_OAUTH|CLIENT_ID|CLIENT_SECRET|não configurados/i.test(msg)) {
          setError("Login com Google não está configurado no servidor.");
        } else {
          setError(msg || "Não foi possível conectar com Google agora.");
        }
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            {
              type: "google-login-oauth-callback",
              status: "error",
              message: msg || "Não foi possível conectar com Google agora."
            },
            window.location.origin
          );
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Box className={classes.root}>
      <div className={classes.logoRow}>
        <span className={classes.vbBadge}>VB</span>
        <span className={classes.googleBadge}>
          <GoogleIcon />
        </span>
      </div>
      <Typography className={classes.title}>
        {error ? "Login com Google" : "Conectando com Google…"}
      </Typography>
      <Typography className={classes.sub}>
        {error
          ? "Esta janela pode ser fechada."
          : "VBSolution · Autorize o acesso na próxima tela. Não feche esta janela até concluir."}
      </Typography>
      {error ? (
        <Typography className={classes.error}>{error}</Typography>
      ) : (
        <CircularProgress size={32} style={{ color: "#a1a1aa" }} />
      )}
    </Box>
  );
}
