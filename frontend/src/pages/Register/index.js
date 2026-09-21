/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useMemo, useRef, useState, useContext } from "react";
import { useHistory } from "react-router-dom";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import {
  Box,
  Typography,
  TextField,
  Grid,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  FormControlLabel,
  makeStyles,
  IconButton,
  Paper,
  Button,
  Collapse,
  CircularProgress
} from "@material-ui/core";
import { toast } from "react-toastify";
import usePlans from "../../hooks/usePlans";
import { openApi } from "../../services/api";
import { i18n } from "../../translate/i18n";
import ColorModeContext from "../../layout/themeContext";
import { useTheme } from "@material-ui/core/styles";
import Brightness4Icon from "@material-ui/icons/Brightness4";
import Brightness7Icon from "@material-ui/icons/Brightness7";
import ArrowBackIosIcon from "@material-ui/icons/ArrowBackIos";
import ArrowForwardIosIcon from "@material-ui/icons/ArrowForwardIos";
import CheckIcon from "@material-ui/icons/Check";
import PlanosPreview from "../../PlanosPreview";
import { AuthContext } from "../../context/Auth/AuthContext";
import api from "../../services/api";
import { buildStripeCrmCheckoutUrl } from "../../utils/stripeCheckout";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";
import MinimalLanguageSelector from "../../components/MinimalLanguageSelector";
import logoVBWhite from "../../assets/olachat-logo-dark.png";
import { PREMIUM_FONT_FAMILY } from "../../constants/typography";

const CLICKUP_FONT = PREMIUM_FONT_FAMILY;

