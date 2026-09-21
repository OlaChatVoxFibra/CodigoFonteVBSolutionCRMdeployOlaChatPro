/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { createContext, useCallback, useContext, useState } from "react";
import { Box, Button, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import ListAltIcon from "@material-ui/icons/ListAlt";
import { useHistory } from "react-router-dom";
import ConnectionChannelWizard from "../../components/HelpStepsList/ConnectionChannelWizard";
import IntegrationBrandIcon, { getBrandVisual } from "./IntegrationBrandIcon";
import { CONNECTIONS_FONT } from "./connectionsTypography";
import {
  getConnectionsBorder,
  getConnectionsSurface,
} from "./connectionsTheme";
import { useConnectionsMagicCardStyles } from "./connectionsMagicUi";

/** Registra botões (ex.: Salvar) na barra superior em modo criar/editar. */
export const SetupHeaderActionsContext = createContext(null);

export function useSetupHeaderActions() {
  return useContext(SetupHeaderActionsContext);
}

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  return {
    root: {
      height: "calc(100vh - 64px)",
      maxHeight: "calc(100vh - 64px)",
      width: "100%",
      maxWidth: "100%",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      backgroundColor: theme.palette.background.default,
      fontFamily: CONNECTIONS_FONT,
      boxSizing: "border-box",
      animation: "$fadeIn 0.28s ease-out",
    },
    rootSetup: {
      height: "auto",
      maxHeight: "none",
      minHeight: "calc(100vh - 64px)",
      overflow: "visible",
    },
    topBar: {
      flexShrink: 0,
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      gap: theme.spacing(0.75),
      padding: theme.spacing(0.75, 1.25),
      [theme.breakpoints.up("sm")]: {
        padding: theme.spacing(0.75, 1.5),
        flexWrap: "nowrap",
      },
      borderBottom: `1px solid ${getConnectionsBorder(theme)}`,
      background: getConnectionsSurface(theme),
    },
    backBtn: {
      fontFamily: CONNECTIONS_FONT,
      fontWeight: 400,
      textTransform: "none",
      fontSize: "0.8125rem",
      borderRadius: 8,
      color: theme.palette.text.primary,
      backgroundColor: "transparent",
      border: `1px solid ${getConnectionsBorder(theme)}`,
      padding: theme.spacing(0.55, 1.2),
      boxShadow: "none",
      flexShrink: 0,
      "&:hover": {
        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#f4f4f5",
      },
    },
    topBarTrailing: {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing(0.75),
      marginLeft: "auto",
      flexShrink: 0
    },
    manageBtn: {
      fontFamily: CONNECTIONS_FONT,
      fontWeight: 400,
      textTransform: "none",
      fontSize: "0.8125rem",
      borderRadius: 8,
      padding: theme.spacing(0.55, 1.5),
      boxShadow: "none",
      flexShrink: 0,
      "&.MuiButton-outlinedPrimary": {
        color: isDark ? "#ffffff" : theme.palette.primary.main,
        borderColor: isDark ? "rgba(255,255,255,0.35)" : undefined,
      },
      "&.MuiButton-containedPrimary": {
        color: isDark ? "#ffffff" : undefined,
      },
    },
    titleBlock: {
      display: "flex",
      alignItems: "center",
      gap: theme.spacing(1.25),
      minWidth: 0,
      flex: 1,
    },
    channelTitle: {
      fontFamily: CONNECTIONS_FONT,
      fontWeight: 500,
      fontSize: "0.8125rem",
      letterSpacing: "-0.02em",
      lineHeight: 1.2,
      color: theme.palette.text.primary,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      [theme.breakpoints.up("sm")]: {
        fontSize: "0.9375rem",
      },
    },
    channelDesc: {
      fontFamily: CONNECTIONS_FONT,
      fontSize: "0.6875rem",
      fontWeight: 400,
      color: theme.palette.text.secondary,
      marginTop: 2,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    bodyRow: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
      width: "100%",
      overflow: "hidden",
      [theme.breakpoints.up("md")]: {
        flexDirection: "row",
      },
    },
    bodyRowSetup: {
      flex: "1 1 auto",
      minHeight: 0,
      overflow: "visible",
      alignItems: "flex-start",
    },
    main: {
      flex: "1 1 0",
      minWidth: 0,
      minHeight: 0,
      overflow: "hidden",
      padding: theme.spacing(0.5, 0.75),
      width: "100%",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      [theme.breakpoints.up("sm")]: {
        padding: theme.spacing(0.75, 1),
      },
    },
    mainSetup: {
      flex: "1 1 auto",
      minHeight: 0,
      overflow: "visible",
      height: "auto",
    },
    mainInner: {
      flex: 1,
      minHeight: 0,
      minWidth: 0,
      width: "100%",
      height: "100%",
      maxHeight: "100%",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    },
    mainInnerManage: {
      flex: "1 1 0",
      height: "100%",
      maxHeight: "100%",
    },
    mainInnerSetup: {
      flex: "0 1 auto",
      height: "auto",
      maxHeight: "none",
      overflow: "visible",
    },
    mobileWizard: {
      flexShrink: 0,
      display: "block",
      [theme.breakpoints.up("md")]: {
        display: "none",
      },
    },
    aside: {
      flexShrink: 0,
      display: "none",
      flexDirection: "column",
      minHeight: 0,
      overflow: "hidden",
      borderTop: `1px solid ${getConnectionsBorder(theme)}`,
        padding: theme.spacing(0.75, 1),
      background: isDark ? "rgba(255,255,255,0.02)" : "#fafbfc",
      [theme.breakpoints.up("md")]: {
        display: "flex",
        width: 240,
        borderTop: "none",
        borderLeft: `1px solid ${getConnectionsBorder(theme)}`,
        padding: theme.spacing(0.75, 1, 0.75, 1.25),
      },
      [theme.breakpoints.up("lg")]: {
        width: 256,
      },
    },
    asideScroll: {
      flex: 1,
      minHeight: 0,
      overflowY: "auto",
      overflowX: "hidden",
      ...theme.scrollbarStylesSoft,
    },
    asideSetup: {
      overflow: "visible",
      [theme.breakpoints.up("md")]: {
        position: "sticky",
        top: theme.spacing(1),
        alignSelf: "flex-start",
        maxHeight: "none",
      },
    },
    asideScrollSetup: {
      overflow: "visible",
      flex: "0 0 auto",
    },
    wizardAsideInner: {
      width: "100%",
    },
    "@keyframes fadeIn": {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
  };
});

