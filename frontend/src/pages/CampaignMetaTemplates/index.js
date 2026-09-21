/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useContext, useState } from "react";
import ActivitiesStyleLayout from "../../components/ActivitiesStyleLayout";
import CampaignMetaTemplatesPanel from "../../components/MetaOfficial/CampaignMetaTemplatesPanel";
import CampaignModal from "../../components/CampaignModal";
import ForbiddenPage from "../../components/ForbiddenPage";
import { AuthContext } from "../../context/Auth/AuthContext";
import useCampaignsPageTabs from "../Campaigns/useCampaignsPageTabs";

export default function CampaignMetaTemplates() {
  const { user } = useContext(AuthContext);
  const { viewModes, currentViewMode, onViewModeChange } = useCampaignsPageTabs();
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);

  if (user.profile === "user" && user?.showCampaign === "disabled") {
    return <ForbiddenPage />;
  }

  return (
    <ActivitiesStyleLayout
      viewModes={viewModes}
      currentViewMode={currentViewMode}
      onViewModeChange={onViewModeChange}
      hideSearch
      disableFilterBar
      description="campaign-meta-templates"
      onCreateClick={() => setCampaignModalOpen(true)}
    >
      <CampaignMetaTemplatesPanel />
      {campaignModalOpen && (
        <CampaignModal
          open={campaignModalOpen}
          onClose={() => setCampaignModalOpen(false)}
          forceWhatsappOficial
          resetPagination={() => {}}
        />
      )}
    </ActivitiesStyleLayout>
  );
}
