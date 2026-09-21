/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Drawer from '@material-ui/core/Drawer';
import DialogTitle from '@material-ui/core/DialogTitle';
import DialogContent from '@material-ui/core/DialogContent';
import DialogActions from '@material-ui/core/DialogActions';
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';

const useStyles = makeStyles(theme => ({
  drawer: {
    '& .MuiDrawer-paper': {
      width: '80%',
      maxWidth: '800px',
      [theme.breakpoints.down('sm')]: {
        width: '100%',
      },
    },
  },
  dialogTitle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
}));

const RightDrawerModal = ({ open, onClose, title, children, actions }) => {
  const classes = useStyles();

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      className={classes.drawer}
    >
      <DialogTitle className={classes.dialogTitle}>
        {title}
        <IconButton
          aria-label="close"
          onClick={onClose}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {children}
      </DialogContent>
      {actions && <DialogActions>{actions}</DialogActions>}
    </Drawer>
  );
};

export default RightDrawerModal;
