/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Button,
  FormControl,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Popover,
  Select,
  Tooltip,
  makeStyles,
  useTheme,
} from "@material-ui/core";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import { toast } from "react-toastify";
import api from "../../services/api";
import {
  getTopbarHover,
  appleSelectMenuProps,
  appleMenuItemProps,
} from "../../utils/appleModalTheme";

const TRANSLATE_LANGUAGES = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "en", label: "Inglês" },
  { value: "es", label: "Espanhol" },
  { value: "fr", label: "Francês" },
  { value: "de", label: "Alemão" },
  { value: "it", label: "Italiano" },
  { value: "ru", label: "Russo" },
  { value: "zh-CN", label: "Chinês (Simplificado)" },
  { value: "zh-TW", label: "Chinês (Tradicional)" },
  { value: "ja", label: "Japonês" },
  { value: "ko", label: "Coreano" },
  { value: "ar", label: "Árabe" },
  { value: "hi", label: "Hindi" },
  { value: "tr", label: "Turco" },
  { value: "nl", label: "Holandês" },
  { value: "pl", label: "Polonês" },
  { value: "sv", label: "Sueco" },
  { value: "no", label: "Norueguês" },
  { value: "da", label: "Dinamarquês" },
  { value: "fi", label: "Finlandês" },
  { value: "he", label: "Hebraico" },
  { value: "el", label: "Grego" },
  { value: "id", label: "Indonésio" },
  { value: "th", label: "Tailandês" },
  { value: "vi", label: "Vietnamita" },
  { value: "uk", label: "Ucraniano" },
  { value: "ro", label: "Romeno" },
  { value: "cs", label: "Tcheco" },
  { value: "hu", label: "Húngaro" },
  { value: "sk", label: "Eslovaco" },
  { value: "bg", label: "Búlgaro" },
  { value: "hr", label: "Croata" },
  { value: "sr", label: "Sérvio" },
  { value: "ms", label: "Malaio" },
  { value: "fa", label: "Persa" },
  { value: "ur", label: "Urdu" },
  { value: "bn", label: "Bengali" },
  { value: "ta", label: "Tâmil" },
];

