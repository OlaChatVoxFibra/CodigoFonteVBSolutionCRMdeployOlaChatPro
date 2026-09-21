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
import WhatsAppConnectionDocs from "../WhatsAppConnectionDocs";
import HelpDocContent from "../SystemHelpDocs/HelpDocContent";
import HelpStepsList from "../HelpStepsList";
import ConnectionsHelpGuide from "./ConnectionsHelpGuide";
import {
  CONNECTIONS_WIZARD_HELP,
  CONNECTION_QUICK_STEPS,
} from "./connectionsHelpContent";

const useStyles = makeStyles((theme) => ({
  paper: {
    borderRadius: 16,
    maxWidth: 620,
  },
  paperHub: {
    borderRadius: 16,
    maxWidth: 720,
  },
  title: {
    fontFamily:
      '"Helvetica Neue", Helvetica, -apple-system, BlinkMacSystemFont, sans-serif',
    fontWeight: 600,
    fontSize: 18,
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
 * @param {"hub"|"wizard"} variant — hub: todos os canais; wizard: só WhatsApp no assistente
 */
const ConnectionHelpDialog = ({
  open,
  onClose,
  variant = "hub",
  guideType = "both",
  title = "Como usar Integrações",
}) => {
  const classes = useStyles();
  const isHub = variant === "hub";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={isHub ? "md" : "sm"}
      fullWidth
      scroll="paper"
      classes={{ paper: isHub ? classes.paperHub : classes.paper }}
    >
      <DialogTitle className={classes.title}>
        {title}
        <IconButton
          className={classes.close}
          onClick={onClose}
          size="small"
          aria-label="Fechar"
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {isHub ? (
          <ConnectionsHelpGuide resetKey={open ? "hub" : 0} />
        ) : (
          <>
            <HelpStepsList
              steps={CONNECTION_QUICK_STEPS}
              label="Resumo"
              resetKey={open ? "wizard" : 0}
            />
            <HelpDocContent
              intro={CONNECTIONS_WIZARD_HELP.intro}
              sections={CONNECTIONS_WIZARD_HELP.sections}
            />
            <WhatsAppConnectionDocs
              compact
              defaultExpanded
              guideType={guideType}
              hideGuideTabs={guideType !== "both"}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ConnectionHelpDialog;
