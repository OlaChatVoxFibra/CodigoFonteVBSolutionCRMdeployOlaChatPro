/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useEffect, useState, useContext, useRef, useMemo } from "react";

import Grid from "@material-ui/core/Grid";
import FormControl from "@material-ui/core/FormControl";
import TextField from "@material-ui/core/TextField";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import useSettings from "../../hooks/useSettings";
import { toast } from "react-toastify";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import { AuthContext } from "../../context/Auth/AuthContext";

import {
  Box,
  IconButton,
  InputAdornment,
  Button,
  FormControlLabel,
  Switch,
} from "@material-ui/core";

import { AttachFile, Delete } from "@material-ui/icons";
import ColorModeContext from "../../layout/themeContext";
import api from "../../services/api";
import { getBackendUrl } from "../../config";

import defaultLogoLight from "../../assets/olachat-logo-light.png";
import defaultLogoDark from "../../assets/olachat-logo-dark.png";
import defaultLogoFavicon from "../../assets/olachat-favicon.png";
import ColorBoxModal from "../ColorBoxModal/index.js";
import Checkbox from "@material-ui/core/Checkbox";
import { i18n } from "../../translate/i18n";
import {
  getContrastTextForBackground,
  hexToRgb,
  relativeLuminance,
} from "../../utils/colorContrast";
import {
  canAccessVisualIdentityUi,
  isPlatformWhitelabelIntroAccount,
  isTenantVisualIdentityCompany,
  isWhitelabelAppNameEditor,
} from "../../helpers/visualIdentityAccess";

const useStyles = makeStyles((theme) => ({
  container: {
    width: "100%",
    paddingTop: 0,
    paddingBottom: theme.spacing(4),
    boxSizing: "border-box",
    /** Aproxima um pouco da barra de abas e alinha levemente à esquerda (só Identidade Visual) */
    marginTop: theme.spacing(-0.5),
    marginLeft: theme.spacing(-0.75),
    [theme.breakpoints.down("sm")]: {
      marginLeft: theme.spacing(-0.5),
    },
  },
  pageHeader: {
    marginBottom: theme.spacing(1.5),
    paddingBottom: theme.spacing(1.5),
    borderBottom:
      theme.mode === "light"
        ? "1px solid rgba(15, 23, 42, 0.08)"
        : "1px solid rgba(255, 255, 255, 0.08)",
  },
  pageTitle: {
    fontWeight: 400,
    letterSpacing: "-0.02em",
    fontSize: "clamp(1.45rem, 2.2vw, 1.85rem)",
    lineHeight: 1.15,
    marginBottom: theme.spacing(0.75),
    color: theme.palette.text.primary,
  },
  pageSubtitle: {
    color: theme.palette.text.secondary,
    fontSize: "0.9375rem",
    fontWeight: 400,
    maxWidth: 520,
    lineHeight: 1.55,
    margin: 0,
  },
  sectionPaper: {
    padding: theme.spacing(3),
    "&:first-of-type": {
      paddingTop: theme.spacing(1),
    },
    marginBottom: 0,
    borderRadius: 0,
    backgroundColor: "transparent",
    border: "none",
    boxShadow: "none",
    backdropFilter: "none",
    WebkitBackdropFilter: "none",
    "&:not(:first-of-type)": {
      borderTop:
        theme.mode === "light"
          ? "1px solid rgba(15, 23, 42, 0.08)"
          : "1px solid rgba(255, 255, 255, 0.08)",
    },
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(2),
    },
  },
  sectionHeader: {
    marginBottom: theme.spacing(2),
    [theme.breakpoints.down("sm")]: {
      marginBottom: theme.spacing(1.5),
    },
  },
  sectionHeaderTight: {
    marginBottom: theme.spacing(1),
    [theme.breakpoints.down("sm")]: {
      marginBottom: theme.spacing(1),
    },
  },
  sectionTitle: {
    fontWeight: 400,
    color: theme.palette.text.primary,
    [theme.breakpoints.down("sm")]: {
      fontSize: "1.1rem",
    },
  },
  sectionSubtitle: {
    color: theme.palette.text.secondary,
    fontSize: "0.875rem",
    marginTop: theme.spacing(0.5),
    [theme.breakpoints.down("sm")]: {
      fontSize: "0.8rem",
    },
  },
  identityIntroSubtitle: {
    marginBottom: theme.spacing(2),
    display: "block",
  },
  formField: {
    marginBottom: theme.spacing(2),
    [theme.breakpoints.down("sm")]: {
      marginBottom: theme.spacing(1.5),
    },
  },
  colorAdorment: {
    width: 20,
    height: 20,
    borderRadius: 4,
    border:
      theme.palette.type === "dark"
        ? "1px solid rgba(255, 255, 255, 0.2)"
        : "1px solid #ddd",
  },
  uploadInput: {
    display: "none",
  },
  uploadField: {
    "& .MuiInputBase-input": {
      cursor: "pointer",
    },
  },
  previewContainer: {
    marginTop: theme.spacing(2),
    [theme.breakpoints.down("sm")]: {
      marginTop: theme.spacing(1),
    },
  },
  previewSidebar: {
    marginTop: 0,
    [theme.breakpoints.down("sm")]: {
      marginTop: theme.spacing(2),
    },
  },
  previewGrid: {
    [theme.breakpoints.down("sm")]: {
      justifyContent: "center",
    },
  },
  livePreview: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: theme.spacing(1.5),
    border: "none",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    boxShadow:
      theme.mode === "light"
        ? "0 8px 32px rgba(15, 23, 42, 0.1)"
        : "0 12px 40px rgba(0, 0, 0, 0.4)",
  },
  livePreviewTopbar: {
    width: "100%",
    minHeight: 36,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing(1),
    borderBottom:
      theme.palette.type === "dark"
        ? "1px solid rgba(255,255,255,0.08)"
        : "1px solid rgba(15, 23, 42, 0.08)",
  },
  livePreviewTabsRow: {
    width: "100%",
    flexShrink: 0,
    padding: theme.spacing(0.75, 1.25),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing(1),
    backgroundColor:
      theme.palette.type === "dark"
        ? theme.palette.chromeSurface || theme.palette.background.default
        : "#ffffff",
    borderBottom:
      theme.palette.type === "dark"
        ? "1px solid rgba(255,255,255,0.08)"
        : "1px solid rgba(15, 23, 42, 0.08)",
  },
  livePreviewSticky: {
    [theme.breakpoints.up("md")]: {
      position: "sticky",
      top: theme.spacing(2),
    },
  },
  livePreviewInner: {
    minHeight: 140,
    padding: theme.spacing(3),
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing(1.5),
  },
  livePreviewLogo: {
    maxWidth: 160,
    maxHeight: 56,
    objectFit: "contain",
  },
  paletteGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
    gap: theme.spacing(1),
    marginBottom: 0,
    width: "100%",
    maxWidth: "100%",
    [theme.breakpoints.down("md")]: {
      gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
    },
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    },
  },
  paletteSwatch: {
    width: 36,
    height: 36,
    borderRadius: 10,
    border:
      theme.palette.type === "dark"
        ? "1px solid rgba(255,255,255,0.12)"
        : "1px solid rgba(0,0,0,0.08)",
    cursor: "pointer",
    flexShrink: 0,
  },
  previewCard: {
    padding: theme.spacing(2),
    borderRadius: theme.spacing(1),
    border: "none",
    textAlign: "center",
    height: "120px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    boxShadow: "0 1px 0 rgba(15, 23, 42, 0.06)",
    [theme.breakpoints.down("sm")]: {
      height: "100px",
      padding: theme.spacing(1),
    },
  },
  previewCardLight: {
    backgroundColor: "#ffffff",
    borderColor: "#e0e0e0",
  },
  previewCardDark: {
    backgroundColor: "#424242",
    borderColor: "#666666",
  },
  previewCardFavicon: {
    backgroundColor:
      theme.palette.type === "dark"
        ? theme.palette.background.default
        : "#f5f5f5",
    borderColor:
      theme.palette.type === "dark"
        ? "rgba(255, 255, 255, 0.12)"
        : "#d0d0d0",
  },
  previewImage: {
    maxWidth: "100%",
    maxHeight: "80px",
    objectFit: "contain",
    [theme.breakpoints.down("sm")]: {
      maxHeight: "60px",
    },
  },
  previewBackgroundImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: theme.spacing(0.5),
  },
  previewLabel: {
    fontSize: "0.75rem",
    color: "#666",
    marginTop: theme.spacing(0.5),
    fontWeight: 500,
  },
  previewLabelDark: {
    color: "#ccc",
  },
  languageSection: {
    marginTop: theme.spacing(1),
  },
  languageGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1),
    [theme.breakpoints.down("sm")]: {
      gap: theme.spacing(0.5),
    },
  },
  languageItem: {
    display: "flex",
    alignItems: "center",
    backgroundColor:
      theme.palette.type === "dark"
        ? theme.palette.background.default
        : "#f5f5f5",
    borderRadius: theme.spacing(0.5),
    padding: theme.spacing(0.5, 1),
    minWidth: "120px",
    [theme.breakpoints.down("sm")]: {
      minWidth: "100px",
      padding: theme.spacing(0.5),
    },
  },
  languageCheckbox: {
    padding: theme.spacing(0.5),
  },
  languageLabel: {
    fontSize: "0.875rem",
    fontWeight: 500,
    [theme.breakpoints.down("sm")]: {
      fontSize: "0.8rem",
    },
  },
  paletteSuggestedLabel: {
    fontWeight: 400,
    marginBottom: 8,
    letterSpacing: "-0.02em",
  },
  colorSection: {
    marginTop: theme.spacing(2.5),
    [theme.breakpoints.down("sm")]: {
      "& .MuiGrid-item": {
        paddingBottom: theme.spacing(1),
      },
    },
  },
  paletteActionsRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: theme.spacing(1.5),
    marginTop: theme.spacing(2),
    width: "100%",
  },
  sectionFooterActions: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: theme.spacing(2),
    width: "100%",
  },
  /** Abaixo do último upload da coluna esquerda (fundos) */
  /** Abaixo só do campo fundo escuro, alinhado à direita da coluna */
  backgroundDarkColumn: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100%",
  },
  logoSaveActions: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: theme.spacing(2),
    marginBottom: 0,
    width: "100%",
  },
  logoSection: {
    [theme.breakpoints.down("sm")]: {
      "& .MuiGrid-item": {
        paddingBottom: theme.spacing(1),
      },
    },
  },
  divider: {
    margin: theme.spacing(2, 0),
    [theme.breakpoints.down("sm")]: {
      margin: theme.spacing(1.5, 0),
    },
  },
}));

