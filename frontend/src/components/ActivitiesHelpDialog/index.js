/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@material-ui/core";
import { Close } from "@material-ui/icons";
import { makeStyles } from "@material-ui/core/styles";
import HelpDocContent from "../SystemHelpDocs/HelpDocContent";
import HelpStepsList from "../HelpStepsList";
import { ACTIVITIES_HELP, ACTIVITIES_STEPS } from "./activitiesHelpContent";

const useStyles = makeStyles((theme) => ({
  paper: { borderRadius: 16, maxWidth: 640 },
  title: {
    fontFamily:
      '"Helvetica Neue", Helvetica, -apple-system, BlinkMacSystemFont, sans-serif',
    fontWeight: 600,
    fontSize: 17,
    letterSpacing: "-0.02em",
    paddingRight: 40,
  },
  close: {
    position: "absolute",
    right: theme.spacing(1),
    top: theme.spacing(1),
  },
}));

const ActivitiesHelpDialog = ({ open, onClose }) => {
  const classes = useStyles();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      scroll="paper"
      classes={{ paper: classes.paper }}
    >
      <DialogTitle className={classes.title}>
        {ACTIVITIES_HELP.title}
        <IconButton className={classes.close} onClick={onClose} size="small" aria-label="Fechar">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <HelpStepsList
          steps={ACTIVITIES_STEPS}
          label="Passo a passo"
          resetKey={open ? "activities" : 0}
        />
        <HelpDocContent intro={ACTIVITIES_HELP.intro} sections={ACTIVITIES_HELP.sections} />
      </DialogContent>
    </Dialog>
  );
};

export default ActivitiesHelpDialog;
