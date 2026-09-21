/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { PREMIUM_FONT_FAMILY } from "../constants/typography";

const tickFont = {
  family: PREMIUM_FONT_FAMILY,
  size: 11,
  weight: "400",
};

/**
 * Opções Chart.js alinhadas ao design system premium (visual apenas).
 */
export function getPremiumBarChartOptions(theme, pluginOverrides = {}) {
  const isDark = theme.palette?.type === "dark";
  const gridColor = isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(15, 23, 42, 0.06)";
  const tickColor = isDark ? "#a1a1aa" : "#64748b";

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400, easing: "easeOutQuart" },
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        backgroundColor: isDark ? "#27272a" : "#ffffff",
        titleColor: isDark ? "#fafafa" : "#0f172a",
        bodyColor: isDark ? "#d4d4d8" : "#475569",
        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)",
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        titleFont: { ...tickFont, size: 12, weight: "500" },
        bodyFont: tickFont,
        displayColors: false,
        ...pluginOverrides.tooltip,
      },
      datalabels: {
        display: true,
        anchor: "end",
        align: "top",
        offset: 2,
        color: isDark ? "#e4e4e7" : "#334155",
        font: { ...tickFont, size: 10, weight: "500" },
        ...pluginOverrides.datalabels,
      },
    },
    scales: {
      x: {
        ticks: { color: tickColor, font: tickFont, maxRotation: 0 },
        grid: { display: false, drawBorder: false },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: { color: tickColor, font: tickFont, padding: 6 },
        grid: { color: gridColor, drawBorder: false },
        border: { display: false },
      },
    },
  };
}

export function getPremiumDonutChartOptions(theme, pluginOverrides = {}) {
  const isDark = theme.palette?.type === "dark";
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "72%",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: isDark ? "#a1a1aa" : "#64748b",
          font: tickFont,
          padding: 12,
          usePointStyle: true,
          pointStyleWidth: 8,
        },
      },
      tooltip: {
        backgroundColor: isDark ? "#27272a" : "#ffffff",
        titleColor: isDark ? "#fafafa" : "#0f172a",
        bodyColor: isDark ? "#d4d4d8" : "#475569",
        borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.08)",
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        bodyFont: tickFont,
        ...pluginOverrides.tooltip,
      },
    },
  };
}
