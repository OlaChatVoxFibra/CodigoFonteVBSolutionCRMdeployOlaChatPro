/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import Paper from "@material-ui/core/Paper";

/** Paleta compartilhada — dashboard WhatsApp e Logs Tokens Brain.AI */
export function whatsappDashboardPalette(theme) {
  const isDark = theme.palette.type === "dark";
  if (isDark) {
    return {
      bg: theme.palette.dashboardCanvas || "#000000",
      card: theme.palette.dashboardCard || "#252526",
      text: "#f4f4f5",
      sub: "#a1a1aa",
      border: "rgba(255,255,255,0.12)",
      shadow: "0 4px 16px rgba(0,0,0,0.35)",
      blue: "#60a5fa",
      blueLight: "#93c5fd",
      blueDark: "#3b82f6",
      green: "#34d399",
      red: "#f87171",
      amber: "#fbbf24",
      track: "rgba(255,255,255,0.12)"
    };
  }
  return {
    bg: "#F8FAFC",
    card: "#FFFFFF",
    text: "#0F172A",
    sub: "#64748B",
    border: "#E2E8F0",
    shadow: "0 2px 8px rgba(2,6,23,0.06)",
    blue: "#3B82F6",
    blueLight: "#60A5FA",
    blueDark: "#2563EB",
    green: "#10B981",
    red: "#EF4444",
    amber: "#F59E0B",
    track: "#e5e7eb"
  };
}

export function dashboardIndicatorGridStyles(theme) {
  return {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 10,
    [theme.breakpoints.down("md")]: {
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))"
    },
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))"
    },
    [theme.breakpoints.down("xs")]: {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
      gap: 8
    }
  };
}

export default function WhatsappMetricCard({
  palette,
  isDark,
  title,
  value,
  subtitle,
  icon,
  accent
}) {
  const mark = accent || palette.blueDark;
  return (
    <Paper
      elevation={0}
      style={{
        borderRadius: 8,
        padding: "12px 14px",
        border: `1px solid ${palette.border}`,
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 72,
        background: isDark ? palette.card : "#FFFFFF",
        transition: "box-shadow 150ms ease",
        overflow: "hidden"
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div
          style={{
            fontSize: 11,
            color: palette.sub,
            fontWeight: 500,
            lineHeight: 1.3,
            marginBottom: 2
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontWeight: 700,
            fontSize: 22,
            color: palette.text,
            fontFeatureSettings: '"tnum"',
            lineHeight: 1.1
          }}
        >
          {value != null ? value : "\u2014"}
        </div>
        {subtitle ? (
          <div
            style={{
              fontSize: 10,
              color: palette.sub,
              fontWeight: 400,
              lineHeight: 1.3,
              marginTop: 2,
              opacity: 0.7
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
      <div style={{ color: mark, opacity: 0.7, flexShrink: 0, marginLeft: 8 }}>{icon}</div>
    </Paper>
  );
}