const useStyles = makeStyles((theme) => {
  const isDark = theme.palette.type === "dark";
  const topbarHover = getTopbarHover(theme);
  const composerText = isDark ? "#f5f5f5" : "#0a0a0a";
  const composerTextMuted = isDark ? "rgba(255,255,255,0.5)" : "rgba(10,10,10,0.45)";

  return {
    aiBtn: {
      padding: 4,
      color: isDark ? "#60a5fa" : "#2563eb",
      "&:hover": {
        backgroundColor: isDark ? "rgba(96,165,250,0.12)" : "rgba(37,99,235,0.08)",
      },
    },
    aiMenuPaper: {
      borderRadius: 14,
      minWidth: 200,
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      fontWeight: 400,
      padding: theme.spacing(0.5, 0),
      boxShadow: isDark
        ? "0 16px 48px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)"
        : "0 16px 48px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.9)",
      backdropFilter: "saturate(180%) blur(20px)",
      WebkitBackdropFilter: "saturate(180%) blur(20px)",
      "& .MuiMenuItem-root": {
        fontSize: 13,
        fontWeight: 400,
        letterSpacing: "-0.01em",
        padding: "8px 16px",
        borderRadius: 8,
        margin: "2px 8px",
        minHeight: 36,
      },
    },
    aiTranslatePaper: {
      width: 272,
      maxWidth: "min(272px, calc(100vw - 24px))",
      borderRadius: 16,
      padding: 0,
      overflow: "hidden",
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      fontWeight: 400,
      boxShadow: isDark
        ? "0 16px 40px rgba(0,0,0,0.5), 0 0 0 0.5px rgba(255,255,255,0.1)"
        : "0 16px 40px rgba(15,23,42,0.14), 0 0 0 0.5px rgba(255,255,255,0.9)",
      border: isDark
        ? "0.5px solid rgba(255,255,255,0.12)"
        : "0.5px solid rgba(255,255,255,0.75)",
      backgroundColor: isDark ? "rgba(44,44,46,0.92)" : "rgba(255,255,255,0.96)",
      backdropFilter: "saturate(180%) blur(20px)",
      WebkitBackdropFilter: "saturate(180%) blur(20px)",
      color: composerText,
    },
    aiTranslatePopoverBody: {
      padding: theme.spacing(1, 1.25, 1.25),
      color: composerText,
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      fontWeight: 400,
      boxSizing: "border-box",
      "& .MuiFormLabel-root": {
        color: composerTextMuted,
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: "0.02em",
        transform: "translate(12px, 10px) scale(1)",
      },
      "& .MuiInputLabel-shrink": {
        transform: "translate(12px, -6px) scale(0.85)",
      },
      "& .MuiOutlinedInput-root": {
        color: composerText,
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        fontSize: 12,
        fontWeight: 400,
        borderRadius: 10,
        backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(120,120,128,0.08)",
      },
      "& .MuiOutlinedInput-input": {
        fontSize: 12,
        fontWeight: 400,
        padding: "8px 10px",
      },
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: "transparent",
      },
      "& .MuiOutlinedInput-root.Mui-focused": {
        boxShadow: `0 0 0 2px ${topbarHover}33`,
      },
      "& .MuiSelect-icon": {
        color: composerTextMuted,
        fontSize: 20,
      },
    },
    aiTranslateHeader: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 1,
      padding: theme.spacing(1, 1.25, 0.75),
      color: composerText,
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      fontSize: 13,
      fontWeight: 500,
      letterSpacing: "-0.02em",
      lineHeight: 1.25,
      borderBottom: isDark
        ? "0.5px solid rgba(255,255,255,0.08)"
        : "0.5px solid rgba(60,60,67,0.1)",
    },
    aiTranslateSubtitle: {
      fontSize: 10,
      fontWeight: 400,
      letterSpacing: "-0.01em",
      color: composerTextMuted,
      textAlign: "center",
      lineHeight: 1.3,
      margin: 0,
    },
    aiPromptPaper: {
      width: 328,
      maxWidth: "calc(100vw - 24px)",
      borderRadius: 22,
      padding: 0,
      overflow: "hidden",
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      fontWeight: 400,
      boxShadow: isDark
        ? "0 24px 64px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.08)"
        : "0 24px 64px rgba(15,23,42,0.18), 0 0 0 0.5px rgba(255,255,255,0.9), inset 0 1px 0 rgba(255,255,255,0.95)",
      border: isDark
        ? "0.5px solid rgba(255,255,255,0.14)"
        : "0.5px solid rgba(255,255,255,0.75)",
      backgroundColor: isDark ? "rgba(44,44,46,0.78)" : "rgba(255,255,255,0.72)",
      backdropFilter: "saturate(200%) blur(28px)",
      WebkitBackdropFilter: "saturate(200%) blur(28px)",
      color: composerText,
    },
    aiPromptHeader: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
      padding: theme.spacing(1.75, 2, 1),
      color: composerText,
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      fontSize: 15,
      fontWeight: 400,
      letterSpacing: "-0.02em",
      lineHeight: 1.25,
      borderBottom: isDark
        ? "0.5px solid rgba(255,255,255,0.08)"
        : "0.5px solid rgba(60,60,67,0.1)",
    },
    aiPromptSubtitle: {
      fontSize: 10,
      fontWeight: 400,
      letterSpacing: "-0.01em",
      color: composerTextMuted,
      textAlign: "center",
      lineHeight: 1.3,
      margin: 0,
    },
    aiPromptPopoverBody: {
      padding: theme.spacing(1.25, 1.5, 1.5),
      color: composerText,
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      fontWeight: 400,
      boxSizing: "border-box",
    },
    aiPromptTextarea: {
      width: "100%",
      minHeight: 88,
      resize: "vertical",
      border: "none",
      outline: "none",
      borderRadius: 12,
      padding: "10px 12px",
      fontSize: 13,
      fontWeight: 400,
      lineHeight: 1.45,
      letterSpacing: "-0.01em",
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      color: composerText,
      backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(120,120,128,0.08)",
      boxSizing: "border-box",
      "&::placeholder": {
        color: composerTextMuted,
        opacity: 1,
      },
    },
    aiPromptActions: {
      display: "flex",
      justifyContent: "stretch",
      gap: theme.spacing(0.75),
      marginTop: theme.spacing(1),
      paddingTop: theme.spacing(0.25),
      borderTop: isDark
        ? "0.5px solid rgba(255,255,255,0.08)"
        : "0.5px solid rgba(60,60,67,0.1)",
      "& > button": {
        flex: 1,
        margin: 0,
        textTransform: "none",
        borderRadius: 12,
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        fontSize: 13,
        fontWeight: 400,
        letterSpacing: "-0.01em",
        minHeight: 36,
        padding: "7px 14px",
        boxShadow: "none",
      },
    },
    aiPromptBtnCancel: {
      color: `${composerText} !important`,
      backgroundColor: isDark ? "rgba(120,120,128,0.24)" : "rgba(120,120,128,0.16)",
      border: "none !important",
      "&:hover": {
        backgroundColor: isDark ? "rgba(120,120,128,0.32)" : "rgba(120,120,128,0.22)",
      },
    },
    aiPromptBtnApply: {
      color: "#fff !important",
      backgroundColor: `${topbarHover} !important`,
      border: "none !important",
      "&:hover": {
        backgroundColor: `${topbarHover} !important`,
      },
      "&.Mui-disabled": {
        backgroundColor: isDark ? "rgba(120,120,128,0.3) !important" : "rgba(120,120,128,0.25) !important",
        color: "rgba(255,255,255,0.5) !important",
      },
    },
  };
});

