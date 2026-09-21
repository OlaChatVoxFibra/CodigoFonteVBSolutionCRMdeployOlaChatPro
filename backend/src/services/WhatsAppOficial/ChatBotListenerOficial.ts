/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { proto } from "baileys";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import path, { join } from "path";

import {
  getBodyMessage,
  verifyMediaMessage,
  verifyMessage
} from "../WbotServices/wbotMessageListener";
import ShowDialogChatBotsServices from "../DialogChatBotsServices/ShowDialogChatBotsServices";
import ShowQueueService from "../QueueService/ShowQueueService";
import ShowChatBotServices from "../ChatBotServices/ShowChatBotServices";
import DeleteDialogChatBotsServices from "../DialogChatBotsServices/DeleteDialogChatBotsServices";
import ShowChatBotByChatbotIdServices from "../ChatBotServices/ShowChatBotByChatbotIdServices";
import CreateDialogChatBotsServices from "../DialogChatBotsServices/CreateDialogChatBotsServices";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import formatBody from "../../helpers/Mustache";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import Chatbot from "../../models/Chatbot";
import ShowFileService from "../../services/FileServices/ShowService";
import { isNil, isNull } from "lodash";
import moment from "moment";

import SendWhatsAppOficialMessage from "./SendWhatsAppOficialMessage";
import CompaniesSettings from "../../models/CompaniesSettings";
import TicketTraking from "../../models/TicketTraking";
import CreateLogTicketService from "../TicketServices/CreateLogTicketService";
import { ENABLE_LID_DEBUG } from "../../config/debug";
import logger from "../../utils/logger";
import { IMetaMessageinteractive } from "../../libs/whatsAppOficial/IWhatsAppOficial.interfaces";
import { getMessageOptions } from "../WbotServices/SendWhatsAppMedia";

const fs = require("fs");

type Session = any; // Para API oficial, não precisamos de WASocket

const isNumeric = (value: string) => /^-?\d+$/.test(value);

export const deleteAndCreateDialogStageOficial = async (
  contact: Contact,
  chatbotId: number,
  ticket: Ticket
) => {
  try {
    await DeleteDialogChatBotsServices(contact.id);

    const bots = await ShowChatBotByChatbotIdServices(chatbotId);

    if (!bots) {
      await ticket.update({ isBot: false });
    }
    return await CreateDialogChatBotsServices({
      awaiting: 1,
      contactId: contact.id,
      chatbotId,
      queueId: bots.queueId
    });
  } catch (error) {
    await ticket.update({ isBot: false });
  }
};

const sendMessageOficial = async (
  contact: Contact,
  ticket: Ticket,
  body: string
) => {
  if (ENABLE_LID_DEBUG) {
    logger.info(`[RDS-LID] ChatBot Oficial - Enviando mensagem: ${body}`);
    logger.info(`[RDS-LID] ChatBot Oficial - Contact lid: ${contact.lid}`);
    logger.info(
      `[RDS-LID] ChatBot Oficial - Contact remoteJid: ${contact.remoteJid}`
    );
  }

  try {
    await SendWhatsAppOficialMessage({
      body: formatBody(body, ticket),
      ticket,
      type: 'text',
      media: null,
      vCard: null
    });
  } catch (error) {
    if (ENABLE_LID_DEBUG) {
      logger.error(`[RDS-LID] ChatBot Oficial - Erro ao enviar mensagem: ${error.message}`);
    }
    throw error;
  }
};

// const sendMessageLinkOficial = async (
//   contact: Contact,
//   ticket: Ticket,
//   url: string,
//   caption: string
// ) => {
//   try {
//     await SendWhatsAppOficialMessage({
//       body: caption,
//       ticket,
//       type: 'document',
//       media: { url },
//       vCard: null
//     });
//   } catch (error) {
//     await SendWhatsAppOficialMessage({
//       body: formatBody(
//         "\u200eNão consegui enviar o PDF, tente novamente!",
//         ticket
//       ),
//       ticket,
//       type: 'text',
//       media: null,
//       vCard: null
//     });
//   }
// };

// const sendMessageImageOficial = async (
//   contact: Contact,
//   ticket: Ticket,
//   url: string,
//   caption: string
// ) => {
//   try {
//     await SendWhatsAppOficialMessage({
//       body: caption,
//       ticket,
//       type: 'image',
//       media: { url },
//       vCard: null
//     });
//   } catch (error) {
//     await SendWhatsAppOficialMessage({
//       body: formatBody("Não consegui enviar a imagem, tente novamente!", ticket),
//       ticket,
//       type: 'text',
//       media: null,
//       vCard: null
//     });
//   }
// };