export default function ConnectionsChannelLayout({
  integration,
  children,
  wizardSteps = [],
  wizardResetKey = 0,
  wizardLabel = "Passo a passo",
  manageActive = false,
  managePath,
  hideWizard = false,
  /** Criar/editar: título único no topo, sem repetir marca no formulário */
  setupMode = false,
  setupTitle = "Nova conexão",
}) {
  const classes = useStyles();
  const magic = useConnectionsMagicCardStyles();
  const history = useHistory();
  const [headerActions, setHeaderActionsState] = useState(null);
  const setHeaderActions = useCallback((node) => {
    setHeaderActionsState(node);
  }, []);
  const visual = integration ? getBrandVisual(integration) : null;
  const listPath =
    managePath ||
    (integration ? `/connections/${integration.key}/manage` : "/connections");
  /** Passo a passo só em criar/editar conexão */
  const showWizard =
    setupMode && !hideWizard && wizardSteps?.length > 0;

  const handleManageClick = () => {
    if (history.location.pathname === listPath) return;
    history.push(listPath);
  };

  const wizardBlock = showWizard ? (
    <ConnectionChannelWizard
      steps={wizardSteps}
      resetKey={wizardResetKey}
      label={wizardLabel}
    />
  ) : null;

  const mobileWizardClass = setupMode
    ? magic.wizardAsideMobileLean
    : magic.wizardAsideMobile;

  return (
    <Box
      className={`${classes.root} ${setupMode ? classes.rootSetup : ""}`}
    >
      <Box className={classes.topBar}>
        <Button
          className={classes.backBtn}
          startIcon={<ArrowBackIcon style={{ fontSize: 16 }} />}
          onClick={() =>
            setupMode ? history.push(listPath) : history.push("/connections")
          }
          disableElevation
        >
          {setupMode ? "Voltar" : "Integrações"}
        </Button>

        {integration && visual ? (
          <Box className={classes.titleBlock}>
            <IntegrationBrandIcon
              brandKey={visual.brandKey}
              variant="header"
              accentColor={visual.accent}
              plain
            />
            <Box minWidth={0}>
              <Typography className={classes.channelTitle}>
                {setupMode ? setupTitle : integration.label}
              </Typography>
              <Typography className={classes.channelDesc}>
                {setupMode
                  ? integration.label
                  : integration.infoLine || integration.label}
              </Typography>
            </Box>
          </Box>
        ) : null}

        {integration && !integration.externalPath ? (
          <Box className={classes.topBarTrailing}>
            {setupMode && headerActions ? headerActions : null}
            <Button
              variant={manageActive ? "contained" : "outlined"}
              color="primary"
              className={classes.manageBtn}
              startIcon={<ListAltIcon style={{ fontSize: 16 }} />}
              onClick={handleManageClick}
              disableElevation
            >
              Administrar
            </Button>
          </Box>
        ) : setupMode && headerActions ? (
          <Box className={classes.topBarTrailing}>{headerActions}</Box>
        ) : null}
      </Box>

      <SetupHeaderActionsContext.Provider
        value={setupMode ? setHeaderActions : null}
      >
      <Box
        className={`${classes.bodyRow} ${
          setupMode ? classes.bodyRowSetup : ""
        }`}
      >
        <Box className={`${classes.main} ${setupMode ? classes.mainSetup : ""}`}>
          <Box
            className={`${classes.mainInner} ${
              setupMode ? classes.mainInnerSetup : classes.mainInnerManage
            }`}
          >
            {showWizard ? (
              <Box className={classes.mobileWizard}>
                <Box className={mobileWizardClass}>{wizardBlock}</Box>
              </Box>
            ) : null}
            {children}
          </Box>
        </Box>

        {showWizard ? (
          <Box
            className={`${classes.aside} ${
              setupMode ? classes.asideSetup : ""
            }`}
            component="aside"
            aria-label={wizardLabel}
          >
            <Box
              className={`${classes.asideScroll} ${
                setupMode ? classes.asideScrollSetup : ""
              }`}
            >
              <Box className={classes.wizardAsideInner}>{wizardBlock}</Box>
            </Box>
          </Box>
        ) : null}
      </Box>
      </SetupHeaderActionsContext.Provider>

    </Box>
  );
}
