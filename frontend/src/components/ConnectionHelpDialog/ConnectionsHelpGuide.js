/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect } from "react";
import { Box, Typography, Paper } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { CheckCircleOutline } from "@material-ui/icons";
import { motion, AnimatePresence } from "framer-motion";
import { CONNECTION_GUIDES } from "./connectionsHelpContent";

const FONT =
  '"Helvetica Neue", Helvetica, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  return {
    root: {
      fontFamily: FONT,
    },
    intro: {
      fontFamily: FONT,
      fontSize: 13,
      lineHeight: 1.55,
      color: theme.palette.text.secondary,
      marginBottom: theme.spacing(2),
      padding: theme.spacing(1.25, 1.5),
      borderRadius: 10,
      background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    },
    sectionLabel: {
      fontFamily: FONT,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: theme.palette.text.secondary,
      marginBottom: theme.spacing(1),
    },
    tabsWrap: {
      display: "flex",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: theme.spacing(2),
      paddingRight: 2
    },
    tab: {
      fontFamily: FONT,
      fontSize: 12,
      fontWeight: 500,
      padding: "6px 12px",
      borderRadius: 20,
      border: `1px solid ${
        isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"
      }`,
      cursor: "pointer",
      background: "transparent",
      color: theme.palette.text.secondary,
      transition: "all 0.18s ease",
      outline: "none",
      "&:hover": {
        borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.14)",
      },
      "&:focus-visible": {
        boxShadow: `0 0 0 2px ${theme.palette.primary.main}44`,
      },
    },
    tabActive: {
      background: isDark ? "#f4f4f5" : "#1d1d1f",
      color: isDark ? "#1d1d1f" : "#fff",
      borderColor: "transparent",
      fontWeight: 600,
    },
    tabDot: {
      display: "inline-block",
      width: 6,
      height: 6,
      borderRadius: "50%",
      marginRight: 6,
      verticalAlign: "middle",
      marginBottom: 1,
    },
    tagline: {
      fontFamily: FONT,
      fontSize: 13,
      color: theme.palette.text.secondary,
      marginBottom: theme.spacing(1.5),
      letterSpacing: "-0.01em",
    },
    stepCard: {
      display: "flex",
      gap: 10,
      padding: theme.spacing(1, 1.25),
      borderRadius: 10,
      marginBottom: 6,
      border: `1px solid ${
        isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"
      }`,
      background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
    },
    stepNum: {
      width: 26,
      height: 26,
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 12,
      fontWeight: 600,
      flexShrink: 0,
      fontFamily: FONT,
    },
    stepTitle: {
      fontFamily: FONT,
      fontWeight: 600,
      fontSize: 12,
      marginBottom: 2,
      letterSpacing: "-0.01em",
      color: theme.palette.text.primary,
    },
    stepDesc: {
      fontFamily: FONT,
      fontSize: 11,
      lineHeight: 1.45,
      color: theme.palette.text.secondary,
    },
    tip: {
      fontFamily: FONT,
      fontSize: 12,
      padding: theme.spacing(1.25, 1.5),
      borderRadius: 10,
      marginTop: theme.spacing(1.5),
      background: isDark ? "rgba(52, 199, 89, 0.12)" : "rgba(52, 199, 89, 0.1)",
      color: isDark ? "#6ee7a0" : "#248a3d",
      display: "flex",
      alignItems: "flex-start",
      gap: 8,
      lineHeight: 1.45,
    },
    tipLink: {
      color: "inherit",
      fontWeight: 600,
      textDecoration: "underline",
      textUnderlineOffset: 2,
    },
    externalBadge: {
      fontFamily: FONT,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      color: theme.palette.text.disabled,
      marginLeft: 4,
    },
    soonBadge: {
      fontFamily: FONT,
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
      color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)",
      marginLeft: 4,
    },
  };
});

const ConnectionsHelpGuide = ({ resetKey = 0, initialSection = "overview" }) => {
  const classes = useStyles();
  const [activeId, setActiveId] = useState(initialSection);

  useEffect(() => {
    setActiveId(initialSection);
  }, [resetKey, initialSection]);

  const guide =
    CONNECTION_GUIDES.find((g) => g.id === activeId) || CONNECTION_GUIDES[0];

  return (
    <Box className={classes.root}>
      <Typography className={classes.intro} component="div">
        Escolha um canal abaixo para ver o passo a passo. No hub, use{" "}
        <strong>Administrar</strong> em cada card ativo. <strong>CRMs</strong> (HubSpot, ClickUp,
        Pipedrive), <strong>Notion</strong>, <strong>Supabase</strong>, <strong>GitHub</strong>,{" "}
        <strong>Figma</strong> e <strong>Google Workspace</strong> já podem ser configurados.{" "}
        <strong>Em breve</strong>: LinkedIn. <strong>Open IA</strong>, <strong>Claude</strong> e{" "}
        <strong>Gemini</strong> usam API Key aqui; agentes em Agente IA. No Brain, use{" "}
        <strong>Brain · IDE</strong> para codificar com preview ao vivo — conecte Supabase para
        publicar no Postgres. E-mail abre o módulo dedicado no menu.
      </Typography>

      <Typography className={classes.sectionLabel}>Canais e módulos</Typography>
      <div className={classes.tabsWrap} role="tablist" aria-label="Guias por canal">
        {CONNECTION_GUIDES.map((g) => {
          const isActive = g.id === activeId;
          return (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`${classes.tab} ${isActive ? classes.tabActive : ""}`}
              onClick={() => setActiveId(g.id)}
            >
              <span
                className={classes.tabDot}
                style={{ backgroundColor: g.accent }}
                aria-hidden
              />
              {g.label}
              {g.comingSoon ? (
                <span className={classes.soonBadge}> · em breve</span>
              ) : g.external ? (
                <span className={classes.externalBadge}> · módulo</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={guide.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22 }}
        >
          <Typography className={classes.tagline}>{guide.tagline}</Typography>

          <Box>
            {guide.steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.28 }}
              >
                <Paper className={classes.stepCard} elevation={0}>
                  <div
                    className={classes.stepNum}
                    style={{
                      background: `${guide.accent}22`,
                      color: guide.accent,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <Typography className={classes.stepTitle}>
                      {step.title}
                    </Typography>
                    <Typography className={classes.stepDesc}>
                      {step.desc}
                    </Typography>
                  </div>
                </Paper>
              </motion.div>
            ))}
          </Box>

          {guide.tip ? (
            <motion.div className={classes.tip}>
              <CheckCircleOutline style={{ fontSize: 16, marginTop: 1, flexShrink: 0 }} />
              <span>
                {guide.tip}
                {guide.tipLink ? (
                  <>
                    {" "}
                    <a
                      href={guide.tipLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={classes.tipLink}
                    >
                      {guide.tipLinkLabel || guide.tipLink}
                    </a>
                  </>
                ) : null}
              </span>
            </motion.div>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </Box>
  );
};

export default ConnectionsHelpGuide;
