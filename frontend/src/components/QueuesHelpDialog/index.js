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
import { QUEUES_HELP, QUEUES_QUICK_STEPS } from "../QueuesDocs/queuesHelpContent";

const useStyles = makeStyles((theme) => ({
  paper: { borderRadius: 16, maxWidth: 620 },
  title: {
    fontFamily:
      '"Helvetica Neue", Helvetica, -apple-system, BlinkMacSystemFont, sans-serif',
    fontWeight: 600,
    fontSize: 16,
    letterSpacing: "-0.02em",
  },
  close: {
    position: "absolute",
    right: theme.spacing(1),
    top: theme.spacing(1),
  },
}));

const QueuesHelpDialog = ({ open, onClose }) => {
  const classes = useStyles();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      classes={{ paper: classes.paper }}
    >
      <DialogTitle className={classes.title}>
        Como configurar as filas (listas)
        <IconButton className={classes.close} onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <HelpStepsList
          steps={QUEUES_QUICK_STEPS}
          label="Passo a passo"
          resetKey={open ? "queues" : 0}
        />
        <HelpDocContent intro={QUEUES_HELP.intro} sections={QUEUES_HELP.sections} />
      </DialogContent>
    </Dialog>
  );
};

export default QueuesHelpDialog;