const LANGUAGE_OPTIONS = [
  { code: "pt-BR", label: "Português" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "ar", label: "عربي" },
];

function ensureHexPrefix(hex) {
  if (!hex || typeof hex !== "string") return "#131B2D";
  const s = hex.trim();
  return s.startsWith("#") ? s : `#${s}`;
}

function isValidHexColor(color) {
  if (!color || typeof color !== "string") return false;
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{8})$/.test(color.trim());
}

/** Gradiente escuro → logo tema escuro (PNG branca) no preview */
function previewGradientIsDark(lightHex, darkHex) {
  const l1 = relativeLuminance(hexToRgb(ensureHexPrefix(lightHex)));
  const l2 = relativeLuminance(hexToRgb(ensureHexPrefix(darkHex)));
  const minL = Math.min(l1, l2);
  const avg = (l1 + l2) / 2;
  return minL < 0.45 || avg < 0.5;
}

const COLOR_PALETTES = [
  { name: "Azul clássico", light: "#2563eb", dark: "#1e3a8a" },
  { name: "Verde", light: "#16a34a", dark: "#14532d" },
  { name: "Roxo", light: "#7c3aed", dark: "#4c1d95" },
  { name: "Coral", light: "#ea580c", dark: "#9a3412" },
  { name: "Ardósia", light: "#475569", dark: "#0f172a" },
  { name: "Padrão VB", light: "#131B2D", dark: "#131B2D" },
  { name: "Teal", light: "#0d9488", dark: "#115e59" },
  { name: "Rosa", light: "#db2777", dark: "#831843" },
  { name: "Índigo", light: "#4f46e5", dark: "#312e81" },
  { name: "Âmbar", light: "#d97706", dark: "#78350f" },
  { name: "Ciano", light: "#0891b2", dark: "#164e63" },
  { name: "Lima", light: "#65a30d", dark: "#365314" },
  { name: "Vinho", light: "#9f1239", dark: "#4c0519" },
  { name: "Grafite", light: "#52525b", dark: "#18181b" },
  { name: "Esmeralda", light: "#10b981", dark: "#064e3b" },
  { name: "Sky", light: "#0ea5e9", dark: "#0c4a6e" },
  { name: "Fúcsia", light: "#d946ef", dark: "#86198f" },
  { name: "Oliva", light: "#84cc16", dark: "#3f6212" },
  { name: "Terracota", light: "#c65d07", dark: "#7c2d12" },
  { name: "Real", light: "#1e40af", dark: "#172554" },
  { name: "Turquesa", light: "#14b8a6", dark: "#115e59" },
  { name: "Ameixa", light: "#a855f7", dark: "#581c87" },
  { name: "Areia", light: "#ca8a04", dark: "#713f12" },
  { name: "Bronze", light: "#b45309", dark: "#78350f" },
];