export default function ComposerAiAssist({
  text,
  onTextChange,
  disabled = false,
  popoverAnchorRef,
  onFocusInput,
  triggerClassName,
  iconSize = 16,
  useNativeButton = false,
}) {
  const classes = useStyles();
  const theme = useTheme();
  const nativeIconColor =
    theme.palette.type === "dark" ? theme.palette.common.white : "#2563eb";
  const triggerRef = useRef(null);
  const aiPromptInputRef = useRef(null);

  const [aiMenuAnchor, setAiMenuAnchor] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPromptOpen, setAiPromptOpen] = useState(false);
  const [aiPromptAnchorEl, setAiPromptAnchorEl] = useState(null);
  const [aiPromptText, setAiPromptText] = useState("");
  const [aiTranslateOpen, setAiTranslateOpen] = useState(false);
  const [aiTranslateLang, setAiTranslateLang] = useState("pt-BR");

  const popoverAnchor =
    aiPromptAnchorEl || popoverAnchorRef?.current || triggerRef.current;

  const handleOpenAIMenu = (e) => {
    e?.stopPropagation?.();
    setAiMenuAnchor(e.currentTarget);
  };
  const handleCloseAIMenu = () => setAiMenuAnchor(null);

  const handleOpenAiPrompt = () => {
    setAiPromptText("");
    setAiPromptAnchorEl(aiMenuAnchor);
    setAiPromptOpen(true);
    handleCloseAIMenu();
  };

  const handleCloseAiPrompt = () => {
    setAiPromptOpen(false);
    setAiPromptText("");
  };

  useEffect(() => {
    if (!aiPromptOpen) return undefined;
    const t = setTimeout(() => aiPromptInputRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [aiPromptOpen]);

  const callOpenAITransform = useCallback(
    async (systemPrompt, userPrompt) => {
      const sourceText = String(text || "").trim();
      if (!sourceText) {
        toast.error("Digite um texto no campo antes de usar a IA.");
        handleCloseAIMenu();
        return;
      }
      try {
        setAiLoading(true);
        const { data } = await api.post("/prompt/composer-assist", {
          systemPrompt,
          userPrompt,
        });
        const next = String(data?.text || "").trim();
        if (next) {
          onTextChange?.(next);
          onFocusInput?.();
        } else {
          toast.error("A IA não retornou texto. Verifique o modelo em Agente IA → Integração.");
        }
      } catch (err) {
        const msg =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Falha ao usar IA. Verifique a API Key e o modelo em Agente IA → Integração.";
        toast.error(msg);
      } finally {
        setAiLoading(false);
        handleCloseAIMenu();
      }
    },
    [text, onTextChange, onFocusInput]
  );

  const handleImproveGrammar = () => {
    callOpenAITransform(
      "Você é um revisor. Corrija apenas gramática e ortografia, mantendo o mesmo tom e intenção. Responda apenas com o texto corrigido, sem comentários.",
      `Texto original:\n${text}`
    );
  };

  const handleImproveText = () => {
    callOpenAITransform(
      "Você é um editor. Reescreva o texto de forma mais clara, natural e objetiva, mantendo o sentido. Responda apenas com o texto reescrito.",
      `Texto original:\n${text}`
    );
  };

  const handleRunAiPrompt = () => {
    if (!String(aiPromptText || "").trim()) {
      setAiPromptOpen(false);
      return;
    }
    callOpenAITransform(
      "Siga estritamente as instruções do usuário para transformar o texto. Responda somente com o resultado final, sem explicações.",
      `Instruções: ${aiPromptText}\n\nTexto original:\n${text}`
    );
    setAiPromptOpen(false);
  };

  const handleTranslate = () => {
    setAiPromptAnchorEl(aiMenuAnchor);
    setAiTranslateOpen(true);
    handleCloseAIMenu();
  };

  const handleConfirmTranslate = () => {
    if (!aiTranslateLang) {
      setAiTranslateOpen(false);
      return;
    }
    callOpenAITransform(
      `Traduza o texto para ${aiTranslateLang}. Preserve o sentido e o tom. Responda apenas com o texto traduzido.`,
      `Texto:\n${text}`
    );
    setAiTranslateOpen(false);
  };

  const trigger = useNativeButton ? (
    <Tooltip title="IA Prompts">
      <button
        type="button"
        ref={triggerRef}
        className={triggerClassName}
        onClick={handleOpenAIMenu}
        disabled={disabled || aiLoading}
        aria-label="IA Prompts"
      >
        <AutoAwesomeOutlinedIcon style={{ fontSize: iconSize, color: nativeIconColor }} />
      </button>
    </Tooltip>
  ) : (
    <Tooltip title="IA Prompts">
      <span style={{ display: "inline-flex" }}>
        <IconButton
          ref={triggerRef}
          size="small"
          className={triggerClassName || classes.aiBtn}
          onClick={handleOpenAIMenu}
          disabled={disabled || aiLoading}
          aria-label="IA Prompts"
        >
          <AutoAwesomeOutlinedIcon style={{ fontSize: iconSize }} />
        </IconButton>
      </span>
    </Tooltip>
  );

  return (
    <>
      {trigger}

      <Menu
        anchorEl={aiMenuAnchor}
        keepMounted
        open={Boolean(aiMenuAnchor)}
        onClose={handleCloseAIMenu}
        PaperProps={{ className: classes.aiMenuPaper, style: { zIndex: 2100 } }}
      >
        <MenuItem onClick={handleImproveGrammar} disabled={aiLoading}>
          Melhorar gramática
        </MenuItem>
        <MenuItem onClick={handleImproveText} disabled={aiLoading}>
          Melhorar texto
        </MenuItem>
        <MenuItem onClick={handleOpenAiPrompt} disabled={aiLoading}>
          Prompt (pedir um texto)
        </MenuItem>
        <MenuItem onClick={handleTranslate} disabled={aiLoading}>
          Traduzir
        </MenuItem>
      </Menu>

      <Popover
        open={aiPromptOpen}
        onClose={handleCloseAiPrompt}
        anchorEl={popoverAnchor}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
        PaperProps={{ className: classes.aiPromptPaper, style: { zIndex: 2100 } }}
        keepMounted
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
        TransitionProps={{
          timeout: 220,
          onEntering: () => aiPromptInputRef.current?.focus(),
        }}
        onKeyDownCapture={(e) => e.stopPropagation()}
        onKeyUpCapture={(e) => e.stopPropagation()}
        onMouseDownCapture={(e) => e.stopPropagation()}
      >
        <div className={classes.aiPromptHeader}>
          <span>Prompt do Agente</span>
          <p className={classes.aiPromptSubtitle}>
            Descreva o que a IA deve gerar ou alterar no texto
          </p>
        </div>
        <div className={classes.aiPromptPopoverBody}>
          <textarea
            ref={aiPromptInputRef}
            className={classes.aiPromptTextarea}
            placeholder="Descreva o que a IA deve fazer…"
            value={aiPromptText}
            onChange={(e) => setAiPromptText(e.target.value)}
            rows={4}
            autoFocus
            onKeyDownCapture={(e) => e.stopPropagation()}
            onKeyUpCapture={(e) => e.stopPropagation()}
            onKeyPressCapture={(e) => e.stopPropagation()}
            onFocusCapture={(e) => e.stopPropagation()}
            onMouseDownCapture={(e) => e.stopPropagation()}
          />
          <div className={classes.aiPromptActions}>
            <Button
              size="small"
              className={classes.aiPromptBtnCancel}
              onClick={handleCloseAiPrompt}
            >
              Cancelar
            </Button>
            <Button
              size="small"
              className={classes.aiPromptBtnApply}
              variant="contained"
              disableElevation
              onClick={handleRunAiPrompt}
              disabled={aiLoading}
            >
              {aiLoading ? "Processando…" : "Aplicar"}
            </Button>
          </div>
        </div>
      </Popover>

      <Popover
        open={aiTranslateOpen}
        onClose={() => setAiTranslateOpen(false)}
        anchorEl={popoverAnchor}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
        PaperProps={{ className: classes.aiTranslatePaper, style: { zIndex: 2100 } }}
        keepMounted
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
        onKeyDownCapture={(e) => e.stopPropagation()}
        onKeyUpCapture={(e) => e.stopPropagation()}
      >
        <div className={classes.aiTranslateHeader}>
          <span>Traduzir</span>
          <p className={classes.aiTranslateSubtitle}>Escolha o idioma de destino</p>
        </div>
        <div className={classes.aiTranslatePopoverBody}>
          <FormControl fullWidth variant="outlined" size="small">
            <InputLabel id="composer-ai-translate-label">Idioma</InputLabel>
            <Select
              labelId="composer-ai-translate-label"
              label="Idioma"
              value={aiTranslateLang}
              onChange={(e) => setAiTranslateLang(e.target.value)}
              MenuProps={{
                ...appleSelectMenuProps(theme),
                disablePortal: true,
                anchorOrigin: { vertical: "bottom", horizontal: "left" },
                transformOrigin: { vertical: "top", horizontal: "left" },
                PaperProps: {
                  ...appleSelectMenuProps(theme).PaperProps,
                  style: {
                    ...appleSelectMenuProps(theme).PaperProps?.style,
                    maxHeight: 200,
                    maxWidth: "min(240px, calc(100vw - 32px))",
                    width: "min(240px, calc(100vw - 32px))",
                  },
                },
                MenuListProps: {
                  ...appleSelectMenuProps(theme).MenuListProps,
                  style: {
                    ...appleSelectMenuProps(theme).MenuListProps?.style,
                    maxHeight: 188,
                    padding: "4px 0",
                  },
                  onKeyDown: (e) => e.stopPropagation(),
                },
              }}
            >
              {TRANSLATE_LANGUAGES.map((lang) => (
                <MenuItem key={lang.value} value={lang.value} {...appleMenuItemProps}>
                  {lang.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <div className={classes.aiPromptActions}>
            <Button
              size="small"
              className={classes.aiPromptBtnCancel}
              onClick={() => setAiTranslateOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="small"
              className={classes.aiPromptBtnApply}
              variant="contained"
              disableElevation
              onClick={handleConfirmTranslate}
              disabled={aiLoading}
            >
              {aiLoading ? "Processando…" : "Traduzir"}
            </Button>
          </div>
        </div>
      </Popover>
    </>
  );
}
