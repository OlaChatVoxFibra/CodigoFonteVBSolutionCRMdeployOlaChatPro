/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Button,
  Card,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Grid,
  Divider,
  Avatar,
  Chip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@material-ui/core';
import LeadCreateWizardForm from './LeadCreateWizardForm';
import LeadSaleSplitDrawer from './LeadSaleSplitDrawer';
import OutlinedInput from '@material-ui/core/OutlinedInput';
import { makeStyles } from '@material-ui/core/styles';
import whatsBackground from '../../assets/wa-background.png';
import whatsBackgroundDark from '../../assets/wa-background-dark.png';
import { Close as CloseIcon } from '@material-ui/icons';
import Autocomplete from "@material-ui/lab/Autocomplete";
import leadsSalesService from "../../services/leadsSalesService";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import NumberFormat from "react-number-format";
import inventoryService from "../../services/inventoryService";
import AddIcon from "@material-ui/icons/Add";
import RemoveIcon from "@material-ui/icons/Remove";
import leadPipelinesService from "../../services/leadPipelinesService";
import { dateInputToStartISO } from "../../utils/deadlineDates";
import { toast } from "react-toastify";

const batchUpdates = ReactDOM.unstable_batchedUpdates || ((fn) => fn());

const NumberFormatCustom = (props) => {
  const { inputRef, onChange, thousandSeparator, decimalSeparator, prefix, value, ...other } = props;
  const lastValueRef = useRef(undefined);
  const safeValue = value == null || value === "" ? "" : String(value);

  return (
    <NumberFormat
      {...other}
      value={safeValue}
      getInputRef={inputRef}
      onValueChange={(values) => {
        if (lastValueRef.current === values.value) return;
        lastValueRef.current = values.value;
        if (onChange) {
          onChange({ target: { value: values.value } });
        }
      }}
      thousandSeparator={thousandSeparator}
      decimalSeparator={decimalSeparator}
      prefix={prefix}
      decimalScale={2}
      fixedDecimalScale
      allowNegative={false}
      isNumericString
    />
  );
};

