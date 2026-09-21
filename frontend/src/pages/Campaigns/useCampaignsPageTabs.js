/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React from "react";
import { useHistory, useLocation } from "react-router-dom";
import WhatsApp from "@material-ui/icons/WhatsApp";
import { i18n } from "../../translate/i18n";

export const CAMPAIGN_PAGE_VIEW_MODES = [
  { value: "campaigns", label: i18n.t("campaigns.title") },
  {
    value: "templates",
    label: "Templates Meta (API Oficial)",
    icon: <WhatsApp style={{ fontSize: 16, color: "#25D366" }} />
  }
];

export default function useCampaignsPageTabs() {
  const history = useHistory();
  const location = useLocation();

  const currentViewMode = location.pathname.startsWith("/campaign-meta-templates")
    ? "templates"
    : "campaigns";

  const onViewModeChange = (mode) => {
    if (mode === "templates") {
      history.push("/campaign-meta-templates");
      return;
    }
    history.push("/campaigns");
  };

  return {
    viewModes: CAMPAIGN_PAGE_VIEW_MODES,
    currentViewMode,
    onViewModeChange
  };
}
