/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** Tokens visuais compartilhados no módulo Conexões (WhatsApp-like, textos claros no escuro). */

export function getConnectionsBorder(theme) {
  const isDark = theme.palette.type === "dark";
  return isDark ? "rgba(255,255,255,0.09)" : "#e8e8ed";
}

export function getConnectionsSurface(theme) {
  const isDark = theme.palette.type === "dark";
  return isDark ? "rgba(255,255,255,0.04)" : "#ffffff";
}

export function getConnectionsMutedSurface(theme) {
  const isDark = theme.palette.type === "dark";
  return isDark ? "rgba(255,255,255,0.02)" : "#fafafa";
}

/** Borda sutil para envoltório minimalista dos inputs (criar/editar). */
export function getConnectionsInputBorder(theme) {
  const isDark = theme.palette.type === "dark";
  return isDark ? "rgba(255,255,255,0.06)" : "rgba(15, 23, 42, 0.07)";
}

/** Estilos compartilhados do bloco minimalista em volta de TextField/FormControl. */
export function getConnectionsMinimalFieldWrap(theme) {
  const isDark = theme.palette.type === "dark";
  const border = getConnectionsInputBorder(theme);
  const bg = isDark ? "transparent" : "rgba(255,255,255,0.45)";
  const labelColor = theme.palette.text.secondary;

  return {
    borderRadius: 3,
    border: `1px solid ${border}`,
    backgroundColor: bg,
    padding: 0,
    marginBottom: theme.spacing(0.25),
    "&:focus-within": {
      borderColor: border,
      backgroundColor: bg,
      boxShadow: "none",
      outline: "none",
    },
    "& .MuiOutlinedInput-root.Mui-focused": {
      boxShadow: "none",
    },
    "& .MuiInputLabel-root.Mui-focused": {
      color: labelColor,
    },
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,
      backgroundColor: "transparent",
      fontSize: "0.625rem",
      minHeight: 26,
      lineHeight: 1.25,
    },
    "& .MuiOutlinedInput-input": {
      padding: theme.spacing(0.35, 0.45),
    },
    "& .MuiOutlinedInput-inputMarginDense": {
      paddingTop: 3,
      paddingBottom: 3,
    },
    "& .MuiOutlinedInput-notchedOutline": { border: "none" },
    "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline": {
      border: "none",
    },
    "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline": {
      border: "none",
    },
    "& .MuiInputLabel-root": {
      fontSize: "0.625rem",
      color: labelColor,
    },
    "& .MuiInputLabel-root.Mui-focused": {
      color: labelColor,
    },
    "& .MuiInputLabel-outlined.MuiInputLabel-marginDense": {
      transform: "translate(6px, 6px) scale(1)",
    },
    "& .MuiInputLabel-outlined.MuiInputLabel-shrink": {
      transform: "translate(6px, -5px) scale(0.76)",
    },
    "& .MuiFormHelperText-root": {
      marginTop: 0,
      marginLeft: 2,
      fontSize: "0.5625rem",
      lineHeight: 1.25,
    },
    "& .MuiSelect-select": {
      paddingTop: 4,
      paddingBottom: 4,
      fontSize: "0.6875rem",
    },
  };
}

/** Ícone OpenAI: preto no claro, branco no escuro */
export function getOpenAiIconColor(theme) {
  return theme.palette.type === "dark" ? "#ffffff" : "#000000";
}

/** Azul mais claro para Switch ativo no modo escuro (primary padrão some no fundo escuro). */
export const CONNECTIONS_SWITCH_DARK_BLUE = "#60A5FA";

/** Estilos MUI Switch checked — aplicar no container pai (ex.: switchRow). */
export function getConnectionsSwitchDarkStyles(theme) {
  if (theme.palette.type !== "dark") return {};
  const blue = CONNECTIONS_SWITCH_DARK_BLUE;
  return {
    "& .MuiSwitch-switchBase.Mui-checked": {
      color: blue,
    },
    "& .MuiSwitch-switchBase.Mui-checked:hover": {
      backgroundColor: "rgba(96, 165, 250, 0.12)",
    },
    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
      backgroundColor: blue,
      opacity: 0.55,
    },
  };
}

export function getConnectionStatusLabel(whatsApp) {
  if (!whatsApp) return "—";
  const { status, channel, hasMtprotoSession } = whatsApp;
  if (channel === "telegram_oficial") {
    if (status === "CONNECTED" || hasMtprotoSession) return "Conta conectada";
    if (status === "PAIRING") return "Aguardando código";
    return "Login pendente";
  }
  if (status === "CONNECTED") return "Conectado";
  if (status === "DISCONNECTED") return "Desconectado";
  if (status === "qrcode") return "Aguardando QR Code";
  if (status === "OPENING") return "Conectando…";
  if (status === "PAIRING") return "Pareando…";
  if (status === "TIMEOUT") return "Timeout";
  return status || "—";
}
