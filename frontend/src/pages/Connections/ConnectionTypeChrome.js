/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import ConnectionsNavBar from "./ConnectionsNavBar";
import IntegrationBrandIcon, { getBrandVisual } from "./IntegrationBrandIcon";

/**
 * Cabeçalho de canal com navegação (substitui hero antigo).
 */
export default function ConnectionTypeChrome({
  integration,
  connectionCount = 0,
  onBack,
  backTo,
  backLabel,
  titleOverride,
  subtitleOverride,
  crumbs = [],
}) {
  if (!integration) return null;
  const visual = getBrandVisual(integration);

  const meta =
    connectionCount >= 0 && !titleOverride
      ? `${connectionCount} ${
          connectionCount === 1 ? "conexão ativa" : "conexões ativas"
        }`
      : undefined;

  return (
    <ConnectionsNavBar
      integration={integration}
      icon={
        <IntegrationBrandIcon
          brandKey={visual.brandKey}
          variant="header"
          background={visual.iconBg}
        />
      }
      title={titleOverride || integration.label}
      subtitle={subtitleOverride || integration.description}
      meta={meta}
      backTo={backTo || "/connections"}
      backLabel={backLabel || "Conexões"}
      onBack={onBack}
      crumbs={
        crumbs.length
          ? crumbs
          : [{ label: integration.label, to: null }]
      }
    />
  );
}
