/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import * as Yup from "yup";

import AppError from "../../errors/AppError";
import { normalizeWhatsappAgentFields } from "../../providers/anthropic/services/resolveConnectionAgent";
import Whatsapp from "../../models/Whatsapp";
import Company from "../../models/Company";
import Plan from "../../models/Plan";
import AssociateWhatsappQueue from "./AssociateWhatsappQueue";
import EnsureSystemQueueService from "../QueueService/EnsureSystemQueueService";

interface Request {
  name: string;
  companyId: number;
  queueIds?: number[];
  greetingMessage?: string;
  complationMessage?: string;
  outOfHoursMessage?: string;
  ratingMessage?: string;
  status?: string;
  isDefault?: boolean;
  token?: string;
  number?: string;
  provider?: string;
  facebookUserId?: string;
  facebookUserToken?: string;
  tokenMeta?: string;
  channel?: string;
  facebookPageUserId?: string;
  maxUseBotQueues?: string;
  timeUseBotQueues?: string;
  expiresTicket?: number;
  allowGroup?: boolean;
  sendIdQueue?: number;
  timeSendQueue?: number;
  timeInactiveMessage?: string;
  inactiveMessage?: string;
  maxUseBotQueuesNPS?: number;
  expiresTicketNPS?: number;
  whenExpiresTicket?: string;
  expiresInactiveMessage?: string;
  groupAsTicket?: string;
  importOldMessages?: string;
  importRecentMessages?: string;
  importOldMessagesGroups?: boolean;
  closedTicketsPostImported?: boolean;
  timeCreateNewTicket?: number;
  integrationId?: number;
  integrationTypeId?: number;
  schedules?: any[];
  promptId?: number;
  anthropicMultiAgentId?: number | null;
  connectionAgent?: string;
  collectiveVacationMessage?: string;
  collectiveVacationStart?: string;
  collectiveVacationEnd?: string;
  queueIdImportMessages?: number;
  phone_number_id?: string;
  waba_id?: string;
  send_token?: string;
  business_id?: string;
  phone_number?: string;
  waba_webhook?: string;
  flowIdNotPhrase?: number;
  flowIdWelcome?: number;
  color?: string;
  flowIdInactiveTime?: number;
  flowInactiveTime?: number;
  maxUseInactiveTime?: number;
  timeToReturnQueue?: number;
  timeAwaitActiveFlowId?: number;
  timeAwaitActiveFlow?: number;
  triggerIntegrationOnClose?: boolean;
  wavoip?: string;
  agentDisabled?: boolean;
  queuesEnabled?: boolean;
  sendGreetingMessage?: boolean;
  sendFarewellMessage?: boolean;
  sendQueueEntryMessage?: string;
  queueEntryMessage?: string;
}

interface Response {
  whatsapp: Whatsapp;
  oldDefaultWhatsapp: Whatsapp | null;
}

