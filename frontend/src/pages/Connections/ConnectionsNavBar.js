/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Box, Button, Typography, Breadcrumbs, Link } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import ChevronRightIcon from "@material-ui/icons/ChevronRight";
import { useHistory } from "react-router-dom";

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  return {
    root: {
      display: "flex",
      alignItems: "flex-start",
      gap: theme.spacing(1.5),
      marginBottom: theme.spacing(2.5),
      flexWrap: "wrap",
    },
    backBtn: {
      marginTop: 2,
      textTransform: "none",
      fontWeight: 500,
      fontSize: "0.8125rem",
      borderRadius: 10,
      padding: theme.spacing(0.75, 1.5),
      color: theme.palette.text.primary,
      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(120,120,128,0.1)",
      border: `1px solid ${
        isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)"
      }`,
      "&:hover": {
        backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(120,120,128,0.14)",
      },
    },
    main: {
      flex: 1,
      minWidth: 0,
    },
    breadcrumbs: {
      marginBottom: theme.spacing(0.75),
      "& .MuiBreadcrumbs-separator": {
        marginLeft: 6,
        marginRight: 6,
        color: theme.palette.text.disabled,
      },
    },
    crumbLink: {
      fontSize: "0.75rem",
      fontWeight: 500,
      color: theme.palette.text.secondary,
      cursor: "pointer",
      "&:hover": {
        color: theme.palette.primary.main,
        textDecoration: "none",
      },
    },
    crumbActive: {
      fontSize: "0.75rem",
      fontWeight: 600,
      color: theme.palette.text.primary,
    },
    titleRow: {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing(1.5),
    },
    title: {
      fontWeight: 700,
      fontSize: "1.375rem",
      letterSpacing: "-0.04em",
      lineHeight: 1.15,
    },
    subtitle: {
      fontSize: "0.875rem",
      color: theme.palette.text.secondary,
      lineHeight: 1.5,
      marginTop: theme.spacing(0.5),
      maxWidth: 640,
    },
    meta: {
      fontSize: "0.75rem",
      color: theme.palette.text.secondary,
      marginTop: theme.spacing(0.75),
      fontWeight: 500,
    },
  };
});

/**
 * Navegação fluida: voltar + breadcrumb (Conexões › Canal › Ação).
 */
export default function ConnectionsNavBar({
  integration,
  icon,
  title,
  subtitle,
  meta,
  backLabel = "Conexões",
  backTo = "/connections",
  crumbs = [],
  onBack,
}) {
  const classes = useStyles();
  const history = useHistory();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    history.push(backTo);
  };

  const trail = [
    { label: "Conexões", to: "/connections" },
    ...crumbs,
  ];

  return (
    <Box className={classes.root}>
      <Button
        className={classes.backBtn}
        startIcon={<ArrowBackIcon style={{ fontSize: 18 }} />}
        onClick={handleBack}
        disableElevation
      >
        {backLabel}
      </Button>
      <Box className={classes.main}>
        <Breadcrumbs
          className={classes.breadcrumbs}
          separator={<ChevronRightIcon style={{ fontSize: 14 }} />}
        >
          {trail.map((c, i) => {
            const isLast = i === trail.length - 1;
            if (isLast) {
              return (
                <Typography key={c.label} className={classes.crumbActive}>
                  {c.label}
                </Typography>
              );
            }
            return (
              <Link
                key={c.label}
                className={classes.crumbLink}
                onClick={(e) => {
                  e.preventDefault();
                  if (c.to) history.push(c.to);
                }}
                color="inherit"
                underline="none"
              >
                {c.label}
              </Link>
            );
          })}
        </Breadcrumbs>
        <Box className={classes.titleRow}>
          {icon || null}
          <Box minWidth={0}>
            <Typography className={classes.title}>
              {title || integration?.label}
            </Typography>
            {(subtitle || integration?.description) && (
              <Typography className={classes.subtitle}>
                {subtitle || integration?.description}
              </Typography>
            )}
            {meta ? (
              <Typography className={classes.meta}>{meta}</Typography>
            ) : null}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
