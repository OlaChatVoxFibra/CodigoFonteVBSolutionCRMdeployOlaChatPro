/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Box, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { motion } from "framer-motion";
import ClaudeBrandLabel from "../ClaudeBrandLabel";
import OpenAiBrandLabel from "../OpenAiBrandLabel";

const useStyles = makeStyles((theme) => ({
  intro: {
    fontSize: 13,
    lineHeight: 1.55,
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(2),
    padding: theme.spacing(1.25, 1.5),
    borderRadius: 10,
    background:
      theme.palette.type === "dark" ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
  },
  section: {
    marginBottom: theme.spacing(2),
    paddingBottom: theme.spacing(1.5),
    borderBottom: `1px solid ${
      theme.palette.type === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"
    }`,
    "&:last-child": { borderBottom: "none", marginBottom: 0 },
  },
  sectionTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  sectionTitle: {
    fontWeight: 600,
    fontSize: 14,
    letterSpacing: "-0.01em",
    color: theme.palette.text.primary,
  },
  sectionBody: {
    fontSize: 13,
    lineHeight: 1.55,
    color: theme.palette.text.secondary,
    "& strong": { color: theme.palette.text.primary, fontWeight: 600 },
  },
  bulletList: {
    margin: "8px 0 0 0",
    paddingLeft: 18,
    fontSize: 12,
    lineHeight: 1.5,
    color: theme.palette.text.secondary,
  },
  bulletItem: { marginBottom: 4 },
  tip: {
    fontSize: 12,
    padding: theme.spacing(1, 1.25),
    borderRadius: 8,
    marginTop: theme.spacing(1.5),
    background:
      theme.palette.type === "dark" ? "rgba(52,199,89,0.12)" : "rgba(52,199,89,0.1)",
    color: theme.palette.type === "dark" ? "#6ee7a0" : "#248a3d",
    lineHeight: 1.45,
  },
}));

/**
 * @param {{ intro?: string, sections?: Array<{ title: string, body?: string, bullets?: string[], tip?: string }> }} props
 */
const HelpDocContent = ({ intro, sections = [] }) => {
  const classes = useStyles();

  if (!sections.length && !intro) {
    return (
      <Typography variant="body2" color="textSecondary">
        Documentação em preparação para esta página.
      </Typography>
    );
  }

  return (
    <Box>
      {intro && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Typography className={classes.intro} component="div">
            {intro}
          </Typography>
        </motion.div>
      )}
      {sections.map((s, i) => (
        <motion.div
          key={s.title}
          className={classes.section}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 * i + 0.12, duration: 0.32 }}
        >
          {s.brandKey === "claude" ? (
            <Box className={classes.sectionTitleRow}>
              <ClaudeBrandLabel label={s.title} labelClassName={classes.sectionTitle} />
            </Box>
          ) : s.brandKey === "openai" ? (
            <Box className={classes.sectionTitleRow}>
              <OpenAiBrandLabel label={s.title} labelClassName={classes.sectionTitle} />
            </Box>
          ) : (
            <Typography className={classes.sectionTitle}>{s.title}</Typography>
          )}
          {s.body && (
            <Typography className={classes.sectionBody} component="div">
              {s.body}
            </Typography>
          )}
          {s.bullets?.length > 0 && (
            <ul className={classes.bulletList}>
              {s.bullets.map((b) => (
                <li key={b} className={classes.bulletItem}>
                  {b}
                </li>
              ))}
            </ul>
          )}
          {s.tip && <Typography className={classes.tip}>{s.tip}</Typography>}
        </motion.div>
      ))}
    </Box>
  );
};

export default HelpDocContent;