const CreateWhatsAppService = async ({
  name,
  status = "OPENING",
  queueIds = [],
  greetingMessage,
  complationMessage,
  outOfHoursMessage,
  isDefault = false,
  companyId,
  token = "",
  number,
  provider = "beta",
  facebookUserId,
  facebookUserToken,
  facebookPageUserId,
  tokenMeta,
  channel = "whatsapp",
  maxUseBotQueues,
  timeUseBotQueues,
  expiresTicket,
  allowGroup = false,
  timeSendQueue,
  sendIdQueue,
  timeInactiveMessage,
  inactiveMessage,
  ratingMessage,
  maxUseBotQueuesNPS,
  expiresTicketNPS,
  whenExpiresTicket,
  expiresInactiveMessage,
  groupAsTicket,
  importOldMessages,
  importRecentMessages,
  closedTicketsPostImported,
  importOldMessagesGroups,
  timeCreateNewTicket,
  integrationId,
  integrationTypeId,
  schedules,
  promptId,
  collectiveVacationEnd,
  collectiveVacationMessage,
  collectiveVacationStart,
  queueIdImportMessages,
  phone_number_id,
  waba_id,
  send_token,
  business_id,
  phone_number,
  waba_webhook,
  flowIdNotPhrase,
  flowIdWelcome,
  flowIdInactiveTime,
  flowInactiveTime,
  maxUseInactiveTime,
  color,
  timeToReturnQueue,
  timeAwaitActiveFlowId,
  timeAwaitActiveFlow,
  triggerIntegrationOnClose,
  wavoip,
  agentDisabled = true,
  anthropicMultiAgentId,
  connectionAgent,
  queuesEnabled = true,
  sendGreetingMessage = false,
  sendFarewellMessage = false,
  sendQueueEntryMessage = "inherit",
  queueEntryMessage = ""
}: Request): Promise<Response> => {
  const agentFields = normalizeWhatsappAgentFields({
    agentDisabled,
    promptId,
    anthropicMultiAgentId,
    connectionAgent
  });

  const company = await Company.findOne({
    where: {
      id: companyId
    },
    include: [{ model: Plan, as: "plan" }]
  });

  if (company !== null) {
    const whatsappCount = await Whatsapp.count({
      where: { companyId }
    });

    if (whatsappCount >= company.plan.connections) {
      throw new AppError(
        `Número máximo de conexões já alcançado: ${whatsappCount}`
      );
    }
  }

  const schema = Yup.object().shape({
    name: Yup.string()
      .required("ERR_WAPP_NAME_REQUIRED")
      .min(2, "ERR_WAPP_INVALID_NAME")
      .test(
        "Check-name",
        "Esse nome já está sendo utilizado por outra conexão",
        async value => {
          if (!value) return false;
          const nameExists = await Whatsapp.findOne({
            where: { name: value, channel: channel, companyId }
          });
          return !nameExists;
        }
      ),
    isDefault: Yup.boolean().required()
  });

  try {
    await schema.validate({ name, status, isDefault });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const whatsappFound = await Whatsapp.findOne({ where: { companyId } });

  isDefault = channel === "whatsapp" ? !whatsappFound : false;

  let oldDefaultWhatsapp: Whatsapp | null = null;

  if (channel === "whatsapp" && isDefault) {
    oldDefaultWhatsapp = await Whatsapp.findOne({
      where: { isDefault: true, companyId, channel: channel }
    });
    if (oldDefaultWhatsapp) {
      await oldDefaultWhatsapp.update({ isDefault: false, companyId });
    }
  }

  const resolvedQueueIds = queuesEnabled
    ? queueIds
    : [(await EnsureSystemQueueService(companyId)).id];

  if (queuesEnabled && resolvedQueueIds.length > 1 && !greetingMessage?.trim()) {
    throw new AppError("ERR_WAPP_GREETING_REQUIRED");
  }

  if (
    token !== null &&
    token !== "" &&
    channel !== "sms" &&
    channel !== "telegram" &&
    channel !== "linkedin"
  ) {
    const tokenSchema = Yup.object().shape({
      token: Yup.string()
        .required()
        .min(2)
        .test(
          "Check-token",
          "This whatsapp token is already used.",
          async value => {
            if (!value) return false;
            const tokenExists = await Whatsapp.findOne({
              where: { token: value, channel: channel }
            });
            return !tokenExists;
          }
        )
    });

    try {
      await tokenSchema.validate({ token });
    } catch (err: any) {
      throw new AppError(err.message);
    }
  }

  const whatsapp = await Whatsapp.create(
    {
      name,
      status,
      greetingMessage,
      complationMessage,
      outOfHoursMessage,
      ratingMessage,
      isDefault,
      companyId,
      // Se token vier vazio e send_token vier preenchido, usa send_token para token
      token: (token === null || token === "") && send_token ? send_token : token,
      provider,
      channel,
      number,
      facebookUserId,
      facebookUserToken,
      facebookPageUserId,
      tokenMeta,
      maxUseBotQueues,
      timeUseBotQueues,
      expiresTicket,
      allowGroup,
      timeSendQueue,
      sendIdQueue,
      timeInactiveMessage,
      inactiveMessage,
      maxUseBotQueuesNPS,
      expiresTicketNPS,
      whenExpiresTicket,
      expiresInactiveMessage,
      groupAsTicket,
      importOldMessages,
      importRecentMessages,
      closedTicketsPostImported,
      importOldMessagesGroups,
      timeCreateNewTicket,
      integrationId,
      integrationTypeId,
      schedules,
      promptId: agentFields.promptId,
      anthropicMultiAgentId: agentFields.anthropicMultiAgentId,
      collectiveVacationEnd,
      collectiveVacationMessage,
      collectiveVacationStart,
      queueIdImportMessages,
      phone_number_id,
      waba_id,
      // Se send_token vier vazio e token vier preenchido, usa token para send_token
      send_token: (!send_token && token) ? token : send_token,
      business_id,
      phone_number,
      waba_webhook,
      flowIdNotPhrase,
      flowIdWelcome,
      flowIdInactiveTime,
      flowInactiveTime,
      maxUseInactiveTime,
      color,
      timeToReturnQueue,
      timeAwaitActiveFlowId,
      timeAwaitActiveFlow,
      triggerIntegrationOnClose,
      wavoip,
      agentDisabled,
      queuesEnabled,
      sendGreetingMessage,
      sendFarewellMessage,
      sendQueueEntryMessage,
      queueEntryMessage
    },
    { include: ["queues", "company"] }
  );

  await AssociateWhatsappQueue(whatsapp, resolvedQueueIds);

  return { whatsapp, oldDefaultWhatsapp };
};

export default CreateWhatsAppService;
