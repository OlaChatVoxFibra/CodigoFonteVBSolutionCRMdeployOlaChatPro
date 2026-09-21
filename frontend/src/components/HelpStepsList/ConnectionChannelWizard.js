/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Box } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import ConnectionGuideStepsStack from "./ConnectionGuideStepsStack";

const useStyles = makeStyles(() => ({
  wrap: {
    marginBottom: 0,
  },
}));

const ConnectionChannelWizard = ({ steps, resetKey, label = "Passo a passo" }) => {
  const classes = useStyles();
  if (!steps?.length) return null;

  return (
    <Box className={classes.wrap} key={resetKey}>
      <ConnectionGuideStepsStack steps={steps} label={label} />
    </Box>
  );
};

export default ConnectionChannelWizard;