const useStyles = makeStyles((theme) => ({
  drawerPaper: {
    width: 1100,
    maxWidth: '100vw',
    padding: 0,
    borderRadius: 12,
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    height: 'calc(100% - 32px)',
    marginRight: theme.spacing(2),
    overflow: 'hidden',
    backgroundColor:
      theme.palette.type === 'dark' ? theme.palette.background.paper : '#FBFBFA',
    boxShadow:
      theme.palette.type === 'dark'
        ? '-8px 0 40px rgba(0,0,0,0.45)'
        : '-6px 0 32px rgba(15, 23, 42, 0.1), 0 0 0 1px rgba(15, 23, 42, 0.05)'
  },
  drawerPaperNarrow: {
    width: 680,
    maxWidth: '100vw',
    padding: 0,
    borderRadius: 12,
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    marginRight: theme.spacing(2),
    marginLeft: 0,
    height: 'calc(100% - 32px)',
    overflow: 'hidden',
    backgroundColor:
      theme.palette.type === 'dark' ? theme.palette.background.paper : '#FBFBFA',
    boxShadow:
      theme.palette.type === 'dark'
        ? '-8px 0 40px rgba(0,0,0,0.45)'
        : '-6px 0 32px rgba(15, 23, 42, 0.1), 0 0 0 1px rgba(15, 23, 42, 0.05)'
  },
  dialogPaper: {
    width: '100%',
    maxWidth: 920,
    margin: theme.spacing(2),
    borderRadius: 14,
    maxHeight: 'calc(100vh - 32px)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: theme.palette.background.paper,
    boxShadow:
      theme.palette.type === 'dark'
        ? '0 24px 48px rgba(0,0,0,0.55)'
        : '0 22px 56px rgba(15, 23, 42, 0.14), 0 0 0 1px rgba(15, 23, 42, 0.05)'
  },
  dialogBackdrop: {
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    backdropFilter: 'blur(3px)'
  },
  dialogHeader: {
    flexShrink: 0,
    padding: theme.spacing(1.75, 2.5, 1.25),
    borderBottom: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.08)' : '#ECEEF1'}`
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: 400,
    letterSpacing: '-0.02em',
    color: theme.palette.text.primary,
    fontFamily: '"Helvetica Neue", HelveticaNeue, system-ui, sans-serif'
  },
  dialogSubtitle: {
    fontSize: 12,
    fontWeight: 300,
    lineHeight: 1.45,
    color: theme.palette.text.secondary,
    opacity: 0.72,
    marginTop: 4,
    fontFamily: '"Helvetica Neue", HelveticaNeue, system-ui, sans-serif'
  },
  dialogBody: {
    flex: 1,
    overflowY: 'auto',
    padding: theme.spacing(1.25, 2, 1.5),
    '&::-webkit-scrollbar': { width: 6 },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: theme.palette.type === 'light' ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.4)',
      borderRadius: 3
    }
  },
  dialogFooter: {
    flexShrink: 0,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1.75, 3),
    borderTop: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.08)' : '#ECEEF1'}`
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderBottom: '1px solid ' + theme.palette.divider,
    paddingBottom: theme.spacing(2),
    marginBottom: theme.spacing(2)
  },
  closeButton: {
    position: 'absolute',
    left: 0,
  },
  formContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
    paddingTop: theme.spacing(1),
    overflowY: 'auto',
    flex: 1,
    paddingRight: theme.spacing(1),
    '&::-webkit-scrollbar': {
      width: '6px',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: theme.palette.type === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.4)',
      borderRadius: '3px',
    }
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    color: theme.palette.text.secondary,
    letterSpacing: '0.02em',
    marginTop: theme.spacing(1),
    marginBottom: theme.spacing(1)
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing(2)
  },
  twoCols: {
    height: '100%',
    overflow: 'hidden'
  },
  leftPane: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  leftScroll: {
    flex: 1,
    overflowY: 'auto',
    paddingRight: theme.spacing(2),
    paddingBottom: theme.spacing(9),
    '&::-webkit-scrollbar': {
      width: '6px',
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: theme.palette.type === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.4)',
      borderRadius: '3px',
    }
  },
  rightPane: {
    height: '100%',
    borderLeft: '1px solid ' + theme.palette.divider,
    display: 'flex',
    flexDirection: 'column'
  },
  cardRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'transparent',
    borderRadius: 8,
    padding: theme.spacing(1),
    border: 'none'
  },
  valueRow: {
    display: 'flex',
    gap: theme.spacing(1),
    width: '100%',
    alignItems: 'center'
  },
  fieldLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: theme.palette.text.secondary,
    opacity: 0.58,
    marginBottom: 6,
    fontWeight: 600,
    fontFamily: '"Inter", "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  },
  inputLabel: {
    fontSize: 12,
    color: theme.palette.text.secondary,
    opacity: 0.78,
    marginBottom: 6,
    fontWeight: 400,
    fontFamily: '"Helvetica Neue", HelveticaNeue, system-ui, sans-serif'
  },
  sectionBlock: {
    borderRadius: 12,
    padding: theme.spacing(1.5, 1.75),
    marginBottom: theme.spacing(1.25),
    background:
      theme.palette.type === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.92)',
    border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.08)' : '#EAECF0'}`,
    boxShadow:
      theme.palette.type === 'dark'
        ? 'inset 0 1px 0 rgba(255,255,255,0.04)'
        : '0 1px 2px rgba(15, 23, 42, 0.04)'
  },
  sectionHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(1.25),
    gap: theme.spacing(1)
  },
  sectionHint: {
    fontSize: 12,
    fontWeight: 300,
    lineHeight: 1.5,
    color: theme.palette.text.secondary,
    opacity: 0.68,
    marginBottom: theme.spacing(1.25),
    fontFamily: '"Helvetica Neue", HelveticaNeue, system-ui, sans-serif'
  },
  valueDisplay: {
    fontSize: 22,
    fontWeight: 300,
    letterSpacing: '-0.02em',
    fontFamily: '"Helvetica Neue", HelveticaNeue, system-ui, sans-serif'
  },
  footerBtn: {
    textTransform: 'none',
    borderRadius: 12,
    minWidth: 108,
    height: 38,
    fontSize: 13,
    fontWeight: 400,
    fontFamily: '"Helvetica Neue", HelveticaNeue, system-ui, sans-serif'
  },
  footerBtnPrimary: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.getContrastText(theme.palette.primary.main),
    boxShadow: 'none',
    '&:hover': { backgroundColor: theme.palette.primary.main, filter: 'brightness(0.94)' }
  },
  footerBtnOutlined: {
    borderColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.25)' : '#D7DCE3',
    color: theme.palette.text.primary
  },
  productRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 0',
    borderBottom: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'}`
  },
  toggleGroup: {
    width: '100%',
    boxShadow: 'none',
    '& .MuiButtonGroup-grouped': {
      flex: 1,
      minWidth: 0
    }
  },
  toggleBtn: {
    flex: 1,
    textTransform: 'none',
    minHeight: 42,
    fontFamily: '"Helvetica Neue", HelveticaNeue, system-ui, sans-serif',
    fontSize: 14,
    fontWeight: 400,
    color: theme.palette.text.secondary,
    borderColor: `${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.14)' : '#D7DCE3'} !important`,
    backgroundColor: theme.palette.background.paper
  },
  toggleBtnActive: {
    borderColor: `${theme.palette.primary.main} !important`,
    color: `${theme.palette.primary.main} !important`,
    backgroundColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.04)' : '#fff !important',
    zIndex: 1
  },
  valueText: {
    fontSize: 14,
    color: theme.palette.text.primary,
    fontWeight: 600
  },
  inputRoot: {
    borderRadius: 6,
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: (theme.palette.type === 'light' ? 'rgba(55,53,47,0.14)' : 'rgba(255,255,255,0.12)') + ' !important',
      borderWidth: '1px !important'
    },
    '&:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: (theme.palette.type === 'light' ? '#C8CED8' : 'rgba(255,255,255,0.18)') + ' !important'
    },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor:
        (theme.palette.type === 'light' ? '#C7C7CC' : 'rgba(255,255,255,0.28)') + ' !important',
      borderWidth: '1px !important',
      boxShadow: 'none !important'
    },
    '&.Mui-focused': {
      boxShadow: 'none !important'
    },
    backgroundColor: 'transparent',
    '& .MuiOutlinedInput-input': {
      padding: '8px 12px',
      fontSize: 12,
      fontFamily: '"Helvetica Neue", HelveticaNeue, system-ui, sans-serif'
    }
  },
  notchedOutline: {
    borderColor: theme.palette.type === 'light' ? 'rgba(55,53,47,0.14)' : 'rgba(255,255,255,0.12)',
    borderWidth: 1
  },
  productsEmpty: {
    fontSize: 13,
    color: theme.palette.text.secondary,
    opacity: 0.55,
    marginTop: theme.spacing(0.5)
  },
  drawerShell: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden'
  },
  drawerScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: theme.spacing(1.25, 2, 0.75),
    width: '100%',
    boxSizing: 'border-box',
    '&::-webkit-scrollbar': { width: 6 },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: theme.palette.type === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.4)',
      borderRadius: 3
    }
  },
  stepNavHorizontal: {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: theme.spacing(2),
    padding: theme.spacing(0.75),
    borderRadius: 12,
    border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(96,165,250,0.2)' : 'rgba(59,130,246,0.15)'}`,
    background:
      theme.palette.type === 'dark' ? 'rgba(59,130,246,0.06)' : 'rgba(59,130,246,0.04)'
  },
  stepTab: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '5px 11px',
    borderRadius: 8,
    border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(96,165,250,0.28)' : 'rgba(59,130,246,0.22)'}`,
    background: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    fontFamily: '"Helvetica Neue", HelveticaNeue, system-ui, sans-serif',
    fontSize: 11,
    fontWeight: 400,
    lineHeight: 1.25,
    letterSpacing: '-0.01em',
    color: theme.palette.type === 'dark' ? 'rgba(147,197,253,0.75)' : 'rgba(37,99,235,0.75)',
    whiteSpace: 'nowrap',
    '&:hover': {
      background:
        theme.palette.type === 'dark' ? 'rgba(59,130,246,0.14)' : 'rgba(59,130,246,0.08)',
      borderColor: theme.palette.type === 'dark' ? 'rgba(96,165,250,0.4)' : 'rgba(59,130,246,0.35)'
    }
  },
  stepTabActive: {
    background:
      theme.palette.type === 'dark' ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.12)',
    borderColor: theme.palette.type === 'dark' ? 'rgba(96,165,250,0.45)' : 'rgba(59,130,246,0.38)',
    color: theme.palette.type === 'dark' ? 'rgba(191,219,254,0.95)' : 'rgba(29,78,216,0.9)',
    fontWeight: 500
  },
  stepPanel: {
    animation: '$fadeStep 0.28s ease'
  },
  '@keyframes fadeStep': {
    from: { opacity: 0, transform: 'translateY(6px)' },
    to: { opacity: 1, transform: 'translateY(0)' }
  },
  stepPanelTitle: {
    fontSize: 17,
    fontWeight: 500,
    letterSpacing: '-0.02em',
    color: theme.palette.text.primary,
    marginBottom: 4,
    fontFamily: '"Helvetica Neue", HelveticaNeue, system-ui, sans-serif'
  },
  stepNavFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing(2),
    paddingTop: theme.spacing(1.5),
    borderTop: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.08)' : '#ECEEF1'}`
  },
  originGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 10,
    marginTop: 8
  },
  originCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '14px 8px',
    borderRadius: 14,
    border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.1)' : '#E8EAED'}`,
    background: 'transparent',
    cursor: 'pointer',
    transition: 'border-color 0.2s, background 0.2s, transform 0.15s',
    fontSize: 11,
    fontWeight: 500,
    color: theme.palette.text.primary,
    fontFamily: '"Helvetica Neue", HelveticaNeue, system-ui, sans-serif',
    '&:hover': {
      transform: 'translateY(-1px)',
      background:
        theme.palette.type === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'
    }
  },
  originCardActive: {
    borderColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.35)' : '#C7C7CC',
    background:
      theme.palette.type === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.03)',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
  },
  choiceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: 8
  },
  choiceChip: {
    padding: '9px 10px',
    borderRadius: 10,
    border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.12)' : '#E4E7EC'}`,
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 12,
    color: theme.palette.text.secondary,
    fontFamily: '"Helvetica Neue", HelveticaNeue, system-ui, sans-serif',
    transition: 'all 0.2s ease'
  },
  choiceChipActive: {
    borderColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.35)' : '#C7C7CC',
    color: theme.palette.text.primary,
    fontWeight: 500,
    background:
      theme.palette.type === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'
  },
  productCartBox: {
    borderRadius: 14,
    padding: theme.spacing(1.5),
    marginBottom: theme.spacing(1.5),
    background:
      theme.palette.type === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
    border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.08)' : '#ECEEF1'}`
  },
  productAddTrigger: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    minHeight: 88,
    padding: theme.spacing(2),
    borderRadius: 14,
    border: `1px dashed ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.18)' : '#D0D5DD'}`,
    background: 'transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      borderColor: theme.palette.type === 'dark' ? 'rgba(96,165,250,0.45)' : 'rgba(59,130,246,0.4)',
      background:
        theme.palette.type === 'dark' ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.04)'
    }
  },
  productAddIconBtn: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(96,165,250,0.35)' : 'rgba(59,130,246,0.3)'}`,
    background:
      theme.palette.type === 'dark' ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)',
    color: theme.palette.type === 'dark' ? 'rgba(147,197,253,0.9)' : 'rgba(37,99,235,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  productLineCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 14px',
    borderRadius: 12,
    marginBottom: 8,
    border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.08)' : '#EAECF0'}`,
    background:
      theme.palette.type === 'dark' ? 'rgba(255,255,255,0.04)' : '#FAFAFB'
  },
  productQtyPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 8px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 500,
    background:
      theme.palette.type === 'dark' ? 'rgba(59,130,246,0.2)' : 'rgba(59,130,246,0.1)',
    color: theme.palette.type === 'dark' ? 'rgba(191,219,254,0.95)' : 'rgba(29,78,216,0.9)'
  },
  originPickerField: {
    cursor: 'pointer'
  },
  originMiniDialog: {
    borderRadius: 16,
    maxWidth: 360,
    width: '100%',
    margin: 16
  },
  originMiniTitle: {
    fontSize: 15,
    fontWeight: 500,
    padding: theme.spacing(2, 2, 1),
    letterSpacing: '-0.02em'
  },
  formFieldCell: {
    display: 'flex',
    flexDirection: 'column',
    '& .MuiFormControl-root, & .MuiAutocomplete-root': {
      width: '100%'
    },
    '& .MuiOutlinedInput-root': {
      minHeight: 40,
      borderRadius: 6
    }
  },
  formFieldCellCompact: {
    '& .MuiOutlinedInput-root': {
      minHeight: 36,
      borderRadius: 6
    }
  },
  formGrid: {
    width: '100%',
    margin: 0
  },
  anchorFieldWrap: {
    position: 'relative',
    width: '100%'
  },
  anchorPopoverPaper: {
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 4,
    boxShadow:
      theme.palette.type === 'dark'
        ? '0 12px 40px rgba(0,0,0,0.5)'
        : '0 12px 32px rgba(15, 23, 42, 0.14)',
    border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.1)' : '#E5E7EB'}`
  },
  anchorPopoverHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing(1.25, 1.5, 0.75),
    fontSize: 13,
    fontWeight: 500
  },
  anchorPopoverBody: {
    padding: theme.spacing(0, 1.5, 1.25),
    maxHeight: 280,
    overflowY: 'auto'
  },
  nestedDialogPaper: {
    borderRadius: 14,
    maxWidth: 380,
    width: 'calc(100% - 32px)',
    margin: 16,
    overflow: 'hidden'
  },
  nestedDialogSearch: {
    marginBottom: theme.spacing(1.5),
    '& .MuiOutlinedInput-root': {
      minHeight: 40
    }
  },
  productSummaryLine: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    borderRadius: 10,
    marginBottom: 6,
    background:
      theme.palette.type === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)',
    border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : '#EAECF0'}`
  },
  cartTotalBar: {
    marginTop: theme.spacing(1.5),
    padding: theme.spacing(1.5, 2),
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background:
      theme.palette.type === 'dark' ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)',
    border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(96,165,250,0.25)' : 'rgba(59,130,246,0.2)'}`
  },
  cartTotalLabel: {
    fontSize: 12,
    fontWeight: 500,
    opacity: 0.75
  },
  cartTotalValue: {
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: '-0.02em',
    color: theme.palette.primary.main
  },
  brandAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    color: '#fff',
    flexShrink: 0,
    '&:hover': {
      opacity: 0.92
    }
  },
  originMiniList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: theme.spacing(0, 1.5, 1.5),
    maxHeight: 320,
    overflowY: 'auto'
  },
  originMiniItem: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    padding: '10px 12px',
    borderRadius: 10,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    color: theme.palette.text.primary,
    textAlign: 'left',
    transition: 'background 0.15s ease',
    '&:hover': {
      background:
        theme.palette.type === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'
    }
  },
  originMiniItemActive: {
    background:
      theme.palette.type === 'dark' ? 'rgba(59,130,246,0.18)' : 'rgba(59,130,246,0.1)'
  },
  productModalAddBtn: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    flexShrink: 0,
    border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(96,165,250,0.35)' : 'rgba(59,130,246,0.28)'}`,
    background:
      theme.palette.type === 'dark' ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.08)',
    color: theme.palette.type === 'dark' ? 'rgba(147,197,253,0.95)' : 'rgba(37,99,235,0.9)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.15s ease, background 0.15s ease',
    '&:hover': {
      transform: 'scale(1.06)',
      background:
        theme.palette.type === 'dark' ? 'rgba(59,130,246,0.28)' : 'rgba(59,130,246,0.14)'
    }
  },
  productCartRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`
  },
  addProductBtn: {
    marginTop: 10,
    textTransform: 'none',
    borderRadius: 12,
    borderColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.2)' : '#D7DCE3',
    color: theme.palette.text.primary
  },
  productDialogPaper: {
    borderRadius: 16,
    overflow: 'hidden'
  },
  productDialogTitle: {
    fontWeight: 500,
    fontSize: 18,
    letterSpacing: '-0.02em'
  },
  productDialogContent: {
    padding: theme.spacing(1, 2, 2)
  },
  productPickList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  productPickCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    width: '100%',
    padding: '14px 16px',
    borderRadius: 14,
    border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.1)' : '#E8EAED'}`,
    background: 'transparent',
    textAlign: 'left',
    transition: 'all 0.2s ease',
    '&:hover': {
      borderColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.22)' : '#D0D5DD',
      background:
        theme.palette.type === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'
    }
  },
  productPickCardActive: {
    borderColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.3)' : '#C7C7CC',
    background:
      theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)'
  },
  productPickMain: {
    flex: 1,
    minWidth: 0
  },
  productPickPrice: {
    color: theme.palette.text.secondary,
    marginTop: 2
  },
  productPickAction: {
    fontSize: 12,
    fontWeight: 500,
    color: theme.palette.text.secondary,
    marginLeft: 12,
    whiteSpace: 'nowrap'
  },
  productDialogActions: {
    padding: theme.spacing(1.5, 2)
  },
  ghostActionBtn: {
    textTransform: 'none',
    fontSize: 12,
    fontWeight: 400,
    borderRadius: 10,
    padding: '4px 12px',
    minHeight: 32,
    borderColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.25)' : '#D7DCE3',
    color: theme.palette.text.primary
  },
  contentWrapper: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden'
  },
  chatHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(1.5, 2),
    borderBottom: '1px solid ' + theme.palette.divider
    },
  chatHeaderTitle: {
    marginLeft: theme.spacing(1),
    display: 'flex',
    flexDirection: 'column'
  },
  chatStatus: {
    marginLeft: 'auto'
  },
  chatBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minHeight: 0,
    background: 'transparent'
  },
  ticketHeader: {
    display: "flex",
    background: theme.palette.total,
    flex: "none",
    borderBottom: "1px solid " + theme.palette.divider,
    height: 65,
    width: "100%",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
    [theme.breakpoints.down("sm")]: {
      flexWrap: "wrap",
      height: "max-content"
    }
  },
  tagInputRow: {
    display: 'flex',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  actionsFooter: {
    position: 'sticky',
    bottom: 0,
    background: theme.palette.background.paper,
    padding: theme.spacing(1),
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid ' + theme.palette.divider,
    zIndex: 2
  },
  priorityChip: {
    fontSize: 12,
    fontWeight: 600,
    padding: '4px 8px',
    borderRadius: 8,
    display: 'inline-flex',
    alignItems: 'center'
  },
  prioBaixa: { backgroundColor: '#DCFCE7', color: '#166534' },
  prioMedia: { backgroundColor: '#FEF9C3', color: '#A16207' },
  prioAlta: { backgroundColor: '#FFE4D5', color: '#9A3412' },
  prioCritica: { backgroundColor: '#FEE2E2', color: '#B91C1C' },
  sectionBlockCompact: {
    padding: theme.spacing(1, 1.25),
    marginBottom: theme.spacing(1)
  },
  stepPanelCompact: {
    animation: '$fadeStep 0.22s ease',
    marginTop: theme.spacing(0.5)
  },
  wizardDockWrap: {
    marginBottom: theme.spacing(2.25),
    paddingBottom: theme.spacing(0.25)
  },
  inputRootCompact: {
    '& .MuiOutlinedInput-root': {
      minHeight: 36
    },
    '& .MuiOutlinedInput-input': {
      padding: '8px 11px',
      fontSize: 13
    }
  },
  formGridTight: {
    width: '100%',
    margin: 0,
    '& > .MuiGrid-item': {
      paddingTop: theme.spacing(0.625),
      paddingBottom: theme.spacing(0.625)
    }
  },
  splitTitleMeta: {
    fontWeight: 400,
    fontSize: 14,
    letterSpacing: '-0.02em',
    color: theme.palette.text.secondary,
    opacity: 0.85
  },
  splitSubtitle: {
    fontSize: 11,
    fontWeight: 400,
    lineHeight: 1.4,
    color: theme.palette.text.secondary,
    opacity: 0.72,
    marginTop: 4,
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif'
  },
  splitHeaderText: {
    textAlign: 'center',
    padding: theme.spacing(0, 4),
    minWidth: 0
  },
  splitCloseBtn: {
    position: 'absolute',
    left: 12,
    top: 12,
    padding: 6
  },
  splitShell: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden'
  },
  splitHeader: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: theme.spacing(1.5, 2, 1),
    borderBottom: 'none'
  },
  splitMenubarRow: {
    flexShrink: 0,
    width: '100%',
    boxSizing: 'border-box',
    padding: theme.spacing(0, 2, 0),
    marginBottom: theme.spacing(1.5),
    borderBottom: 'none'
  },
  splitTitle: {
    fontSize: 16,
    fontWeight: 500,
    letterSpacing: '-0.02em',
    fontFamily: '"Helvetica Neue", HelveticaNeue, system-ui, sans-serif',
    textAlign: 'center',
    lineHeight: 1.35,
    padding: theme.spacing(0, 3)
  },
  splitGrid: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden'
  },
  splitLeftCol: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    borderRight: `1px solid ${theme.palette.divider}`,
    minWidth: 0
  },
  splitLeftScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: theme.spacing(1.5, 2, 1),
    '&::-webkit-scrollbar': { width: 6 },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: theme.palette.type === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.4)',
      borderRadius: 3
    }
  },
  splitFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing(1.5, 2),
    marginTop: theme.spacing(2),
    background: 'transparent'
  },
  splitRightCol: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    background: 'transparent'
  },
  detailPanelRoot: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(0.75),
    minHeight: 0,
    width: '100%',
    boxSizing: 'border-box'
  },
  detailLeadHeader: {
    marginBottom: theme.spacing(0.5)
  },
  detailLeadTitle: {
    fontSize: 16,
    fontWeight: 600,
    letterSpacing: '-0.02em',
    lineHeight: 1.3
  },
  detailBadgeMuted: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 8px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 500,
    background: theme.palette.type === 'dark' ? 'rgba(34,197,94,0.15)' : '#DCFCE7',
    color: theme.palette.type === 'dark' ? '#86EFAC' : '#166534'
  },
  detailBadgeStage: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 8px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 500,
    background: theme.palette.type === 'dark' ? 'rgba(59,130,246,0.18)' : '#DBEAFE',
    color: theme.palette.type === 'dark' ? '#93C5FD' : '#1D4ED8'
  },
  detailFieldMb: {
    marginBottom: theme.spacing(1)
  },
  detailAvatarSm: {
    width: 22,
    height: 22,
    fontSize: 11
  },
  detailMetricsRow: {
    marginBottom: theme.spacing(0.5)
  },
  detailMetricCard: {
    borderRadius: 12,
    padding: theme.spacing(1, 1.25),
    border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.08)' : '#EAECF0'}`,
    background: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff',
    minHeight: 72,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  },
  detailMetricCardAccent: {
    borderColor: theme.palette.primary.main,
    boxShadow: `inset 0 0 0 1px ${theme.palette.primary.main}22`
  },
  detailMetricLabel: {
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    opacity: 0.55,
    marginBottom: 4
  },
  detailMetricValue: {
    fontSize: 20,
    fontWeight: 600,
    letterSpacing: '-0.02em',
    lineHeight: 1.1
  },
  detailMetricHint: {
    fontSize: 10,
    opacity: 0.5,
    marginTop: 2
  },
  detailValueBig: {
    '& .MuiOutlinedInput-input': {
      fontSize: 20,
      fontWeight: 500,
      padding: '10px 14px'
    }
  },
  funnelStepper: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: theme.spacing(1)
  },
  funnelStep: {
    flex: '1 1 auto',
    minWidth: 0,
    padding: '8px 10px',
    borderRadius: 8,
    border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.12)' : '#E4E7EC'}`,
    background: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.04)' : '#F4F5F7',
    fontSize: 11,
    fontWeight: 500,
    color: theme.palette.text.secondary,
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.15s ease',
    fontFamily: 'inherit'
  },
  funnelStepActive: {
    background: theme.palette.primary.main,
    borderColor: theme.palette.primary.main,
    color: theme.palette.getContrastText(theme.palette.primary.main),
    fontWeight: 600
  },
  detailSplitRow: {
    marginBottom: theme.spacing(0.5)
  },
  productChipsBox: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
    minHeight: 36,
    padding: theme.spacing(0.75),
    borderRadius: 10,
    border: `1px dashed ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.14)' : '#D0D5DD'}`,
    background: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.02)' : '#FAFAFB'
  },
  productChip: {
    height: 26,
    fontSize: 12,
    fontWeight: 500,
    background: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.08)' : '#fff',
    border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.12)' : '#E4E7EC'}`
  },
  inventoryBtn: {
    textTransform: 'none',
    borderRadius: 8,
    fontSize: 12,
    height: 28,
    borderColor: theme.palette.primary.main,
    color: theme.palette.primary.main
  },
  linkActionBtn: {
    textTransform: 'none',
    fontSize: 12,
    color: theme.palette.primary.main,
    minWidth: 0,
    padding: '2px 6px'
  },
  ghostActionBtn: {
    textTransform: 'none',
    borderRadius: 10,
    fontSize: 12,
    borderColor: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.2)' : '#D7DCE3'
  },
  detailActionsRow: {
    marginTop: theme.spacing(0.25),
    marginBottom: theme.spacing(0.5)
  },
  detailWizardCompact: {
    marginTop: theme.spacing(0.5),
    width: '100%',
    '& .MuiGrid-container': {
      width: '100%',
      margin: 0
    }
  },
  productBlockHero: {
    borderRadius: 14,
    padding: theme.spacing(1.25),
    marginBottom: theme.spacing(0.5),
    background:
      theme.palette.type === 'dark'
        ? 'linear-gradient(145deg, rgba(59,130,246,0.08) 0%, rgba(255,255,255,0.02) 100%)'
        : 'linear-gradient(145deg, rgba(59,130,246,0.06) 0%, #FAFBFC 100%)',
    border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(96,165,250,0.2)' : 'rgba(59,130,246,0.12)'}`
  },
  splitEditBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    overflow: 'hidden'
  },
  splitEditInfoColFull: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 0,
    height: '100%',
    flex: 1,
    maxWidth: '100%',
    overflowY: 'auto',
    paddingRight: theme.spacing(0.5),
    '&::-webkit-scrollbar': { width: 5 },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: theme.palette.type === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.4)',
      borderRadius: 3
    }
  },
  splitEditLeadTitle: {
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: '-0.02em',
    marginBottom: theme.spacing(1),
    textAlign: 'center',
    color: theme.palette.text.primary
  },
  splitEditMain: {
    flex: 1,
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    padding: theme.spacing(0, 2, 0),
    '&::-webkit-scrollbar': { width: 4 },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: theme.palette.type === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.4)',
      borderRadius: 3
    }
  },
  splitEditMainScrollable: {
    flex: 1,
    minHeight: 0,
    display: 'block',
    overflowY: 'auto',
    padding: theme.spacing(0, 2, 0),
    '&::-webkit-scrollbar': { width: 4 },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: theme.palette.type === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.4)',
      borderRadius: 3
    }
  },
  splitEditBottom: {
    flex: 1,
    minHeight: 0,
    height: '100%',
    margin: 0,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden'
  },
  splitEditInfoCol: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 0,
    height: '100%',
    paddingRight: theme.spacing(1.5),
    borderRight: `1px solid ${theme.palette.divider}`,
    flex: '0 0 42%',
    maxWidth: '42%',
    [theme.breakpoints.down('sm')]: {
      borderRight: 'none',
      borderBottom: `1px solid ${theme.palette.divider}`,
      paddingRight: 0,
      paddingBottom: theme.spacing(1),
      maxHeight: '42vh'
    }
  },
  splitEditInfoScroll: {
    flex: 1,
    overflowY: 'auto',
    minHeight: 0,
    paddingRight: theme.spacing(0.5),
    '&::-webkit-scrollbar': { width: 5 },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: theme.palette.type === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.4)',
      borderRadius: 3
    }
  },
  splitEditChatCol: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 0,
    height: '100%',
    flex: '1 1 58%',
    maxWidth: '58%',
    background: 'transparent',
    overflow: 'hidden',
    paddingLeft: theme.spacing(1),
    paddingRight: 0
  },
  detailPanelFooterActions: {
    marginTop: theme.spacing(1),
    paddingTop: theme.spacing(0.75),
    borderTop: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : '#ECEEF1'}`
  },
  detailSummaryRoot: {
    marginBottom: theme.spacing(1)
  },
  summaryStageRow: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(1.25),
    paddingBottom: theme.spacing(1),
    borderBottom: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.08)' : '#E5E7EB'}`
  },
  detailSummaryGrid: {
    width: '100%'
  },
  summaryStat: {
    borderRadius: 12,
    padding: theme.spacing(1, 1.1),
    border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.08)' : '#EAECF0'}`,
    background: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.03)' : '#fff',
    minHeight: 68,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  },
  summaryStatFlat: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    minHeight: 56,
    padding: theme.spacing(0.25, 0)
  },
  summaryBlocksRow: {
    marginBottom: theme.spacing(0.25),
    width: '100%',
    alignItems: 'stretch',
    '& > .MuiGrid-item': {
      paddingLeft: theme.spacing(1),
      paddingRight: theme.spacing(1)
    }
  },
  summaryKpiGridItem: {
    display: 'flex',
    '& > *': {
      flex: 1,
      width: '100%'
    }
  },
  summaryKpiCard: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 4,
    minHeight: 92,
    height: '100%',
    padding: theme.spacing(1, 1.1),
    borderRadius: 10,
    border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.08)'}`,
    background: theme.palette.type === 'dark'
      ? 'linear-gradient(180deg, rgba(99,102,241,0.12) 0%, rgba(255,255,255,0.03) 100%)'
      : 'linear-gradient(180deg, rgba(99,102,241,0.05) 0%, rgba(255,255,255,0.92) 100%)',
    boxShadow: theme.palette.type === 'dark'
      ? 'inset 0 0 0 1px rgba(255,255,255,0.04)'
      : '0 1px 3px rgba(15,23,42,0.04)',
    overflow: 'hidden'
  },
  summaryKpiLabel: {
    display: 'block',
    fontSize: 8.5,
    fontWeight: 500,
    color: theme.palette.text.secondary,
    lineHeight: 1.15,
    letterSpacing: 0,
    whiteSpace: 'nowrap',
    width: '100%',
    marginBottom: 2
  },
  summaryKpiCardMid: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    width: '100%',
    minHeight: 26
  },
  summaryKpiIconTile: {
    width: 22,
    height: 22,
    borderRadius: 8,
    display: 'grid',
    placeItems: 'center',
    flexShrink: 0
  },
  summaryResponsibleSection: {
    marginTop: theme.spacing(1.75),
    paddingTop: theme.spacing(1.5),
    borderTop: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.08)' : '#E5E7EB'}`
  },
  summaryResponsibleLabel: {
    display: 'block',
    fontSize: 11,
    fontWeight: 500,
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(0.75),
    letterSpacing: '0.02em'
  },
  summaryKpiValue: {
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    lineHeight: 1.15,
    color: theme.palette.text.primary,
    minHeight: 24,
    display: 'flex',
    alignItems: 'center'
  },
  summaryKpiHint: {
    fontSize: 9,
    opacity: 0.55,
    lineHeight: 1.2,
    minHeight: 14,
    display: 'block',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  summaryValueInput: {
    marginTop: 2,
    '& .MuiOutlinedInput-input': {
      fontSize: 16,
      fontWeight: 600,
      padding: '8px 10px'
    }
  },
  summaryResponsible: {
    gap: 8,
    marginTop: 2
  },
  summaryResponsibleName: {
    fontSize: 13,
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  summaryProducts: {
    borderRadius: 12,
    padding: theme.spacing(1, 1.1),
    border: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.08)' : '#EAECF0'}`,
    background: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.02)' : '#FAFAFB'
  },
  summaryProductsFlat: {
    padding: theme.spacing(0.5, 0, 0),
    borderTop: `1px solid ${theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : '#ECEEF1'}`,
    marginTop: theme.spacing(0.5),
    paddingTop: theme.spacing(1)
  },
  summaryProductChips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center'
  },
  summaryEmptyProducts: {
    fontSize: 12,
    opacity: 0.5
  },
  fieldLabelRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    marginBottom: 6,
    minHeight: 22
  },
  pencilBtn: {
    padding: 4,
    opacity: 0.55,
    '&:hover': { opacity: 1, background: 'rgba(0,0,0,0.04)' }
  },
  funnelChevronWrap: {
    margin: theme.spacing(0, 0, 0.5),
    padding: 0,
    width: '100%'
  },
  funnelChevronWrapFull: {
    width: '100%'
  },
  funnelChevronLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: theme.palette.type === 'dark' ? '#fff' : '#000',
    opacity: 1,
    textAlign: 'left',
    marginBottom: 8,
    marginTop: 2,
    fontWeight: 600
  },
  funnelChevronTrackWrap: {
    width: '100%',
    display: 'flex',
    justifyContent: 'stretch'
  },
  funnelChevronTrack: {
    display: 'flex',
    width: '100%',
    maxWidth: '100%',
    minHeight: 30,
    overflow: 'hidden',
    borderRadius: 10,
    background: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : '#F3F4F6',
    boxShadow: theme.palette.type === 'dark'
      ? 'inset 0 0 0 1px rgba(255,255,255,0.06)'
      : 'inset 0 0 0 1px rgba(0,0,0,0.04)'
  },
  funnelChevronStep: {
    flex: '1 1 0',
    minWidth: 0,
    position: 'relative',
    marginLeft: -10,
    padding: '10px 14px 10px 18px',
    border: 'none',
    background: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.06)' : '#F3F4F6',
    color: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.65)' : '#4B5563',
    fontSize: 10,
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    clipPath: 'polygon(0 0, calc(100% - 11px) 0, 100% 50%, calc(100% - 11px) 100%, 0 100%, 11px 50%)',
    transition: 'background 0.15s ease, color 0.15s ease',
    '&:disabled': {
      cursor: 'default',
      opacity: 0.85
    },
    '&:hover:not(:disabled)': {
      background: theme.palette.type === 'dark' ? 'rgba(255,255,255,0.1)' : '#E9EAEC'
    }
  },
  funnelChevronStepFirst: {
    marginLeft: 0,
    paddingLeft: 12,
    clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)'
  },
  funnelChevronStepLast: {
    clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 14px 50%)',
    paddingRight: 12
  },
  funnelChevronStepActive: {
    background: '#7C3AED',
    color: '#fff',
    fontWeight: 600,
    zIndex: 2,
    '&:hover': {
      background: '#6D28D9'
    }
  },
  funnelChevronStepText: {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  ticketHeaderCompact: {
    height: 52,
    minHeight: 52
  },
  chatBodyEmbedded: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minHeight: 0,
    background: 'transparent'
  },
  chatConversationStack: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    overflow: 'hidden'
  },
  chatMessagesScroll: {
    flex: '1 1 auto',
    minHeight: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundImage:
      theme.palette.type === 'light'
        ? `url(${whatsBackground})`
        : `url(${whatsBackgroundDark})`,
    backgroundColor:
      theme.palette.type === 'light' ? '#e5ddd5' : theme.palette.background.default,
    backgroundRepeat: 'repeat',
    backgroundSize: '380px auto',
    '&::-webkit-scrollbar': { width: 6 },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: theme.palette.type === 'light' ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.4)',
      borderRadius: 3
    }
  },
  chatPaneFill: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    minHeight: 0,
    height: '100%'
  }
}));

