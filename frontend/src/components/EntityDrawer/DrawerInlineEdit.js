/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Box, IconButton } from "@material-ui/core";
import EditOutlinedIcon from "@material-ui/icons/EditOutlined";
import CheckIcon from "@material-ui/icons/Check";
import CloseIcon from "@material-ui/icons/Close";

export function DrawerPencil({ classes, onClick, ariaLabel }) {
  return (
    <IconButton
      size="small"
      className={classes.pencilBtn}
      aria-label={ariaLabel || "Editar"}
      onClick={onClick}
    >
      <EditOutlinedIcon style={{ fontSize: 14 }} />
    </IconButton>
  );
}

export function DrawerEditActions({ onConfirm, onCancel, saving }) {
  return (
    <Box component="span" display="inline-flex" alignItems="center" style={{ gap: 2 }}>
      <IconButton size="small" onClick={onConfirm} disabled={saving} aria-label="Salvar">
        <CheckIcon style={{ fontSize: 16, color: "#10b981" }} />
      </IconButton>
      <IconButton size="small" onClick={onCancel} disabled={saving} aria-label="Cancelar">
        <CloseIcon style={{ fontSize: 16, opacity: 0.6 }} />
      </IconButton>
    </Box>
  );
}

/** Bloco com valor em leitura + lápis; em edição mostra editContent e ações. */
export function DrawerInlineEdit({
  classes,
  editKey,
  editing,
  onStartEdit,
  onCancel,
  onConfirm,
  readContent,
  editContent,
  saving,
  style,
}) {
  const active = editing === editKey;
  return (
    <Box style={{ position: "relative", ...style }}>
      {active ? (
        <Box display="flex" alignItems="flex-start" flexWrap="wrap" style={{ gap: 4 }}>
          <Box flex={1} minWidth={0}>
            {editContent}
          </Box>
          <DrawerEditActions onConfirm={onConfirm} onCancel={onCancel} saving={saving} />
        </Box>
      ) : (
        <Box display="flex" alignItems="flex-start" style={{ gap: 4 }}>
          <Box flex={1} minWidth={0}>
            {readContent}
          </Box>
          <DrawerPencil
            classes={classes}
            onClick={() => onStartEdit(editKey)}
          />
        </Box>
      )}
    </Box>
  );
}

/** Chip de ação (responsável, prazo…) com lápis embutido. */
export function DrawerActionChip({
  classes,
  editKey,
  editing,
  onStartEdit,
  onCancel,
  onConfirm,
  readContent,
  editContent,
  saving,
}) {
  const active = editing === editKey;
  if (active) {
    return (
      <Box
        display="flex"
        alignItems="center"
        flexWrap="wrap"
        style={{
          gap: 6,
          padding: "4px 6px",
          borderRadius: 6,
          border: "1px solid rgba(59,130,246,0.35)",
          background: "rgba(59,130,246,0.06)",
        }}
      >
        {editContent}
        <DrawerEditActions onConfirm={onConfirm} onCancel={onCancel} saving={saving} />
      </Box>
    );
  }
  return (
    <Box className={classes.actionChip}>
      {readContent}
      <DrawerPencil
        classes={classes}
        onClick={() => onStartEdit(editKey)}
        ariaLabel="Editar"
      />
    </Box>
  );
}
