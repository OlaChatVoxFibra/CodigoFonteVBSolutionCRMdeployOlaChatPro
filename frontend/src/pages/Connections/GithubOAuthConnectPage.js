/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useState } from "react";
import { Box, CircularProgress, Typography, makeStyles } from "@material-ui/core";
import { Github } from "lucide-react";
import githubIntegrationService from "../../services/githubIntegrationService";
import { getGithubAuthorizeUrl } from "../../services/brainGithubService";

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
    fontSize: 16,
    letterSpacing: "-0.02em"
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: 8
  },
  sub: {
    fontSize: 13,
    color: "#a1a1aa",
    maxWidth: 320,
    lineHeight: 1.5,
    marginBottom: 20
  },
  error: {
    fontSize: 13,
    color: "#fca5a5",
    maxWidth: 340,
    lineHeight: 1.5
  }
}));

/**
 * Popup branded: redireciona para GitHub OAuth sem expor URLs inválidas ao usuário.
 */
export default function GithubOAuthConnectPage() {
  const classes = useStyles();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get("mode") === "user" ? "user" : "org";

      try {
        let authorizeUrl = "";

        if (mode === "org") {
          const data = await githubIntegrationService.getOrgAuthorizeUrl();
          authorizeUrl = data?.authorizeUrl || "";
        } else {
          const data = await getGithubAuthorizeUrl();
          authorizeUrl = data?.authorizeUrl || "";
        }

        if (cancelled) return;

        if (!authorizeUrl) {
          setError(
            "Não foi possível iniciar a conexão. Tente em Integrações → GitHub ou contate o suporte."
          );
          return;
        }

        window.location.replace(authorizeUrl);
      } catch (e) {
        if (cancelled) return;
        const msg =
          e?.response?.data?.error ||
          e?.response?.data?.message ||
          e?.message ||
          "";
        if (msg && !/GITHUB_OAUTH|\.env|CLIENT_SECRET/i.test(msg)) {
          setError(msg);
        } else {
          setError(
            "Não foi possível conectar ao GitHub agora. Verifique Integrações → GitHub e tente novamente."
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
        <Github size={36} color="#fafafa" />
      </div>
      <Typography className={classes.title}>
        {error ? "Conexão GitHub" : "Conectando ao GitHub…"}
      </Typography>
      <Typography className={classes.sub}>
        {error
          ? "Esta janela pode ser fechada."
          : "VBSolution CRM · Autorize o acesso na próxima tela do GitHub. Não feche esta janela até concluir."}
      </Typography>
      {error ? (
        <Typography className={classes.error}>{error}</Typography>
      ) : (
        <CircularProgress size={32} style={{ color: "#a1a1aa" }} />
      )}
    </Box>
  );
}
