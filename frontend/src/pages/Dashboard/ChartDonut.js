/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";

/**
 * Anel de progresso circular; texto central legível (sem rotação no label).
 * O arco é desenhado com <g transform="rotate(-90)">; o overlay fica fora do SVG.
 */
const DonutChart = ({
  title,
  value = 0,
  color = ["#2563eb"],
  trackColor = "#e5e7eb",
  subColor = "#64748B",
  valueColor = "#0F172A",
  size = 132,
  stroke = 12,
}) => {
  const radius = (size - stroke) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  const offset = circumference * (1 - clamped / 100);
  const ringColor = Array.isArray(color) ? color[0] : color;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        margin: "0 auto",
      }}
    >
      <svg width={size} height={size} style={{ display: "block" }}>
        <g transform={`rotate(-90 ${c} ${c})`}>
          <circle
            cx={c}
            cy={c}
            r={radius}
            fill="transparent"
            stroke={trackColor}
            strokeWidth={stroke}
          />
          <circle
            cx={c}
            cy={c}
            r={radius}
            fill="transparent"
            stroke={ringColor}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </g>
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          textAlign: "center",
          padding: "0 8px",
        }}
      >
        {title ? (
          <div
            style={{
              fontWeight: 500,
              fontSize: 10,
              fontFamily:
                '"Inter", "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              letterSpacing: "0.02em",
              color: subColor,
              lineHeight: 1.25,
              maxWidth: size - 16,
            }}
          >
            {title}
          </div>
        ) : null}
        <div
          style={{
            fontWeight: 600,
            fontSize: 18,
            fontFamily:
              '"Inter", "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            letterSpacing: "-0.02em",
            color: valueColor,
            lineHeight: 1.2,
            fontFeatureSettings: '"tnum"',
          }}
        >
          {clamped}%
        </div>
      </div>
    </div>
  );
};

export default DonutChart;
