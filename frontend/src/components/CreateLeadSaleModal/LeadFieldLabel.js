/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { IconButton } from "@material-ui/core";
import EditOutlinedIcon from "@material-ui/icons/EditOutlined";

export function isFieldEditable(viewOnly, editableFields, fieldKey) {
  if (!viewOnly) return true;
  return Boolean(editableFields[fieldKey]);
}

export default function LeadFieldLabel({
  classes,
  label,
  fieldKey,
  viewOnly,
  editableFields,
  setEditableFields,
  required
}) {
  return (
    <div className={classes.fieldLabelRow}>
      <span className={classes.inputLabel}>
        {label}
        {required ? " *" : ""}
      </span>
      {viewOnly && fieldKey && !editableFields[fieldKey] && (
        <IconButton
          size="small"
          className={classes.pencilBtn}
          aria-label={`Editar ${label}`}
          onClick={() => setEditableFields((prev) => ({ ...prev, [fieldKey]: true }))}
        >
          <EditOutlinedIcon style={{ fontSize: 15 }} />
        </IconButton>
      )}
    </div>
  );
}
