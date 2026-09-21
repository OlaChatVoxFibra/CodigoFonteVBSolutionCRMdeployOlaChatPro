/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useContext, useEffect, useState } from "react";
import { Webhook } from "lucide-react";
import ActivitiesStyleLayout from "../../components/ActivitiesStyleLayout";
import PlatformApiHubPanel from "../../components/PlatformApi/PlatformApiHubPanel";
import ForbiddenPage from "../../components/ForbiddenPage";
import { AuthContext } from "../../context/Auth/AuthContext";

const VIEW_MODES = [
  {
    value: "platform-api",
    label: "API & MCP",
    icon: <Webhook size={16} />
  }
];

export default function PlatformApiHub() {
  const { user } = useContext(AuthContext);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.scrollTo) {
      window.scrollTo(0, 0);
    }
  }, []);

  if (user?.profile === "user" && user?.allowConnections === "disabled") {
    return <ForbiddenPage />;
  }

  return (
    <ActivitiesStyleLayout
      viewModes={VIEW_MODES}
      currentViewMode="platform-api"
      description="platform_api"
      hideSearch
      disableFilterBar
      hideDefaultRightFilters
      hideNavDivider
      hideHeaderDivider
      helpTopic="platform_api"
      scrollContent={false}
      contentEdgeToEdge
      onCreateClick={() => setCreateDialogOpen(true)}
      createButtonText="Nova API Key"
    >
      <PlatformApiHubPanel
        createDialogOpen={createDialogOpen}
        onCreateDialogChange={setCreateDialogOpen}
      />
    </ActivitiesStyleLayout>
  );
}
