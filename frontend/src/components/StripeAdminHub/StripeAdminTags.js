/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { Box, Chip } from "@material-ui/core";
import { useTheme } from "@material-ui/core/styles";
import { formatLimit } from "../../config/stripePlanEntitlements";
import { tagStyle, tagRowStyle, tagLabelStyle, tagLabelStyleBold } from "./stripeAdminHubStyles";

function ColoredTag({ label, tone = "users", soft = false }) {
  const theme = useTheme();
  const isDark = theme.palette.type === "dark";
  return (
    <Chip
      size="small"
      label={<span style={soft ? tagLabelStyle : tagLabelStyleBold}>{label}</span>}
      style={tagStyle(tone, isDark, { lightWeight: soft })}
    />
  );
}

export function PlanTypeTag({ type, soft = false }) {
  const isBrain = type === "brain" || type === "Brain.AI" || type === "Brain";
  return (
    <ColoredTag
      label={isBrain ? "Brain.AI" : "CRM"}
      tone={isBrain ? "brainType" : "crm"}
      soft={soft}
    />
  );
}

export function EntitlementTags({ ent, soft = false, wrap = false }) {
  if (!ent) return <span style={{ opacity: 0.5, fontSize: 12 }}>—</span>;

  const rowStyle = wrap
    ? { ...tagRowStyle, flexWrap: "wrap", overflowX: "visible" }
    : tagRowStyle;

  return (
    <Box style={rowStyle}>
      {"maxUsers" in ent ? (
        <ColoredTag
          label={formatLimit(ent.maxUsers, "Usuários")}
          tone={ent.maxUsers == null ? "unlimited" : "users"}
          soft={soft}
        />
      ) : null}
      {"maxConnections" in ent ? (
        <ColoredTag
          label={formatLimit(ent.maxConnections, "Conexões")}
          tone={ent.maxConnections == null ? "unlimited" : "connections"}
          soft={soft}
        />
      ) : null}
      {ent.brainCreditsIncluded ? (
        <ColoredTag
          label={`Brain ${Number(ent.brainCreditsIncluded).toLocaleString("pt-BR")}/mês`}
          tone="brain"
          soft={soft}
        />
      ) : null}
      {ent.brainAddonCredits ? (
        <ColoredTag
          label={`+${Number(ent.brainAddonCredits).toLocaleString("pt-BR")} créditos`}
          tone="brainAddon"
          soft={soft}
        />
      ) : null}
      {ent.apiAccess ? <ColoredTag label="API" tone="api" soft={soft} /> : null}
    </Box>
  );
}

export function StatusTag({ status, cancelAtPeriodEnd }) {
  const map = {
    active: { label: "Ativa", tone: "active" },
    trialing: { label: "Trial", tone: "brain" },
    past_due: { label: "Em atraso", tone: "warning" },
    canceled: { label: "Cancelada", tone: "danger" }
  };
  const cfg = map[status] || { label: status, tone: "users" };
  return (
    <Box>
      <ColoredTag label={cfg.label} tone={cfg.tone} />
      {cancelAtPeriodEnd ? (
        <div style={{ fontSize: 10, color: "#d97706", marginTop: 4, fontWeight: 500 }}>
          Cancela no fim do ciclo
        </div>
      ) : null}
    </Box>
  );
}

export function PriceTags({ prices, soft = false }) {
  const brlMonthly = prices?.find((p) => p.currency === "brl" && p.interval === "monthly");
  const brlAnnual = prices?.find((p) => p.currency === "brl" && p.interval === "annual");
  return (
    <Box style={tagRowStyle}>
      <ColoredTag label={`Mensal ${brlMonthly?.formattedAmount || "—"}`} tone="price" soft={soft} />
      <ColoredTag label={`Anual ${brlAnnual?.formattedAmount || "—"}`} tone="price" soft={soft} />
    </Box>
  );
}

export function SectionDivider({ title }) {
  return (
    <div style={{ padding: "12px 18px 6px", display: "flex", alignItems: "center", gap: 10 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 650,
          letterSpacing: "-0.01em",
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif'
        }}
      >
        {title}
      </span>
      <div style={{ flex: 1, height: 1, background: "rgba(15,23,42,0.06)" }} />
    </div>
  );
}
