/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import * as Yup from "yup";
import { Op } from "sequelize";

import AppError from "../../errors/AppError";
import { normalizeWhatsappAgentFields } from "../../providers/anthropic/services/resolveConnectionAgent";
import Whatsapp from "../../models/Whatsapp";
import ShowWhatsAppService from "./ShowWhatsAppService";
import AssociateWhatsappQueue from "./AssociateWhatsappQueue";
import EnsureSystemQueueService from "../QueueService/EnsureSystemQueueService";

interface WhatsappData {
  name?: string;
  status?: string;
  session?: string;
  isDefault?: boolean;
  greetingMessage?: string;
  complationMessage?: string;
  outOfHoursMessage?: string;
  queueIds?: number[];
  token?: string;
  maxUseBotQueues?: number;
  timeUseBotQueues?: string;
  expiresTicket?: string;
  allowGroup?: boolean;
  sendIdQueue?: number;
  timeSendQueue?: number;
  timeInactiveMessage?: string;
  inactiveMessage?: string;
  ratingMessage?: string;
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
  requestQR?: boolean;
  collectiveVacationMessage?: string;
  collectiveVacationStart?: string;
  collectiveVacationEnd?: string;
  queueIdImportMessages?: number;
  phone_number_id?: string;
  waba_id?: string;
  send_token?: string;
  business_id?: string;
  phone_number?: string;
  flowIdNotPhrase?: number;
  flowIdWelcome?: number;
  flowIdInactiveTime?: number;
  flowInactiveTime?: number;
  maxUseInactiveTime?: number;
  color?: string;
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

interface Request {
  whatsappData: WhatsappData;
  whatsappId: string;
  companyId: number;
  requestUserId?: number;
}

interface Response {
  whatsapp: Whatsapp;
  oldDefaultWhatsapp: Whatsapp | null;
}

const UpdateWhatsAppService = async ({
  whatsappData,
  whatsappId,
  companyId,
  requestUserId
}: Request): Promise<Response> => {
  const schema = Yup.object().shape({
    name: Yup.string().min(2),
    status: Yup.string(),
    isDefault: Yup.boolean()
  });

  const {
    name,
    status,
    isDefault,
    session,
    greetingMessage,
    complationMessage,
    outOfHoursMessage,
    queueIds = [],
    token,
    maxUseBotQueues = 0,
    timeUseBotQueues = 0,
    expiresTicket = 0,
    allowGroup,
    timeSendQueue = 0,
    sendIdQueue = null,
    timeInactiveMessage = 0,
    inactiveMessage,
    ratingMessage,
    maxUseBotQueuesNPS,
    expiresTicketNPS = 0,
    whenExpiresTicket,
    expiresInactiveMessage,
    groupAsTicket,
    importOldMessages,
    importRecentMessages,
    closedTicketsPostImported,
    importOldMessagesGroups,
    timeCreateNewTicket = null,
    integrationId,
    integrationTypeId,
    schedules,
    promptId,
    requestQR = false,
    collectiveVacationEnd,
    collectiveVacationMessage,
    collectiveVacationStart,
    queueIdImportMessages,
    flowIdNotPhrase,
    flowIdWelcome,
    flowIdInactiveTime,
    flowInactiveTime,
    maxUseInactiveTime,
    color,
    // Força atualização dos campos da API Oficial
    phone_number_id,
    waba_id,
    send_token,
    business_id,
    phone_number,
    timeToReturnQueue = 0,
    timeAwaitActiveFlowId,
    timeAwaitActiveFlow = 0,
    triggerIntegrationOnClose,
    wavoip,
    agentDisabled,
    anthropicMultiAgentId,
    connectionAgent,
    queuesEnabled,
    sendGreetingMessage,
    sendFarewellMessage,
    sendQueueEntryMessage,
    queueEntryMessage
  } = whatsappData;

  const agentFields = normalizeWhatsappAgentFields({
    agentDisabled,
    promptId,
    anthropicMultiAgentId,
    connectionAgent
  });

  try {
    await schema.validate({ name, status, isDefault });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  // Removida a obrigatoriedade de greetingMessage quando houver múltiplas filas

  const resolvedQueueIds =
    queuesEnabled === false
      ? [(await EnsureSystemQueueService(companyId)).id]
      : queueIds;

  if (
    queuesEnabled !== false &&
    Array.isArray(resolvedQueueIds) &&
    resolvedQueueIds.length > 1 &&
    !greetingMessage?.trim()
  ) {
    throw new AppError("ERR_WAPP_GREETING_REQUIRED");
  }

  let oldDefaultWhatsapp: Whatsapp | null = null;

  if (isDefault) {
    oldDefaultWhatsapp = await Whatsapp.findOne({
      where: {
        isDefault: true,
        id: { [Op.not]: whatsappId },
        companyId
      }
    });
    if (oldDefaultWhatsapp) {
      await oldDefaultWhatsapp.update({ isDefault: false });
    }
  }
  // console.log("GETTING WHATSAPP SHOW WHATSAPP 1", whatsappId, companyId)
  const whatsapp = await ShowWhatsAppService(whatsappId, companyId, undefined, requestUserId);

  // DEBUG - Log dos dados antes da atualização
  console.log(`[WHATSAPP-SERVICE] Atualizando conexão ${whatsappId} com:`, {
    flowIdNotPhrase: flowIdNotPhrase,
    flowIdWelcome: flowIdWelcome,
    flowIdInactiveTime: flowIdInactiveTime
  });

  await whatsapp.update({
    name,
    status,
    session,
    greetingMessage,
    complationMessage,
    outOfHoursMessage,
    isDefault,
    companyId,
    token: token || send_token,
    send_token: send_token || token,
    maxUseBotQueues: maxUseBotQueues || 0,
    timeUseBotQueues: timeUseBotQueues || 0,
    expiresTicket: expiresTicket || 0,
    allowGroup,
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
    promptId: agentFields.promptId,
    anthropicMultiAgentId: agentFields.anthropicMultiAgentId,
    collectiveVacationEnd,
    collectiveVacationMessage,
    collectiveVacationStart,
    queueIdImportMessages,
    flowIdNotPhrase,
    flowIdWelcome,
    flowIdInactiveTime,
    flowInactiveTime,
    maxUseInactiveTime,
    color,
    phone_number_id,
    waba_id,
    business_id,
    phone_number,
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
  });

  if (!requestQR) {
    await AssociateWhatsappQueue(whatsapp, resolvedQueueIds);
  }

  return { whatsapp, oldDefaultWhatsapp };
};

export default UpdateWhatsAppService;