const sendDialogOficial = async (
  choosenQueue: Chatbot,
  contact: Contact,
  ticket: Ticket
) => {
  if (ENABLE_LID_DEBUG) {
    logger.info(`[RDS-LID] ChatBot Oficial - sendDialogOficial iniciado para: ${choosenQueue.name}`);
  }
  
  const showChatBots = await ShowChatBotServices(choosenQueue.id);
  if (showChatBots.options) {
    if (ENABLE_LID_DEBUG) {
      logger.info(`[RDS-LID] ChatBot Oficial - Opções encontradas: ${showChatBots.options.length}`);
    }
    let companyId = ticket.companyId;
    const buttonActive = await CompaniesSettings.findOne({
      where: { companyId }
    });

    const typeBot = buttonActive?.chatBotType || "text";

    const botText = async () => {
      if (ENABLE_LID_DEBUG) {
        logger.info(`[RDS-LID] ChatBot Oficial - botText executado`);
      }
      
      let options = "";

      showChatBots.options.forEach((option, index) => {
        options += `*[ ${index + 1} ]* - ${option.name}\n`;
      });

      const optionsBack =
        options.length > 0
          ? `${options}\n*[ # ]* Voltar para o menu principal\n*[ Sair ]* Encerrar atendimento`
          : `${options}\n*[ Sair ]* Encerrar atendimento`;

      if (options.length > 0) {
        const body = formatBody(
          `\u200e ${choosenQueue.greetingMessage}\n\n${optionsBack}`,
          ticket
        );
        
        if (ENABLE_LID_DEBUG) {
          logger.info(`[RDS-LID] ChatBot Oficial - Enviando mensagem com opções: ${body}`);
        }
        
        const sendOption = await sendMessageOficial(contact, ticket, body);

        return sendOption;
      }

      const body = formatBody(`\u200e ${choosenQueue.greetingMessage}`, ticket);
      
      if (ENABLE_LID_DEBUG) {
        logger.info(`[RDS-LID] ChatBot Oficial - Enviando mensagem simples: ${body}`);
      }
      
      const send = await sendMessageOficial(contact, ticket, body);

      return send;
    };

    const botButton = async () => {
      const buttons = [];
      showChatBots.options.forEach((option, index) => {
        buttons.push({
          buttonId: `${index + 1}`,
          buttonText: { displayText: option.name },
          type: 1
        });
      });

      if (buttons.length > 0) {
        const buttonMessage = {
          text: `\u200e${choosenQueue.greetingMessage}`,
          buttons,
          headerType: 1
        };

        await SendWhatsAppOficialMessage({
          body: buttonMessage.text,
          ticket,
          type: 'interactive',
          media: null,
          vCard: null,
          interative: buttonMessage as unknown as IMetaMessageinteractive
        });

        return buttonMessage;
      }

      const body = `\u200e${choosenQueue.greetingMessage}`;
      const send = await sendMessageOficial(contact, ticket, body);

      return send;
    };

    const botList = async () => {
      const sectionsRows = [];
      showChatBots.options.forEach((queue, index) => {
        sectionsRows.push({
          title: queue.name,
          rowId: `${index + 1}`
        });
      });

      if (sectionsRows.length > 0) {
        const sections = [
          {
            title: "Menu",
            rows: sectionsRows
          }
        ];

        const listMessage = {
          text: formatBody(`\u200e${choosenQueue.greetingMessage}`, ticket),
          buttonText: "Escolha uma opção",
          sections
        };

        await SendWhatsAppOficialMessage({
          body: listMessage.text,
          ticket,
          type: 'interactive',
          media: null,
          vCard: null,
          interative: listMessage as unknown as IMetaMessageinteractive
        });

        return listMessage;
      }

      const body = `\u200e${choosenQueue.greetingMessage}`;
      const send = await sendMessageOficial(contact, ticket, body);

      return send;
    };

    if (ENABLE_LID_DEBUG) {
      logger.info(`[RDS-LID] ChatBot Oficial - Tipo de bot: ${typeBot}, Opções: ${showChatBots.options.length}`);
    }

    if (typeBot === "text") {
      if (ENABLE_LID_DEBUG) {
        logger.info(`[RDS-LID] ChatBot Oficial - Executando botText`);
      }
      const result = await botText();
      if (ENABLE_LID_DEBUG) {
        logger.info(`[RDS-LID] ChatBot Oficial - botText concluído`);
      }
      return result;
    }

    if (typeBot === "button" && showChatBots.options.length > 4) {
      if (ENABLE_LID_DEBUG) {
        logger.info(`[RDS-LID] ChatBot Oficial - Executando botText (muitas opções)`);
      }
      return await botText();
    }

    if (typeBot === "button" && showChatBots.options.length <= 4) {
      if (ENABLE_LID_DEBUG) {
        logger.info(`[RDS-LID] ChatBot Oficial - Executando botButton`);
      }
      return await botButton();
    }

    if (typeBot === "list") {
      if (ENABLE_LID_DEBUG) {
        logger.info(`[RDS-LID] ChatBot Oficial - Executando botList`);
      }
      return await botList();
    }
  }
};

