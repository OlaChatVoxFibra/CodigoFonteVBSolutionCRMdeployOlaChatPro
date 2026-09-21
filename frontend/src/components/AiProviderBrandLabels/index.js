/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { makeStyles, useTheme } from "@material-ui/core/styles";
import { OpenAIIcon } from "../ui/OpenAIIcon";
import { LobeClaudeIcon, LobeGeminiIcon, LobeGrokIcon } from "../LobeBrandIcon";
import { getOpenAiIconColor } from "../../pages/Connections/connectionsTheme";
import { isClaudeModelId } from "../../providers/anthropic/models";
import { isGeminiModelId } from "../../providers/gemini/models";
import { isGrokModelId } from "../../providers/grok/models";
import { labelForAgentModel } from "../../pages/Prompts/agentModelCatalog";

const ICON = { header: 18, option: 17, field: 16 };
const GAP = { header: 10, option: 12, field: 10 };

const useStyles = makeStyles((theme) => ({
  row: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    minHeight: 22,
    lineHeight: 1.45,
    verticalAlign: "middle"
  },
  iconSlot: {
    width: 22,
    height: 22,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  groupLabel: {
    fontWeight: 600,
    fontSize: 13,
    letterSpacing: "0.01em",
    color: theme.palette.text.secondary
  },
  suffix: {
    fontWeight: 500,
    fontSize: 12,
    color: theme.palette.text.secondary,
    opacity: 0.9,
    marginLeft: 4
  },
  optionLabel: {
    fontSize: "0.875rem",
    fontWeight: 500,
    letterSpacing: "-0.01em",
    color: theme.palette.text.primary
  }
}));

function ProviderIcon({ providerKind, size, color }) {
  if (providerKind === "claude") return <LobeClaudeIcon size={size} />;
  if (providerKind === "gemini") return <LobeGeminiIcon size={size} />;
  if (providerKind === "grok") return <LobeGrokIcon size={size} />;
  return <OpenAIIcon size={size} color={color} />;
}

function providerKindFromId(modelOrProvider) {
  const s = String(modelOrProvider || "");
  if (s === "grok" || s === "xai") return "grok";
  if (s === "gemini" || s === "anthropic" || s === "claude") {
    return s === "gemini" ? "gemini" : "claude";
  }
  if (isGrokModelId(s)) return "grok";
  if (isGeminiModelId(s)) return "gemini";
  if (isClaudeModelId(s)) return "claude";
  return "openai";
}

/** Props compartilhados do menu do seletor de modelos (mais largo e arejado). */
export const agentModelSelectMenuProps = {
  disableScrollLock: true,
  anchorOrigin: { vertical: "bottom", horizontal: "left" },
  transformOrigin: { vertical: "top", horizontal: "left" },
  getContentAnchorEl: null,
  PaperProps: {
    style: {
      minWidth: 300,
      maxWidth: 380,
      marginTop: 6,
      borderRadius: 12
    }
  },
  MenuListProps: {
    style: {
      paddingTop: 8,
      paddingBottom: 10
    }
  }
};

/** Cabeçalho de grupo no select (OpenAI / Claude) com logo oficial. */
export function AiProviderGroupHeader({ provider, label, suffix, className }) {
  const classes = useStyles();
  const theme = useTheme();
  const kind = providerKindFromId(provider);
  const text =
    label ||
    (kind === "grok"
      ? "Grok"
      : kind === "gemini"
        ? "Gemini"
        : kind === "claude"
          ? "Claude"
          : "OpenAI");
  const iconColor = getOpenAiIconColor(theme);

  return (
    <span
      className={`${classes.row} ${className || ""}`}
      style={{ gap: GAP.header }}
    >
      <span className={classes.iconSlot}>
        <ProviderIcon providerKind={kind} size={ICON.header} color={iconColor} />
      </span>
      <span className={classes.groupLabel}>{text}</span>
      {suffix ? <span className={classes.suffix}>{suffix}</span> : null}
    </span>
  );
}

/** Item de modelo no dropdown do agente — logo + nome legível. */
export function AgentModelOptionLabel({ modelId, className, variant = "option" }) {
  const classes = useStyles();
  const theme = useTheme();
  const id = String(modelId || "").trim();
  const kind = providerKindFromId(id);
  const size = ICON[variant] || ICON.option;
  const gap = GAP[variant] || GAP.option;
  const iconColor = getOpenAiIconColor(theme);

  return (
    <span
      className={`${classes.row} ${className || ""}`}
      style={{ gap }}
    >
      <span className={classes.iconSlot}>
        <ProviderIcon providerKind={kind} size={size} color={iconColor} />
      </span>
      <span className={classes.optionLabel}>{labelForAgentModel(id)}</span>
    </span>
  );
}
