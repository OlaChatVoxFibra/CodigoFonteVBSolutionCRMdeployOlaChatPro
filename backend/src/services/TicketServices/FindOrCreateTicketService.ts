/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op } from "sequelize";
import { sub } from "date-fns";

import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import ShowTicketService from "./ShowTicketService";
import { isNil } from "lodash";
import { getIO } from "../../libs/socket";
import { isHumanAttendantTicket } from "../../helpers/ticketHumanAccept";
import Whatsapp from "../../models/Whatsapp";
import CreateLogTicketService from "./CreateLogTicketService";
import AppError from "../../errors/AppError";
import ContactWallet from "../../models/ContactWallet";
import ShowContactService from "../ContactServices/ShowContactService";
import logger from "../../utils/logger";
import { normalizeTicketDataWebhook } from "../AgentProactiveServices/agentProactiveTicketState";
import { whatsappHasConnectionAgent } from "../../providers/anthropic/services/resolveConnectionAgent";

const FindOrCreateTicketService = async (
  contact: Contact,
  whatsapp: Whatsapp,
  unreadMessages: number,
  companyId: number,
  queueId: number = null,
  userId: number = null,
  groupContact?: Contact,
  channel?: string,
  isImported?: boolean,
  isForward?: boolean,
  settings?: any,
  isTransfered?: boolean,
  isCampaign: boolean = false
): Promise<Ticket> => {
  // try {
  // let isCreated = false;

  // await new Promise(resolve => setTimeout(resolve, 3000));

  let openAsLGPD = false
  if (settings.enableLGPD) { //adicionar lgpdMessage

    openAsLGPD = !isCampaign &&
      !isTransfered &&
      settings.enableLGPD === "enabled" &&
      settings.lgpdMessage !== "" &&
      (settings.lgpdConsent === "enabled" ||
        (settings.lgpdConsent === "disabled" && isNil(contact?.lgpdAcceptedAt)))
  }

  const io = getIO();

  const DirectTicketsToWallets = settings.DirectTicketsToWallets;

  const contactId = groupContact ? groupContact.id : contact.id;

  console.log(`[DEBUG 2026] Buscando tickets para contactId=${contactId}, companyId=${companyId}, whatsappId=${whatsapp.id}`);

  /** IA na conexão: Prompt (GPT/Claude em /prompts) ou multi-agente Claude (anthropicMultiAgentId). */
  const connectionLevelAi = whatsappHasConnectionAgent(whatsapp);

  let ticket = await Ticket.findOne({
    where: {
      status: {
        [Op.or]: ["open", "pending", "group", "chatbot", "nps", "lgpd"]
      },
      contactId: contactId,
      companyId,
      whatsappId: whatsapp.id
    },
    order: [["updatedAt", "DESC"]]
  });

  if (ticket) {
    console.log(`[RDS-TICKET] Ticket existente encontrado: ID=${ticket.id}, status=${ticket.status}, updatedAt=${ticket.updatedAt}`);
  } else {
    console.log(`[RDS-TICKET] Nenhum ticket existente para contactId=${contactId}`);
  }

  if (ticket) {
    console.log(`[RDS-TICKET] Atualizando ticket existente ID=${ticket.id}, antigo status=${ticket.status}`);

    if (isCampaign) {
      await ticket.update({
        userId: userId !== ticket.userId ? ticket.userId : userId,
        queueId: queueId !== ticket.queueId ? ticket.queueId : queueId,
      })
    } else {
      const newUnreadCount = ticket.unreadMessages + unreadMessages;

      const updateData: any = {
        unreadMessages: newUnreadCount
      };

      const dataWebhook = normalizeTicketDataWebhook(ticket.dataWebhook) as any;
      const isAIWebhook =
        dataWebhook?.type === "openai" || dataWebhook?.type === "gemini";
      const aiIntegrationActive =
        !!ticket.useIntegration && isAIWebhook && !ticket.userId;

      const connectionLevelAi = whatsappHasConnectionAgent(whatsapp);

      // Após Aceitar (humano com isBot=false), não reativar IA na próxima mensagem do cliente.
      if (isHumanAttendantTicket(ticket)) {
        updateData.isBot = false;
        if (ticket.useIntegration) {
          updateData.useIntegration = false;
          updateData.integrationId = null;
        }
      } else if (
        aiIntegrationActive ||
        (isAIWebhook && dataWebhook?.mode === "permanent") ||
        connectionLevelAi
      ) {
        // Não forçar isBot=false quando a conversa está com IA ativa (todas as mensagens seguintes).
        updateData.isBot = true;
        if (connectionLevelAi) {
          updateData.useIntegration = true;
        }
        if (dataWebhook?.mode === "permanent") {
          logger.info(`[AI PERMANENT] Preservando modo IA permanente para ticket ${ticket.id}`);
        }
      } else {
        updateData.isBot = false;
      }

      if (!["open", "pending", "chatbot", "nps"].includes(ticket.status)) {
        // Verificar se é um grupo analisando o remoteJid (se termina com @g.us) ou a propriedade isGroup do ticket
        const isGroupTicket = ticket.status === "group" ||
          (ticket.isGroup === true) ||
          (groupContact !== undefined && groupContact !== null);

        if (isGroupTicket) {
          // Para tickets de grupo, precisamos verificar a configuração groupAsTicket
          console.log(`[RDS-TICKET] Ticket ${ticket.id} identificado como grupo, verificando configuração groupAsTicket`);

          try {
            // Buscar a configuração do whatsapp explicitamente
            const ticketWhatsapp = await Whatsapp.findByPk(ticket.whatsappId, {
              attributes: ["id", "name", "groupAsTicket"]
            });

            if (ticketWhatsapp && ticketWhatsapp.groupAsTicket === "enabled") {
              // Se groupAsTicket estiver habilitado, tratar como ticket normal
              console.log(`[RDS-TICKET] Whatsapp ${ticketWhatsapp.id} tem groupAsTicket=enabled, reativando ticket ${ticket.id} para 'pending'`);
              updateData.status = "pending";
            } else {
              // Se groupAsTicket estiver desabilitado, manter como grupo
              console.log(`[RDS-TICKET] Mantendo ticket ${ticket.id} como 'group' pois groupAsTicket não está habilitado`);
              // Garantir que o status seja "group" para evitar problemas de consistência
              if (ticket.status !== "group") {
                updateData.status = "group";
              }
            }
          } catch (error) {
            console.error(`[RDS-TICKET] Erro ao verificar configuração groupAsTicket: ${error.message}`);
            // Em caso de erro, manter como grupo por precaução
            console.log(`[RDS-TICKET] Mantendo ticket ${ticket.id} como 'group' devido a erro na verificação`);
            // Não alterar o status para "pending"
          }
        } else {
          // Para tickets normais (não de grupo), reativar normalmente
          console.log(`[RDS-TICKET] Reativando ticket ${ticket.id} de status '${ticket.status}' para 'pending'`);
          updateData.status = "pending";
        }
      }

      await ticket.update(updateData);
    }

    ticket = await ShowTicketService(ticket.id, companyId);
    console.log(`[RDS-TICKET] Ticket atualizado ID=${ticket.id}, novo status=${ticket.status}`);

    io.of("/" + String(companyId))
      .emit(`company-${companyId}-ticket`, {
        action: "update",
        ticket
      });

    if (!isCampaign && !isForward) {
      // @ts-ignore: Unreachable code error
      if ((Number(ticket?.userId) !== Number(userId) && userId !== 0 && userId !== "" && userId !== "0" && !isNil(userId) && !ticket.isGroup)
        // @ts-ignore: Unreachable code error
        || (queueId !== 0 && Number(ticket?.queueId) !== Number(queueId) && queueId !== "" && queueId !== "0" && !isNil(queueId))) {
        throw new AppError(`Ticket em outro atendimento. ${"Atendente: " + ticket?.user?.name} - ${"Fila: " + ticket?.queue?.name}`);
      }
    }

    return ticket
  }

  const timeCreateNewTicket = whatsapp.timeCreateNewTicket;

  if (!ticket && timeCreateNewTicket !== 0) {
    console.log(`[RDS-TICKET] Verificando tickets recentes nos últimos ${timeCreateNewTicket} minutos`);

    if (Number(timeCreateNewTicket) !== 0) {
      ticket = await Ticket.findOne({
        where: {
          updatedAt: {
            [Op.between]: [
              +sub(new Date(), {
                minutes: Number(timeCreateNewTicket)
              }),
              +new Date()
            ]
          },
          contactId: contactId,
          companyId,
          whatsappId: whatsapp.id
        },
        order: [["updatedAt", "DESC"]]
      });

      if (ticket) {
        console.log(`[RDS-TICKET] Ticket recente encontrado: ID=${ticket.id}, status=${ticket.status}, updatedAt=${ticket.updatedAt}`);
      }
    }

    if (ticket && ticket.status !== "nps") {
      console.log(`[RDS-TICKET] Reativando ticket recente ID=${ticket.id} como 'pending'`);
      await ticket.update({
        status: "pending",
        unreadMessages,
        companyId,
      });
    }
  }

  let createdNewTicket = false;

  if (!ticket) {
    console.log(`[RDS-TICKET] Criando novo ticket para contactId=${contactId}, companyId=${companyId}`);

    const ticketData: any = {
      contactId: contactId,
      status: (!isImported && !isNil(settings.enableLGPD)
        && openAsLGPD && !groupContact) ?
        "lgpd" :
        (whatsapp.groupAsTicket === "enabled" || !groupContact) ?
          "pending" :
          "group",
      isGroup: !!groupContact,
      unreadMessages,
      whatsappId: whatsapp.id,
      companyId,
      isBot: groupContact ? false : connectionLevelAi,
      useIntegration: !groupContact && connectionLevelAi ? true : false,
      channel,
      imported: isImported ? new Date() : null,
      isActiveDemand: false
    };

    const contactWallet = await ShowContactService(contact.id, companyId)

    // Se a IA está ativa na conexão, NÃO auto-atribuir por wallet/roteador:
    // isso setava isBot=false/useIntegration=false e bloqueava a resposta automática do agente.
    if (!connectionLevelAi && DirectTicketsToWallets && ((contact.id && !groupContact) || (groupContact && groupContact)) && contactWallet.contactWallets.length > 0) {
      const wallets = await ContactWallet.findOne({
        where: {
          contactId: groupContact ? groupContact.id : contact.id,
          companyId: companyId
        }
      })

      try {
        if (wallets?.walletId && wallets?.queueId) {
          const userId = contactWallet.wallets[0].id

          if (wallets && wallets?.id) {
            ticketData.status = (!isImported && !isNil(settings.enableLGPD)
              && openAsLGPD && !groupContact) ?
              "lgpd" :
              (whatsapp.groupAsTicket === "enabled" || !groupContact) ?
                "pending" :
                "group",
              ticketData.userId = userId;
            ticketData.queueId = wallets.queueId;
            ticketData.isBot = false;
            ticketData.startBot = false;
            ticketData.useIntegration = false;
            ticketData.integrationId = null;
            ticketData.isGroup = groupContact ? true : false;
          }
        }
      } catch (error) {
        console.log("error wallet", error)
      }
    }

    ticket = await Ticket.create(
      ticketData
    );
    createdNewTicket = true;

    // await FindOrCreateATicketTrakingService({
    //   ticketId: ticket.id,
    //   companyId,
    //   whatsappId: whatsapp.id,
    //   userId: userId ? userId : ticket.userId
    // });
  }


  if (queueId != 0 && !isNil(queueId)) {
    await ticket.update({ queueId: queueId });
  }

  if (userId != 0 && !isNil(userId)) {
    await ticket.update({ userId: userId });
  }

  ticket = await ShowTicketService(ticket.id, companyId);

  io.of("/" + String(companyId))
  .emit(`company-${companyId}-ticket`, {
    action: createdNewTicket ? "create" : "update",
    ticket
  });

  await CreateLogTicketService({
    ticketId: ticket.id,
    type: openAsLGPD ? "lgpd" : "create"
  });

  console.log(`[RDS-TICKET] Ticket final: ID=${ticket.id}, status=${ticket.status}, contactId=${ticket.contactId}`);
  return ticket;
};

export default FindOrCreateTicketService;
