/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Link, Typography } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

const OPENAI_API_KEYS_URL = "https://platform.openai.com/api-keys";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "block",
    marginTop: theme.spacing(0.75),
    marginBottom: theme.spacing(1),
    fontSize: 12,
    lineHeight: 1.45,
    color: theme.palette.text.secondary,
  },
  link: {
    color: theme.palette.primary.main,
    fontWeight: 500,
    textDecoration: "none",
    "&:hover": { textDecoration: "underline" },
  },
}));

const OpenAiApiKeyHint = ({ className }) => {
  const classes = useStyles();
  return (
    <Typography className={`${classes.root} ${className || ""}`} component="span">
      Obtenha sua API Key em{" "}
      <Link
        href={OPENAI_API_KEYS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={classes.link}
      >
        platform.openai.com/api-keys
      </Link>
    </Typography>
  );
};

export default OpenAiApiKeyHint;
export { OPENAI_API_KEYS_URL };
