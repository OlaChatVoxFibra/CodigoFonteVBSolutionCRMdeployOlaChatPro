/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Tooltip, makeStyles } from "@material-ui/core";
import { green, grey } from "@material-ui/core/colors";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import ErrorIcon from "@material-ui/icons/Error";

const useStyles = makeStyles((theme) => ({
  on: {
    color: green[600],
    fontSize: "20px",
  },
  off: {
    color: grey[600],
    fontSize: "20px",
  },
}));

const UserStatusIcon = ({ user }) => {
  const classes = useStyles();
  if (!user || typeof user.online === "undefined") {
    return (
      <Tooltip title="Desconhecido">
        <ErrorIcon className={classes.off} />
      </Tooltip>
    );
  }
  return user.online ? (
    <Tooltip title="Online">
      <CheckCircleIcon className={classes.on} />
    </Tooltip>
  ) : (
    <Tooltip title="Offline">
      <ErrorIcon className={classes.off} />
    </Tooltip>
  );
};

export default UserStatusIcon;
