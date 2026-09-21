/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { useIsDarkMode } from "../../hooks/useMediaQueryBrain";
import {
  SiGithub,
  SiGooglesheets,
  SiNotion,
  SiSupabase,
} from "react-icons/si";
import { getBrainMcpById } from "../../config/brainMcpCatalog";
import {
  FigmaBrandIcon,
  GoogleDriveBrandIcon,
  GoogleCalendarBrandIcon,
} from "./BrainMcpBrandIcons";

const CRM_IMAGE_ICONS = {
  hubspot: null,
  clickup: null,
  pipedrive: null,
};

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

const MONO_ICONS = {
  google_sheets: SiGooglesheets,
  github: SiGithub,
  notion: SiNotion,
  supabase: SiSupabase,
};

function resolveIconColor(id, item, isDark) {
  if (!item) return undefined;
  if (isDark && (id === "github" || id === "notion")) {
    return "#ffffff";
  }
  return item.accent;
}

export default function BrainMcpIcon({ id, size = 18, className, style }) {
  const isDark = useIsDarkMode();
  const item = getBrainMcpById(id);

  if (id === "google_drive") {
    return (
      <GoogleDriveBrandIcon
        size={size}
        className={className}
        style={{ flexShrink: 0, ...style }}
      />
    );
  }

  if (id === "google_calendar") {
    return (
      <GoogleCalendarBrandIcon
        size={size}
        className={className}
        style={{ flexShrink: 0, ...style }}
      />
    );
  }

  if (id === "figma") {
    return (
      <FigmaBrandIcon
        size={size}
        className={className}
        style={{ flexShrink: 0, ...style }}
      />
    );
  }

  if (CRM_IMAGE_ICONS[id]) {
    return (
      <BrandImageIcon
        src={CRM_IMAGE_ICONS[id]}
        size={size}
        alt={id}
        className={className}
        style={style}
      />
    );
  }

  const Icon = MONO_ICONS[id];
  if (!Icon) return null;

  return (
    <Icon
      size={size}
      className={className}
      style={{ color: resolveIconColor(id, item, isDark), flexShrink: 0, ...style }}
      aria-hidden
    />
  );
}