export default function Whitelabel(props) {
  const { settings } = props;
  const classes = useStyles();
  const muiTheme = useTheme();
  const [settingsLoaded, setSettingsLoaded] = useState({});

  const { user: authUser } = useContext(AuthContext);
  const canManageWhitelabel = canAccessVisualIdentityUi(authUser);
  const showWhitelabelIdentityIntro = isPlatformWhitelabelIntroAccount(authUser);
  const showTenantPrimaryButtonTextColors =
    canManageWhitelabel && isTenantVisualIdentityCompany(authUser);
  const showAppNameEditor = isWhitelabelAppNameEditor(authUser);
  const [loading, setLoading] = useState(true);
  const colorMode = useContext(ColorModeContext);
  const [primaryColorLightModalOpen, setPrimaryColorLightModalOpen] =
    useState(false);
  const [primaryColorDarkModalOpen, setPrimaryColorDarkModalOpen] =
    useState(false);
  const [buttonColorLightModalOpen, setButtonColorLightModalOpen] =
    useState(false);
  const [buttonColorDarkModalOpen, setButtonColorDarkModalOpen] =
    useState(false);
  const [buttonTextColorLightModalOpen, setButtonTextColorLightModalOpen] =
    useState(false);
  const [buttonTextColorDarkModalOpen, setButtonTextColorDarkModalOpen] =
    useState(false);
  const [buttonSecondaryColorLightModalOpen, setButtonSecondaryColorLightModalOpen] =
    useState(false);
  const [buttonSecondaryColorDarkModalOpen, setButtonSecondaryColorDarkModalOpen] =
    useState(false);
  const [topbarColorLightModalOpen, setTopbarColorLightModalOpen] =
    useState(false);
  const [topbarColorDarkModalOpen, setTopbarColorDarkModalOpen] =
    useState(false);
  const [sidebarColorLightModalOpen, setSidebarColorLightModalOpen] =
    useState(false);
  const [sidebarColorDarkModalOpen, setSidebarColorDarkModalOpen] =
    useState(false);
  const savedPaletteRef = useRef(null);

  const logoLightInput = useRef(null);
  const logoDarkInput = useRef(null);
  const logoFaviconInput = useRef(null);
  const ticketsLogoInput = useRef(null);
  const backgroundLightInput = useRef(null);
  const backgroundDarkInput = useRef(null);
  const [appName, setAppName] = useState(settingsLoaded.appName || "");
  const [savingAppName, setSavingAppName] = useState(false);
  const [enabledLanguages, setEnabledLanguages] = useState(["pt-BR", "en"]);

  const { update } = useSettings();

  const [draftLight, setDraftLight] = useState(
    () => localStorage.getItem("primaryColorLight") || "#131B2D"
  );
  const [draftDark, setDraftDark] = useState(
    () => localStorage.getItem("primaryColorDark") || "#131B2D"
  );
  /** Vazio = mesma cor da identidade (marca) para botões primários */
  const [draftButtonLight, setDraftButtonLight] = useState(
    () => localStorage.getItem("buttonPrimaryColorLight") || ""
  );
  const [draftButtonDark, setDraftButtonDark] = useState(
    () => localStorage.getItem("buttonPrimaryColorDark") || ""
  );
  const [draftButtonTextLight, setDraftButtonTextLight] = useState(
    () => localStorage.getItem("buttonPrimaryTextColorLight") || ""
  );
  const [draftButtonTextDark, setDraftButtonTextDark] = useState(
    () => localStorage.getItem("buttonPrimaryTextColorDark") || ""
  );
  const [draftSecondaryLight, setDraftSecondaryLight] = useState(
    () => localStorage.getItem("buttonSecondaryColorLight") || ""
  );
  const [draftSecondaryDark, setDraftSecondaryDark] = useState(
    () => localStorage.getItem("buttonSecondaryColorDark") || ""
  );
  const [draftTopbarLight, setDraftTopbarLight] = useState(
    () => localStorage.getItem("topbarColorLight") || ""
  );
  const [draftTopbarDark, setDraftTopbarDark] = useState(
    () => localStorage.getItem("topbarColorDark") || ""
  );
  const [draftSidebarLight, setDraftSidebarLight] = useState(
    () => localStorage.getItem("sidebarColorLight") || ""
  );
  const [draftSidebarDark, setDraftSidebarDark] = useState(
    () => localStorage.getItem("sidebarColorDark") || ""
  );
  /** Se true, ignora o contraste e mantém sempre a logo do tema claro no preview. */
  const [previewForceLightLogo, setPreviewForceLightLogo] = useState(false);

  const previewGradientDark = useMemo(
    () =>
      previewGradientIsDark(
        ensureHexPrefix(draftLight || "#131B2D"),
        ensureHexPrefix(draftDark || "#131B2D")
      ),
    [draftLight, draftDark]
  );
  const useDarkLogoInPreview =
    !previewForceLightLogo && previewGradientDark;

  /** Mesma regra que theme.calculatedLogoDark/Light (duplicata claro/escuro → PNG branca padrão). */
  const previewLogoSrc = useMemo(() => {
    if (useDarkLogoInPreview) {
      return muiTheme.calculatedLogoDark();
    }
    return muiTheme.calculatedLogoLight();
  }, [
    useDarkLogoInPreview,
    muiTheme.appLogoDark,
    muiTheme.appLogoLight,
  ]);

  /** Mesma cascata do App: topbar explícita → identidade (não usa cor dos botões principais). */
  const previewEffectiveTopbarBg = useMemo(() => {
    const brandL = ensureHexPrefix(draftLight || "#131B2D");
    const brandD = ensureHexPrefix(draftDark || "#131B2D");
    const topL = isValidHexColor(draftTopbarLight)
      ? draftTopbarLight.trim()
      : brandL;
    const topD = isValidHexColor(draftTopbarDark)
      ? draftTopbarDark.trim()
      : brandD;
    return ensureHexPrefix(colorMode.mode === "light" ? topL : topD);
  }, [
    colorMode.mode,
    draftLight,
    draftDark,
    draftTopbarLight,
    draftTopbarDark,
  ]);

  /** Abas das páginas: secundário ou identidade (igual ao App pageTabsAccent). */
  const previewSecondaryLightSwatch = useMemo(() => {
    const brandL = ensureHexPrefix(draftLight || "#131B2D");
    return isValidHexColor(draftSecondaryLight)
      ? draftSecondaryLight.trim()
      : brandL;
  }, [draftLight, draftSecondaryLight]);

  const previewSecondaryDarkSwatch = useMemo(() => {
    const brandD = ensureHexPrefix(draftDark || "#131B2D");
    return isValidHexColor(draftSecondaryDark)
      ? draftSecondaryDark.trim()
      : brandD;
  }, [draftDark, draftSecondaryDark]);

  const previewPageTabsAccent = useMemo(() => {
    return ensureHexPrefix(
      colorMode.mode === "light"
        ? previewSecondaryLightSwatch
        : previewSecondaryDarkSwatch
    );
  }, [colorMode.mode, previewSecondaryLightSwatch, previewSecondaryDarkSwatch]);

  /** Topbar do preview: só contraste sobre a cor da topbar (não usa secundário). */
  const previewNavbarAccent = useMemo(() => {
    const brandL = ensureHexPrefix(draftLight || "#131B2D");
    const brandD = ensureHexPrefix(draftDark || "#131B2D");
    const topL = isValidHexColor(draftTopbarLight)
      ? draftTopbarLight.trim()
      : brandL;
    const topD = isValidHexColor(draftTopbarDark)
      ? draftTopbarDark.trim()
      : brandD;
    const bar = ensureHexPrefix(colorMode.mode === "light" ? topL : topD);
    return getContrastTextForBackground(bar);
  }, [
    colorMode.mode,
    draftLight,
    draftDark,
    draftTopbarLight,
    draftTopbarDark,
  ]);

  function updateSettingsLoaded(key, value) {
    if (
      key === "primaryColorLight" ||
      key === "primaryColorDark" ||
      key === "appName"
    ) {
      localStorage.setItem(key, value);
    }
    if (
      key === "buttonPrimaryColorLight" ||
      key === "buttonPrimaryColorDark" ||
      key === "buttonPrimaryTextColorLight" ||
      key === "buttonPrimaryTextColorDark" ||
      key === "buttonSecondaryColorLight" ||
      key === "buttonSecondaryColorDark" ||
      key === "topbarColorLight" ||
      key === "topbarColorDark" ||
      key === "sidebarColorLight" ||
      key === "sidebarColorDark"
    ) {
      if (value) {
        localStorage.setItem(key, value);
      } else {
        localStorage.removeItem(key);
      }
    }
    const newSettings = { ...settingsLoaded };
    newSettings[key] = value;
    setSettingsLoaded(newSettings);
  }

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    if (Array.isArray(settings) && settings.length) {
      const primaryColorLight = settings.find(
        (s) => s.key === "primaryColorLight"
      )?.value;
      const primaryColorDark = settings.find(
        (s) => s.key === "primaryColorDark"
      )?.value;
      const buttonPrimaryColorLight = settings.find(
        (s) => s.key === "buttonPrimaryColorLight"
      )?.value;
      const buttonPrimaryColorDark = settings.find(
        (s) => s.key === "buttonPrimaryColorDark"
      )?.value;
      const buttonPrimaryTextColorLight = settings.find(
        (s) => s.key === "buttonPrimaryTextColorLight"
      )?.value;
      const buttonPrimaryTextColorDark = settings.find(
        (s) => s.key === "buttonPrimaryTextColorDark"
      )?.value;
      const buttonSecondaryColorLight = settings.find(
        (s) => s.key === "buttonSecondaryColorLight"
      )?.value;
      const buttonSecondaryColorDark = settings.find(
        (s) => s.key === "buttonSecondaryColorDark"
      )?.value;
      const topbarColorLight = settings.find(
        (s) => s.key === "topbarColorLight"
      )?.value;
      const topbarColorDark = settings.find(
        (s) => s.key === "topbarColorDark"
      )?.value;
      const sidebarColorLight = settings.find(
        (s) => s.key === "sidebarColorLight"
      )?.value;
      const sidebarColorDark = settings.find(
        (s) => s.key === "sidebarColorDark"
      )?.value;
      const appLogoLight = settings.find(
        (s) => s.key === "appLogoLight"
      )?.value;
      const appLogoDark = settings.find((s) => s.key === "appLogoDark")?.value;
      const appLogoFavicon = settings.find(
        (s) => s.key === "appLogoFavicon"
      )?.value;
      const appLogoTickets = settings.find(
        (s) => s.key === "appLogoTickets"
      )?.value;
      const appLogoBackgroundLight = settings.find(
        (s) => s.key === "appLogoBackgroundLight"
      )?.value;
      const appLogoBackgroundDark = settings.find(
        (s) => s.key === "appLogoBackgroundDark"
      )?.value;
      const appName = settings.find((s) => s.key === "appName")?.value;
      const enabledLanguagesSetting = settings.find(
        (s) => s.key === "enabledLanguages"
      )?.value;
      let langs = ["pt-BR", "en"];
      try {
        if (enabledLanguagesSetting) {
          langs = JSON.parse(enabledLanguagesSetting);
        }
      } catch { }

      if (isMounted) {
        setAppName(appName || "");
        setEnabledLanguages(langs);
        setSettingsLoaded({
          ...settingsLoaded,
          primaryColorLight,
          primaryColorDark,
          buttonPrimaryColorLight,
          buttonPrimaryColorDark,
          buttonPrimaryTextColorLight,
          buttonPrimaryTextColorDark,
          buttonSecondaryColorLight,
          buttonSecondaryColorDark,
          topbarColorLight,
          topbarColorDark,
          sidebarColorLight,
          sidebarColorDark,
          appLogoLight,
          appLogoDark,
          appLogoFavicon,
          appLogoTickets,
          appLogoBackgroundLight,
          appLogoBackgroundDark,
          appName,
          enabledLanguages: langs,
        });
        setDraftButtonLight(buttonPrimaryColorLight || "");
        setDraftButtonDark(buttonPrimaryColorDark || "");
        setDraftButtonTextLight(buttonPrimaryTextColorLight || "");
        setDraftButtonTextDark(buttonPrimaryTextColorDark || "");
        setDraftSecondaryLight(buttonSecondaryColorLight || "");
        setDraftSecondaryDark(buttonSecondaryColorDark || "");
        setDraftTopbarLight(topbarColorLight || "");
        setDraftTopbarDark(topbarColorDark || "");
        setDraftSidebarLight(sidebarColorLight || "");
        setDraftSidebarDark(sidebarColorDark || "");
        savedPaletteRef.current = {
          light: primaryColorLight || "#131B2D",
          dark: primaryColorDark || "#131B2D",
          btnLight: buttonPrimaryColorLight || "",
          btnDark: buttonPrimaryColorDark || "",
          btnTextLight: buttonPrimaryTextColorLight || "",
          btnTextDark: buttonPrimaryTextColorDark || "",
          secLight: buttonSecondaryColorLight || "",
          secDark: buttonSecondaryColorDark || "",
          topbarLight: topbarColorLight || "",
          topbarDark: topbarColorDark || "",
          sidebarLight: sidebarColorLight || "",
          sidebarDark: sidebarColorDark || "",
        };
        setLoading(false);
      }
    }
    else {
      savedPaletteRef.current = {
        light: localStorage.getItem("primaryColorLight") || "#131B2D",
        dark: localStorage.getItem("primaryColorDark") || "#131B2D",
        btnLight: localStorage.getItem("buttonPrimaryColorLight") || "",
        btnDark: localStorage.getItem("buttonPrimaryColorDark") || "",
        btnTextLight: localStorage.getItem("buttonPrimaryTextColorLight") || "",
        btnTextDark: localStorage.getItem("buttonPrimaryTextColorDark") || "",
        secLight: localStorage.getItem("buttonSecondaryColorLight") || "",
        secDark: localStorage.getItem("buttonSecondaryColorDark") || "",
        topbarLight: localStorage.getItem("topbarColorLight") || "",
        topbarDark: localStorage.getItem("topbarColorDark") || "",
        sidebarLight: localStorage.getItem("sidebarColorLight") || "",
        sidebarDark: localStorage.getItem("sidebarColorDark") || "",
      };
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [settings]);

  useEffect(() => {
    const l = settingsLoaded.primaryColorLight;
    const d = settingsLoaded.primaryColorDark;
    if (l) setDraftLight(l);
    if (d) setDraftDark(d);
  }, [settingsLoaded.primaryColorLight, settingsLoaded.primaryColorDark]);

  useEffect(() => {
    const l = draftLight || "#131B2D";
    const d = draftDark || "#131B2D";
    colorMode.setPrimaryColorLight(l);
    colorMode.setPrimaryColorDark(d);
  }, [draftLight, draftDark]);

  useEffect(() => {
    colorMode.setButtonPrimaryColorLight(draftButtonLight || "");
    colorMode.setButtonPrimaryColorDark(draftButtonDark || "");
  }, [draftButtonLight, draftButtonDark]);

  useEffect(() => {
    if (!showTenantPrimaryButtonTextColors) return;
    colorMode.setButtonPrimaryTextColorLight(draftButtonTextLight || "");
    colorMode.setButtonPrimaryTextColorDark(draftButtonTextDark || "");
  }, [
    draftButtonTextLight,
    draftButtonTextDark,
    showTenantPrimaryButtonTextColors,
  ]);

  useEffect(() => {
    colorMode.setButtonSecondaryColorLight(draftSecondaryLight || "");
    colorMode.setButtonSecondaryColorDark(draftSecondaryDark || "");
  }, [draftSecondaryLight, draftSecondaryDark]);

  useEffect(() => {
    colorMode.setTopbarColorLight(draftTopbarLight || "");
    colorMode.setTopbarColorDark(draftTopbarDark || "");
  }, [draftTopbarLight, draftTopbarDark]);

  useEffect(() => {
    colorMode.setSidebarColorLight(draftSidebarLight || "");
    colorMode.setSidebarColorDark(draftSidebarDark || "");
  }, [draftSidebarLight, draftSidebarDark]);

  useEffect(() => {
    return () => {
      const s = savedPaletteRef.current;
      if (!s) {
        const l = localStorage.getItem("primaryColorLight") || "#131B2D";
        const d = localStorage.getItem("primaryColorDark") || "#131B2D";
        const bl = localStorage.getItem("buttonPrimaryColorLight") || "";
        const bd = localStorage.getItem("buttonPrimaryColorDark") || "";
        const btl = localStorage.getItem("buttonPrimaryTextColorLight") || "";
        const btd = localStorage.getItem("buttonPrimaryTextColorDark") || "";
        const bsl = localStorage.getItem("buttonSecondaryColorLight") || "";
        const bsd = localStorage.getItem("buttonSecondaryColorDark") || "";
        const tl = localStorage.getItem("topbarColorLight") || "";
        const td = localStorage.getItem("topbarColorDark") || "";
        const sl = localStorage.getItem("sidebarColorLight") || "";
        const sd = localStorage.getItem("sidebarColorDark") || "";
        colorMode.setPrimaryColorLight(l);
        colorMode.setPrimaryColorDark(d);
        colorMode.setButtonPrimaryColorLight(bl);
        colorMode.setButtonPrimaryColorDark(bd);
        colorMode.setButtonPrimaryTextColorLight(btl);
        colorMode.setButtonPrimaryTextColorDark(btd);
        colorMode.setButtonSecondaryColorLight(bsl);
        colorMode.setButtonSecondaryColorDark(bsd);
        colorMode.setTopbarColorLight(tl);
        colorMode.setTopbarColorDark(td);
        colorMode.setSidebarColorLight(sl);
        colorMode.setSidebarColorDark(sd);
        return;
      }
      colorMode.setPrimaryColorLight(s.light);
      colorMode.setPrimaryColorDark(s.dark);
      colorMode.setButtonPrimaryColorLight(s.btnLight ?? "");
      colorMode.setButtonPrimaryColorDark(s.btnDark ?? "");
      colorMode.setButtonPrimaryTextColorLight(s.btnTextLight ?? "");
      colorMode.setButtonPrimaryTextColorDark(s.btnTextDark ?? "");
      colorMode.setButtonSecondaryColorLight(s.secLight ?? "");
      colorMode.setButtonSecondaryColorDark(s.secDark ?? "");
      colorMode.setTopbarColorLight(s.topbarLight ?? "");
      colorMode.setTopbarColorDark(s.topbarDark ?? "");
      colorMode.setSidebarColorLight(s.sidebarLight ?? "");
      colorMode.setSidebarColorDark(s.sidebarDark ?? "");
    };
  }, []);

  async function handleSaveSetting(key, value) {
    await update({
      key,
      value,
    });
    updateSettingsLoaded(key, value);
    toast.success("Operação atualizada com sucesso.");
  }

  async function handleSaveAppName() {
    try {
      setSavingAppName(true);
      await update({
        key: "appName",
        value: appName
      });
      updateSettingsLoaded("appName", appName);
      colorMode.setAppName(appName || "OlaChat Pro");
      toast.success("Nome da aplicação salvo com sucesso.");
    } catch (e) {
      toast.error("Não foi possível salvar o nome da aplicação.");
    } finally {
      setSavingAppName(false);
    }
  }

  async function handleSaveEnabledLanguages(newLangs) {
    await handleSaveSetting("enabledLanguages", newLangs);
    setEnabledLanguages(newLangs);
  }

  const handleDraftReset = async () => {
    const l = "#131B2D";
    const d = "#131B2D";
    const bl = "";
    const bd = "";
    const btl = "";
    const btd = "";
    const bsl = "";
    const bsd = "";
    const tl = "";
    const td = "";
    const sl = "";
    const sd = "";
    setDraftLight(l);
    setDraftDark(d);
    setDraftButtonLight(bl);
    setDraftButtonDark(bd);
    setDraftButtonTextLight(btl);
    setDraftButtonTextDark(btd);
    setDraftSecondaryLight(bsl);
    setDraftSecondaryDark(bsd);
    setDraftTopbarLight(tl);
    setDraftTopbarDark(td);
    setDraftSidebarLight(sl);
    setDraftSidebarDark(sd);
    try {
      await Promise.all([
        update({ key: "primaryColorLight", value: l }),
        update({ key: "primaryColorDark", value: d }),
        update({ key: "buttonPrimaryColorLight", value: bl }),
        update({ key: "buttonPrimaryColorDark", value: bd }),
        update({ key: "buttonPrimaryTextColorLight", value: btl }),
        update({ key: "buttonPrimaryTextColorDark", value: btd }),
        update({ key: "buttonSecondaryColorLight", value: bsl }),
        update({ key: "buttonSecondaryColorDark", value: bsd }),
        update({ key: "topbarColorLight", value: tl }),
        update({ key: "topbarColorDark", value: td }),
        update({ key: "sidebarColorLight", value: sl }),
        update({ key: "sidebarColorDark", value: sd }),
      ]);
      updateSettingsLoaded("primaryColorLight", l);
      updateSettingsLoaded("primaryColorDark", d);
      updateSettingsLoaded("buttonPrimaryColorLight", bl);
      updateSettingsLoaded("buttonPrimaryColorDark", bd);
      updateSettingsLoaded("buttonPrimaryTextColorLight", btl);
      updateSettingsLoaded("buttonPrimaryTextColorDark", btd);
      updateSettingsLoaded("buttonSecondaryColorLight", bsl);
      updateSettingsLoaded("buttonSecondaryColorDark", bsd);
      updateSettingsLoaded("topbarColorLight", tl);
      updateSettingsLoaded("topbarColorDark", td);
      updateSettingsLoaded("sidebarColorLight", sl);
      updateSettingsLoaded("sidebarColorDark", sd);
      colorMode.setPrimaryColorLight(l);
      colorMode.setPrimaryColorDark(d);
      colorMode.setButtonPrimaryColorLight(bl);
      colorMode.setButtonPrimaryColorDark(bd);
      colorMode.setButtonPrimaryTextColorLight(btl);
      colorMode.setButtonPrimaryTextColorDark(btd);
      colorMode.setButtonSecondaryColorLight(bsl);
      colorMode.setButtonSecondaryColorDark(bsd);
      colorMode.setTopbarColorLight(tl);
      colorMode.setTopbarColorDark(td);
      colorMode.setSidebarColorLight(sl);
      colorMode.setSidebarColorDark(sd);
      savedPaletteRef.current = {
        light: l,
        dark: d,
        btnLight: bl,
        btnDark: bd,
        btnTextLight: btl,
        btnTextDark: btd,
        secLight: bsl,
        secDark: bsd,
        topbarLight: tl,
        topbarDark: td,
        sidebarLight: sl,
        sidebarDark: sd,
      };
      toast.success(i18n.t("whitelabel.resetPersistedToast"));
    } catch (e) {
      toast.error(i18n.t("whitelabel.resetPersistError"));
    }
  };

  async function handleSaveDraftColors() {
    const l = draftLight || "#131B2D";
    const d = draftDark || "#131B2D";
    const bl = (draftButtonLight || "").trim();
    const bd = (draftButtonDark || "").trim();
    const btl = (draftButtonTextLight || "").trim();
    const btd = (draftButtonTextDark || "").trim();
    const bsl = (draftSecondaryLight || "").trim();
    const bsd = (draftSecondaryDark || "").trim();
    const tl = (draftTopbarLight || "").trim();
    const td = (draftTopbarDark || "").trim();
    const sl = (draftSidebarLight || "").trim();
    const sd = (draftSidebarDark || "").trim();
    const savingMsg = i18n.t("whitelabel.savingColors");
    const doneMsg = i18n.t("whitelabel.colorsSaveSuccessAlert");
    const toastId =
      typeof toast.loading === "function"
        ? toast.loading(savingMsg)
        : toast.info(savingMsg, { autoClose: false, closeOnClick: false });
    try {
      await Promise.all([
        update({ key: "primaryColorLight", value: l }),
        update({ key: "primaryColorDark", value: d }),
        update({ key: "buttonPrimaryColorLight", value: bl }),
        update({ key: "buttonPrimaryColorDark", value: bd }),
        update({ key: "buttonPrimaryTextColorLight", value: btl }),
        update({ key: "buttonPrimaryTextColorDark", value: btd }),
        update({ key: "buttonSecondaryColorLight", value: bsl }),
        update({ key: "buttonSecondaryColorDark", value: bsd }),
        update({ key: "topbarColorLight", value: tl }),
        update({ key: "topbarColorDark", value: td }),
        update({ key: "sidebarColorLight", value: sl }),
        update({ key: "sidebarColorDark", value: sd }),
      ]);
    } catch (err) {
      if (toastId != null) toast.dismiss(toastId);
      toast.error(i18n.t("whitelabel.colorsSaveError"));
      return;
    }
    if (toastId != null) toast.dismiss(toastId);
    updateSettingsLoaded("primaryColorLight", l);
    updateSettingsLoaded("primaryColorDark", d);
    updateSettingsLoaded("buttonPrimaryColorLight", bl);
    updateSettingsLoaded("buttonPrimaryColorDark", bd);
    updateSettingsLoaded("buttonPrimaryTextColorLight", btl);
    updateSettingsLoaded("buttonPrimaryTextColorDark", btd);
    updateSettingsLoaded("buttonSecondaryColorLight", bsl);
    updateSettingsLoaded("buttonSecondaryColorDark", bsd);
    updateSettingsLoaded("topbarColorLight", tl);
    updateSettingsLoaded("topbarColorDark", td);
    updateSettingsLoaded("sidebarColorLight", sl);
    updateSettingsLoaded("sidebarColorDark", sd);
    colorMode.setPrimaryColorLight(l);
    colorMode.setPrimaryColorDark(d);
    colorMode.setButtonPrimaryColorLight(bl);
    colorMode.setButtonPrimaryColorDark(bd);
    colorMode.setButtonPrimaryTextColorLight(btl);
    colorMode.setButtonPrimaryTextColorDark(btd);
    colorMode.setButtonSecondaryColorLight(bsl);
    colorMode.setButtonSecondaryColorDark(bsd);
    colorMode.setTopbarColorLight(tl);
    colorMode.setTopbarColorDark(td);
    colorMode.setSidebarColorLight(sl);
    colorMode.setSidebarColorDark(sd);
    savedPaletteRef.current = {
      light: l,
      dark: d,
      btnLight: bl,
      btnDark: bd,
      btnTextLight: btl,
      btnTextDark: btd,
      secLight: bsl,
      secDark: bsd,
      topbarLight: tl,
      topbarDark: td,
      sidebarLight: sl,
      sidebarDark: sd,
    };
    toast.success(doneMsg, { autoClose: 4000 });
  }

  function handleSaveLogosSection() {
    toast.success(i18n.t("whitelabel.logoSectionSave"));
  }

  async function handleSaveLanguagesClick() {
    await handleSaveEnabledLanguages(enabledLanguages);
  }

  const uploadLogo = async (e, mode) => {
    if (!e.target.files) {
      return;
    }

    const file = e.target.files[0];
    const formData = new FormData();

    formData.append("typeArch", "logo");
    formData.append("mode", mode);
    formData.append("file", file);

    await api
      .post("/settings-whitelabel/logo", formData, {
        onUploadProgress: (event) => {
          let progress = Math.round((event.loaded * 100) / event.total);
          console.log(`A imagem está ${progress}% carregada... `);
        },
      })
      .then((response) => {
        const raw = response.data;
        const stored =
          typeof raw === "string"
            ? raw
            : raw && typeof raw === "object" && raw.value != null
              ? String(raw.value)
              : raw != null
                ? String(raw)
                : "";
        if (!stored) {
          console.error("Upload de logo sem nome de arquivo na resposta");
          return;
        }
        updateSettingsLoaded(`appLogo${mode}`, stored);
        if (mode === "BackgroundLight" || mode === "BackgroundDark") {
        } else {
          colorMode[`setAppLogo${mode}`](
            getBackendUrl() + "/public/" + stored
          );
        }
      })
      .catch((err) => {
        console.error(`Houve um problema ao realizar o upload da imagem.`);
        console.log(err);
      });
  };

  const uploadUnifiedLogo = async (e) => {
    if (!e.target.files) {
      return;
    }
    const file = e.target.files[0];
    const upload = async (mode) => {
      const fd = new FormData();
      fd.append("typeArch", "logo");
      fd.append("mode", mode);
      fd.append("file", file);
      const resp = await api.post("/settings-whitelabel/logo", fd);
      const raw = resp.data;
      const stored =
        typeof raw === "string"
          ? raw
          : raw && typeof raw === "object" && raw.value != null
            ? String(raw.value)
            : raw != null
              ? String(raw)
              : "";
      if (!stored) throw new Error("Resposta sem nome de arquivo");
      updateSettingsLoaded(`appLogo${mode}`, stored);
      colorMode[`setAppLogo${mode}`](getBackendUrl() + "/public/" + stored);
    };
    try {
      await upload("Light");
      await upload("Dark");
      toast.success("Logo atualizada.");
    } catch {
      toast.error("Falha ao atualizar a logo.");
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '50px' }}>
        <div>Carregando configurações...</div>
      </div>
    );
  }

  return (
    <div className={classes.container}>
      {canManageWhitelabel ? (
          <>
            {showWhitelabelIdentityIntro || showAppNameEditor ? (
              <Paper className={classes.sectionPaper}>
                <div className={`${classes.sectionHeader} ${classes.sectionHeaderTight}`}>
                  {showWhitelabelIdentityIntro ? (
                    <>
                      <Typography variant="h6" className={classes.sectionTitle}>
                        {i18n.t("whitelabel.pageTitle")}
                      </Typography>
                      <Typography
                        className={`${classes.sectionSubtitle} ${classes.identityIntroSubtitle}`}
                      >
                        {i18n.t("whitelabel.sections.identityIntro")}
                      </Typography>
                    </>
                  ) : showAppNameEditor ? (
                    <Typography variant="h6" className={classes.sectionTitle}>
                      {i18n.t("whitelabel.appName")}
                    </Typography>
                  ) : null}
                </div>
                {showAppNameEditor ? (
                  <Grid container spacing={3}>
                    <Grid xs={12} sm={6} md={6} item>
                      <FormControl className={classes.formField} fullWidth>
                        <TextField
                          id="appname-field"
                          label={i18n.t("whitelabel.appName")}
                          variant="outlined"
                          name="appName"
                          value={appName}
                          onChange={(e) => {
                            setAppName(e.target.value);
                          }}
                          size="small"
                        />
                        <Box mt={1.5}>
                          <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            disabled={savingAppName}
                            onClick={handleSaveAppName}
                          >
                            {savingAppName ? "Salvando…" : "Salvar nome da aplicação"}
                          </Button>
                        </Box>
                      </FormControl>
                    </Grid>
                  </Grid>
                ) : null}
              </Paper>
            ) : null}

            {/* Seção de Cores */}
            <Paper className={classes.sectionPaper}>
              <div className={classes.sectionHeader}>
                <Typography variant="h6" className={classes.sectionTitle}>
                  {i18n.t("whitelabel.sections.colors")}
                </Typography>
                <Typography className={classes.sectionSubtitle}>
                  {i18n.t("whitelabel.sections.colorsDescription")}
                </Typography>
              </div>

              <Grid container spacing={4} alignItems="flex-start">
                <Grid item xs={12} md={7}>
                  <Typography variant="caption" color="textSecondary" style={{ display: "block", marginBottom: 8 }}>
                    {i18n.t("whitelabel.paletteHint")}
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    className={classes.paletteSuggestedLabel}
                  >
                    {i18n.t("whitelabel.paletteSuggestedTopbar")}
                  </Typography>
                  <div className={classes.paletteGrid}>
                    {COLOR_PALETTES.map((p, idx) => (
                      <button
                        type="button"
                        key={`topbar-${p.name}-${idx}`}
                        title={p.name}
                        className={classes.paletteSwatch}
                        style={{
                          background: `linear-gradient(135deg, ${p.light} 0%, ${p.dark} 100%)`,
                        }}
                        onClick={() => {
                          setDraftTopbarLight(p.light);
                          setDraftTopbarDark(p.dark);
                        }}
                        aria-label={p.name}
                      />
                    ))}
                  </div>

                  <Grid container spacing={3} className={classes.colorSection}>
                    <Grid xs={12} sm={6} md={6} item>
                      <FormControl className={classes.formField} fullWidth>
                        <TextField
                          id="topbar-color-light-field"
                          label={i18n.t("whitelabel.topbarColorLight")}
                          variant="outlined"
                          value={draftTopbarLight || ""}
                          placeholder={draftLight || "#131B2D"}
                          onClick={() => setTopbarColorLightModalOpen(true)}
                          size="small"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <div
                                  style={{
                                    backgroundColor:
                                      draftTopbarLight || draftLight,
                                  }}
                                  className={classes.colorAdorment}
                                />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </FormControl>
                      <ColorBoxModal
                        open={topbarColorLightModalOpen}
                        handleClose={() => setTopbarColorLightModalOpen(false)}
                        onChange={(color) => {
                          setDraftTopbarLight(`#${color.hex}`);
                        }}
                        currentColor={draftTopbarLight || draftLight}
                      />
                    </Grid>
                    <Grid xs={12} sm={6} md={6} item>
                      <FormControl className={classes.formField} fullWidth>
                        <TextField
                          id="topbar-color-dark-field"
                          label={i18n.t("whitelabel.topbarColorDark")}
                          variant="outlined"
                          value={draftTopbarDark || ""}
                          placeholder={draftDark || "#131B2D"}
                          onClick={() => setTopbarColorDarkModalOpen(true)}
                          size="small"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <div
                                  style={{
                                    backgroundColor:
                                      draftTopbarDark || draftDark,
                                  }}
                                  className={classes.colorAdorment}
                                />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </FormControl>
                      <ColorBoxModal
                        open={topbarColorDarkModalOpen}
                        handleClose={() => setTopbarColorDarkModalOpen(false)}
                        onChange={(color) => {
                          setDraftTopbarDark(`#${color.hex}`);
                        }}
                        currentColor={draftTopbarDark || draftDark}
                      />
                    </Grid>
                  </Grid>

                  <Typography
                    variant="subtitle2"
                    className={classes.paletteSuggestedLabel}
                    style={{ marginTop: 16 }}
                  >
                    {i18n.t("whitelabel.paletteSuggestedSidebar")}
                  </Typography>
                  <div className={classes.paletteGrid}>
                    {COLOR_PALETTES.map((p, idx) => (
                      <button
                        type="button"
                        key={`sidebar-${p.name}-${idx}`}
                        title={p.name}
                        className={classes.paletteSwatch}
                        style={{
                          background: `linear-gradient(135deg, ${p.light} 0%, ${p.dark} 100%)`,
                        }}
                        onClick={() => {
                          setDraftSidebarLight(p.light);
                          setDraftSidebarDark(p.dark);
                        }}
                        aria-label={p.name}
                      />
                    ))}
                  </div>

                  <Grid container spacing={3} className={classes.colorSection}>
                    <Grid xs={12} sm={6} md={6} item>
                      <FormControl className={classes.formField} fullWidth>
                        <TextField
                          id="sidebar-color-light-field"
                          label={i18n.t("whitelabel.sidebarColorLight")}
                          variant="outlined"
                          value={draftSidebarLight || ""}
                          placeholder="#ffffff"
                          onClick={() => setSidebarColorLightModalOpen(true)}
                          size="small"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <div
                                  style={{
                                    backgroundColor:
                                      draftSidebarLight || "#ffffff",
                                  }}
                                  className={classes.colorAdorment}
                                />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </FormControl>
                      <ColorBoxModal
                        open={sidebarColorLightModalOpen}
                        handleClose={() => setSidebarColorLightModalOpen(false)}
                        onChange={(color) => {
                          setDraftSidebarLight(`#${color.hex}`);
                        }}
                        currentColor={draftSidebarLight || "#ffffff"}
                      />
                    </Grid>
                    <Grid xs={12} sm={6} md={6} item>
                      <FormControl className={classes.formField} fullWidth>
                        <TextField
                          id="sidebar-color-dark-field"
                          label={i18n.t("whitelabel.sidebarColorDark")}
                          variant="outlined"
                          value={draftSidebarDark || ""}
                          placeholder="#1e1e1e"
                          onClick={() => setSidebarColorDarkModalOpen(true)}
                          size="small"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <div
                                  style={{
                                    backgroundColor:
                                      draftSidebarDark || "#1e1e1e",
                                  }}
                                  className={classes.colorAdorment}
                                />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </FormControl>
                      <ColorBoxModal
                        open={sidebarColorDarkModalOpen}
                        handleClose={() => setSidebarColorDarkModalOpen(false)}
                        onChange={(color) => {
                          setDraftSidebarDark(`#${color.hex}`);
                        }}
                        currentColor={draftSidebarDark || "#1e1e1e"}
                      />
                    </Grid>
                  </Grid>

                  <Typography
                    variant="subtitle2"
                    className={classes.paletteSuggestedLabel}
                    style={{ marginTop: 16 }}
                  >
                    {i18n.t("whitelabel.identityColorsSection")}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" style={{ display: "block", marginBottom: 8 }}>
                    {i18n.t("whitelabel.identityColorsHint")}
                  </Typography>

                  <Grid container spacing={3} className={classes.colorSection}>
                    <Grid xs={12} sm={6} md={6} item>
                      <FormControl className={classes.formField} fullWidth>
                        <TextField
                          id="primary-color-light-field"
                          label={i18n.t("whitelabel.primaryColorLight")}
                          variant="outlined"
                          value={draftLight || ""}
                          onClick={() => setPrimaryColorLightModalOpen(true)}
                          size="small"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <div
                                  style={{
                                    backgroundColor: draftLight,
                                  }}
                                  className={classes.colorAdorment}
                                />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </FormControl>
                      <ColorBoxModal
                        open={primaryColorLightModalOpen}
                        handleClose={() => setPrimaryColorLightModalOpen(false)}
                        onChange={(color) => {
                          setDraftLight(`#${color.hex}`);
                        }}
                        currentColor={draftLight}
                      />
                    </Grid>
                    <Grid xs={12} sm={6} md={6} item>
                      <FormControl className={classes.formField} fullWidth>
                        <TextField
                          id="primary-color-dark-field"
                          label={i18n.t("whitelabel.primaryColorDark")}
                          variant="outlined"
                          value={draftDark || ""}
                          onClick={() => setPrimaryColorDarkModalOpen(true)}
                          size="small"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <div
                                  style={{
                                    backgroundColor: draftDark,
                                  }}
                                  className={classes.colorAdorment}
                                />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </FormControl>
                      <ColorBoxModal
                        open={primaryColorDarkModalOpen}
                        handleClose={() => setPrimaryColorDarkModalOpen(false)}
                        onChange={(color) => {
                          setDraftDark(`#${color.hex}`);
                        }}
                        currentColor={draftDark}
                      />
                    </Grid>
                  </Grid>

                  <Typography
                    variant="subtitle2"
                    className={classes.paletteSuggestedLabel}
                    style={{ marginTop: 16 }}
                  >
                    {i18n.t("whitelabel.buttonPrimaryColorsSection")}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" style={{ display: "block", marginBottom: 8 }}>
                    {i18n.t("whitelabel.buttonPrimaryColorsHint")}
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    className={classes.paletteSuggestedLabel}
                  >
                    {i18n.t("whitelabel.paletteSuggestedPrimaryButtons")}
                  </Typography>
                  <div className={classes.paletteGrid}>
                    {COLOR_PALETTES.map((p, idx) => (
                      <button
                        type="button"
                        key={`button-primary-${p.name}-${idx}`}
                        title={p.name}
                        className={classes.paletteSwatch}
                        style={{
                          background: `linear-gradient(135deg, ${p.light} 0%, ${p.dark} 100%)`,
                        }}
                        onClick={() => {
                          setDraftButtonLight(p.light);
                          setDraftButtonDark(p.dark);
                        }}
                        aria-label={p.name}
                      />
                    ))}
                  </div>
                  <Grid container spacing={3} className={classes.colorSection}>
                    <Grid xs={12} sm={6} md={6} item>
                      <FormControl className={classes.formField} fullWidth>
                        <TextField
                          id="button-color-light-field"
                          label={i18n.t("whitelabel.buttonPrimaryColorLight")}
                          variant="outlined"
                          value={draftButtonLight || ""}
                          placeholder={draftLight || "#131B2D"}
                          onClick={() => setButtonColorLightModalOpen(true)}
                          size="small"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <div
                                  style={{
                                    backgroundColor: draftButtonLight || draftLight,
                                  }}
                                  className={classes.colorAdorment}
                                />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </FormControl>
                      <ColorBoxModal
                        open={buttonColorLightModalOpen}
                        handleClose={() => setButtonColorLightModalOpen(false)}
                        onChange={(color) => {
                          setDraftButtonLight(`#${color.hex}`);
                        }}
                        currentColor={draftButtonLight || draftLight}
                      />
                    </Grid>
                    <Grid xs={12} sm={6} md={6} item>
                      <FormControl className={classes.formField} fullWidth>
                        <TextField
                          id="button-color-dark-field"
                          label={i18n.t("whitelabel.buttonPrimaryColorDark")}
                          variant="outlined"
                          value={draftButtonDark || ""}
                          placeholder={draftDark || "#131B2D"}
                          onClick={() => setButtonColorDarkModalOpen(true)}
                          size="small"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <div
                                  style={{
                                    backgroundColor: draftButtonDark || draftDark,
                                  }}
                                  className={classes.colorAdorment}
                                />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </FormControl>
                      <ColorBoxModal
                        open={buttonColorDarkModalOpen}
                        handleClose={() => setButtonColorDarkModalOpen(false)}
                        onChange={(color) => {
                          setDraftButtonDark(`#${color.hex}`);
                        }}
                        currentColor={draftButtonDark || draftDark}
                      />
                    </Grid>
                  </Grid>
                  {showTenantPrimaryButtonTextColors ? (
                    <>
                      <Typography
                        variant="subtitle2"
                        className={classes.paletteSuggestedLabel}
                        style={{ marginTop: 16 }}
                      >
                        {i18n.t("whitelabel.buttonPrimaryTextColorsSection")}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="textSecondary"
                        style={{ display: "block", marginBottom: 8 }}
                      >
                        {i18n.t("whitelabel.buttonPrimaryTextColorsHint")}
                      </Typography>
                      <Grid container spacing={3} className={classes.colorSection}>
                        <Grid xs={12} sm={6} md={6} item>
                          <FormControl className={classes.formField} fullWidth>
                            <TextField
                              id="button-text-color-light-field"
                              label={i18n.t("whitelabel.buttonPrimaryTextColorLight")}
                              variant="outlined"
                              value={draftButtonTextLight || ""}
                              placeholder={getContrastTextForBackground(
                                ensureHexPrefix(draftButtonLight || draftLight || "#131B2D")
                              )}
                              onClick={() => setButtonTextColorLightModalOpen(true)}
                              size="small"
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <div
                                      style={{
                                        backgroundColor:
                                          draftButtonTextLight ||
                                          getContrastTextForBackground(
                                            ensureHexPrefix(draftButtonLight || draftLight || "#131B2D")
                                          ),
                                      }}
                                      className={classes.colorAdorment}
                                    />
                                  </InputAdornment>
                                ),
                              }}
                            />
                          </FormControl>
                          <ColorBoxModal
                            open={buttonTextColorLightModalOpen}
                            handleClose={() => setButtonTextColorLightModalOpen(false)}
                            onChange={(color) => {
                              setDraftButtonTextLight(`#${color.hex}`);
                            }}
                            currentColor={
                              draftButtonTextLight ||
                              getContrastTextForBackground(
                                ensureHexPrefix(draftButtonLight || draftLight || "#131B2D")
                              )
                            }
                          />
                        </Grid>
                        <Grid xs={12} sm={6} md={6} item>
                          <FormControl className={classes.formField} fullWidth>
                            <TextField
                              id="button-text-color-dark-field"
                              label={i18n.t("whitelabel.buttonPrimaryTextColorDark")}
                              variant="outlined"
                              value={draftButtonTextDark || ""}
                              placeholder={getContrastTextForBackground(
                                ensureHexPrefix(draftButtonDark || draftDark || "#131B2D")
                              )}
                              onClick={() => setButtonTextColorDarkModalOpen(true)}
                              size="small"
                              InputProps={{
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <div
                                      style={{
                                        backgroundColor:
                                          draftButtonTextDark ||
                                          getContrastTextForBackground(
                                            ensureHexPrefix(draftButtonDark || draftDark || "#131B2D")
                                          ),
                                      }}
                                      className={classes.colorAdorment}
                                    />
                                  </InputAdornment>
                                ),
                              }}
                            />
                          </FormControl>
                          <ColorBoxModal
                            open={buttonTextColorDarkModalOpen}
                            handleClose={() => setButtonTextColorDarkModalOpen(false)}
                            onChange={(color) => {
                              setDraftButtonTextDark(`#${color.hex}`);
                            }}
                            currentColor={
                              draftButtonTextDark ||
                              getContrastTextForBackground(
                                ensureHexPrefix(draftButtonDark || draftDark || "#131B2D")
                              )
                            }
                          />
                        </Grid>
                      </Grid>
                    </>
                  ) : null}

                  <Typography
                    variant="subtitle2"
                    className={classes.paletteSuggestedLabel}
                    style={{ marginTop: 16 }}
                  >
                    {i18n.t("whitelabel.buttonSecondaryColorsSection")}
                  </Typography>
                  <Typography variant="caption" color="textSecondary" style={{ display: "block", marginBottom: 8 }}>
                    {i18n.t("whitelabel.buttonSecondaryColorsHint")}
                  </Typography>
                  <Typography
                    variant="subtitle2"
                    className={classes.paletteSuggestedLabel}
                  >
                    {i18n.t("whitelabel.paletteSuggestedSecondaryButtons")}
                  </Typography>
                  <div className={classes.paletteGrid}>
                    {COLOR_PALETTES.map((p, idx) => (
                      <button
                        type="button"
                        key={`button-secondary-${p.name}-${idx}`}
                        title={p.name}
                        className={classes.paletteSwatch}
                        style={{
                          background: `linear-gradient(135deg, ${p.light} 0%, ${p.dark} 100%)`,
                        }}
                        onClick={() => {
                          setDraftSecondaryLight(p.light);
                          setDraftSecondaryDark(p.dark);
                        }}
                        aria-label={p.name}
                      />
                    ))}
                  </div>
                  <Grid container spacing={3} className={classes.colorSection}>
                    <Grid xs={12} sm={6} md={6} item>
                      <FormControl className={classes.formField} fullWidth>
                        <TextField
                          id="button-secondary-color-light-field"
                          label={i18n.t("whitelabel.buttonSecondaryColorLight")}
                          variant="outlined"
                          value={draftSecondaryLight || ""}
                          placeholder={i18n.t("whitelabel.buttonSecondaryPlaceholder")}
                          onClick={() => setButtonSecondaryColorLightModalOpen(true)}
                          size="small"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <div
                                  style={{
                                    backgroundColor: previewSecondaryLightSwatch,
                                  }}
                                  className={classes.colorAdorment}
                                />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </FormControl>
                      <ColorBoxModal
                        open={buttonSecondaryColorLightModalOpen}
                        handleClose={() => setButtonSecondaryColorLightModalOpen(false)}
                        onChange={(color) => {
                          setDraftSecondaryLight(`#${color.hex}`);
                        }}
                        currentColor={previewSecondaryLightSwatch}
                      />
                    </Grid>
                    <Grid xs={12} sm={6} md={6} item>
                      <FormControl className={classes.formField} fullWidth>
                        <TextField
                          id="button-secondary-color-dark-field"
                          label={i18n.t("whitelabel.buttonSecondaryColorDark")}
                          variant="outlined"
                          value={draftSecondaryDark || ""}
                          placeholder={i18n.t("whitelabel.buttonSecondaryPlaceholder")}
                          onClick={() => setButtonSecondaryColorDarkModalOpen(true)}
                          size="small"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <div
                                  style={{
                                    backgroundColor: previewSecondaryDarkSwatch,
                                  }}
                                  className={classes.colorAdorment}
                                />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </FormControl>
                      <ColorBoxModal
                        open={buttonSecondaryColorDarkModalOpen}
                        handleClose={() => setButtonSecondaryColorDarkModalOpen(false)}
                        onChange={(color) => {
                          setDraftSecondaryDark(`#${color.hex}`);
                        }}
                        currentColor={previewSecondaryDarkSwatch}
                      />
                    </Grid>
                  </Grid>

                  <Box className={classes.paletteActionsRow}>
                    <Button variant="outlined" color="primary" onClick={handleDraftReset}>
                      {i18n.t("whitelabel.resetPreview")}
                    </Button>
                    <Button variant="contained" color="primary" onClick={handleSaveDraftColors}>
                      {i18n.t("whitelabel.saveColors")}
                    </Button>
                  </Box>
                </Grid>

                <Grid item xs={12} md={5}>
                  <Box className={classes.livePreviewSticky}>
                    <Typography
                      variant="subtitle2"
                      className={classes.paletteSuggestedLabel}
                    >
                      {i18n.t("whitelabel.livePreview")}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" style={{ display: "block", marginBottom: 10 }}>
                      {i18n.t("whitelabel.livePreviewHint")}
                    </Typography>
                    <FormControlLabel
                      style={{ marginLeft: 0, marginBottom: 8, alignItems: "flex-start" }}
                      control={
                        <Switch
                          checked={previewForceLightLogo}
                          onChange={(e) => setPreviewForceLightLogo(e.target.checked)}
                          color="primary"
                          size="small"
                        />
                      }
                      label={
                        <Typography variant="body2" color="textSecondary" style={{ lineHeight: 1.35 }}>
                          {i18n.t("whitelabel.previewForceLightLogo")}
                        </Typography>
                      }
                    />
                    <Box className={classes.livePreview}>
                      <div
                        className={classes.livePreviewTopbar}
                        style={{
                          backgroundColor: previewEffectiveTopbarBg,
                          color: previewNavbarAccent,
                        }}
                        aria-hidden
                      >
                        <span style={{ fontSize: 8, lineHeight: 1, opacity: 0.95 }}>●</span>
                        <span style={{ fontSize: 8, lineHeight: 1, opacity: 0.95 }}>●</span>
                        <span style={{ fontSize: 8, lineHeight: 1, opacity: 0.95 }}>●</span>
                      </div>
                      <div className={classes.livePreviewTabsRow} aria-hidden>
                        <Typography
                          component="span"
                          variant="caption"
                          style={{
                            color: previewPageTabsAccent,
                            fontWeight: 600,
                            padding: "4px 10px",
                            borderRadius: 8,
                            backgroundColor: "rgba(0,0,0,0.06)",
                          }}
                        >
                          {i18n.t("whitelabel.previewTabSampleActive")}
                        </Typography>
                        <Typography
                          component="span"
                          variant="caption"
                          style={{
                            color: previewPageTabsAccent,
                            opacity: 0.55,
                            fontWeight: 400,
                          }}
                        >
                          {i18n.t("whitelabel.previewTabSampleInactive")}
                        </Typography>
                      </div>
                      <div
                        className={classes.livePreviewInner}
                        style={{
                          background: `linear-gradient(155deg, ${ensureHexPrefix(
                            draftLight || "#131B2D"
                          )} 0%, ${ensureHexPrefix(draftDark || "#131B2D")} 100%)`,
                        }}
                      >
                        <img
                          className={classes.livePreviewLogo}
                          src={previewLogoSrc}
                          alt=""
                          key={previewLogoSrc}
                          onError={(e) => {
                            const fallback = useDarkLogoInPreview
                              ? defaultLogoDark
                              : defaultLogoLight;
                            if (e.target.src !== fallback) {
                              e.target.onerror = null;
                              e.target.src = fallback;
                            }
                          }}
                        />
                        <Typography
                          variant="body2"
                          style={{
                            color: useDarkLogoInPreview
                              ? "rgba(255,255,255,0.95)"
                              : "rgba(15,23,42,0.92)",
                            fontWeight: 400,
                            letterSpacing: "-0.02em",
                          }}
                        >
                          {appName || settingsLoaded.appName || colorMode.appName || "OlaChat Pro"}
                        </Typography>
                      </div>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Seção de Logos e Imagens */}
            <Paper className={classes.sectionPaper}>
              <div className={classes.sectionHeader}>
                <Typography variant="h6" className={classes.sectionTitle}>
                  {i18n.t("whitelabel.sections.logos")}
                </Typography>
                <Typography className={classes.sectionSubtitle}>
                  {i18n.t("whitelabel.sections.logosDescription")}
                </Typography>
              </div>

              <Grid container spacing={3} alignItems="flex-start">
                <Grid item xs={12} md={7}>
                  <Grid container spacing={3} className={classes.logoSection}>
                <Grid xs={12} sm={6} md={4} item>
                  <FormControl className={classes.formField} fullWidth>
                    <TextField
                      id="logo-light-upload-field"
                      label={i18n.t("whitelabel.logoLight")}
                      variant="outlined"
                      value={settingsLoaded.appLogoLight || ""}
                      size="small"
                      className={classes.uploadField}
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <>
                            {settingsLoaded.appLogoLight && (
                              <IconButton
                                size="small"
                                color="default"
                                onClick={() => {
                                  handleSaveSetting("appLogoLight", "");
                                  colorMode.setAppLogoLight(defaultLogoLight);
                                }}
                              >
                                <Delete
                                  titleAccess={i18n.t("whitelabel.delete")}
                                />
                              </IconButton>
                            )}
                            <input
                              type="file"
                              id="upload-logo-light-button"
                              ref={logoLightInput}
                              className={classes.uploadInput}
                              onChange={(e) => uploadLogo(e, "Light")}
                            />
                            <label htmlFor="upload-logo-light-button">
                              <IconButton
                                size="small"
                                color="default"
                                onClick={() => {
                                  logoLightInput.current.click();
                                }}
                              >
                                <AttachFile
                                  titleAccess={i18n.t("whitelabel.upload")}
                                />
                              </IconButton>
                            </label>
                          </>
                        ),
                      }}
                    />
                  </FormControl>
                </Grid>

                <Grid xs={12} item>
                  <FormControl className={classes.formField} fullWidth>
                    <TextField
                      label="Insira sua Logo"
                      variant="outlined"
                      value=""
                      size="small"
                      placeholder="Clique no clipe para anexar"
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <>
                            <input
                              type="file"
                              id="upload-unified-logo-button"
                              className={classes.uploadInput}
                              onChange={uploadUnifiedLogo}
                              accept="image/png,image/jpeg,image/webp"
                            />
                            <label htmlFor="upload-unified-logo-button">
                              <IconButton
                                size="small"
                                color="default"
                                onClick={() => {
                                  const input = document.getElementById("upload-unified-logo-button");
                                  if (input) input.click();
                                }}
                              >
                                <AttachFile titleAccess="Anexar" />
                              </IconButton>
                            </label>
                          </>
                        ),
                      }}
                    />
                  </FormControl>
                </Grid>

                <Grid xs={12} sm={6} md={4} item>
                  <FormControl className={classes.formField} fullWidth>
                    <TextField
                      id="logo-tickets-upload-field"
                      label="Logo Atendimentos"
                      variant="outlined"
                      value={settingsLoaded.appLogoTickets || ""}
                      size="small"
                      className={classes.uploadField}
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <>
                            {settingsLoaded.appLogoTickets && (
                              <IconButton
                                size="small"
                                color="default"
                                onClick={() => {
                                  handleSaveSetting("appLogoTickets", "");
                                  colorMode.setAppLogoTickets("");
                                }}
                              >
                                <Delete titleAccess={i18n.t("whitelabel.delete")} />
                              </IconButton>
                            )}
                            <input
                              type="file"
                              id="upload-logo-tickets-button"
                              ref={ticketsLogoInput}
                              className={classes.uploadInput}
                              onChange={(e) => uploadLogo(e, "Tickets")}
                              accept="image/png,image/jpeg,image/webp"
                            />
                            <label htmlFor="upload-logo-tickets-button">
                              <IconButton
                                size="small"
                                color="default"
                                onClick={() => {
                                  ticketsLogoInput.current && ticketsLogoInput.current.click();
                                }}
                              >
                                <AttachFile titleAccess={i18n.t("whitelabel.upload")} />
                              </IconButton>
                            </label>
                          </>
                        ),
                      }}
                    />
                  </FormControl>
                </Grid>

                <Grid xs={12} sm={6} md={4} item>
                  <FormControl className={classes.formField} fullWidth>
                    <TextField
                      id="logo-dark-upload-field"
                      label={i18n.t("whitelabel.logoDark")}
                      variant="outlined"
                      value={settingsLoaded.appLogoDark || ""}
                      size="small"
                      className={classes.uploadField}
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <>
                            {settingsLoaded.appLogoDark && (
                              <IconButton
                                size="small"
                                color="default"
                                onClick={() => {
                                  handleSaveSetting("appLogoDark", "");
                                  colorMode.setAppLogoDark(defaultLogoDark);
                                }}
                              >
                                <Delete
                                  titleAccess={i18n.t("whitelabel.delete")}
                                />
                              </IconButton>
                            )}
                            <input
                              type="file"
                              id="upload-logo-dark-button"
                              ref={logoDarkInput}
                              className={classes.uploadInput}
                              onChange={(e) => uploadLogo(e, "Dark")}
                              accept="image/png,image/jpeg,image/webp,image/svg+xml"
                            />
                            <label htmlFor="upload-logo-dark-button">
                              <IconButton
                                size="small"
                                color="default"
                                onClick={() => {
                                  logoDarkInput.current.click();
                                }}
                              >
                                <AttachFile
                                  titleAccess={i18n.t("whitelabel.upload")}
                                />
                              </IconButton>
                            </label>
                          </>
                        ),
                      }}
                    />
                  </FormControl>
                </Grid>

                <Grid xs={12} sm={6} md={4} item>
                  <FormControl className={classes.formField} fullWidth>
                    <TextField
                      id="logo-favicon-upload-field"
                      label={i18n.t("whitelabel.favicon")}
                      variant="outlined"
                      value={settingsLoaded.appLogoFavicon || ""}
                      size="small"
                      className={classes.uploadField}
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <>
                            {settingsLoaded.appLogoFavicon && (
                              <IconButton
                                size="small"
                                color="default"
                                onClick={() => {
                                  handleSaveSetting("appLogoFavicon", "");
                                  colorMode.setAppLogoFavicon(defaultLogoFavicon);
                                }}
                              >
                                <Delete
                                  titleAccess={i18n.t("whitelabel.delete")}
                                />
                              </IconButton>
                            )}
                            <input
                              type="file"
                              id="upload-logo-favicon-button"
                              ref={logoFaviconInput}
                              className={classes.uploadInput}
                              onChange={(e) => uploadLogo(e, "Favicon")}
                            />
                            <label htmlFor="upload-logo-favicon-button">
                              <IconButton
                                size="small"
                                color="default"
                                onClick={() => {
                                  logoFaviconInput.current.click();
                                }}
                              >
                                <AttachFile
                                  titleAccess={i18n.t("whitelabel.upload")}
                                />
                              </IconButton>
                            </label>
                          </>
                        ),
                      }}
                    />
                  </FormControl>
                </Grid>

                <Grid xs={12} sm={6} md={6} item>
                  <FormControl className={classes.formField} fullWidth>
                    <TextField
                      id="background-light-upload-field"
                      label={i18n.t("whitelabel.backgroundLight")}
                      variant="outlined"
                      value={settingsLoaded.appLogoBackgroundLight || ""}
                      size="small"
                      className={classes.uploadField}
                      InputProps={{
                        readOnly: true,
                        endAdornment: (
                          <>
                            {settingsLoaded.appLogoBackgroundLight && (
                              <IconButton
                                size="small"
                                color="default"
                                onClick={() => {
                                  handleSaveSetting("appLogoBackgroundLight", "");
                                }}
                              >
                                <Delete
                                  titleAccess={i18n.t("whitelabel.delete")}
                                />
                              </IconButton>
                            )}
                            <input
                              type="file"
                              id="upload-background-light-button"
                              ref={backgroundLightInput}
                              className={classes.uploadInput}
                              onChange={(e) => uploadLogo(e, "BackgroundLight")}
                            />
                            <label htmlFor="upload-background-light-button">
                              <IconButton
                                size="small"
                                color="default"
                                onClick={() => {
                                  backgroundLightInput.current.click();
                                }}
                              >
                                <AttachFile
                                  titleAccess={i18n.t("whitelabel.upload")}
                                />
                              </IconButton>
                            </label>
                          </>
                        ),
                      }}
                    />
                  </FormControl>
                </Grid>

                <Grid xs={12} sm={6} md={6} item>
                  <Box className={classes.backgroundDarkColumn}>
                    <FormControl className={classes.formField} fullWidth>
                      <TextField
                        id="background-dark-upload-field"
                        label={i18n.t("whitelabel.backgroundDark")}
                        variant="outlined"
                        value={settingsLoaded.appLogoBackgroundDark || ""}
                        size="small"
                        className={classes.uploadField}
                        InputProps={{
                          readOnly: true,
                          endAdornment: (
                            <>
                              {settingsLoaded.appLogoBackgroundDark && (
                                <IconButton
                                  size="small"
                                  color="default"
                                  onClick={() => {
                                    handleSaveSetting("appLogoBackgroundDark", "");
                                  }}
                                >
                                  <Delete
                                    titleAccess={i18n.t("whitelabel.delete")}
                                  />
                                </IconButton>
                              )}
                              <input
                                type="file"
                                id="upload-background-dark-button"
                                ref={backgroundDarkInput}
                                className={classes.uploadInput}
                                onChange={(e) => uploadLogo(e, "BackgroundDark")}
                              />
                              <label htmlFor="upload-background-dark-button">
                                <IconButton
                                  size="small"
                                  color="default"
                                  onClick={() => {
                                    backgroundDarkInput.current.click();
                                  }}
                                >
                                  <AttachFile
                                    titleAccess={i18n.t("whitelabel.upload")}
                                  />
                                </IconButton>
                              </label>
                            </>
                          ),
                        }}
                      />
                    </FormControl>
                    <Box className={classes.logoSaveActions}>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSaveLogosSection}
                      >
                        {i18n.t("whitelabel.saveLogosSection")}
                      </Button>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
                </Grid>

                <Grid item xs={12} md={5}>
              <Box className={`${classes.previewSidebar} ${classes.livePreviewSticky}`}>
                <Typography
                  variant="subtitle2"
                  gutterBottom
                  className={classes.paletteSuggestedLabel}
                  style={{ marginBottom: 16 }}
                >
                  {i18n.t("whitelabel.preview")}
                </Typography>
                <Grid container spacing={2} className={classes.previewGrid}>
                  <Grid xs={12} sm={6} item>
                    <div className={`${classes.previewCard} ${classes.previewCardLight}`}>
                      <img
                        className={classes.previewImage}
                        src={settingsLoaded.appLogoLight ?
                          getBackendUrl() + "/public/" + settingsLoaded.appLogoLight :
                          defaultLogoLight
                        }
                        alt={i18n.t("whitelabel.preview") + " light-logo"}
                        onError={(e) => {
                          e.target.src = defaultLogoLight;
                        }}
                      />
                      <div className={classes.previewLabel}>
                        {i18n.t("whitelabel.logoLight")}
                      </div>
                    </div>
                  </Grid>

                  <Grid xs={12} sm={6} item>
                    <div className={`${classes.previewCard} ${classes.previewCardDark}`}>
                      <img
                        className={classes.previewImage}
                        src={settingsLoaded.appLogoDark ?
                          getBackendUrl() + "/public/" + settingsLoaded.appLogoDark :
                          defaultLogoDark
                        }
                        alt={i18n.t("whitelabel.preview") + " dark-logo"}
                        onError={(e) => {
                          e.target.src = defaultLogoDark;
                        }}
                      />
                      <div className={`${classes.previewLabel} ${classes.previewLabelDark}`}>
                        {i18n.t("whitelabel.logoDark")}
                      </div>
                    </div>
                  </Grid>

                  <Grid xs={12} sm={6} item>
                    <div className={`${classes.previewCard} ${classes.previewCardFavicon}`}>
                      <img
                        className={classes.previewImage}
                        src={settingsLoaded.appLogoFavicon ?
                          getBackendUrl() + "/public/" + settingsLoaded.appLogoFavicon :
                          defaultLogoFavicon
                        }
                        alt={i18n.t("whitelabel.preview") + " favicon"}
                        onError={(e) => {
                          e.target.src = defaultLogoFavicon;
                        }}
                      />
                      <div className={classes.previewLabel}>
                        {i18n.t("whitelabel.favicon")}
                      </div>
                    </div>
                  </Grid>

                  <Grid xs={12} sm={6} item>
                    <div className={`${classes.previewCard} ${classes.previewCardLight}`}>
                      <img
                        className={classes.previewImage}
                        src={settingsLoaded.appLogoTickets ?
                          getBackendUrl() + "/public/" + settingsLoaded.appLogoTickets :
                          (defaultLogoLight)
                        }
                        alt="preview tickets-logo"
                        onError={(e) => {
                          e.target.src = defaultLogoLight;
                        }}
                      />
                      <div className={classes.previewLabel}>
                        Logo Atendimentos
                      </div>
                    </div>
                  </Grid>

                  <Grid xs={12} sm={6} md={6} item>
                    <div className={`${classes.previewCard} ${classes.previewCardLight}`}>
                      {settingsLoaded.appLogoBackgroundLight ? (
                        <img
                          className={classes.previewBackgroundImage}
                          src={
                            getBackendUrl() +
                            "/public/" +
                            settingsLoaded.appLogoBackgroundLight
                          }
                          alt={i18n.t("whitelabel.preview") + " background-light"}
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className={classes.previewLabel}>
                          {i18n.t("whitelabel.backgroundLight")}
                        </div>
                      )}
                    </div>
                  </Grid>

                  <Grid xs={12} sm={6} md={6} item>
                    <div className={`${classes.previewCard} ${classes.previewCardDark}`}>
                      {settingsLoaded.appLogoBackgroundDark ? (
                        <img
                          className={classes.previewBackgroundImage}
                          src={
                            getBackendUrl() +
                            "/public/" +
                            settingsLoaded.appLogoBackgroundDark
                          }
                          alt={i18n.t("whitelabel.preview") + " background-dark"}
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className={`${classes.previewLabel} ${classes.previewLabelDark}`}>
                          {i18n.t("whitelabel.backgroundDark")}
                        </div>
                      )}
                    </div>
                  </Grid>
                </Grid>
              </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Seção de Idiomas */}
            <Paper className={classes.sectionPaper}>
              <div className={classes.sectionHeader}>
                <Typography variant="h6" className={classes.sectionTitle}>
                  {i18n.t("whitelabel.sections.languages")}
                </Typography>
                <Typography className={classes.sectionSubtitle}>
                  {i18n.t("whitelabel.sections.languagesDescription")}
                </Typography>
              </div>

              <div className={classes.languageSection}>
                <div className={classes.languageGrid}>
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <div key={lang.code} className={classes.languageItem}>
                      <Checkbox
                        className={classes.languageCheckbox}
                        checked={enabledLanguages.includes(lang.code)}
                        onChange={(e) => {
                          let newLangs = e.target.checked
                            ? [...enabledLanguages, lang.code]
                            : enabledLanguages.filter((c) => c !== lang.code);
                          if (newLangs.length === 0) {
                            toast.error(
                              i18n.t("whitelabel.atLeastOneLanguage")
                            );
                            return;
                          }
                          handleSaveEnabledLanguages(newLangs);
                        }}
                        color="primary"
                        size="small"
                      />
                      <span className={classes.languageLabel}>
                        {lang.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Box className={classes.sectionFooterActions}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSaveLanguagesClick}
                >
                  {i18n.t("whitelabel.saveLanguagesSection")}
                </Button>
              </Box>
            </Paper>
          </>
      ) : null}
    </div>
  );
}