const ORIGIN_CHANNELS = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "x", label: "X" },
  { id: "telegram", label: "Telegram" },
  { id: "sms", label: "SMS" },
  { id: "site", label: "Site" },
  { id: "indicacao", label: "IndicaÃ§Ã£o" },
  { id: "google", label: "Google" }
];

const statusOptions = [
  { value: "novo", label: "Novo Lead" },
  { value: "qualificacao", label: "QualificaÃ§Ã£o" },
  { value: "proposta", label: "Proposta" },
  { value: "negociacao", label: "NegociaÃ§Ã£o" },
  { value: "fechado", label: "Fechado" }
];

const DEFAULT_STAGE_COLORS = {
  novo: "#6366F1",
  qualificacao: "#8B5CF6",
  proposta: "#F59E0B",
  negociacao: "#F97316",
  fechado: "#10B981"
};

const toStageOption = (stage) => {
  const value = stage?.key ?? stage?.value ?? "";
  return {
    value,
    label: stage?.label ?? stage?.title ?? stage?.key ?? stage?.value ?? "Etapa",
    color: stage?.color || DEFAULT_STAGE_COLORS[String(value).toLowerCase()] || "#6366F1"
  };
};

export default function CreateLeadSaleModal({ open, onClose, lead, onSave, pipelineId, columns, hideTicketPreview = false }) {
  const classes = useStyles();
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [users, setUsers] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState(pipelineId || null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [phone, setPhone] = useState("");
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticket, setTicket] = useState(null);
  const [tagInput, setTagInput] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [productService, setProductService] = useState("");
  const [priority, setPriority] = useState("MÃ©dia");
  const [currency, setCurrency] = useState("BRL");
  const [inventoryItems, setInventoryItems] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [personType, setPersonType] = useState("cpf");
  const [email, setEmail] = useState("");
  const [cartLines, setCartLines] = useState([]);
  const [originOpen, setOriginOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [originChannel, setOriginChannel] = useState("");
  const [activeStep, setActiveStep] = useState(null);
  const [activityDraft, setActivityDraft] = useState({ title: "", description: "", type: "task" });
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "novo",
    value: 0,
    companyName: "",
    contactId: null,
    responsibleId: null,
    dateStart: "",
    site: "",
    origin: "",
    document: "",
    birthDate: "",
    address: {
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: ""
    },
    tags: []
  });

  const initLeadIdRef = useRef(null);
  const stageValidatedKeyRef = useRef(null);

  useEffect(() => {
    if (!open) {
      initLeadIdRef.current = null;
      stageValidatedKeyRef.current = null;
      return;
    }
    const currentId = lead?.id ?? "__new__";
    if (initLeadIdRef.current === currentId) return;
    initLeadIdRef.current = currentId;
    stageValidatedKeyRef.current = null;

    const today = new Date().toISOString().slice(0, 10);

    if (lead?.id) {
      setForm({
        name: lead.name || "",
        description: lead.description || "",
        status: lead.status || "novo",
        value: lead.value || 0,
        companyName: lead.companyName || "",
        contactId: lead.contactId || null,
        responsibleId: lead.responsibleId || null,
        dateStart: lead.date ? String(lead.date).slice(0, 10) : today,
        site: lead.site || "",
        origin: lead.origin || "",
        document: lead.document || "",
        birthDate: lead.birthDate ? String(lead.birthDate).slice(0, 10) : "",
        address: {
          cep: lead.address?.cep || "",
          street: lead.address?.street || "",
          number: lead.address?.number || "",
          complement: lead.address?.complement || "",
          neighborhood: lead.address?.neighborhood || "",
          city: lead.address?.city || "",
          state: lead.address?.state || ""
        },
        tags: Array.isArray(lead.tags) ? lead.tags : []
      });
      setPhone(lead.phone || "");
      setEmail(lead.email || "");
      if (lead.contact) {
        setSelectedContact(lead.contact);
      }
      setSelectedPipelineId(lead.pipelineId ?? (pipelineId || null));
      setActiveStep(null);
    } else {
      setForm({
        name: lead?.name || "",
        description: lead?.description || "",
        status: lead?.status || "novo",
        value: lead?.value || 0,
        companyName: lead?.companyName || "",
        contactId: lead?.contactId || null,
        responsibleId: lead?.responsibleId || null,
        dateStart: lead?.date ? String(lead.date).slice(0, 10) : today,
        site: lead?.site || "",
        origin: lead?.origin || "",
        document: lead?.document || "",
        birthDate: lead?.birthDate ? String(lead.birthDate).slice(0, 10) : "",
        address: {
          cep: lead?.address?.cep || "",
          street: lead?.address?.street || "",
          number: lead?.address?.number || "",
          complement: lead?.address?.complement || "",
          neighborhood: lead?.address?.neighborhood || "",
          city: lead?.address?.city || "",
          state: lead?.address?.state || ""
        },
        tags: Array.isArray(lead?.tags) ? lead.tags : []
      });
      setPhone(lead?.phone || "");
      setEmail(lead?.email || "");
      setCartLines([]);
      setActiveStep(null);
      setOriginChannel(lead?.origin || "");
      setProductService("");
      setSelectedPipelineId(lead?.pipelineId ?? (pipelineId || null));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id, open]);

  useEffect(() => {
    let cancelled = false;
    if (!open) return undefined;
    const load = async () => {
      try {
        let invItems = [];
        let pipeList = [];
        try {
          const data = await inventoryService.list({ searchParam: "", pageNumber: 1 });
          if (cancelled) return;
          invItems = Array.isArray(data?.inventory) ? data.inventory : [];
        } catch { /* ignore */ }
        try {
          const list = await leadPipelinesService.list();
          if (cancelled) return;
          pipeList = Array.isArray(list) ? list : [];
        } catch { /* ignore */ }
        const { data: contactsResp } = await api.get("/contacts/list");
        if (cancelled) return;
        const { data: usersResp } = await api.get("/users", { params: { searchParam: "" } });
        if (cancelled) return;

        let matchedContact = null;
        if (lead?.contactId) {
          matchedContact = (contactsResp || []).find((x) => x.id === lead.contactId) || null;
        } else if (lead?.phone) {
          const digits = String(lead.phone).replace(/\D/g, "");
          matchedContact = (contactsResp || []).find((x) => {
            const contactDigits = String(x.number || "").replace(/\D/g, "");
            if (!contactDigits || !digits) return false;
            if (contactDigits === digits) return true;
            const minLen = Math.min(8, contactDigits.length, digits.length);
            return (
              contactDigits.slice(-minLen) === digits.slice(-minLen) ||
              contactDigits.endsWith(digits.slice(-10)) ||
              digits.endsWith(contactDigits.slice(-10))
            );
          }) || null;
        }

        batchUpdates(() => {
          setInventoryItems(invItems);
          setPipelines(pipeList);
          setContacts(contactsResp || []);
          setUsers(usersResp?.users || []);
          if (matchedContact) {
            setSelectedContact(matchedContact);
            if (lead?.phone && !lead?.contactId) {
              setForm((prev) => {
                if (prev.contactId === matchedContact.id) return prev;
                return { ...prev, contactId: matchedContact.id };
              });
            }
          } else {
            setSelectedContact(null);
          }
        });
      } catch (err) {
        toastError(err);
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lead?.id]);

  useEffect(() => {
    if (!selectedContact) return;
    const newPhone = selectedContact.number || "";
    setPhone((prev) => (prev === newPhone ? prev : newPhone));
  }, [selectedContact]);

  const digitsPhone = useMemo(() => String(phone || "").replace(/\D/g, ""), [phone]);
  const [debouncedDigitsPhone, setDebouncedDigitsPhone] = useState("");
  const queueIdsCacheRef = useRef(null);
  const ticketFetchGenRef = useRef(0);

  useEffect(() => {
    if (!open) {
      setDebouncedDigitsPhone((prev) => (prev === "" ? prev : ""));
      return undefined;
    }
    const timer = setTimeout(() => {
      setDebouncedDigitsPhone((prev) => (prev === digitsPhone ? prev : digitsPhone));
    }, digitsPhone.length >= 8 ? 350 : 600);
    return () => clearTimeout(timer);
  }, [open, digitsPhone]);

  useEffect(() => {
    if (!open || !ticket) return undefined;
    const contact = ticket.contact || selectedContact;
    if (contact?.profilePicUrl || contact?.urlPicture) {
      setAvatarUrl(contact.profilePicUrl || contact.urlPicture);
      return undefined;
    }
    const number = contact?.number;
    if (!number || number.length < 8) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/contacts/profile/${number}`);
        if (!cancelled) {
          const url = data?.profilePicUrl || data?.urlPicture || "";
          if (url) setAvatarUrl(url);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, ticket, selectedContact]);

  useEffect(() => {
    if (!open) {
      batchUpdates(() => {
        setTicket(null);
        setTicketLoading(false);
      });
      return undefined;
    }

    const contactId =
      lead?.contactId ||
      lead?.contact?.id ||
      form.contactId ||
      selectedContact?.id;
    const isEditingLead = Boolean(lead?.id);
    const rawPhone =
      lead?.contact?.number ||
      selectedContact?.number ||
      phone ||
      lead?.phone ||
      "";
    const phoneKey = isEditingLead
      ? String(rawPhone).replace(/\D/g, "")
      : debouncedDigitsPhone;
    const hasLookupKey = Boolean(contactId || phoneKey.length >= 8);

    if (!hasLookupKey) {
      batchUpdates(() => {
        setTicket(null);
        setTicketLoading(false);
      });
      return undefined;
    }

    const fetchGen = ++ticketFetchGenRef.current;
    let cancelled = false;

    const fetchTicketsByContact = async (cid) => {
      const { data } = await api.get("/tickets", {
        params: {
          contacts: JSON.stringify([cid]),
          pageNumber: 1,
          showAll: "true",
          status: "search",
          queueIds: JSON.stringify(queueIdsCacheRef.current || [])
        }
      });
      return Array.isArray(data?.tickets) ? data.tickets : [];
    };

    const loadTicket = async () => {
      setTicketLoading(true);
      try {
        const contactId =
          lead?.contactId ||
          lead?.contact?.id ||
          form.contactId ||
          selectedContact?.id;
        const rawPhone =
          lead?.contact?.number ||
          selectedContact?.number ||
          phone ||
          lead?.phone ||
          "";

        let previewTicket = null;
        try {
          const { data } = await api.get("/tickets/preview-for-contact", {
            params: {
              contactId: contactId || undefined,
              phone: rawPhone || undefined
            }
          });
          previewTicket = data;
        } catch {
          /* endpoint indisponível — segue fallback */
        }

        if (cancelled || fetchGen !== ticketFetchGenRef.current) return;

        if (previewTicket?.uuid) {
          const phoneKey = String(rawPhone).replace(/\D/g, "");
          const storageKey =
            (contactId && `leadTicket:contact:${contactId}`) ||
            (phoneKey && `leadTicket:phone:${phoneKey}`) ||
            null;
          batchUpdates(() => {
            setTicket(previewTicket);
            setTicketLoading(false);
          });
          if (storageKey) localStorage.setItem(storageKey, previewTicket.uuid);
          return;
        }

        if (!queueIdsCacheRef.current) {
          try {
            const { data } = await api.get("/queue");
            queueIdsCacheRef.current = Array.isArray(data) ? data.map((q) => q.id) : [];
          } catch {
            queueIdsCacheRef.current = [];
          }
        }
        const allQueueIds = queueIdsCacheRef.current;

        const phoneKey = isEditingLead
          ? String(rawPhone).replace(/\D/g, "")
          : debouncedDigitsPhone;

        const storageKey =
          (contactId && `leadTicket:contact:${contactId}`) ||
          (phoneKey && `leadTicket:phone:${phoneKey}`) ||
          null;

        if (storageKey) {
          const cachedUuid = localStorage.getItem(storageKey);
          if (cachedUuid) {
            try {
              const { data: cachedFull } = await api.get(`/tickets/u/${cachedUuid}`);
              if (cancelled || fetchGen !== ticketFetchGenRef.current) return;
              if (cachedFull?.uuid) {
                batchUpdates(() => {
                  setTicket(cachedFull);
                  setTicketLoading(false);
                });
                return;
              }
            } catch {
              /* tenta busca completa */
            }
          }
        }

        let list = [];

        if (contactId) {
          list = await fetchTicketsByContact(contactId);
          if (cancelled || fetchGen !== ticketFetchGenRef.current) return;
        }

        if (list.length === 0 && phoneKey.length >= 8) {
          const searchParam = selectedContact?.number || phoneKey;
          const { data: ticketsResp } = await api.get("/tickets", {
            params: {
              searchParam,
              pageNumber: 1,
              showAll: "true",
              status: "search",
              queueIds: JSON.stringify(allQueueIds)
            }
          });
          if (cancelled || fetchGen !== ticketFetchGenRef.current) return;
          list = Array.isArray(ticketsResp?.tickets) ? ticketsResp.tickets : [];
        }

        const byContact = contactId
          ? list.filter((t) => String(t.contactId) === String(contactId))
          : list;
        const chosen = byContact.sort(
          (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
        )[0];

        if (chosen?.uuid) {
          const { data: full } = await api.get(`/tickets/u/${chosen.uuid}`);
          if (cancelled || fetchGen !== ticketFetchGenRef.current) return;
          batchUpdates(() => {
            setTicket(full);
            setTicketLoading(false);
          });
          if (storageKey) localStorage.setItem(storageKey, chosen.uuid);
        } else {
          batchUpdates(() => {
            setTicket(null);
            setTicketLoading(false);
          });
        }
      } catch {
        if (!cancelled && fetchGen === ticketFetchGenRef.current) {
          batchUpdates(() => {
            setTicket(null);
            setTicketLoading(false);
          });
        }
      }
    };

    loadTicket();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    lead?.id,
    lead?.contactId,
    lead?.contact?.id,
    lead?.contact?.number,
    lead?.phone,
    selectedContact?.id,
    selectedContact?.number,
    form.contactId,
    debouncedDigitsPhone,
    phone
  ]);

  const pipelineTimeLabel = useMemo(() => {
    const base = lead?.createdAt ? new Date(lead.createdAt) : new Date();
    const now = new Date();
    const diffMs = now.getTime() - base.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days} ${days === 1 ? "dia" : "dias"}`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }, [lead?.createdAt]);

  const handleChange = useCallback((field) => (e) => {
    const value = e?.target?.value;
    setForm((prev) => {
      if (prev[field] === value) return prev;
      if (field === "value" && String(prev[field]) === String(value)) return prev;
      return { ...prev, [field]: value };
    });
  }, []);
  const handleAddressChange = useCallback((field) => (e) => {
    const value = e?.target?.value;
    setForm((prev) => {
      if ((prev.address?.[field] || "") === (value || "")) return prev;
      return { ...prev, address: { ...(prev.address || {}), [field]: value } };
    });
  }, []);

  const selectedPipeline = useMemo(() => {
    if (!Array.isArray(pipelines) || !pipelines.length) return null;
    if (selectedPipelineId !== null && selectedPipelineId !== undefined && String(selectedPipelineId) !== "") {
      return pipelines.find((p) => String(p.id) === String(selectedPipelineId)) || null;
    }
    return pipelines[0] || null;
  }, [pipelines, selectedPipelineId]);

  const stageOptions = useMemo(() => {
    if (Array.isArray(selectedPipeline?.stages) && selectedPipeline.stages.length) {
      return selectedPipeline.stages.map(toStageOption).filter((opt) => String(opt.value) !== "");
    }
    if (Array.isArray(columns) && columns.length) {
      return columns.map(toStageOption).filter((opt) => String(opt.value) !== "");
    }
    return statusOptions;
  }, [columns, selectedPipeline]);

  const stageOptionsKey = useMemo(
    () => (stageOptions || []).map((o) => o.value).join("|"),
    [stageOptions]
  );

  useEffect(() => {
    if (!open || !stageOptions.length) return;
    if (stageValidatedKeyRef.current === stageOptionsKey) return;
    stageValidatedKeyRef.current = stageOptionsKey;
    const first = stageOptions[0]?.value;
    if (first === undefined) return;
    setForm((prev) => {
      const hasCurrentStage = stageOptions.some((opt) => String(opt.value) === String(prev.status));
      if (hasCurrentStage) return prev;
      return { ...prev, status: first };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, stageOptionsKey]);

  const cartTotal = useMemo(
    () =>
      cartLines.reduce(
        (sum, line) => sum + (Number(line.price) || 0) * (Number(line.qty) || 1),
        0
      ),
    [cartLines]
  );

  const addProductToCart = useCallback((item) => {
    if (!item) return;
    const id = item.id ?? item._id ?? `inv-${String(item.name || "").trim()}`;
    if (!id) return;
    const itemCurrency = String(item.currency || "BRL").toUpperCase();
    setCurrency((cur) => (cur === itemCurrency ? cur : itemCurrency));
    const price = Number(item.price) || 0;
    setCartLines((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          qty: (next[idx].qty || 1) + 1,
          price,
          currency: itemCurrency
        };
        return next;
      }
      return [
        ...prev,
        {
          id,
          name: item.name,
          price,
          currency: itemCurrency,
          qty: 1
        }
      ];
    });
  }, []);

  const formatMoney = useCallback((n, cur) => {
    const c = (cur || currency) === "USD" ? "USD" : "BRL";
    return Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: c });
  }, [currency]);

  const formatBRL = useCallback((n) => formatMoney(n, "BRL"), [formatMoney]);

  const handleSubmit = async () => {
    const entryDate = form.dateStart || new Date().toISOString().slice(0, 10);
    try {
      setLoading(true);
      const sanitizePhone = (v) => String(v || "").replace(/\D/g, "");
      if (selectedContact) {
        const newDigits = sanitizePhone(phone);
        const oldDigits = sanitizePhone(selectedContact.number);
        if (newDigits && newDigits !== oldDigits) {
          try {
            await api.put(`/contacts/${selectedContact.id}`, { number: newDigits });
          } catch (err) {
            toastError(err);
          }
        }
      }
      const payload = {
        name: (form.name || "").trim(),
        description: [
          (form.description || "").trim(),
          cartLines.length
            ? `Produtos: ${cartLines.map((l) => `${l.qty}x ${l.name}`).join(", ")}`
            : ""
        ]
          .filter(Boolean)
          .join("\n"),
        status: form.status,
        value: cartLines.length > 0 ? cartTotal : Number(form.value) || 0,
        companyName: (form.companyName || "").trim() || undefined,
        phone: sanitizePhone(phone) || undefined,
        site: (form.site || "").trim() || undefined,
        origin: (form.origin || "").trim() || undefined,
        email: (email || "").trim() || undefined,
        document: (form.document || "").replace(/\D/g, "") || undefined,
        birthDate: form.birthDate && String(form.birthDate).trim() !== "" ? form.birthDate : undefined,
        address: (() => {
          const a = form.address || {};
          const clean = Object.keys(a).reduce((acc, k) => {
            const v = a[k];
            if (v !== undefined && v !== null && String(v).trim() !== "") acc[k] = v;
            return acc;
          }, {});
          return Object.keys(clean).length ? clean : undefined;
        })(),
        contactId: form.contactId || undefined,
        responsibleId:
          form.responsibleId === "" || form.responsibleId === null || form.responsibleId === undefined
            ? undefined
            : Number(form.responsibleId),
        date: dateInputToStartISO(entryDate),
        tags: Array.isArray(form.tags) ? form.tags : undefined
      };
      let saved;
      const numericPipelineId = (() => {
        if (selectedPipelineId == null) return undefined;
        const s = String(selectedPipelineId).trim();
        if (s === "") return undefined;
        const n = Number(s);
        return Number.isFinite(n) ? n : undefined;
      })();
      if (lead && lead.id) {
        const payloadWithPipeline = { ...payload, pipelineId: numericPipelineId };
        saved = await leadsSalesService.update(lead.id, payloadWithPipeline);
      } else {
        const payloadWithPipeline = { ...payload, pipelineId: numericPipelineId };
        saved = await leadsSalesService.create(payloadWithPipeline);
      }
      setLoading(false);
      if (onSave) onSave(saved);
      onClose();
    } catch (err) {
      setLoading(false);
      toastError(err);
    }
  };
  const isEdit = Boolean(lead?.id);
  const wizardFormProps = {
    classes,
    activeStep,
    setActiveStep,
    form,
    setForm,
    handleChange,
    handleAddressChange,
    phone,
    setPhone,
    email,
    setEmail,
    contacts,
    selectedContact,
    setSelectedContact,
    cartLines,
    setCartLines,
    addProductToCart,
    formatMoney,
    currency,
    setCurrency,
    inventoryItems,
    originChannel,
    setOriginChannel,
    pipelines,
    selectedPipelineId,
    setSelectedPipelineId,
    stageOptions,
    users,
    priority,
    setPriority,
    tagInput,
    setTagInput,
    activityOpen,
    setActivityOpen,
    activityDraft,
    setActivityDraft,
    NumberFormatCustom,
    cartTotal
  };

  const leadPanelProps = {
    ...wizardFormProps,
    lead,
    pipelineTimeLabel,
    productService,
    setProductService,
    NumberFormat
  };

  return (
    <LeadSaleSplitDrawer
      open={open}
      onClose={onClose}
      classes={classes}
      isEdit={isEdit}
      lead={lead}
      loading={loading}
      handleSubmit={handleSubmit}
      wizardProps={wizardFormProps}
      leadPanelProps={leadPanelProps}
      ticket={ticket}
      ticketLoading={ticketLoading}
      selectedContact={selectedContact}
      drawerOpen={drawerOpen}
      setDrawerOpen={setDrawerOpen}
      setActiveStep={setActiveStep}
      setForm={setForm}
      showTicketPreview={!hideTicketPreview}
    />
  );
}
