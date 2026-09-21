/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useEffect } from "react";
import { Box, Typography, Paper, Button } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { motion, AnimatePresence } from "framer-motion";
import ChevronLeft from "@material-ui/icons/ChevronLeft";
import ChevronRight from "@material-ui/icons/ChevronRight";
import OpenInNew from "@material-ui/icons/OpenInNew";

const useStyles = makeStyles((theme) => ({
  root: { marginBottom: theme.spacing(2) },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "-0.01em",
    marginBottom: 10,
    color: theme.palette.text.secondary,
    textTransform: "uppercase",
  },
  stepCard: {
    display: "flex",
    gap: 12,
    padding: theme.spacing(1.5, 1.75),
    borderRadius: 12,
    minHeight: 72,
    border: `1px solid ${
      theme.palette.type === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"
    }`,
    background:
      theme.palette.type === "dark" ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.9)",
  },
  stepNum: {
    width: 32,
    height: 32,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    background: theme.palette.type === "dark" ? "rgba(255,255,255,0.1)" : "#e8e8ed",
  },
  stepTitle: { fontSize: 14, fontWeight: 600, marginBottom: 4, letterSpacing: "-0.01em" },
  stepDesc: { fontSize: 12, color: theme.palette.text.secondary, lineHeight: 1.5 },
  navRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: theme.spacing(1.25),
    gap: 8,
  },
  dots: {
    display: "flex",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: theme.palette.type === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.15)",
    transition: "all 0.2s ease",
  },
  dotActive: {
    width: 18,
    borderRadius: 4,
    background: theme.palette.primary.main,
  },
  navBtn: {
    textTransform: "none",
    fontSize: 12,
    minWidth: 88,
    borderRadius: 8,
  },
  linksRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  linkBtn: {
    textTransform: "none",
    fontSize: 11,
    borderRadius: 8,
    padding: "2px 8px",
  },
}));

/**
 * Passo a passo com motion (um passo por vez + navegação).
 * @param {{ steps: Array<{ title: string, desc: string, icon?: React.ComponentType, color?: string, links?: Array<{ label: string, href: string }> }>, label?: string, resetKey?: string|number }} props
 */
const HelpStepsList = ({ steps = [], label = "Passo a passo", resetKey = 0 }) => {
  const classes = useStyles();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [resetKey, steps.length]);

  if (!steps.length) return null;

  const step = steps[index];
  const Icon = step.icon;
  const atStart = index === 0;
  const atEnd = index === steps.length - 1;

  return (
    <Box className={classes.root}>
      <Typography className={classes.sectionLabel}>{label}</Typography>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${resetKey}-${index}-${step.title}`}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <Paper className={classes.stepCard} elevation={0}>
            <Box className={classes.stepNum}>
              {Icon ? (
                <Icon style={{ fontSize: 18, color: step.color || "#007aff" }} />
              ) : (
                <Typography style={{ fontSize: 13, fontWeight: 700 }}>{index + 1}</Typography>
              )}
            </Box>
            <Box flex={1}>
              <Typography className={classes.stepTitle}>
                {index + 1}. {step.title}
              </Typography>
              <Typography className={classes.stepDesc}>{step.desc}</Typography>
              {step.links?.length > 0 && (
                <Box className={classes.linksRow}>
                  {step.links.map((link) => (
                    <Button
                      key={link.href}
                      size="small"
                      variant="outlined"
                      color="primary"
                      className={classes.linkBtn}
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      endIcon={<OpenInNew style={{ fontSize: 13 }} />}
                    >
                      {link.label}
                    </Button>
                  ))}
                </Box>
              )}
            </Box>
          </Paper>
        </motion.div>
      </AnimatePresence>

      <div className={classes.navRow}>
        <Button
          size="small"
          className={classes.navBtn}
          startIcon={<ChevronLeft />}
          disabled={atStart}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
        >
          Anterior
        </Button>
        <motion.div className={classes.dots} layout>
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              className={`${classes.dot} ${i === index ? classes.dotActive : ""}`}
              layout
              onClick={() => setIndex(i)}
              style={{ cursor: "pointer" }}
              whileTap={{ scale: 0.9 }}
            />
          ))}
        </motion.div>
        {atEnd ? (
          <Button
            size="small"
            color="primary"
            variant="contained"
            className={classes.navBtn}
            onClick={() => setIndex(0)}
          >
            Reiniciar
          </Button>
        ) : (
          <Button
            size="small"
            color="primary"
            variant="outlined"
            className={classes.navBtn}
            endIcon={<ChevronRight />}
            onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))}
          >
            Próximo
          </Button>
        )}
      </div>
    </Box>
  );
};

export default HelpStepsList;
