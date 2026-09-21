/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Whatsapp from "../../models/Whatsapp";
import CreateWhatsAppService from "../WhatsappService/CreateWhatsAppService";
import AssociateWhatsappQueue from "../WhatsappService/AssociateWhatsappQueue";
import { buildLinkedInWebhookUrl } from "./linkedinCredentials";
import { verifyLinkedInAccessToken } from "./linkedinApi";

interface Request {
  name: string;
  companyId: number;
  clientId: string;
  clientSecret: string;
  accessToken: string;
  senderUrn: string;
  senderLabel?: string;
  queueIds?: number[];
  greetingMessage?: string;
  color?: string;
  id?: number;
  webhookSecret?: string;
  promptId?: number | null;
  agentDisabled?: boolean;
}

export type LinkedInConnectionSaveResult = {
  whatsapp: Whatsapp;
  webhookUrl: string;
};

const CreateLinkedInConnectionService = async ({
  name,
  companyId,
  clientId,
  clientSecret,
  accessToken,
  senderUrn,
  senderLabel,
  queueIds = [],
  greetingMessage = "",
  color = "",
  id,
  webhookSecret,
  promptId,
  agentDisabled
}: Request): Promise<LinkedInConnectionSaveResult> => {
  const schema = Yup.object().shape({
    name: Yup.string().required().min(2),
    clientId: Yup.string().required().min(4),
    senderUrn: Yup.string().required().min(8)
  });

  try {
    await schema.validate({ name, clientId, senderUrn });
  } catch (err: any) {
    throw new AppError(err.message, 400);
  }

  const saveConnection = async (
    existing?: Whatsapp
  ): Promise<Whatsapp> => {
    const tokenToSave =
      accessToken && accessToken.length > 0
        ? accessToken.trim()
        : existing?.token || "";
    const secretToSave =
      clientSecret && clientSecret.length > 0
        ? clientSecret.trim()
        : existing?.facebookUserToken || "";

    if (!tokenToSave || tokenToSave.length < 10) {
      throw new AppError("Informe um Access Token válido do LinkedIn.", 400);
    }

    const profile = await verifyLinkedInAccessToken(tokenToSave);
    const label =
      (senderLabel || "").trim() ||
      profile.name ||
      "LinkedIn";

    if (existing) {
      await existing.update({
        name,
        status: "CONNECTED",
        channel: "linkedin",
        provider: "linkedin",
        token: tokenToSave,
        facebookUserId: clientId.trim(),
        facebookUserToken: secretToSave || existing.facebookUserToken,
        send_token: webhookSecret
          ? webhookSecret.trim()
          : existing.send_token,
        phone_number_id: senderUrn.trim(),
        number: label,
        phone_number: label,
        greetingMessage: greetingMessage || "",
        color: color || "#0A66C2",
        ...(promptId !== undefined ? { promptId: promptId ?? null } : {}),
        ...(agentDisabled !== undefined ? { agentDisabled } : {})
      });
      await AssociateWhatsappQueue(existing, queueIds);
      const webhookUrl = buildLinkedInWebhookUrl(companyId, existing.id);
      await existing.update({ waba_webhook: webhookUrl });
      return existing.reload();
    }

    const { whatsapp } = await CreateWhatsAppService({
      name,
      status: "CONNECTED",
      isDefault: false,
      companyId,
      channel: "linkedin",
      provider: "linkedin",
      token: tokenToSave,
      facebookUserId: clientId.trim(),
      facebookUserToken: secretToSave || undefined,
      send_token: webhookSecret ? webhookSecret.trim() : undefined,
      phone_number_id: senderUrn.trim(),
      number: label,
      phone_number: label,
      greetingMessage,
      color: color || "#0A66C2",
      queueIds,
      allowGroup: false,
      promptId: promptId ?? undefined,
      agentDisabled: agentDisabled ?? false
    });

    const webhookUrl = buildLinkedInWebhookUrl(companyId, whatsapp.id);
    await whatsapp.update({ waba_webhook: webhookUrl });
    return whatsapp.reload();
  };

  if (id) {
    const existing = await Whatsapp.findOne({
      where: { id, companyId, channel: "linkedin" }
    });
    if (!existing) {
      throw new AppError("Conexão LinkedIn não encontrada.", 404);
    }
    const whatsapp = await saveConnection(existing);
    return {
      whatsapp,
      webhookUrl: buildLinkedInWebhookUrl(companyId, whatsapp.id)
    };
  }

  if (!accessToken || accessToken.trim().length < 10) {
    throw new AppError("Informe o Access Token do LinkedIn.", 400);
  }
  if (!clientSecret || clientSecret.trim().length < 4) {
    throw new AppError("Informe o Client Secret do app LinkedIn.", 400);
  }

  const whatsapp = await saveConnection();
  return {
    whatsapp,
    webhookUrl: buildLinkedInWebhookUrl(companyId, whatsapp.id)
  };
};

export async function testLinkedInConnection({
  accessToken,
  senderUrn,
  testRecipientUrn
}: {
  accessToken: string;
  senderUrn?: string;
  testRecipientUrn?: string;
}): Promise<{ ok: boolean; message: string; profileName?: string }> {
  const profile = await verifyLinkedInAccessToken(accessToken.trim());

  if (testRecipientUrn && senderUrn) {
    const { sendLinkedInDirectMessage } = await import("./linkedinApi");
    await sendLinkedInDirectMessage({
      accessToken: accessToken.trim(),
      senderUrn: senderUrn.trim(),
      recipientUrn: testRecipientUrn.trim(),
      body: "Teste de conexão LinkedIn - VBSolution"
    });
    return {
      ok: true,
      message: "Mensagem de teste enviada no LinkedIn.",
      profileName: profile.name
    };
  }

  return {
    ok: true,
    message: `Token válido: ${profile.name || "LinkedIn"}`,
    profileName: profile.name
  };
}

export default CreateLinkedInConnectionService;
