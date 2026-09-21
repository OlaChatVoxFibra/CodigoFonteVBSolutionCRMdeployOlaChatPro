/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import React, { useContext, useEffect } from "react";
import { useHistory, useParams } from "react-router-dom";
import WhatsAppModal from "../../components/WhatsAppModal";
import { getIntegrationByKey } from "./integrationCatalog";
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";
import ForbiddenPage from "../../components/ForbiddenPage";
import { AuthContext } from "../../context/Auth/AuthContext";
import ConnectionsChannelLayout from "./ConnectionsChannelLayout";
import { getConnectionGuideSteps } from "../../components/HelpStepsList/connectionChannelSteps";
import TelegramBotSetupForm from "./setup/TelegramBotSetupForm";
import TelegramOficialSetupForm from "./setup/TelegramOficialSetupForm";
import SmsSetupForm from "./setup/SmsSetupForm";
import EmailSmtpSetupForm from "./setup/EmailSmtpSetupForm";
import OpenAiConnectionSetupForm from "./setup/OpenAiConnectionSetupForm";
import AnthropicConnectionSetupForm from "./setup/AnthropicConnectionSetupForm";
import GeminiConnectionSetupForm from "./setup/GeminiConnectionSetupForm";
import GrokConnectionSetupForm from "./setup/GrokConnectionSetupForm";
import FigmaConnectionSetupForm from "./setup/FigmaConnectionSetupForm";
import GithubConnectionSetupForm from "./setup/GithubConnectionSetupForm";
import MetaChannelSetupForm from "./setup/MetaChannelSetupForm";

const WHATSAPP_CHANNEL_BY_KEY = {
  "whatsapp-web": "whatsapp",
  "whatsapp-oficial": "whatsapp_oficial",
};

const SETUP_KEYS = new Set([
  "whatsapp-web",
  "whatsapp-oficial",
  "telegram-bot",
  "telegram-oficial",
  "sms",
  "facebook",
  "instagram",
  "email",
  "openai",
  "claude",
  "gemini",
  "grok",
  "figma",
  "github",
]);

export default function ConnectionsChannelSetupPage() {
  const history = useHistory();
  const { integrationKey, whatsAppId: editIdParam } = useParams();
  const integration = getIntegrationByKey(integrationKey);
  const managePath = `/connections/${integrationKey}/manage`;
  const { fetchWhatsApps } = useContext(WhatsAppsContext);
  const { user } = useContext(AuthContext);

  const whatsAppId = editIdParam || undefined;
  const isEdit = Boolean(whatsAppId);

  if (user?.profile === "user" && user?.allowConnections === "disabled") {
    return <ForbiddenPage />;
  }

  const setupAllowed = Boolean(integration && SETUP_KEYS.has(integrationKey));

  useEffect(() => {
    if (!setupAllowed) {
      history.replace("/connections");
    }
  }, [setupAllowed, history]);

  if (!setupAllowed) {
    return null;
  }

  const hideSidebarWizard =
    integrationKey === "openai" ||
    integrationKey === "gemini" ||
    integrationKey === "grok" ||
    integrationKey === "figma" ||
    integrationKey === "github";
  const guideSteps = hideSidebarWizard
    ? []
    : getConnectionGuideSteps(integrationKey);
  const wizardResetKey = `${integrationKey}-${whatsAppId || "new"}`;

  const onSaved = () => {
    if (
      typeof fetchWhatsApps === "function" &&
      ![
        "email",
        "openai",
        "claude",
        "gemini",
        "grok",
        "figma",
        "github",
      ].includes(integrationKey)
    ) {
      fetchWhatsApps({ silent: true });
    }
    history.push(managePath);
  };

  const onCancel = () => history.push(managePath);

  let content = null;

  if (WHATSAPP_CHANNEL_BY_KEY[integrationKey]) {
    content = (
      <WhatsAppModal
        embeddedPage
        open
        onClose={onCancel}
        whatsAppId={whatsAppId}
        channel={WHATSAPP_CHANNEL_BY_KEY[integrationKey]}
        onConnectionSaved={onSaved}
      />
    );
  } else if (integrationKey === "telegram-bot") {
    content = (
      <TelegramBotSetupForm
        whatsAppId={whatsAppId}
        isEdit={isEdit}
        onCancel={onCancel}
        onSaved={onSaved}
        hidePageHeader
      />
    );
  } else if (integrationKey === "telegram-oficial") {
    content = (
      <TelegramOficialSetupForm
        whatsAppId={whatsAppId}
        isEdit={isEdit}
        onCancel={onCancel}
        onSaved={onSaved}
        hidePageHeader
      />
    );
  } else if (integrationKey === "sms") {
    content = (
      <SmsSetupForm
        whatsAppId={whatsAppId}
        isEdit={isEdit}
        onCancel={onCancel}
        onSaved={onSaved}
        hidePageHeader
      />
    );
  } else if (integrationKey === "facebook" || integrationKey === "instagram") {
    content = (
      <MetaChannelSetupForm
        channel={integrationKey === "instagram" ? "instagram" : "facebook"}
        whatsAppId={whatsAppId}
        isEdit={isEdit}
        onCancel={onCancel}
        onSaved={onSaved}
        hidePageHeader
      />
    );
  } else if (integrationKey === "email") {
    content = (
      <EmailSmtpSetupForm
        smtpId={whatsAppId}
        isEdit={isEdit}
        onCancel={onCancel}
        onSaved={onSaved}
        hidePageHeader
      />
    );
  } else if (integrationKey === "openai") {
    content = (
      <OpenAiConnectionSetupForm
        isEdit={isEdit || Boolean(whatsAppId)}
        onCancel={onCancel}
        onSaved={onSaved}
        hidePageHeader
      />
    );
  } else if (integrationKey === "claude") {
    content = (
      <AnthropicConnectionSetupForm
        isEdit={isEdit || Boolean(whatsAppId)}
        onCancel={onCancel}
        onSaved={onSaved}
        hidePageHeader
      />
    );
  } else if (integrationKey === "gemini") {
    content = (
      <GeminiConnectionSetupForm
        isEdit={isEdit || Boolean(whatsAppId)}
        onCancel={onCancel}
        onSaved={onSaved}
        hidePageHeader
      />
    );
  } else if (integrationKey === "grok") {
    content = (
      <GrokConnectionSetupForm
        isEdit={isEdit || Boolean(whatsAppId)}
        onCancel={onCancel}
        onSaved={onSaved}
        hidePageHeader
      />
    );
  } else if (integrationKey === "figma") {
    content = (
      <FigmaConnectionSetupForm
        onCancel={onCancel}
        onSaved={onSaved}
        hidePageHeader
      />
    );
  } else if (integrationKey === "github") {
    content = (
      <GithubConnectionSetupForm onSaved={onSaved} hidePageHeader />
    );
  }

  const setupTitle = isEdit ? "Editar conexão" : "Nova conexão";

  return (
    <ConnectionsChannelLayout
      integration={integration}
      wizardSteps={guideSteps}
      wizardResetKey={wizardResetKey}
      wizardLabel="Passo a passo"
      hideWizard={hideSidebarWizard}
      managePath={managePath}
      setupMode
      setupTitle={setupTitle}
    >
      {content}
    </ConnectionsChannelLayout>
  );
}