const useStyles = makeStyles(theme => {
  const isDark = theme.palette.type === "dark";
  const inputBg = isDark ? "rgba(255, 255, 255, 0.06)" : "#f5f5f7";
  const inputBgHover = isDark ? "rgba(255, 255, 255, 0.09)" : "#ebebed";
  const inputBgFocus = isDark ? "rgba(255, 255, 255, 0.11)" : "#e8e8ed";
  const labelColor = isDark ? "#abaeb3" : "#86868b";
  const textColor = isDark ? "#fafbfc" : "#1d1d1f";

  return {
  root: {
    minHeight: "100vh",
    height: "auto",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    background: isDark ? theme.palette.background.default : "#f5f5f7",
    padding: theme.spacing(4, 1.5, 5),
    fontFamily: CLICKUP_FONT,
    color: textColor,
    boxSizing: "border-box",
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(5, 1, 6),
      alignItems: "stretch"
    },
    [theme.breakpoints.down("xs")]: {
      padding: theme.spacing(4, 0.75, 7)
    }
  },
  rootPlans: {
    paddingBottom: theme.spacing(6)
  },
  formContent: {
    width: "100%",
    minHeight: 240,
    [theme.breakpoints.down("xs")]: {
      minHeight: 200
    }
  },
  formFieldsWrap: {
    width: "100%",
    maxWidth: 400,
    marginLeft: "auto",
    marginRight: "auto",
    paddingTop: theme.spacing(3),
    paddingBottom: theme.spacing(1),
    boxSizing: "border-box",
    [theme.breakpoints.down("sm")]: {
      paddingTop: theme.spacing(2.5),
      maxWidth: 380
    },
    [theme.breakpoints.down("xs")]: {
      paddingTop: theme.spacing(2),
      maxWidth: "100%"
    }
  },
  formFieldsWrapCentered: {
    paddingTop: theme.spacing(5),
    paddingBottom: theme.spacing(4),
    minHeight: "min(460px, 54vh)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    [theme.breakpoints.down("sm")]: {
      minHeight: "min(400px, 50vh)",
      paddingTop: theme.spacing(4)
    },
    [theme.breakpoints.down("xs")]: {
      minHeight: 0,
      paddingTop: theme.spacing(3),
      paddingBottom: theme.spacing(2)
    }
  },
  stepPanel: {
    width: "100%",
    animation: "$stepEnter 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards"
  },
  stepPanelInputs: {
    borderRadius: 16,
    animation: "$stepEnter 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards, $stepBlueGlow 1s ease-out"
  },
  "@keyframes stepEnter": {
    "0%": {
      opacity: 0,
      transform: "translateY(8px)"
    },
    "100%": {
      opacity: 1,
      transform: "translateY(0)"
    }
  },
  "@keyframes stepBlueGlow": {
    "0%": {
      backgroundColor: isDark ? "rgba(96, 165, 250, 0.1)" : "rgba(147, 197, 253, 0.22)"
    },
    "100%": {
      backgroundColor: "transparent"
    }
  },
  container: {
    width: "100%",
    maxWidth: 640,
    position: "relative",
    transition: "max-width 0.25s ease",
    padding: theme.spacing(0, 0.5),
    boxSizing: "border-box"
  },
  containerWide: {
    maxWidth: "68rem",
    padding: theme.spacing(0, 1),
    [theme.breakpoints.down("md")]: {
      maxWidth: "100%",
      padding: theme.spacing(0, 1)
    },
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(0, 0.5)
    }
  },
  contentWrap: {
    width: "100%",
    marginTop: 72,
    boxSizing: "border-box",
    [theme.breakpoints.down("sm")]: {
      marginTop: 80
    },
    [theme.breakpoints.down("xs")]: {
      marginTop: 96
    }
  },
  formShell: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(5),
    width: "100%",
    [theme.breakpoints.down("md")]: {
      gap: theme.spacing(4)
    },
    [theme.breakpoints.down("sm")]: {
      flexDirection: "column",
      alignItems: "stretch",
      gap: 0
    }
  },
  formMain: {
    flex: 1,
    minWidth: 0,
    width: "100%"
  },
  navSide: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    alignSelf: "center",
    [theme.breakpoints.down("sm")]: {
      display: "none"
    }
  },
  navSideBack: {
    paddingRight: theme.spacing(2),
    [theme.breakpoints.down("md")]: {
      paddingRight: theme.spacing(1.5)
    }
  },
  navSideForward: {
    paddingLeft: theme.spacing(3),
    marginLeft: theme.spacing(0.5),
    [theme.breakpoints.down("md")]: {
      paddingLeft: theme.spacing(2.5)
    }
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: theme.spacing(2),
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    padding: theme.spacing(1, 2),
    zIndex: 20,
    background: isDark ? "rgba(45, 45, 45, 0.94)" : "rgba(245, 245, 247, 0.92)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    [theme.breakpoints.down("xs")]: {
      flexWrap: "wrap",
      padding: theme.spacing(0.75, 1),
      gap: 4
    }
  },
  stepperWrap: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing(0, 1),
    marginTop: theme.spacing(1),
    minWidth: 0,
    [theme.breakpoints.down("xs")]: {
      order: 3,
      flexBasis: "100%",
      marginTop: 0,
      padding: theme.spacing(0, 0.5)
    }
  },
  stepperInner: {
    width: "100%",
    maxWidth: 560,
    overflowX: "auto",
    WebkitOverflowScrolling: "touch"
  },
  flowStepper: {
    position: "relative",
    width: "100%",
    padding: theme.spacing(0.5, 0, 1)
  },
  flowTrack: {
    position: "absolute",
    top: 14,
    left: "12%",
    right: "12%",
    height: 3,
    borderRadius: 999,
    background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
    overflow: "hidden",
    [theme.breakpoints.down("xs")]: {
      left: "8%",
      right: "8%",
      top: 12
    }
  },
  flowProgress: {
    height: "100%",
    borderRadius: 999,
    background: "linear-gradient(90deg, #1e3a8a, #1e40af)",
    transition: "width 0.75s cubic-bezier(0.25, 0.1, 0.25, 1)",
    boxShadow: isDark
      ? "0 0 8px rgba(30, 58, 138, 0.35)"
      : "0 0 6px rgba(30, 64, 175, 0.2)"
  },
  flowSteps: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    position: "relative",
    zIndex: 1,
    gap: 4
  },
  flowStep: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    minWidth: 0,
    textAlign: "center"
  },
  flowDot: {
    width: 26,
    height: 26,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    fontWeight: 500,
    fontFamily: CLICKUP_FONT,
    background: isDark ? "rgba(255,255,255,0.08)" : "#e8e9eb",
    color: isDark ? "rgba(255,255,255,0.45)" : "#9ca3af",
    border: isDark ? "2px solid rgba(255,255,255,0.12)" : "2px solid #e5e7eb",
    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
    [theme.breakpoints.down("xs")]: {
      width: 24,
      height: 24,
      fontSize: 10
    }
  },
  flowDotDone: {
    background: "#1e3a8a",
    color: "#fff",
    borderColor: "#1e3a8a"
  },
  flowDotActive: {
    background: "#1e40af",
    color: "#fff",
    borderColor: "#1e40af",
    boxShadow: isDark
      ? "0 0 0 3px rgba(30, 58, 138, 0.35)"
      : "0 0 0 3px rgba(30, 64, 175, 0.18)",
    animation: "$flowDotPulse 2.5s ease-in-out infinite"
  },
  "@keyframes flowDotPulse": {
    "0%, 100%": { transform: "scale(1)" },
    "50%": { transform: "scale(1.04)" }
  },
  flowLabel: {
    marginTop: 6,
    fontSize: 9,
    fontWeight: 400,
    fontFamily: CLICKUP_FONT,
    letterSpacing: "-0.01em",
    color: isDark ? "rgba(255,255,255,0.4)" : "#9ca3af",
    lineHeight: 1.2,
    transition: "color 0.35s ease",
    [theme.breakpoints.down("sm")]: {
      fontSize: 8
    },
    [theme.breakpoints.down("xs")]: {
      display: "none"
    }
  },
  flowLabelActive: {
    color: isDark ? "#8ba4cf" : "#1e3a8a",
    fontWeight: 400
  },
  flowLabelDone: {
    color: isDark ? "rgba(255,255,255,0.55)" : "#64748b",
    fontWeight: 400
  },
  topBarActions: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginRight: theme.spacing(1.5),
    [theme.breakpoints.down("xs")]: {
      marginRight: 0
    }
  },
  themeToggle: {
    width: 32,
    height: 32,
    borderRadius: 999,
    border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(0, 0, 0, 0.08)",
    background: isDark ? "rgba(58, 58, 58, 0.9)" : "rgba(255, 255, 255, 0.72)",
    backdropFilter: "blur(16px)",
    boxShadow: isDark ? "0 4px 18px rgba(0, 0, 0, 0.25)" : "0 4px 18px rgba(15, 23, 42, 0.08)",
    color: isDark ? "#f5f5f7" : "inherit"
  },
  brand: {
    display: "flex",
    alignItems: "flex-start",
    gap: theme.spacing(1.5),
    paddingTop: 0,
    marginLeft: theme.spacing(2),
    marginRight: theme.spacing(2),
    [theme.breakpoints.down("xs")]: {
      marginLeft: theme.spacing(0.5),
      marginRight: theme.spacing(0.5)
    }
  },
  logo: {
    height: 52,
    width: "auto",
    marginRight: theme.spacing(1),
    filter: "none",
    objectFit: "contain",
    [theme.breakpoints.down("xs")]: {
      height: 40,
      marginRight: 0
    }
  },
  stepperClear: {
    background: "transparent !important",
    boxShadow: "none !important",
    padding: theme.spacing(0.5, 0),
    "& .MuiSvgIcon-root": {
      fontSize: "1rem"
    },
    "& .MuiStepLabel-label": {
      fontSize: 12,
      fontFamily: CLICKUP_FONT,
      color: isDark ? theme.palette.text.primary : textColor,
      [theme.breakpoints.down("sm")]: {
        fontSize: 10
      },
      [theme.breakpoints.down("xs")]: {
        display: "none"
      }
    },
    "& .MuiStepLabel-label.MuiStepLabel-alternativeLabel": {
      [theme.breakpoints.down("xs")]: {
        marginTop: 4
      }
    },
    "& .MuiStepIcon-root": {
      color: "#cbd5e1"
    },
    "& .MuiStepIcon-root.MuiStepIcon-active": {
      color: theme.palette.primary.main
    },
    "& .MuiStepIcon-root.MuiStepIcon-completed": {
      color: theme.palette.primary.dark
    },
    "& .MuiStepLabel-label.MuiStepLabel-active": {
      color: theme.palette.primary.main
    },
    "& .MuiStepConnector-root": {
      display: "none"
    }
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(2)
  },
  title: {
    fontWeight: 700,
    fontSize: 22
  },
  subtitle: {
    color: theme.palette.text.secondary
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 600,
    marginBottom: theme.spacing(2)
  },
  grayDivider: {
    backgroundColor: theme.palette.type === "light" ? "#e5e7eb" : theme.palette.divider,
    margin: theme.spacing(2, 0)
  },
  inputGroup: {
    border: "none",
    borderRadius: 12,
    padding: theme.spacing(0.5, 0),
    background: "transparent",
    boxShadow: "none",
    fontFamily: CLICKUP_FONT,
    "& .MuiGrid-item": {
      paddingTop: theme.spacing(1),
      paddingBottom: theme.spacing(0.5)
    },
    "& .MuiOutlinedInput-root": {
      background: inputBg,
      borderRadius: 10,
      minHeight: 36,
      fontSize: 15,
      fontFamily: CLICKUP_FONT,
      transition: "background-color 0.2s ease, box-shadow 0.2s ease",
      "& fieldset": {
        border: "none"
      },
      "&:hover": {
        background: inputBgHover
      },
      "&.Mui-focused": {
        background: inputBgFocus,
        boxShadow: isDark
          ? "0 0 0 3px rgba(255, 255, 255, 0.08)"
          : "0 0 0 3px rgba(0, 0, 0, 0.04)",
        outline: "none"
      },
      "&.Mui-focused fieldset": {
        border: "none"
      }
    },
    "& .MuiOutlinedInput-notchedOutline": {
      border: "none !important"
    },
    "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
      border: "none !important"
    },
    "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
      border: "none !important"
    },
    "& .MuiSelect-select.MuiSelect-outlined": {
      paddingTop: 8,
      paddingBottom: 8,
      paddingLeft: 14,
      paddingRight: 32,
      fontSize: 15,
      fontWeight: 400,
      lineHeight: 1.35,
      letterSpacing: "-0.022em"
    },
    "& .MuiFormLabel-root": {
      color: labelColor,
      fontFamily: CLICKUP_FONT,
      fontSize: 13,
      fontWeight: 500,
      letterSpacing: "-0.022em",
      marginBottom: 7,
      lineHeight: 1.25
    },
    "& .MuiInputLabel-root": {
      color: labelColor,
      fontSize: 12,
      fontWeight: 500,
      letterSpacing: "-0.01em"
    },
    "& .MuiInputLabel-root.Mui-focused": {
      color: labelColor
    },
    "& .MuiInputLabel-root.MuiInputLabel-shrink": {
      transform: "translate(12px, -6px) scale(0.85)"
    },
    "& .MuiInputBase-input": {
      color: textColor,
      fontFamily: CLICKUP_FONT,
      fontSize: 15,
      fontWeight: 400,
      letterSpacing: "-0.022em",
      padding: "8px 14px"
    },
    "& .MuiOutlinedInput-inputMarginDense": {
      paddingTop: 8,
      paddingBottom: 8
    },
    "& .MuiSelect-icon": {
      color: labelColor,
      right: 8
    },
    "& .MuiCheckbox-root": {
      color: labelColor,
      padding: 6
    },
    "& .MuiFormControlLabel-label": {
      fontFamily: CLICKUP_FONT,
      fontSize: 13,
      fontWeight: 400,
      color: textColor,
      letterSpacing: "-0.01em"
    },
    "& .MuiFormHelperText-root": {
      fontFamily: CLICKUP_FONT,
      fontSize: 11,
      marginTop: 4
    }
  },
  fieldLabel: {
    display: "block",
    color: labelColor,
    fontFamily: CLICKUP_FONT,
    fontSize: 13,
    fontWeight: 500,
    letterSpacing: "-0.022em",
    marginBottom: 7,
    lineHeight: 1.25
  },
  menuPaper: {
    borderRadius: 12,
    boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.45)" : "0 8px 24px rgba(0,0,0,0.12)",
    background: isDark ? theme.palette.background.paper : "#fff"
  },
  selectPlaceholder: {
    color: isDark ? theme.palette.text.secondary : "#9ca3af"
  },
  actionBar: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: theme.spacing(1)
  },
  navDock: {
    display: "none",
    [theme.breakpoints.down("sm")]: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: theme.spacing(4),
      padding: theme.spacing(2, 3, 2.5),
      paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)",
      gap: theme.spacing(2),
      position: "sticky",
      bottom: 0,
      zIndex: 12,
      background: isDark ? "rgba(45, 45, 45, 0.96)" : "rgba(245, 245, 247, 0.96)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      borderTop: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
      marginLeft: theme.spacing(-0.5),
      marginRight: theme.spacing(-0.5),
      width: "calc(100% + 8px)"
    },
    [theme.breakpoints.down("xs")]: {
      marginTop: theme.spacing(3.5),
      paddingLeft: theme.spacing(2.5),
      paddingRight: theme.spacing(2.5)
    }
  },
  navDockBtn: {
    minWidth: 44,
    minHeight: 44
  },
  navButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    flexShrink: 0,
    transition: "background-color 0.15s ease, opacity 0.15s ease",
    [theme.breakpoints.down("sm")]: {
      width: 44,
      height: 44,
      borderRadius: 10
    }
  },
  navButtonEnabled: {
    background: isDark ? "rgba(255, 255, 255, 0.08)" : "#e8e9eb",
    color: isDark ? "#fafbfc" : "#292d34",
    border: "none",
    "&:hover": {
      background: isDark ? "rgba(255, 255, 255, 0.12)" : "#dfe0e2"
    }
  },
  navButtonDisabled: {
    background: isDark ? "rgba(255, 255, 255, 0.03)" : "#f0f1f3",
    color: isDark ? "rgba(255,255,255,0.22)" : "rgba(41,45,52,0.28)",
    border: "none"
  },
  navButtonPaymentWait: {
    opacity: 0.32,
    background: isDark ? "rgba(255, 255, 255, 0.04)" : "#f0f1f3",
    color: isDark ? "rgba(255,255,255,0.18)" : "rgba(41,45,52,0.2)",
    border: "none",
    cursor: "not-allowed",
    "&:hover": {
      background: isDark ? "rgba(255, 255, 255, 0.04)" : "#f0f1f3"
    }
  },
  plansWrap: {
    width: "100%",
    overflow: "visible"
  },
  plansSection: {
    width: "100%",
    marginLeft: "auto",
    marginRight: "auto",
    "& .vb-pricing--register-embed": {
      width: "100%"
    }
  },
  paymentSection: {
    width: "100%",
    paddingLeft: 8,
    paddingRight: 8,
    boxSizing: "border-box",
    [theme.breakpoints.down("xs")]: {
      paddingLeft: 4,
      paddingRight: 4
    }
  },
  paymentCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 12,
    padding: theme.spacing(3, 2.5),
    background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
    border: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(0,0,0,0.06)",
    boxShadow: isDark ? "none" : "0 1px 2px rgba(0,0,0,0.04)",
    [theme.breakpoints.down("xs")]: {
      padding: theme.spacing(2.5, 2),
      borderRadius: 10
    }
  },
  paymentEmailLine: {
    fontSize: 12,
    fontWeight: 400,
    fontFamily: CLICKUP_FONT,
    letterSpacing: "-0.01em",
    color: labelColor,
    textAlign: "center",
    marginBottom: theme.spacing(2),
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  paymentActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: theme.spacing(2.5),
    paddingTop: theme.spacing(2),
    borderTop: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.05)"
  },
  paymentActionLink: {
    fontSize: 12,
    fontWeight: 400,
    fontFamily: CLICKUP_FONT,
    letterSpacing: "-0.01em",
    color: labelColor,
    textTransform: "none",
    minWidth: 0,
    padding: "3px 8px",
    borderRadius: 6,
    lineHeight: 1.3,
    "&:hover": {
      color: isDark ? "#fafbfc" : textColor,
      background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)"
    }
  },
  paymentActionLinkActive: {
    color: `${textColor} !important`
  },
  paymentActionSep: {
    fontSize: 10,
    color: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.12)",
    userSelect: "none",
    lineHeight: 1
  },
  paymentEmailRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: theme.spacing(1.5)
  },
  paymentEmailField: {
    flex: 1,
    margin: 0,
    "& .MuiOutlinedInput-root": {
      borderRadius: 8,
      fontSize: 13,
      fontFamily: CLICKUP_FONT,
      background: inputBg,
      "& fieldset": { border: "none" },
      "&:hover": { background: inputBgHover },
      "&.Mui-focused": { background: inputBgFocus }
    },
    "& .MuiOutlinedInput-input": {
      padding: "8px 12px",
      letterSpacing: "-0.01em"
    }
  },
  paymentConfirmBtn: {
    minWidth: 34,
    width: 34,
    height: 34,
    borderRadius: 8,
    padding: 0,
    flexShrink: 0,
    color: isDark ? "#8ba4cf" : "#1e40af",
    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(30,64,175,0.06)",
    "&:hover": {
      background: isDark ? "rgba(255,255,255,0.09)" : "rgba(30,64,175,0.1)"
    },
    "&.Mui-disabled": { opacity: 0.35 }
  },
  paymentHint: {
    fontSize: 12,
    fontWeight: 400,
    fontFamily: CLICKUP_FONT,
    color: labelColor,
    textAlign: "center"
  },
  paymentWaiting: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: theme.spacing(1, 0, 0),
    animation: "$paymentFadeIn 0.45s ease forwards"
  },
  paymentPulse: {
    position: "relative",
    width: 52,
    height: 52,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  paymentPulseRing: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    border: `1.5px solid ${isDark ? "rgba(139,164,207,0.28)" : "rgba(30,64,175,0.16)"}`,
    animation: "$paymentRingPulse 2.4s ease-out infinite"
  },
  paymentPulseRing2: {
    position: "absolute",
    inset: 6,
    borderRadius: "50%",
    border: `1.5px solid ${isDark ? "rgba(139,164,207,0.14)" : "rgba(30,64,175,0.08)"}`,
    animation: "$paymentRingPulse 2.4s ease-out 0.7s infinite"
  },
  paymentPulseCore: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: isDark ? "#8ba4cf" : "#1e40af",
    animation: "$paymentCoreBreath 1.8s ease-in-out infinite"
  },
  paymentWaitingText: {
    marginTop: theme.spacing(1.5),
    fontSize: 12,
    fontWeight: 400,
    fontFamily: CLICKUP_FONT,
    letterSpacing: "-0.01em",
    color: labelColor
  },
  paymentWaitingDots: {
    display: "inline-flex",
    gap: 3,
    marginLeft: 2,
    "& > span": {
      width: 4,
      height: 4,
      borderRadius: "50%",
      background: labelColor,
      animation: "$paymentDotBounce 1.2s ease-in-out infinite",
      "&:nth-child(2)": { animationDelay: "0.15s" },
      "&:nth-child(3)": { animationDelay: "0.3s" }
    }
  },
  paymentSuccess: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: theme.spacing(4, 2),
    animation: "$paymentSuccessIn 0.65s cubic-bezier(0.22, 1, 0.36, 1) forwards"
  },
  paymentSuccessVisual: {
    position: "relative",
    width: 80,
    height: 80,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  paymentSuccessBurst: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    border: "2px solid rgba(52, 211, 153, 0.45)",
    animation: "$paymentBurst 0.9s ease-out forwards"
  },
  paymentSuccessCircle: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    background: "linear-gradient(160deg, #4ade80, #22c55e)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    boxShadow: "0 12px 28px rgba(34, 197, 94, 0.38)",
    animation: "$paymentCheckPop 0.55s cubic-bezier(0.34, 1.4, 0.64, 1) 0.08s both"
  },
  paymentSuccessCheck: {
    animation: "$paymentCheckDraw 0.35s ease 0.35s both"
  },
  paymentSuccessTitle: {
    marginTop: theme.spacing(2),
    fontWeight: 400,
    fontSize: 13,
    fontFamily: CLICKUP_FONT,
    letterSpacing: "-0.01em",
    color: isDark ? "#4ade80" : "#16a34a"
  },
  "@keyframes paymentFadeIn": {
    "0%": { opacity: 0, transform: "scale(0.98)" },
    "100%": { opacity: 1, transform: "scale(1)" }
  },
  "@keyframes paymentRingPulse": {
    "0%": { transform: "scale(0.92)", opacity: 0.7 },
    "70%": { transform: "scale(1.15)", opacity: 0 },
    "100%": { transform: "scale(1.15)", opacity: 0 }
  },
  "@keyframes paymentCoreBreath": {
    "0%, 100%": { transform: "scale(1)", opacity: 0.85 },
    "50%": { transform: "scale(1.2)", opacity: 1 }
  },
  "@keyframes paymentDotBounce": {
    "0%, 80%, 100%": { transform: "translateY(0)", opacity: 0.4 },
    "40%": { transform: "translateY(-3px)", opacity: 1 }
  },
  "@keyframes paymentSuccessIn": {
    "0%": { opacity: 0, transform: "scale(0.94)" },
    "100%": { opacity: 1, transform: "scale(1)" }
  },
  "@keyframes paymentCheckPop": {
    "0%": { transform: "scale(0)", opacity: 0 },
    "60%": { transform: "scale(1.08)" },
    "100%": { transform: "scale(1)", opacity: 1 }
  },
  "@keyframes paymentCheckDraw": {
    "0%": { transform: "scale(0.5)", opacity: 0 },
    "100%": { transform: "scale(1)", opacity: 1 }
  },
  "@keyframes paymentBurst": {
    "0%": { transform: "scale(0.85)", opacity: 0.8 },
    "100%": { transform: "scale(1.45)", opacity: 0 }
  }
};
});

