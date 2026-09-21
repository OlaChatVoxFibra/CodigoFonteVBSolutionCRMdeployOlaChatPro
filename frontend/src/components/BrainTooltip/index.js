/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip";

const SIDE_MAP = {
  top: "top",
  right: "right",
  bottom: "bottom",
  left: "left",
};

export default function BrainTooltip({ title, placement = "top", children }) {
  if (!title) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={SIDE_MAP[placement] || "top"}>{title}</TooltipContent>
    </Tooltip>
  );
}
