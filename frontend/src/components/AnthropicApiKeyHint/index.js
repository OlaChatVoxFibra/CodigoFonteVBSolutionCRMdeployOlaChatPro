/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Link, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

export const ANTHROPIC_API_KEYS_URL = "https://console.anthropic.com/settings/keys";
export const ANTHROPIC_BILLING_URL = "https://console.anthropic.com/settings/billing";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "block",
    marginTop: theme.spacing(0.75),
    marginBottom: theme.spacing(1),
    fontSize: 12,
    lineHeight: 1.45,
    color: theme.palette.text.secondary
  },
  link: {
    color: "#d97706",
    fontWeight: 500,
    textDecoration: "none",
    "&:hover": { textDecoration: "underline" }
  }
}));

const AnthropicApiKeyHint = ({ className }) => {
  const classes = useStyles();
  return (
    <Typography className={`${classes.root} ${className || ""}`} component="span">
      Obtenha sua API Key em{" "}
      <Link
        href={ANTHROPIC_API_KEYS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={classes.link}
      >
        console.anthropic.com/settings/keys
      </Link>
      . Créditos em{" "}
      <Link
        href={ANTHROPIC_BILLING_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={classes.link}
      >
        Plans &amp; Billing
      </Link>
      .
    </Typography>
  );
};

export default AnthropicApiKeyHint;
