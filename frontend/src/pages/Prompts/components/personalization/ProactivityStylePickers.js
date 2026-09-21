/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useState } from "react";
import { Box, Typography } from "@material-ui/core";
import { useTheme } from "@material-ui/core/styles";
import {
  Scale,
  TrendingUp,
  Headphones,
  Sprout,
  CalendarClock,
  BookOpen,
  Rocket,
  Layers,
  UserPlus,
  Target,
  HeartHandshake,
  RefreshCw,
  Wallet,
  GraduationCap,
  Wrench
} from "lucide-react";

const cardBase = {
  borderRadius: 12,
  padding: "12px 14px",
  cursor: "pointer",
  textAlign: "left",
  border: "2px solid #e5e7eb",
  background: "#fff",
  minHeight: 88,
  display: "flex",
  flexDirection: "column",
  gap: 4,
  outline: "none",
  boxSizing: "border-box"
};

export const PROACTIVE_MISSION_OPTIONS = [
  {
    value: "balanced",
    title: "Equilibrado",
    subtitle: "Útil e humano; próximo passo só quando fizer sentido.",
    Icon: Scale
  },
  {
    value: "sales",
    title: "Vendas",
    subtitle: "Perguntas curtas, avança para demo, proposta ou fechamento.",
    Icon: TrendingUp
  },
  {
    value: "support",
    title: "Suporte",
    subtitle: "Diagnóstico e clareza; evita empurrar oferta.",
    Icon: Headphones
  },
  {
    value: "nurture",
    title: "Nutrição de lead",
    subtitle: "Educa com insights leves antes de vender direto.",
    Icon: Sprout
  },
  {
    value: "appointment_focus",
    title: "Foco em agenda",
    subtitle: "Conduz para marcar reunião ou demo com opções de horário.",
    Icon: CalendarClock
  },
  {
    value: "retention",
    title: "Retenção",
    subtitle: "Valor contínuo, risco de churn e win-back com empatia.",
    Icon: RefreshCw
  },
  {
    value: "billing",
    title: "Cobrança / financeiro",
    subtitle: "Clareza em valores e prazos; tom profissional.",
    Icon: Wallet
  },
  {
    value: "onboarding",
    title: "Onboarding",
    subtitle: "Primeiros passos, checklists e próximo marco claro.",
    Icon: GraduationCap
  },
  {
    value: "technical_depth",
    title: "Técnico aprofundado",
    subtitle: "Requisitos, especificação e limitações sem inventar.",
    Icon: Wrench
  }
];

export const PROACTIVE_PLAYBOOK_OPTIONS = [
  {
    value: "",
    title: "Nenhum",
    subtitle: "Só usa as instruções e objetivos que você escrever abaixo.",
    Icon: BookOpen
  },
  {
    value: "consultivo",
    title: "Consultivo",
    subtitle: "Ouve mais, menos pressão; curiosidade na prospecção.",
    Icon: BookOpen
  },
  {
    value: "prospeccao",
    title: "Prospecção",
    subtitle: "Gancho de segmento, CTA claro no lead quente.",
    Icon: Rocket
  },
  {
    value: "suporte_upsell",
    title: "Suporte + upsell",
    subtitle: "Acolhimento com valor incremental quando couber.",
    Icon: Layers
  },
  {
    value: "sdr_light",
    title: "SDR enxuto",
    subtitle: "Mensagens curtas, qualificação objetiva.",
    Icon: UserPlus
  },
  {
    value: "closer",
    title: "Fechamento",
    subtitle: "Direto em condições e próximo passo decisório.",
    Icon: Target
  },
  {
    value: "customer_success",
    title: "Sucesso do cliente",
    subtitle: "Parceria, adoção e retorno — menos venda fria.",
    Icon: HeartHandshake
  }
];

function StyleCard({ selected, onClick, title, subtitle, Icon }) {
  const theme = useTheme();
  const isDark = theme.palette.type === "dark";
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);

  const scale = pressed ? 0.99 : hover ? 1.015 : 1;

  return (
    <div
      style={{
        ...cardBase,
        background: isDark ? theme.palette.inputBackground : cardBase.background,
        borderColor: selected
          ? "#2563eb"
          : isDark
            ? "rgba(255,255,255,0.12)"
            : "#e5e7eb",
        boxShadow: selected
          ? "0 0 0 1px rgba(37,99,235,0.25), 0 8px 24px rgba(37,99,235,0.12)"
          : isDark
            ? "0 1px 2px rgba(0,0,0,0.35)"
            : "0 1px 2px rgba(0,0,0,0.04)",
        transform: `scale(${scale})`,
        transition: "transform 0.15s ease, box-shadow 0.2s ease, border-color 0.2s ease"
      }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setPressed(false);
      }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <Box display="flex" alignItems="flex-start" style={{ gap: 10 }}>
        <Box
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: selected
              ? "rgba(37,99,235,0.1)"
              : isDark
                ? "rgba(255,255,255,0.08)"
                : "#f3f4f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}
        >
          <Icon
            size={20}
            color={selected ? "#2563eb" : isDark ? "#a1a1aa" : "#6b7280"}
            strokeWidth={2}
          />
        </Box>
        <Box flex={1} minWidth={0}>
          <Typography
            variant="body2"
            style={{
              fontWeight: 600,
              fontSize: 13,
              color: theme.palette.text.primary
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="caption"
            style={{
              display: "block",
              lineHeight: 1.35,
              color: theme.palette.text.secondary
            }}
          >
            {subtitle}
          </Typography>
        </Box>
      </Box>
      {selected ? (
        <Typography variant="caption" style={{ color: "#2563eb", fontWeight: 600, marginTop: 2 }}>
          Selecionado
        </Typography>
      ) : null}
    </div>
  );
}

export function ProactiveMissionPicker({ value, onChange }) {
  const theme = useTheme();
  const v = value || "balanced";
  return (
    <Box>
      <Typography className="MuiTypography-root" variant="caption" style={{ display: "block", marginBottom: 10, color: theme.palette.text.secondary }}>
        Missão principal: orienta o follow-up automático e o bloco “Proatividade” no prompt do chat ao vivo (com Cargo e Cérebro).
      </Typography>
      <Box
        display="grid"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))",
          gap: 10
        }}
      >
        {PROACTIVE_MISSION_OPTIONS.map((opt) => (
          <StyleCard
            key={opt.value}
            selected={v === opt.value}
            title={opt.title}
            subtitle={opt.subtitle}
            Icon={opt.Icon}
            onClick={() => onChange(opt.value)}
          />
        ))}
      </Box>
    </Box>
  );
}

export function ProactivePlaybookPicker({ value, onChange }) {
  const theme = useTheme();
  const v = value === undefined || value === null ? "" : value;
  return (
    <Box>
      <Typography className="MuiTypography-root" variant="caption" style={{ display: "block", marginBottom: 10, color: theme.palette.text.secondary }}>
        Estilo de estratégia aplicado em cima das instruções (opcional)
      </Typography>
      <Box
        display="grid"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: 10
        }}
      >
        {PROACTIVE_PLAYBOOK_OPTIONS.map((opt) => (
          <StyleCard
            key={opt.value === "" ? "__none__" : opt.value}
            selected={v === opt.value}
            title={opt.title}
            subtitle={opt.subtitle}
            Icon={opt.Icon}
            onClick={() => onChange(opt.value)}
          />
        ))}
      </Box>
    </Box>
  );
}
