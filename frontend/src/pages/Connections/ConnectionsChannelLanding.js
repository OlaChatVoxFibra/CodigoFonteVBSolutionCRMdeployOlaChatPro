/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useContext } from "react";
import { useHistory, useParams } from "react-router-dom";
import { Box, Button, Typography, makeStyles } from "@material-ui/core";
import ForbiddenPage from "../../components/ForbiddenPage";
import { AuthContext } from "../../context/Auth/AuthContext";
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";
import {
  getIntegrationByKey,
  countConnectionsForIntegration,
  integrationSupportsNewForm,
} from "./integrationCatalog";
import IntegrationBrandIcon, { getBrandVisual } from "./IntegrationBrandIcon";
import ConnectionsChannelLayout from "./ConnectionsChannelLayout";

const useStyles = makeStyles((theme) => ({
  hero: {
    maxWidth: 560,
    margin: "0 auto",
    padding: theme.spacing(4, 2),
    textAlign: "center",
  },
  title: {
    fontWeight: 700,
    fontSize: "1.75rem",
    letterSpacing: "-0.04em",
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
  },
  desc: {
    fontSize: "0.9375rem",
    color: theme.palette.text.secondary,
    lineHeight: 1.6,
    marginBottom: theme.spacing(3),
  },
  meta: {
    fontSize: "0.8125rem",
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(3),
    fontWeight: 500,
  },
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(1.25),
    alignItems: "stretch",
    maxWidth: 320,
    margin: "0 auto",
  },
  primaryBtn: {
    textTransform: "none",
    fontWeight: 600,
    borderRadius: 12,
    padding: theme.spacing(1.25, 2),
  },
  secondaryBtn: {
    textTransform: "none",
    fontWeight: 500,
    borderRadius: 12,
    padding: theme.spacing(1.1, 2),
  },
}));

export default function ConnectionsChannelLanding() {
  const classes = useStyles();
  const history = useHistory();
  const { integrationKey } = useParams();
  const integration = getIntegrationByKey(integrationKey);
  const { whatsApps } = useContext(WhatsAppsContext);
  const { user } = useContext(AuthContext);

  if (user.profile === "user" && user.allowConnections === "disabled") {
    return <ForbiddenPage />;
  }

  if (!integration) {
    history.replace("/connections");
    return null;
  }

  if (integration.externalPath) {
    history.replace(integration.externalPath);
    return null;
  }

  if (integration.comingSoon) {
    history.replace("/connections");
    return null;
  }

  const visual = getBrandVisual(integration);
  const count = countConnectionsForIntegration(whatsApps, integration);
  const managePath = `/connections/${integrationKey}/manage`;
  return (
    <ConnectionsChannelLayout
      integration={integration}
      managePath={managePath}
      showNewFab={integrationSupportsNewForm(integrationKey)}
      onNewConnection={() =>
        history.push(`/connections/${integrationKey}/new`)
      }
    >
      <Box className={classes.hero}>
        <IntegrationBrandIcon
          brandKey={visual.brandKey}
          variant="hub"
          accentColor={visual.accent}
          plain
        />
        <Typography className={classes.title}>{integration.label}</Typography>
        <Typography className={classes.desc}>{integration.description}</Typography>
        <Typography className={classes.meta}>
          {count === 0
            ? "Nenhuma conexão ativa neste canal"
            : `${count} conexão${count !== 1 ? "ões" : ""} ativa${count !== 1 ? "s" : ""}`}
        </Typography>
        <Box className={classes.actions}>
          <Button
            variant="contained"
            color="primary"
            className={classes.primaryBtn}
            onClick={() => history.push(managePath)}
          >
            Administrar conexões
          </Button>
        </Box>
      </Box>
    </ConnectionsChannelLayout>
  );
}