const backToMainMenuOficial = async (
  contact: Contact,
  ticket: Ticket,
  ticketTraking: TicketTraking
) => {
  await UpdateTicketService({
    ticketData: { queueId: null, userId: null },
    ticketId: ticket.id,
    companyId: ticket.companyId
  });

  const { queues, greetingMessage, greetingMediaAttachment } =
    await ShowWhatsAppService(ticket.whatsappId!, ticket.companyId);

  const buttonActive = await CompaniesSettings.findOne({
    where: {
      companyId: ticket.companyId
    }
  });

  const botText = async () => {
    let options = "";

    queues.forEach((option, index) => {
      options += `*[ ${index + 1} ]* - ${option.name}\n`;
    });
    options += `\n*[ Sair ]* - Encerrar Atendimento`;

    const body = formatBody(`\u200e ${greetingMessage}\n\n${options}`, ticket);

    if (greetingMediaAttachment !== null) {
      const filePath = path.resolve(
        "public",
        `company${ticket.companyId}`,
        ticket.whatsapp.greetingMediaAttachment
      );

      const messagePath = ticket.whatsapp.greetingMediaAttachment;
      const optionsMsg = await getMessageOptions(
        messagePath,
        filePath,
        String(ticket.companyId),
        body
      );

      await SendWhatsAppOficialMessage({
        body,
        ticket,
        type: optionsMsg.mimetype?.includes('image') ? 'image' :
          optionsMsg.mimetype?.includes('video') ? 'video' :
            optionsMsg.mimetype?.includes('audio') ? 'audio' : 'document',
        media: optionsMsg,
        vCard: null
      });
    } else {
      await SendWhatsAppOficialMessage({
        body,
        ticket,
        type: 'text',
        media: null,
        vCard: null
      });
    }

    const deleteDialog = await DeleteDialogChatBotsServices(contact.id);
    return deleteDialog;
  };

  if (buttonActive.chatBotType === "text") {
    return botText();
  }
};

async function sendMsgAndCloseTicketOficial(contact, ticket) {
  const ticketUpdateAgent = {
    ticketData: {
      status: "closed",
      userId: ticket?.userId || null,
      sendFarewellMessage: false,
      amountUsedBotQueues: 0
    },
    ticketId: ticket.id,
    companyId: ticket.companyId
  };

  await new Promise(resolve => setTimeout(resolve, 2000));
  await UpdateTicketService(ticketUpdateAgent);
}

