/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";

import TextField from "@material-ui/core/TextField";

const InputComponent = ({ inputRef, ...other }) => <div {...other} />;

const OutlinedDiv = ({
  InputProps,
  children,
  InputLabelProps,
  label,
  ...other
}) => {
  return (
    <TextField
      {...other}
      variant="outlined"
      label={label}
      multiline
      InputLabelProps={{ shrink: true, ...InputLabelProps }}
      InputProps={{
        inputComponent: InputComponent,
        ...InputProps
      }}
      inputProps={{ children: children }}
    />
  );
};

export default OutlinedDiv;