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
import {
  PROMPTS_HUB_HELP,
  PROMPTS_EDITOR_HELP,
  ANTHROPIC_AGENT_EDITOR_HELP
} from "./promptsHelpContent";

const useStyles = makeStyles((theme) => ({
  paper: { borderRadius: 16, maxWidth: 620 },
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

const PromptsHelpDialog = ({ open, onClose, variant = "hub" }) => {
  const classes = useStyles();
  const data =
    variant === "editor"
      ? PROMPTS_EDITOR_HELP
      : variant === "anthropic"
        ? ANTHROPIC_AGENT_EDITOR_HELP
        : PROMPTS_HUB_HELP;

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
        {data.title}
        <IconButton className={classes.close} onClick={onClose} size="small" aria-label="Fechar">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <HelpDocContent intro={data.intro} sections={data.sections} />
      </DialogContent>
    </Dialog>
  );
};

export default PromptsHelpDialog;
