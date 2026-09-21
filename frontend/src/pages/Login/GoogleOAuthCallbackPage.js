/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@material-ui/core";

/**
 * Callback OAuth Google Login — notifica janela pai (popup) e fecha.
 */
export default function GoogleOAuthCallbackPage() {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get("status") || "error";
    const exchange = params.get("exchange") || "";
    const email = params.get("email") || "";
    const message = params.get("message") || "";

    const payload = {
      type: "google-login-oauth-callback",
      status,
      exchange,
      email,
      message
    };

    const origin = window.location.origin;

    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(payload, origin);
      window.close();
      return;
    }

    if (window.parent && window.parent !== window) {
      window.parent.postMessage(payload, origin);
    }
  }, [location.search]);

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      p={3}
      style={{ background: "#fff" }}
    >
      <CircularProgress size={32} />
      <Typography variant="body2" color="textSecondary" style={{ marginTop: 16 }}>
        Finalizando login com Google…
      </Typography>
    </Box>
  );
}
