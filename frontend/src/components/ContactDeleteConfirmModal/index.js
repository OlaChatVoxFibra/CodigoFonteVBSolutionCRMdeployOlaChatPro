/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

// src/components/ContactDeleteConfirmModal/index.js
import React, { useState } from "react";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Typography from "@material-ui/core/Typography";
import TextField from "@material-ui/core/TextField";
import { makeStyles } from "@material-ui/core/styles";
import { Alert } from "@material-ui/lab";

const useStyles = makeStyles((theme) => ({
  dialogContent: {
    minWidth: 400,
    paddingTop: theme.spacing(2),
  },
  confirmationInput: {
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1),
  },
  warningText: {
    marginBottom: theme.spacing(2),
    fontWeight: 600,
    color: theme.palette.error.main,
  },
  alert: {
    marginBottom: theme.spacing(2),
  },
}));

const ContactDeleteConfirmModal = ({
  open,
  onClose,
  onConfirm,
  deleteType, // 'selected' ou 'all'
  selectedCount,
  totalCount,
}) => {
  const classes = useStyles();
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState("");

  const expectedText = deleteType === 'all' ? 'EXCLUIR TODOS' : 'EXCLUIR SELECIONADOS';
  const isConfirmValid = confirmText === expectedText;

  const handleConfirm = () => {
    if (!isConfirmValid) {
      setError(`Digite exatamente: ${expectedText}`);
      return;
    }
    
    setConfirmText("");
    setError("");
    onConfirm();
  };

  const handleClose = () => {
    setConfirmText("");
    setError("");
    onClose();
  };

  const getTitle = () => {
    if (deleteType === 'all') {
      return `Excluir TODOS os ${totalCount} contatos?`;
    }
    return `Excluir ${selectedCount} contatos selecionados?`;
  };

  const getMessage = () => {
    if (deleteType === 'all') {
      return (
        <>
          <Alert severity="error" className={classes.alert}>
            ⚠️ ATENÇÃO: Esta ação irá excluir TODOS os {totalCount} contatos da empresa permanentemente!
          </Alert>
          <Typography variant="body2">
            Esta operação não pode ser desfeita. Todos os contatos, seus históricos de mensagens, 
            tags e relacionamentos serão perdidos definitivamente.
          </Typography>
        </>
      );
    }
    
    return (
      <>
        <Alert severity="warning" className={classes.alert}>
          Esta ação irá excluir {selectedCount} contatos selecionados permanentemente.
        </Alert>
        <Typography variant="body2">
          Os contatos selecionados e seus dados relacionados serão excluídos definitivamente.
        </Typography>
      </>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="delete-confirm-dialog"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle id="delete-confirm-dialog">
        {getTitle()}
      </DialogTitle>
      <DialogContent className={classes.dialogContent}>
        {getMessage()}
        
        <Typography variant="body1" className={classes.warningText}>
          Para confirmar, digite exatamente: <strong>{expectedText}</strong>
        </Typography>
        
        <TextField
          fullWidth
          label="Confirmação"
          value={confirmText}
          onChange={(e) => {
            setConfirmText(e.target.value);
            setError("");
          }}
          placeholder={expectedText}
          className={classes.confirmationInput}
          error={!!error}
          helperText={error}
          autoFocus
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="default">
          Cancelar
        </Button>
        <Button
          onClick={handleConfirm}
          color="secondary"
          variant="contained"
          disabled={!isConfirmValid}
        >
          {deleteType === 'all' ? 'Excluir Todos' : 'Excluir Selecionados'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContactDeleteConfirmModal;