/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import {
  Facebook,
  Instagram,
  WhatsApp,
} from "@material-ui/icons";
import TelegramIcon from "@mui/icons-material/Telegram";
import {
  SiGithub,
  SiGmail,
  SiNotion,
  SiTiktok,
  SiSupabase,
  SiHubspot,
} from "react-icons/si";
const VBSOLUTION_FAVICON = "/android-chrome-192x192.png";
import { LobeClaudeIcon, LobeGeminiIcon, LobeGrokIcon, LobeOpenAIIcon } from "../../components/LobeBrandIcon";
import {
  FigmaBrandIcon,
  GoogleDriveBrandIcon,
  GoogleSheetsBrandIcon,
  LinkedInBrandIcon,
  GoogleCalendarBrandIcon,
} from "../../components/BrainMcpDialog/BrainMcpBrandIcons";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import clsx from "clsx";
import { getOpenAiIconColor } from "./connectionsTheme";

const useStyles = makeStyles(() => ({
  root: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    lineHeight: 0,
    boxSizing: "border-box",
  },
  hub: {
    width: 48,
    height: 48,
  },
  hubBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  header: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  list: {
    width: 36,
    height: 36,
    borderRadius: 9,
  },
  table: {
    width: 28,
    height: 28,
    borderRadius: 7,
  },
  card: {
    width: 20,
    height: 20,
    borderRadius: 5,
  },
  filled: {
    boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
  },
}));

function OutlookBrandGlyph({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={{ display: "block", flexShrink: 0 }}
    >
      <path
        fill="#0078D4"
        d="M24 7.387v9.226c0 .724-.576 1.303-1.297 1.303H1.297C.576 17.916 0 17.337 0 16.613V7.387c0-.724.576-1.303 1.297-1.303h21.406C23.424 6.084 24 6.663 24 7.387z"
      />
      <path fill="#0364B8" d="M23 7.387H1V5.5C1 4.1 2.1 3 3.5 3h16C20.9 3 22 4.1 22 5.5v1.9z" />
      <path fill="#28A8EA" d="M12 12.5L1 7.4h22l-11 5.1z" />
      <path fill="#0078D4" d="M1 7.4v9.2l10.5-5.1L1 7.4z" />
      <path fill="#50D9FF" d="M12 12.5L23 7.4v9.2l-11-5.1z" />
      <path fill="#0364B8" d="M12 12.5L1 15.6V7.4l11 5.1z" />
      <path fill="#0078D4" d="M23 15.6L12 12.5 23 7.4v9.2z" />
    </svg>
  );
}

function EmailDualGlyph({ boxSize = 32 }) {
  const iconSize = Math.max(12, Math.round(boxSize * 0.44));
  const gap = Math.max(2, Math.round(boxSize * 0.08));
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap,
        width: boxSize,
        height: boxSize,
        lineHeight: 0,
        flexShrink: 0,
      }}
      aria-hidden
    >
      <SiGmail size={iconSize} color="#EA4335" />
      <OutlookBrandGlyph size={iconSize} />
    </span>
  );
}

function SmsBrandGlyph({ size = 24, color = "#2563eb" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 4H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h2v3.5c0 .6.7.9 1.1.5L12 18h8c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z"
        fill={color}
      />
    </svg>
  );
}

function BrandImageIcon({ src, size, alt = "" }) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      style={{ display: "block", objectFit: "contain", flexShrink: 0 }}
      draggable={false}
    />
  );
}

const BRAND_RENDERERS = {
  whatsapp: ({ size, color }) => (
    <WhatsApp style={{ fontSize: size, color }} />
  ),
  telegram: ({ size, color }) => (
    <TelegramIcon style={{ fontSize: size, color }} />
  ),
  facebook: ({ size, color }) => (
    <Facebook style={{ fontSize: size, color }} />
  ),
  instagram: ({ size, color }) => (
    <Instagram style={{ fontSize: size, color }} />
  ),
  email: ({ size }) => <EmailDualGlyph boxSize={size} />,
  sms: ({ size, color }) => <SmsBrandGlyph size={size} color={color} />,
  openai: ({ size }) => <LobeOpenAIIcon size={size} />,
  claude: ({ size }) => <LobeClaudeIcon size={size} />,
  gemini: ({ size }) => <LobeGeminiIcon size={size} />,
  grok: ({ size }) => <LobeGrokIcon size={size} />,
  tiktok: ({ size, color }) => <SiTiktok size={size} color={color || "#000000"} />,
  linkedin: ({ size, color }) => (
    <LinkedInBrandIcon size={size} color={color || "#0A66C2"} />
  ),
  "google-drive": ({ size }) => <GoogleDriveBrandIcon size={size} />,
  "google-sheets": ({ size }) => <GoogleSheetsBrandIcon size={size} />,
  "google-calendar": ({ size }) => <GoogleCalendarBrandIcon size={size} />,
  figma: ({ size }) => <FigmaBrandIcon size={size} />,
  notion: ({ size, color }) => <SiNotion size={size} color={color || "#000000"} />,
  github: ({ size, color, theme }) => (
    <SiGithub
      size={size}
      color={color || (theme?.palette?.type === "dark" ? "#f4f4f5" : "#181717")}
    />
  ),
  supabase: ({ size, color }) => <SiSupabase size={size} color={color || "#3ECF8E"} />,
  hubspot: ({ size, color }) => <SiHubspot size={size} color={color || "#FF7A59"} />,
  clickup: ({ size, color }) => (
    <span
      style={{
        display: "inline-flex",
        width: size,
        height: size,
        borderRadius: 6,
        background: color || "#7B68EE",
        color: "#fff",
        fontSize: Math.max(10, Math.round(size * 0.38)),
        fontWeight: 700,
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
      }}
    >
      CU
    </span>
  ),
  pipedrive: ({ size, color }) => (
    <span
      style={{
        display: "inline-flex",
        width: size,
        height: size,
        borderRadius: 6,
        background: color || "#017737",
        color: "#fff",
        fontSize: Math.max(10, Math.round(size * 0.38)),
        fontWeight: 700,
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
      }}
    >
      PD
    </span>
  ),
  "vbsolution-api": ({ size }) => (
    <BrandImageIcon src={VBSOLUTION_FAVICON} size={size} alt="VBSolution" />
  ),
};

const SIZE_MAP = { hub: 32, hubBox: 40, header: 28, list: 22, table: 18, card: 14 };

export function resolveBrandIconColor(brandKey, theme, { accentColor, background, plain }) {
  if (brandKey === "github") {
    if (theme.palette.type === "dark") {
      return accentColor === "#181717" ? "#181717" : "#f4f4f5";
    }
    return accentColor || "#181717";
  }
  if (brandKey === "openai" && plain) {
    return getOpenAiIconColor(theme);
  }
  if (brandKey === "email") {
    return accentColor || "#EA4335";
  }
  if (brandKey === "supabase") {
    return accentColor || "#3ECF8E";
  }
  if (brandKey === "notion") {
    return accentColor || (theme.palette.type === "dark" ? "#f4f4f5" : "#000000");
  }
  if (plain) {
    return accentColor || background || "#6366f1";
  }
  return "#ffffff";
}

export default function IntegrationBrandIcon({
  brandKey = "whatsapp",
  variant = "hub",
  background,
  accentColor,
  plain = false,
  className,
}) {
  const classes = useStyles();
  const theme = useTheme();
  const iconSize = SIZE_MAP[variant] || 24;
  const render = BRAND_RENDERERS[brandKey] || BRAND_RENDERERS.whatsapp;
  const color = resolveBrandIconColor(brandKey, theme, {
    accentColor,
    background,
    plain,
  });

  const multicolorBrandKeys = new Set([
    "email",
    "google-drive",
    "google-sheets",
    "google-calendar",
    "figma",
    "notion",
    "github",
    "supabase",
    "hubspot",
    "clickup",
    "pipedrive",
    "vbsolution-api",
    "tiktok",
    "linkedin",
    "grok",
  ]);

  if (plain || multicolorBrandKeys.has(brandKey)) {
    return (
      <span
        className={clsx(classes.root, classes[variant], className)}
        aria-hidden
      >
        {render({ size: iconSize, color, theme })}
      </span>
    );
  }

  const boxBg =
    brandKey === "openai"
      ? theme.palette.type === "dark"
        ? "rgba(255,255,255,0.12)"
        : "rgba(0,0,0,0.06)"
      : background || "rgba(120,120,128,0.12)";

  return (
    <span
      className={clsx(classes.root, classes[variant], classes.filled, className)}
      style={{ background: boxBg }}
      aria-hidden
    >
      {render({
        size: iconSize,
        color: "#ffffff",
        theme,
      })}
    </span>
  );
}

export function getBrandVisual(integration) {
  const map = {
    "whatsapp-web": { brandKey: "whatsapp", accent: "#25D366", iconBg: "#25D366" },
    "whatsapp-oficial": { brandKey: "whatsapp", accent: "#25D366", iconBg: "#128C7E" },
    "telegram-bot": { brandKey: "telegram", accent: "#0088cc", iconBg: "#2AABEE" },
    "telegram-oficial": { brandKey: "telegram", accent: "#229ED9", iconBg: "#229ED9" },
    sms: { brandKey: "sms", accent: "#2563eb", iconBg: "#3b82f6" },
    facebook: { brandKey: "facebook", accent: "#1877F2", iconBg: "#1877F2" },
    instagram: { brandKey: "instagram", accent: "#E4405F", iconBg: "#E4405F" },
    email: { brandKey: "email", accent: "#EA4335", iconBg: "#0078D4" },
    openai: { brandKey: "openai", accent: "#10a37f", iconBg: "#10a37f" },
    claude: { brandKey: "claude", accent: "#D97757", iconBg: "#CC785C" },
    gemini: { brandKey: "gemini", accent: "#4285F4", iconBg: "#5B7FD6" },
    grok: { brandKey: "grok", accent: "#1C1C1C", iconBg: "#111111" },
    "linkedin-messaging": {
      brandKey: "linkedin",
      accent: "#0A66C2",
      iconBg: "#0A66C2",
    },
    "google-drive": { brandKey: "google-drive", accent: "#4285F4", iconBg: "#4285F4" },
    "google-sheets": { brandKey: "google-sheets", accent: "#0F9D58", iconBg: "#0F9D58" },
    "google-calendar": {
      brandKey: "google-calendar",
      accent: "#4285F4",
      iconBg: "#4285F4",
    },
    figma: { brandKey: "figma", accent: "#A259FF", iconBg: "#1E1E1E" },
    notion: { brandKey: "notion", accent: "#000000", iconBg: "#191919" },
    github: { brandKey: "github", accent: "#181717", iconBg: "#24292f", iconBgDark: "#f4f4f5", accentDark: "#181717" },
    supabase: { brandKey: "supabase", accent: "#3ECF8E", iconBg: "#1C1C1C" },
    hubspot: { brandKey: "hubspot", accent: "#FF7A59", iconBg: "#FF7A59" },
    clickup: { brandKey: "clickup", accent: "#7B68EE", iconBg: "#7B68EE" },
    pipedrive: { brandKey: "pipedrive", accent: "#017737", iconBg: "#017737" },
    "vbsolution-api": {
      brandKey: "vbsolution-api",
      accent: "#1e3a5f",
      iconBg: "#1e3a5f",
      plain: true
    },
  };
  return (
    map[integration?.key] || {
      brandKey: "whatsapp",
      accent: "#6366f1",
      iconBg: "#6366f1",
    }
  );
}

export function getBrandVisualByChannel(channel) {
  const keyMap = {
    whatsapp: "whatsapp-web",
    whatsapp_oficial: "whatsapp-oficial",
    telegram: "telegram-bot",
    telegram_oficial: "telegram-oficial",
    sms: "sms",
    facebook: "facebook",
    instagram: "instagram",
    linkedin: "linkedin-messaging",
  };
  return getBrandVisual({ key: keyMap[channel] || "whatsapp-web" });
}
