/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { useTheme } from "@material-ui/core/styles";
import BrainPricingSection from "./brain";
import CrmPricingSection from "./crm";

/**
 * Planos unificados — delega para módulos Brain ou CRM.
 */
export default function PricingPlansSection({
  variant = "crm",
  onChoose,
  title,
  subtitle,
  className = "",
  themeMode,
  compact = false,
  toggleSize = "default",
  stripeProducts = null
}) {
  const theme = useTheme();
  const resolvedMode = themeMode || (theme.palette.type === "dark" ? "dark" : "light");

  if (variant === "brain") {
    return (
      <BrainPricingSection
        themeMode={resolvedMode}
        onChoose={onChoose}
        subtitle={subtitle}
        className={className}
      />
    );
  }

  return (
    <CrmPricingSection
      onChoose={onChoose}
      title={title}
      subtitle={subtitle}
      className={className}
      themeMode={resolvedMode}
      compact={compact}
      toggleSize={toggleSize}
      stripeProducts={stripeProducts}
    />
  );
}