export const sayChatbotOficial = async (
  queueId: number,
  ticket: Ticket,
  contact: Contact,
  msg: any,
  ticketTraking: TicketTraking
): Promise<any> => {
  // ✅ VERIFICAÇÃO PREVENTIVA: Não processar se ticket estiver "open" (aceito por atendente)
  if (ticket.status === "open") {
    console.log(`[CHATBOT OFICIAL] Ticket ${ticket.id} está "open" - ChatBot não deve processar`);
    return;
  }

  // ✅ CORREÇÃO: Extrair selectedOption corretamente para API oficial
  const selectedOption =
    msg?.message?.buttonsResponseMessage?.selectedButtonId ||
    msg?.message?.listResponseMessage?.singleSelectReply.selectedRowId ||
    msg?.message?.conversation ||
    getBodyMessage(msg);

  if (ENABLE_LID_DEBUG) {
    logger.info(`[RDS-LID] ChatBot Oficial - sayChatbotOficial iniciado`);
    logger.info(`[RDS-LID] ChatBot Oficial - selectedOption: ${selectedOption}`);
    logger.info(`[RDS-LID] ChatBot Oficial - queueId: ${queueId}`);
    logger.info(`[RDS-LID] ChatBot Oficial - msg.key.fromMe: ${msg.key.fromMe}`);
  }

  if (!queueId && selectedOption && msg.key.fromMe) return;

  // ✅ VERIFICAÇÃO ADICIONAL: SÓ PROCESSAR SE HOUVER UMA OPÇÃO VÁLIDA
  if (!selectedOption || selectedOption.trim() === "") {
    if (ENABLE_LID_DEBUG) {
      logger.info(`[RDS-LID] ChatBot Oficial - Nenhuma opção selecionada, saindo`);
    }
    return;
  }

  const getStageBot = await ShowDialogChatBotsServices(contact.id);

  if (ENABLE_LID_DEBUG) {
    logger.info(`[RDS-LID] ChatBot Oficial - getStageBot: ${JSON.stringify(getStageBot)}`);
    logger.info(`[RDS-LID] ChatBot Oficial - contact.id: ${contact.id}`);
  }

  if (String(selectedOption).toLocaleLowerCase() === "sair") {
    // Enviar mensagem de conclusão primeiro para aparecer no frontend
    const complationMessage = ticket.whatsapp?.complationMessage;
    if (!isNil(complationMessage)) {
      const textMessage = { text: formatBody(`\u200e${complationMessage}`, ticket) };
      await SendWhatsAppOficialMessage({
        body: textMessage.text,
        ticket,
        type: 'text',
        media: null,
        vCard: null
      });
    }

    // Fechar ticket de forma centralizada e emitir sockets
    const ticketUpdateAgent = {
      ticketData: {
        status: "closed",
        userId: ticket?.userId || null,
        // já enviamos a mensagem de conclusão acima
        sendFarewellMessage: false,
        amountUsedBotQueues: 0
      },
      ticketId: ticket.id,
      companyId: ticket.companyId
    };

    await UpdateTicketService(ticketUpdateAgent);

    await ticketTraking.update({
      userId: ticket.userId,
      closedAt: moment().toDate(),
      finishedAt: moment().toDate()
    });

    await CreateLogTicketService({
      ticketId: ticket.id,
      type: "clientClosed",
      queueId: ticket.queueId
    });

    // Limpar diálogos do bot para evitar loops
    try {
      await DeleteDialogChatBotsServices(contact.id);
    } catch (error) {
      console.error("Erro ao deletar dialogs", error);
    }

    return;
  }

  if (selectedOption === "#") {
    const backTo = await backToMainMenuOficial(contact, ticket, ticketTraking);
    return;
  }

  if (!getStageBot) {
    if (ENABLE_LID_DEBUG) {
      logger.info(`[RDS-LID] ChatBot Oficial - Entrando na lógica de !getStageBot`);
    }
    
    const queue = await ShowQueueService(queueId, ticket.companyId);

    const selectedOptions =
      msg?.message?.buttonsResponseMessage?.selectedButtonId ||
      msg?.message?.listResponseMessage?.singleSelectReply.selectedRowId ||
      getBodyMessage(msg);

    if (ENABLE_LID_DEBUG) {
      logger.info(`[RDS-LID] ChatBot Oficial - selectedOptions: ${selectedOptions}`);
      logger.info(`[RDS-LID] ChatBot Oficial - queue.chatbots.length: ${queue.chatbots.length}`);
    }

    const choosenQueue = queue.chatbots[+selectedOptions - 1];

    if (ENABLE_LID_DEBUG) {
      logger.info(`[RDS-LID] ChatBot Oficial - choosenQueue: ${choosenQueue?.name}, queueType: ${choosenQueue?.queueType}`);
    }

    if (choosenQueue) {

      if (choosenQueue.queueType === "integration") {
        try {
          await ticket.update({
            integrationId: choosenQueue.optIntegrationId,
            useIntegration: true,
            status: "pending",
            queueId: null
          });

          if (ENABLE_LID_DEBUG) {
            logger.info(`[RDS-LID] ChatBot Oficial - Integração configurada: ${choosenQueue.optIntegrationId}`);
          }
        } catch (error) {
          if (ENABLE_LID_DEBUG) {
            logger.error(`[RDS-LID] ChatBot Oficial - Erro ao configurar integração: ${error.message}`);
          }
          await deleteAndCreateDialogStageOficial(contact, choosenQueue.id, ticket);
        }
      } else if (choosenQueue.queueType === "queue") {
        try {
          const ticketUpdateAgent = {
            ticketData: {
              queueId: choosenQueue.optQueueId,
              status: "pending"
            },
            ticketId: ticket.id
          };
          await UpdateTicketService({
            ticketData: {
              ...ticketUpdateAgent.ticketData
            },
            ticketId: ticketUpdateAgent.ticketId,
            companyId: ticket.companyId
          });
        } catch (error) {
          await deleteAndCreateDialogStageOficial(contact, choosenQueue.id, ticket);
        }
      } else if (choosenQueue.queueType === "attendent") {
        try {
          const ticketUpdateAgent = {
            ticketData: {
              queueId: choosenQueue.optQueueId,
              userId: choosenQueue.optUserId,
              status: "pending"
            },
            ticketId: ticket.id
          };
          await UpdateTicketService({
            ticketData: {
              ...ticketUpdateAgent.ticketData
            },
            ticketId: ticketUpdateAgent.ticketId,
            companyId: ticket.companyId
          });
        } catch (error) {
          await deleteAndCreateDialogStageOficial(contact, choosenQueue.id, ticket);
        }
      }

      await deleteAndCreateDialogStageOficial(contact, choosenQueue.id, ticket);

      // ✅ SEMPRE ENVIAR MENSAGEM DA SUBFILA (igual ao ChatBotListener original)
      let send;
      if (choosenQueue?.greetingMessage) {
        if (ENABLE_LID_DEBUG) {
          logger.info(`[RDS-LID] ChatBot Oficial - Enviando mensagem da subfila: ${choosenQueue.name}`);
          logger.info(`[RDS-LID] ChatBot Oficial - Mensagem: ${choosenQueue.greetingMessage}`);
        }
        send = await sendDialogOficial(choosenQueue, contact, ticket);
      }

      if (choosenQueue.queueType === "file") {
        try {
          const publicFolder = path.resolve(
            __dirname,
            "..",
            "..",
            "..",
            "public"
          );

          const files = await ShowFileService(
            choosenQueue.optFileId,
            ticket.companyId
          );

          const folder = path.resolve(
            publicFolder,
            `company${ticket.companyId}`,
            "fileList",
            String(files.id)
          );

          for (const [index, file] of files.options.entries()) {
            const mediaSrc = {
              fieldname: "medias",
              originalname: path.basename(file.path),
              encoding: "7bit",
              mimetype: file.mediaType,
              filename: file.path,
              path: path.resolve(folder, file.path)
            } as Express.Multer.File;

            await SendWhatsAppOficialMessage({
              media: mediaSrc,
              body: file.name,
              ticket,
              type: null
            });
          }
        } catch (error) {
          await deleteAndCreateDialogStageOficial(contact, choosenQueue.id, ticket);
        }
      }

      if (choosenQueue.queueType === "text" && choosenQueue.greetingMessage) {
        send = await sendDialogOficial(choosenQueue, contact, ticket);
      }

      if (choosenQueue.closeTicket) {
        await sendMsgAndCloseTicketOficial(ticket.contact, ticket);
      }

      return send;
    }
  }

  if (getStageBot) {
    if (ENABLE_LID_DEBUG) {
      logger.info(`[RDS-LID] ChatBot Oficial - getStageBot encontrado: ${getStageBot.chatbotId}`);
    }
    
    const selected = isNumeric(selectedOption) ? selectedOption : 0;
    const bots = await ShowChatBotServices(getStageBot.chatbotId);

    if (ENABLE_LID_DEBUG) {
      logger.info(`[RDS-LID] ChatBot Oficial - selected: ${selected}, bots.options.length: ${bots.options.length}`);
    }

    if (selected === 0 || +selected > bots.options.length) {
      const body = "\u200eOpção inválida! Digite um número válido para continuar!";
      await new Promise(resolve => setTimeout(resolve, 2000));
      await sendMessageOficial(ticket.contact, ticket, body);
      return;
    }
    const choosenQueue = bots.options[+selected - 1]
      ? bots.options[+selected - 1]
      : bots.options[0];

    if (ENABLE_LID_DEBUG) {
      logger.info(`[RDS-LID] ChatBot Oficial - choosenQueue: ${choosenQueue?.name}, queueType: ${choosenQueue?.queueType}`);
    }

    if (!choosenQueue.greetingMessage) {
      await DeleteDialogChatBotsServices(contact.id);
      return;
    }

    if (choosenQueue) {
      // ✅ REGRA PRINCIPAL: choosenQueue.queueType === "integration"
      if (choosenQueue.queueType === "integration") {
        try {
          const ticketUpdateAgent = {
            ticketData: {
              integrationId: choosenQueue.optIntegrationId,
              useIntegration: true,
              status: "pending"
            },
            ticketId: ticket.id
          };
          await UpdateTicketService({
            ticketData: {
              ...ticketUpdateAgent.ticketData
            },
            ticketId: ticketUpdateAgent.ticketId,
            companyId: ticket.companyId
          });

          if (ENABLE_LID_DEBUG) {
            logger.info(`[RDS-LID] ChatBot Oficial - Integração configurada no estágio: ${choosenQueue.optIntegrationId}`);
          }
        } catch (error) {
          if (ENABLE_LID_DEBUG) {
            logger.error(`[RDS-LID] ChatBot Oficial - Erro ao configurar integração no estágio: ${error.message}`);
          }
          await deleteAndCreateDialogStageOficial(contact, choosenQueue.id, ticket);
        }
      } else if (choosenQueue.queueType === "queue") {
        try {
          const ticketUpdateAgent = {
            ticketData: {
              queueId: choosenQueue.optQueueId,
              status: "pending"
            },
            ticketId: ticket.id
          };
          await UpdateTicketService({
            ticketData: {
              ...ticketUpdateAgent.ticketData
            },
            ticketId: ticketUpdateAgent.ticketId,
            companyId: ticket.companyId
          });
        } catch (error) {
          await deleteAndCreateDialogStageOficial(contact, choosenQueue.id, ticket);
        }
      } else if (choosenQueue.queueType === "attendent") {
        try {
          const ticketUpdateAgent = {
            ticketData: {
              queueId: choosenQueue.optQueueId,
              userId: choosenQueue.optUserId,
              status: "pending"
            },
            ticketId: ticket.id
          };
          await UpdateTicketService({
            ticketData: {
              ...ticketUpdateAgent.ticketData
            },
            ticketId: ticketUpdateAgent.ticketId,
            companyId: ticket.companyId
          });
        } catch (error) {
          await deleteAndCreateDialogStageOficial(contact, choosenQueue.id, ticket);
        }
      }

      await deleteAndCreateDialogStageOficial(contact, choosenQueue.id, ticket);

      if (choosenQueue.queueType === "file") {
        try {
          const publicFolder = path.resolve(
            __dirname,
            "..",
            "..",
            "..",
            "public"
          );

          const files = await ShowFileService(
            choosenQueue.optFileId,
            ticket.companyId
          );

          const folder = path.resolve(
            publicFolder,
            `company${ticket.companyId}`,
            "fileList",
            String(files.id)
          );

          for (const [index, file] of files.options.entries()) {
            const mediaSrc = {
              fieldname: "medias",
              originalname: path.basename(file.path),
              encoding: "7bit",
              mimetype: file.mediaType,
              filename: file.path,
              path: path.resolve(folder, file.path)
            } as Express.Multer.File;

            await SendWhatsAppOficialMessage({
              media: mediaSrc,
              body: file.name,
              ticket,
              type: null
            });
          }
        } catch (error) {
          await deleteAndCreateDialogStageOficial(contact, choosenQueue.id, ticket);
        }
      }
      if (choosenQueue.closeTicket) {
        await sendMsgAndCloseTicketOficial(ticket.contact, ticket);
      }

      // ✅ SEMPRE ENVIAR RESPOSTA DO SUBMENU (igual ao ChatBotListener original)
      await deleteAndCreateDialogStageOficial(contact, choosenQueue.id, ticket);

      if (ENABLE_LID_DEBUG) {
        logger.info(`[RDS-LID] ChatBot Oficial - Enviando submenu para: ${choosenQueue.name}`);
        logger.info(`[RDS-LID] ChatBot Oficial - Mensagem: ${choosenQueue.greetingMessage}`);
      }
      
      const send = await sendDialogOficial(choosenQueue, contact, ticket);
      return send;
    } else {
      if (ENABLE_LID_DEBUG) {
        logger.warn(`[RDS-LID] ChatBot Oficial - getStageBot não encontrado para contact: ${contact.id}`);
      }
    }
  }
};
