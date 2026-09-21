/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Box, Typography, Link } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { motion } from "framer-motion";
import OpenInNew from "@material-ui/icons/OpenInNew";
import { CONNECTIONS_FONT } from "../../pages/Connections/connectionsTypography";
import {
  MAGIC_RADIUS_SM,
  MAGIC_RADIUS_XS,
} from "../../pages/Connections/connectionsMagicUi";
import { getConnectionsBorder, getConnectionsSurface } from "../../pages/Connections/connectionsTheme";

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  return {
    root: {
      fontFamily: CONNECTIONS_FONT,
    },
    label: {
      fontFamily: CONNECTIONS_FONT,
      fontSize: 11,
      fontWeight: 400,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: theme.palette.text.secondary,
      marginBottom: theme.spacing(1),
    },
    list: {
      display: "flex",
      flexDirection: "column",
      gap: theme.spacing(0.5),
    },
    step: {
      padding: theme.spacing(0.75, 0.9),
      borderRadius: MAGIC_RADIUS_SM,
      border: `1px solid ${getConnectionsBorder(theme)}`,
      background: getConnectionsSurface(theme),
      display: "flex",
      gap: theme.spacing(1.25),
      alignItems: "flex-start",
    },
    stepIcon: {
      width: 28,
      height: 28,
      borderRadius: MAGIC_RADIUS_XS,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      background: isDark ? "rgba(255,255,255,0.06)" : "#f4f4f5",
    },
    stepTitle: {
      fontFamily: CONNECTIONS_FONT,
      fontSize: 13,
      fontWeight: 400,
      color: theme.palette.text.primary,
      marginBottom: 4,
      letterSpacing: "-0.01em",
      lineHeight: 1.3,
    },
    stepDesc: {
      fontFamily: CONNECTIONS_FONT,
      fontSize: 12,
      fontWeight: 400,
      color: theme.palette.text.secondary,
      lineHeight: 1.5,
    },
    links: {
      display: "flex",
      flexDirection: "column",
      gap: 4,
      marginTop: theme.spacing(1),
    },
    link: {
      fontFamily: CONNECTIONS_FONT,
      fontSize: 11,
      fontWeight: 400,
      color: theme.palette.primary.main,
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      textDecoration: "none",
      "&:hover": {
        textDecoration: "underline",
      },
    },
  };
});

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.32, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

/** Passos empilhados verticalmente (motion) + links de apoio. */
export default function ConnectionGuideStepsStack({
  steps = [],
  label = "Passo a passo",
}) {
  const classes = useStyles();
  if (!steps?.length) return null;

  return (
    <Box className={classes.root}>
      <Typography className={classes.label}>{label}</Typography>
      <Box className={classes.list}>
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.title}
              custom={i}
              initial="hidden"
              animate="show"
              variants={itemVariants}
            >
              <Box className={classes.step}>
                <Box className={classes.stepIcon}>
                  {Icon ? (
                    <Icon
                      style={{
                        fontSize: 16,
                        color: step.color || "#007aff",
                      }}
                    />
                  ) : (
                    <Typography
                      style={{
                        fontSize: 12,
                        fontFamily: CONNECTIONS_FONT,
                        fontWeight: 400,
                      }}
                    >
                      {i + 1}
                    </Typography>
                  )}
                </Box>
                <Box flex={1} minWidth={0}>
                  <Typography className={classes.stepTitle}>
                    {i + 1}. {step.title}
                  </Typography>
                  <Typography className={classes.stepDesc}>{step.desc}</Typography>
                  {step.links?.length > 0 ? (
                    <Box className={classes.links}>
                      {step.links.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={classes.link}
                        >
                          {link.label}
                          <OpenInNew style={{ fontSize: 12 }} />
                        </Link>
                      ))}
                    </Box>
                  ) : null}
                </Box>
              </Box>
            </motion.div>
          );
        })}
      </Box>
    </Box>
  );
}
