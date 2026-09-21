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
import SystemHelpDocs, { SYSTEM_HELP } from "../SystemHelpDocs";
import ConnectionHelpDialog from "../ConnectionHelpDialog";
import QueuesHelpDialog from "../QueuesHelpDialog";
import PromptsHelpDialog from "../PromptsHelpDialog";
import LeadsSalesHelpDialog from "../LeadsSalesHelpDialog";
import ActivitiesHelpDialog from "../ActivitiesHelpDialog";
import ProjectsHelpDialog from "../ProjectsHelpDialog";

const useStyles = makeStyles((theme) => ({
  paper: {
    borderRadius: 16,
    maxWidth: 620,
  },
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

/**
 * Diálogo de ajuda unificado.
 * connections / queues usam docs especializados existentes.
 */
const PageHelpDialog = ({ open, onClose, topic }) => {
  const classes = useStyles();
  const data = topic ? SYSTEM_HELP[topic] : null;

  if (topic === "connections") {
    return (
      <ConnectionHelpDialog
        open={open}
        onClose={onClose}
        variant="hub"
        title="Como usar Conexões"
      />
    );
  }

  if (topic === "queues") {
    return <QueuesHelpDialog open={open} onClose={onClose} />;
  }

  if (topic === "prompts") {
    return <PromptsHelpDialog open={open} onClose={onClose} variant="hub" />;
  }

  if (topic === "promptsAgent") {
    return <PromptsHelpDialog open={open} onClose={onClose} variant="editor" />;
  }

  if (topic === "leadsSales") {
    return <LeadsSalesHelpDialog open={open} onClose={onClose} />;
  }

  if (topic === "activities") {
    return <ActivitiesHelpDialog open={open} onClose={onClose} />;
  }

  if (topic === "projects") {
    return <ProjectsHelpDialog open={open} onClose={onClose} />;
  }

  const title = data?.title || "Ajuda";

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
        {title}
        <IconButton className={classes.close} onClick={onClose} size="small" aria-label="Fechar">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <SystemHelpDocs topic={topic} />
      </DialogContent>
    </Dialog>
  );
};

export default PageHelpDialog;
