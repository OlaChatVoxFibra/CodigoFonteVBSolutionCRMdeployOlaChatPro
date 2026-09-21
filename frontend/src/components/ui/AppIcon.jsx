/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { cn } from "../../lib/utils";

/**
 * Ícone padronizado estilo Notion / ClickUp (Lucide).
 * strokeWidth 1.75 = traço refinado premium.
 */
export function AppIcon({
  icon: Icon,
  size = 15,
  strokeWidth = 1.5,
  className,
  color,
  ...props
}) {
  if (!Icon) return null;
  return (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      color={color ?? "currentColor"}
      className={cn("shrink-0", className)}
      aria-hidden
      {...props}
    />
  );
}

export default AppIcon;