const tKey = (key, fallback) => {
  const v = i18n.t(key);
  return v !== key ? v : fallback;
};

const niches = [
  "retail",
  "services",
  "education",
  "health",
  "realEstate",
  "technology",
  "other"
];

const foundOptions = [
  "google",
  "referral",
  "social",
  "marketplace",
  "other"
];

const needsOptions = [
  "whatsappSupport",
  "chatbotFlows",
  "campaigns",
  "reportsNps",
  "integrations",
  "leadManagement",
  "crmPipeline",
  "projectManagement",
  "kanbanTasks",
  "emailMarketing",
  "omnichannelCampaigns",
  "telephonyDialer",
  "formsCapture",
  "calendar",
  "advancedReportsBi",
  "taskAutomation",
  "erpEcommerceIntegrations",
  "aiAgents",
  "other"
];

const Schema = Yup.object().shape({
  email: Yup.string().email().required(),
  password: Yup.string().min(5).required(),
  phone: Yup.string().required(),
  planId: Yup.string().required(),
  acceptTerms: Yup.boolean().oneOf([true]).required()
});

const Register = () => {
  const classes = useStyles();
  const history = useHistory();
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
  const { handleLogin } = useContext(AuthContext) || {};
  const [lang, setLang] = useState(i18n.language);
  const { getPlanList } = usePlans();
  const [plans, setPlans] = useState([]);
  const [activeStep, setActiveStep] = useState(0);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState(null); // mensal|anual
  const [selectedTier, setSelectedTier] = useState(null); // starter|essencial|pro
  const [confirmToken, setConfirmToken] = useState(null);
  const [accessEmail, setAccessEmail] = useState("");
  const [accessPassword, setAccessPassword] = useState("");
  const [accessPassword2, setAccessPassword2] = useState("");
  const [accessBusy, setAccessBusy] = useState(false);
  const [accessErr, setAccessErr] = useState("");
  const [stripeCatalog, setStripeCatalog] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const checkoutOpenedRef = useRef(false);
  const paymentPollLockRef = useRef(false);

  useEffect(() => {
    const handler = lng => setLang(lng);
    i18n.on("languageChanged", handler);
    return () => i18n.off("languageChanged", handler);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("confirmToken");
    if (tokenFromUrl) {
      setConfirmToken(tokenFromUrl);
      setPaymentConfirmed(true);
      setActiveStep(3);
    }
  }, []);

  useEffect(() => {
    const bodyClass = "register-page-scroll";
    if (activeStep === 1) {
      document.body.classList.add(bodyClass);
      document.documentElement.classList.add(bodyClass);
    } else {
      document.body.classList.remove(bodyClass);
      document.documentElement.classList.remove(bodyClass);
    }
    return () => {
      document.body.classList.remove(bodyClass);
      document.documentElement.classList.remove(bodyClass);
    };
  }, [activeStep]);

  useEffect(() => {
    const fetchPlans = async () => {
      setLoadingPlans(true);
      try {
        const list = await getPlanList({ listPublic: "false" });
        setPlans(Array.isArray(list) ? list : []);
      } catch {
        setPlans([]);
      } finally {
        setLoadingPlans(false);
      }
    };
    fetchPlans();
  }, [getPlanList]);

  useEffect(() => {
    openApi
      .get("/public/stripe/plans?type=crm")
      .then(({ data }) => {
        if (data?.products) setStripeCatalog(data.products);
      })
      .catch(() => {});
  }, []);

  const resolveStripeUrlFromCatalog = (cycle, tier, email) => {
    const staticUrl = buildStripeCrmCheckoutUrl(cycle, tier, email);
    if (!stripeCatalog || !Array.isArray(stripeCatalog)) return staticUrl;
    const product = stripeCatalog.find(
      (p) => String(p.key || "").toLowerCase() === String(tier || "").toLowerCase()
    );
    if (!product?.prices?.length) return staticUrl;
    const normalizedCycle = String(cycle || "").toLowerCase() === "anual" ? "annual" : "monthly";
    const priceRow = product.prices.find(
      (row) =>
        String(row.interval || "").toLowerCase() === normalizedCycle &&
        String(row.currency || "").toLowerCase() === "brl"
    );
    const link = priceRow?.paymentLink;
    if (!link) return staticUrl;
    if (email && String(email).trim()) {
      const join = link.includes("?") ? "&" : "?";
      return `${link}${join}prefilled_email=${encodeURIComponent(String(email).trim())}`;
    }
    return link;
  };

  const steps = [
    tKey("register.steps.discovery", "Encontro e necessidades"),
    tKey("register.steps.plans", "Planos"),
    tKey("register.steps.payment", "Pagamento"),
    tKey("register.steps.access", "Acesso")
  ];

  const resolvePaymentLink = (cycle, tier, email) =>
    resolveStripeUrlFromCatalog(cycle, tier, email);

  const initialValues = useMemo(
    () => ({
      foundUs: [],
      needs: [],
      razaoSocial: "",
      companyName: "",
      document: "",
      hasCNPJ: true,
      cpf: "",
      personName: "",
      inscricaoEstadual: "",
      inscricaoMunicipal: "",
      niche: "",
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      uf: "",
      legalName: "",
      legalEmail: "",
      legalPhone: "",
      techName: "",
      techEmail: "",
      techPhone: "",
      publicAccountName: "",
      email: "",
      password: "",
      phone: "",
      planId: "",
      paymentMethod: "",
      cardNumber: "",
      cardName: "",
      cardExpiry: "",
      cardCvv: "",
      acceptTerms: false
    }),
    []
  );

  const handleCnpjCpf = async (value, isCnpj, setFieldValue) => {
    const digits = (value || "").replace(/\D/g, "");
    if (isCnpj) {
      if (digits.length !== 14) return;
      try {
        const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data) {
          setFieldValue("razaoSocial", data.razao_social || "");
          setFieldValue("companyName", data.nome_fantasia || data.razao_social || "");
          if (data.cep) setFieldValue("cep", data.cep);
          if (data.logradouro) setFieldValue("logradouro", data.logradouro);
          if (data.numero) setFieldValue("numero", String(data.numero));
          if (data.complemento) setFieldValue("complemento", data.complemento);
          if (data.bairro) setFieldValue("bairro", data.bairro);
          if (data.municipio) setFieldValue("cidade", data.municipio);
          if (data.uf) setFieldValue("uf", data.uf);
        }
      } catch {}
    } else {
      const valid = digits.length === 11;
      if (!valid) return;
      try {
        const customUrl = process.env.REACT_APP_CPF_LOOKUP_URL;
        if (customUrl) {
          const r = await fetch(`${customUrl}?cpf=${digits}`);
          if (r.ok) {
            const d = await r.json();
            const nome = d.nome || d.name || d.fullname || d.nome_completo;
            if (nome) setFieldValue("personName", nome);
          }
          return;
        }
        const token = process.env.REACT_APP_HUBDEV_TOKEN;
        if (token) {
          const r = await fetch(`https://ws.hubdodesenvolvedor.com.br/v2/cpf/?cpf=${digits}&token=${token}`);
          if (r.ok) {
            const d = await r.json();
            const nome = d?.result?.nome || d?.nome;
            if (nome) setFieldValue("personName", nome);
          }
        }
      } catch {}
    }
  };

  const next = () => setActiveStep(prev => Math.min(prev + 1, steps.length - 1));
  const prev = () => {
    setPaymentSuccess(false);
    setActiveStep(s => Math.max(s - 1, 0));
  };

  useEffect(() => {
    if (!paymentSuccess) return undefined;
    const timer = setTimeout(() => setActiveStep(3), 2200);
    return () => clearTimeout(timer);
  }, [paymentSuccess]);

  const onSubmit = async values => {
    const payload = {
      document: "",
      email: values.email,
      phone: values.phone || values.legalPhone,
      planId: values.planId,
      metadata: {
        razaoSocial: undefined,
        hasCNPJ: undefined,
        personName: undefined,
        niche: values.niche,
        foundUs: values.foundUs,
        needs: values.needs,
        address: {
          cep: values.cep,
          logradouro: values.logradouro,
          numero: values.numero,
          complemento: values.complemento,
          bairro: values.bairro,
          cidade: values.cidade,
          uf: values.uf
        },
        payment: {
          method: values.paymentMethod,
          card: values.paymentMethod === "card"
            ? {
                number: values.cardNumber,
                name: values.cardName,
                expiry: values.cardExpiry,
                cvv: values.cardCvv
              }
            : undefined
        },
        contacts: {
          legal: { name: values.legalName, email: values.legalEmail, phone: values.legalPhone },
          tech: { name: values.techName, email: values.techEmail, phone: values.techPhone }
        },
        publicAccountName: values.publicAccountName,
        acceptTerms: values.acceptTerms,
        acceptTimestamp: new Date().toISOString()
      }
    };
    try {
      await openApi.post("/auth/signup", payload);
      toast.success("Cadastro concluído");
      history.push("/login");
    } catch (e) {
      toast.error("Erro ao concluir cadastro");
    }
  };

  const Section1 = ({ values, setFieldValue }) => (
    <Box className={`${classes.formFieldsWrap} ${classes.formFieldsWrapCentered}`}>
      <Grid container spacing={2} className={classes.inputGroup}>
        <Grid item xs={12}>
          <InputLabel className={classes.fieldLabel}>{tKey("register.labels.niche", "Nicho de Atuação")}</InputLabel>
          <Select
            value={values.niche}
            onChange={e => setFieldValue("niche", e.target.value)}
            fullWidth
            variant="outlined"
            displayEmpty
            margin="dense"
          >
            <MenuItem value=""><em>{tKey("common.select", "Selecione")}</em></MenuItem>
            {niches.map(key => (
              <MenuItem key={key} value={key} style={{ fontSize: 14, paddingTop: 6, paddingBottom: 6 }}>
                {tKey(`register.options.niches.${key}`, key)}
              </MenuItem>
            ))}
          </Select>
        </Grid>
        <Grid item xs={12}>
          <InputLabel className={classes.fieldLabel}>{tKey("register.labels.foundUs", "Como nos encontrou")}</InputLabel>
          <Select
            multiple
            value={values.foundUs}
            onChange={e => setFieldValue("foundUs", e.target.value)}
            fullWidth
            variant="outlined"
            displayEmpty
            margin="dense"
            MenuProps={{
              PaperProps: { className: classes.menuPaper, style: { maxHeight: 280, width: 320 } },
              MenuListProps: { dense: true }
            }}
            renderValue={(selected) => {
              if (!selected || selected.length === 0) {
                return <span className={classes.selectPlaceholder}>{tKey("common.select", "Selecione")}</span>;
              }
              return selected.map(k => tKey(`register.options.foundUs.${k}`, k)).join(", ");
            }}
          >
            {foundOptions.map(key => (
              <MenuItem key={key} value={key} style={{ fontSize: 14, paddingTop: 6, paddingBottom: 6 }}>
                <Checkbox checked={values.foundUs.indexOf(key) > -1} />
                <ListItemText primary={tKey(`register.options.foundUs.${key}`, key)} />
              </MenuItem>
            ))}
          </Select>
        </Grid>
        <Grid item xs={12}>
          <InputLabel className={classes.fieldLabel}>{tKey("register.labels.needs", "Necessidade")}</InputLabel>
          <Select
            multiple
            value={values.needs}
            onChange={e => setFieldValue("needs", e.target.value)}
            fullWidth
            variant="outlined"
            displayEmpty
            margin="dense"
            MenuProps={{
              PaperProps: { className: classes.menuPaper, style: { maxHeight: 280, width: 320 } },
              MenuListProps: { dense: true }
            }}
            renderValue={(selected) => {
              if (!selected || selected.length === 0) {
                return <span className={classes.selectPlaceholder}>{tKey("common.select", "Selecione")}</span>;
              }
              return selected.map(k => tKey(`register.options.needs.${k}`, k)).join(", ");
            }}
          >
            {needsOptions.map(key => (
              <MenuItem key={key} value={key} style={{ fontSize: 14, paddingTop: 6, paddingBottom: 6 }}>
                <Checkbox checked={values.needs.indexOf(key) > -1} />
                <ListItemText primary={tKey(`register.options.needs.${key}`, key)} />
              </MenuItem>
            ))}
          </Select>
        </Grid>
      </Grid>
    </Box>
  );

  const SectionPlans = ({ values, touched, errors, setFieldValue }) => (
    <Box className={classes.plansWrap}>
      <Box className={classes.plansSection} style={{ position: "relative" }}>
      <Grid container spacing={1} className={classes.inputGroup}>
        <Grid item xs={12}>
          <PlanosPreview
            themeMode={theme.palette.type === "dark" ? "dark" : "light"}
            className="vb-pricing--register-embed"
            toggleSize="register"
            stripeProducts={stripeCatalog}
            onChoose={(cycle, tier) => {
              setSelectedCycle(cycle);
              setSelectedTier(tier);
              setPaymentConfirmed(false);
              setPaymentSuccess(false);
              paymentPollLockRef.current = false;
              checkoutOpenedRef.current = false;
              const match = plans.find(
                (p) => String(p.name || "").toLowerCase() === String(tier || "").toLowerCase()
              );
              if (match?.id) {
                setFieldValue("planId", String(match.id));
              } else if (tier) {
                setFieldValue("planId", String(tier));
              }
              setActiveStep(2);
            }}
          />
        </Grid>
        <Grid item xs={12} style={{ display: "none" }}>
          <InputLabel>Plano</InputLabel>
          <Field as={Select} name="planId" fullWidth variant="outlined" error={touched.planId && Boolean(errors.planId)}>
            {plans.map(p => (
              <MenuItem key={p.id} value={p.id}>
                {p.name} • Atendentes {p.users} • WhatsApp {p.connections} • Filas {p.queues} • R$ {p.amount}
              </MenuItem>
            ))}
          </Field>
        </Grid>
      </Grid>
      </Box>
    </Box>
  );

  const Section5 = ({ touched, errors, values }) => {
    useEffect(() => {
      let mounted = true;
      const run = async () => {
        if (!confirmToken) return;
        try {
          const r = await openApi.get(`/auth/confirm/${confirmToken}`);
          if (mounted && r?.data?.email) {
            setAccessEmail(r.data.email);
          }
        } catch {}
      };
      run();
      return () => {
        mounted = false;
      };
    }, [confirmToken]);
    const [valid, setValid] = React.useState(false);
    const [mismatch, setMismatch] = React.useState(false);
    const passRef = React.useRef(null);
    const confirmRef = React.useRef(null);
    const recompute = React.useCallback(() => {
      const p = passRef.current?.value || "";
      const c = confirmRef.current?.value || "";
      const okLen = p.length >= 6;
      const okMix = /[A-Za-z]/.test(p) && /[0-9]/.test(p);
      const okMatch = c.length > 0 && p === c;
      setMismatch(c.length > 0 && p !== c);
      setValid(okLen && okMix && okMatch);
    }, []);
    if (confirmToken) {
      return (
        <Box p={2} display="flex" justifyContent="center">
          <Box style={{ width: "100%", maxWidth: 520 }}>
            <Box className={classes.inputGroup}>
              <InputLabel className={classes.fieldLabel}>{tKey("register.labels.loginEmail", "E-mail de acesso")}</InputLabel>
              <TextField
                value={accessEmail || values.email}
                variant="outlined"
                fullWidth
                size="small"
                margin="dense"
                disabled
              />
            </Box>
            <Box className={classes.inputGroup}>
              <InputLabel className={classes.fieldLabel}>{tKey("register.labels.password", "Senha")}</InputLabel>
              <TextField
                type="password"
                inputRef={passRef}
                onChange={recompute}
                onInput={recompute}
                variant="outlined"
                fullWidth
                size="small"
                margin="dense"
                autoComplete="new-password"
                inputProps={{ autoCapitalize: "none", autoCorrect: "off", spellCheck: false }}
              />
            </Box>
            <Box className={classes.inputGroup}>
              <InputLabel className={classes.fieldLabel}>Confirmar senha</InputLabel>
              <TextField
                type="password"
                inputRef={confirmRef}
                onChange={recompute}
                onInput={recompute}
                variant="outlined"
                fullWidth
                size="small"
                margin="dense"
                autoComplete="new-password"
                inputProps={{ autoCapitalize: "none", autoCorrect: "off", spellCheck: false }}
                error={mismatch}
                helperText={mismatch ? "As senhas não coincidem" : ""}
              />
            </Box>
            <Typography variant="caption" color="textSecondary">
              A senha deve ter no mínimo 6 caracteres, contendo letras e números.
            </Typography>
            <Box mt={1} display="flex" justifyContent="center">
              <Button
                color="primary"
                variant="contained"
                disabled={accessBusy || !valid}
                onClick={async () => {
                  const p = passRef.current?.value || "";
                  const nameValue = values.legalName || values.companyName || (accessEmail || values.email || "").split("@")[0];
                  setAccessBusy(true);
                  setAccessErr("");
                  try {
                    await openApi.post(`/auth/confirm/${confirmToken}`, {
                      name: nameValue,
                      password: p
                    });
                    try {
                      // encerra qualquer sessão anterior
                      localStorage.removeItem("token");
                      await api.delete("/auth/logout");
                    } catch {}
                    if (handleLogin) {
                      await handleLogin({ email: accessEmail || values.email, password: p });
                    } else {
                      window.location.assign("/login");
                    }
                  } catch (e) {
                    setAccessErr("Falha ao criar acesso");
                  }
                  setAccessBusy(false);
                }}
              >
                Salvar e continuar
              </Button>
              {accessErr ? (
                <Typography variant="caption" color="error" style={{ marginLeft: 8 }}>
                  {accessErr}
                </Typography>
              ) : null}
            </Box>
          </Box>
        </Box>
      );
    }
    return (
      <Box className={`${classes.formFieldsWrap} ${classes.formFieldsWrapCentered}`}>
        <Grid container spacing={2} className={classes.inputGroup}>
          <Grid item xs={12}>
            <InputLabel className={classes.fieldLabel}>{tKey("register.labels.loginEmail", "E-mail de acesso")}</InputLabel>
            <Field as={TextField} name="email" variant="outlined" fullWidth size="small" margin="dense" error={touched.email && Boolean(errors.email)} helperText={touched.email && errors.email} />
          </Grid>
          <Grid item xs={12}>
            <InputLabel className={classes.fieldLabel}>{tKey("register.labels.password", "Senha")}</InputLabel>
            <Field as={TextField} name="password" type="password" variant="outlined" fullWidth size="small" margin="dense" error={touched.password && Boolean(errors.password)} helperText={touched.password && errors.password} />
          </Grid>
          <Grid item xs={12}>
            <InputLabel className={classes.fieldLabel}>{tKey("register.labels.whatsapp", "Telefone (WhatsApp)")}</InputLabel>
            <Field as={TextField} name="phone" variant="outlined" fullWidth size="small" margin="dense" />
          </Grid>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Field as={Checkbox} name="acceptTerms" color="primary" />
              }
              label={tKey("register.labels.terms", "Li e aceito os Termos e a Política de Privacidade")}
            />
            {touched.acceptTerms && errors.acceptTerms && (
              <Typography color="error" variant="caption">{errors.acceptTerms}</Typography>
            )}
          </Grid>
        </Grid>
      </Box>
    );
  };

  const pollPaymentConfirmation = async (email) => {
    if (paymentPollLockRef.current || paymentConfirmed) return true;
    const normalized = String(email || "").trim();
    if (!normalized) return false;
    try {
      const r = await openApi.get("/auth/confirm/by-email", { params: { email: normalized } });
      if (r?.data?.token) {
        paymentPollLockRef.current = true;
        setConfirmToken(r.data.token);
        setPaymentConfirmed(true);
        setPaymentSuccess(true);
        setPaymentStatus("");
        return true;
      }
    } catch {}
    return false;
  };

  const SectionPayment = ({ values }) => {
    const payEmail = values?.email || values?.legalEmail || "";
    const emailValid = Yup.string().email().isValidSync(payEmail || "");
    const [checkoutUrl, setCheckoutUrl] = useState(null);
    const [emailMode, setEmailMode] = useState(false);
    const [manualEmail, setManualEmail] = useState("");
    const [manualBusy, setManualBusy] = useState(false);

    useEffect(() => {
      if (emailValid && !manualEmail) setManualEmail(payEmail);
    }, [payEmail, emailValid, manualEmail]);

    useEffect(() => {
      let cancelled = false;
      const loadUrl = async () => {
        if (!emailValid || !selectedTier) {
          setCheckoutUrl(null);
          return;
        }
        const url = resolvePaymentLink(selectedCycle, selectedTier, payEmail);
        if (!cancelled) setCheckoutUrl(url);
      };
      loadUrl();
      return () => {
        cancelled = true;
      };
    }, [payEmail, emailValid, selectedCycle, selectedTier]);

    useEffect(() => {
      if (!checkoutUrl || !emailValid || checkoutOpenedRef.current) return;
      checkoutOpenedRef.current = true;
      setPaymentStatus("opening");
      window.open(checkoutUrl, "_blank", "noopener,noreferrer");
    }, [checkoutUrl, emailValid]);

    useEffect(() => {
      if (!emailValid || !selectedTier || paymentConfirmed) return undefined;
      setPaymentStatus("waiting");
      let cancelled = false;
      const tick = async () => {
        if (cancelled || paymentConfirmed) return;
        const ok = await pollPaymentConfirmation(payEmail);
        if (ok) cancelled = true;
      };
      tick();
      const timer = setInterval(tick, 2000);
      const onResume = () => {
        if (!document.hidden) tick();
      };
      window.addEventListener("focus", tick);
      document.addEventListener("visibilitychange", onResume);
      return () => {
        cancelled = true;
        clearInterval(timer);
        window.removeEventListener("focus", tick);
        document.removeEventListener("visibilitychange", onResume);
      };
    }, [payEmail, emailValid, selectedTier, paymentConfirmed]);

    const handleManualConfirm = async () => {
      const normalized = String(manualEmail || payEmail).trim();
      if (!normalized || manualBusy || paymentConfirmed) return;
      setManualBusy(true);
      await pollPaymentConfirmation(normalized);
      setManualBusy(false);
    };

    return (
      <Box
        className={`${classes.paymentSection} ${classes.formFieldsWrap}`}
        display="flex"
        alignItems="center"
        justifyContent="center"
        style={{ minHeight: 360 }}
      >
        <Paper elevation={0} className={classes.paymentCard}>
          {selectedTier ? (
            paymentSuccess ? (
              <Box className={classes.paymentSuccess}>
                <Box className={classes.paymentSuccessVisual}>
                  <Box className={classes.paymentSuccessBurst} aria-hidden />
                  <Box className={classes.paymentSuccessCircle}>
                    <CheckIcon className={classes.paymentSuccessCheck} style={{ fontSize: 40 }} />
                  </Box>
                </Box>
                <Typography className={classes.paymentSuccessTitle}>Confirmado</Typography>
              </Box>
            ) : (
              <>
                {!emailValid && (
                  <Box className={classes.inputGroup}>
                    <InputLabel className={classes.fieldLabel}>{tKey("register.labels.email", "E-mail")}</InputLabel>
                    <Field
                      as={TextField}
                      name="email"
                      variant="outlined"
                      fullWidth
                      size="small"
                      margin="dense"
                      placeholder="seu@email.com"
                    />
                  </Box>
                )}
                {emailValid && checkoutUrl && (
                  <>
                    <Typography className={classes.paymentEmailLine} title={payEmail}>
                      {payEmail}
                    </Typography>
                    {(paymentStatus === "opening" || paymentStatus === "waiting") && (
                      <Box className={classes.paymentWaiting}>
                        <Box className={classes.paymentPulse}>
                          <Box className={classes.paymentPulseRing} aria-hidden />
                          <Box className={classes.paymentPulseRing2} aria-hidden />
                          <Box className={classes.paymentPulseCore} aria-hidden />
                        </Box>
                        <Typography className={classes.paymentWaitingText}>
                          {paymentStatus === "opening" ? "Abrindo" : "Aguardando"}
                        </Typography>
                      </Box>
                    )}
                    <Box className={classes.paymentActions}>
                      <Button
                        component="a"
                        href={checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={classes.paymentActionLink}
                        endIcon={<OpenInNewIcon style={{ fontSize: 12, opacity: 0.7 }} />}
                      >
                        Stripe
                      </Button>
                      <Typography component="span" className={classes.paymentActionSep} aria-hidden>
                        ·
                      </Typography>
                      <Button
                        className={`${classes.paymentActionLink}${emailMode ? ` ${classes.paymentActionLinkActive}` : ""}`}
                        onClick={() => setEmailMode(v => !v)}
                      >
                        E-mail
                      </Button>
                    </Box>
                    <Collapse in={emailMode} unmountOnExit>
                      <Box className={classes.paymentEmailRow}>
                        <TextField
                          value={manualEmail}
                          onChange={e => setManualEmail(e.target.value)}
                          variant="outlined"
                          size="small"
                          margin="dense"
                          type="email"
                          placeholder="e-mail do pagamento"
                          className={classes.paymentEmailField}
                          inputProps={{ autoCapitalize: "none", autoCorrect: "off", spellCheck: false }}
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleManualConfirm();
                            }
                          }}
                        />
                        <IconButton
                          className={classes.paymentConfirmBtn}
                          disabled={!manualEmail?.trim() || manualBusy}
                          onClick={handleManualConfirm}
                          aria-label="Confirmar por e-mail"
                        >
                          {manualBusy ? (
                            <CircularProgress size={16} thickness={5} />
                          ) : (
                            <CheckIcon style={{ fontSize: 18 }} />
                          )}
                        </IconButton>
                      </Box>
                    </Collapse>
                  </>
                )}
              </>
            )
          ) : (
            <Box py={3} textAlign="center">
              <Typography className={classes.paymentHint}>Selecione um plano</Typography>
            </Box>
          )}
        </Paper>
      </Box>
    );
  };

  const canGoNext = (step, values) => {
    switch (step) {
      case 0:
        return (
          (values.niche && values.niche !== "") ||
          (values.foundUs && values.foundUs.length > 0) ||
          (values.needs && values.needs.length > 0)
        );
      case 1:
        return !!selectedTier || !!values.planId;
      case 2:
        return paymentConfirmed;
      case 3:
        return (
          Yup.string().email().isValidSync(values.email || "") &&
          values.password &&
          values.phone &&
          values.acceptTerms
        );
      default:
        return false;
    }
  };

  const isDark = theme.palette.type === "dark";
  const logoSrc = isDark ? logoVBWhite : theme.calculatedLogoLight();

  const navBtnClass = (enabled) =>
    `${classes.navButton} ${enabled ? classes.navButtonEnabled : classes.navButtonDisabled}`;

  const flowProgressPct = steps.length > 1 ? (activeStep / (steps.length - 1)) * 100 : 0;

  const FlowStepper = () => (
    <Box className={classes.flowStepper} aria-label="Progresso do cadastro">
      <Box className={classes.flowTrack} aria-hidden>
        <Box className={classes.flowProgress} style={{ width: `${flowProgressPct}%` }} />
      </Box>
      <Box className={classes.flowSteps}>
        {steps.map((label, index) => {
          const done = index < activeStep;
          const current = index === activeStep;
          return (
            <Box key={label} className={classes.flowStep}>
              <Box
                className={`${classes.flowDot}${
                  done ? ` ${classes.flowDotDone}` : current ? ` ${classes.flowDotActive}` : ""
                }`}
              >
                {done ? "✓" : index + 1}
              </Box>
              <Typography
                className={`${classes.flowLabel}${
                  done ? ` ${classes.flowLabelDone}` : current ? ` ${classes.flowLabelActive}` : ""
                }`}
              >
                {label}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );

  return (
    <Box className={`${classes.root}${activeStep === 1 ? ` ${classes.rootPlans}` : ""}`}>
      <div className={`${classes.container}${activeStep === 1 ? ` ${classes.containerWide}` : ""}`}>
        <Box className={classes.topBar}>
          <div className={classes.brand}>
            <img
              className={classes.logo}
              alt="VB Solution"
              src={logoSrc}
            />
          </div>
          <div className={classes.stepperWrap}>
            <div className={classes.stepperInner}>
              <FlowStepper />
            </div>
          </div>
          <div className={classes.topBarActions}>
            <MinimalLanguageSelector variant={isDark ? "dark" : "light"} inline />
            <IconButton
              className={classes.themeToggle}
              size="small"
              onClick={() => colorMode?.toggleColorMode?.()}
            >
              {theme.mode === "light" ? <Brightness4Icon fontSize="small" /> : <Brightness7Icon fontSize="small" />}
            </IconButton>
          </div>
        </Box>
        <Box className={classes.contentWrap}>
          <Formik
            initialValues={initialValues}
            validationSchema={Schema}
            onSubmit={onSubmit}
          >
            {({ values, touched, errors, isSubmitting, setFieldValue }) => {
              const canNext = canGoNext(activeStep, values);
              const forwardEnabled = activeStep === 2 ? paymentConfirmed : canNext;
              const forwardWaiting = activeStep === 2 && !paymentConfirmed;
              const backBtn = (
                <IconButton
                  className={`${navBtnClass(activeStep > 0)} ${classes.navDockBtn}`}
                  onClick={prev}
                  disabled={activeStep === 0}
                  size="small"
                  aria-label="Voltar"
                >
                  <ArrowBackIosIcon style={{ fontSize: 14, marginLeft: 3 }} />
                </IconButton>
              );
              const nextBtn =
                activeStep < steps.length - 1 ? (
                  <IconButton
                    className={`${classes.navButton} ${forwardWaiting ? classes.navButtonPaymentWait : navBtnClass(forwardEnabled)} ${classes.navDockBtn}`}
                    onClick={() => forwardEnabled && next()}
                    disabled={!forwardEnabled}
                    size="small"
                    aria-label={forwardWaiting ? "Aguardando confirmação do pagamento" : "Avançar"}
                  >
                    <ArrowForwardIosIcon style={{ fontSize: 14 }} />
                  </IconButton>
                ) : (
                  <IconButton
                    className={`${navBtnClass(canNext && !isSubmitting)} ${classes.navDockBtn}`}
                    type="submit"
                    disabled={!canNext || isSubmitting}
                    size="small"
                    aria-label="Concluir"
                  >
                    <ArrowForwardIosIcon style={{ fontSize: 14 }} />
                  </IconButton>
                );

              return (
              <Form>
                <Box className={classes.formShell}>
                  <Box className={`${classes.navSide} ${classes.navSideBack}`}>{backBtn}</Box>
                  <Box className={classes.formMain}>
                    <Box
                      key={activeStep}
                      className={`${classes.formContent} ${classes.stepPanel}${
                        activeStep === 0 || activeStep === 3 ? ` ${classes.stepPanelInputs}` : ""
                      }`}
                    >
                      {activeStep === 0 && <Section1 values={values} setFieldValue={setFieldValue} />}
                      {activeStep === 1 && (
                        <SectionPlans
                          values={values}
                          touched={touched}
                          errors={errors}
                          setFieldValue={setFieldValue}
                        />
                      )}
                      {activeStep === 2 && <SectionPayment values={values} setFieldValue={setFieldValue} />}
                      {activeStep === 3 && <Section5 touched={touched} errors={errors} values={values} />}
                    </Box>
                    <Box className={classes.navDock}>
                      {backBtn}
                      {nextBtn}
                    </Box>
                  </Box>
                  <Box className={`${classes.navSide} ${classes.navSideForward}`}>{nextBtn}</Box>
                </Box>
              </Form>
              );
            }}
          </Formik>
        </Box>
      </div>
    </Box>
  );
};

export default Register;
