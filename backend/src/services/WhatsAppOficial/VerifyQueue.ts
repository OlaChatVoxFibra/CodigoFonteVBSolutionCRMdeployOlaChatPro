/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import CompaniesSettings from "../../models/CompaniesSettings";
import Ticket from "../../models/Ticket";
import TicketTraking from "../../models/TicketTraking";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import { IMessageReceived } from "./ReceivedWhatsApp";

import formatBody from "../../helpers/Mustache";
import {
  buildQueueEntryMessageText,
  resolveQueueEntryMessageTemplate,
  resolveShouldSendQueueEntryMessage
} from "../../helpers/queueEntryMessage";
import path from "path";
import fs from "fs";

import { isNil } from "lodash";
import SendWhatsAppOficialMessage from "./SendWhatsAppOficialMessage";
import { getMessageOptions } from "../WbotServices/SendWhatsAppMedia";
import ShowFileService from "../FileServices/ShowService";
import logger from "../../utils/logger";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import ListUserQueueServices from "../UserQueueServices/ListUserQueueServices";
import Queue from "../../models/Queue";
import VerifyCurrentSchedule from "../CompanyService/VerifyCurrentSchedule";
import CreateLogTicketService from "../TicketServices/CreateLogTicketService";
import { IMetaMessageinteractive } from "../../libs/whatsAppOficial/IWhatsAppOficial.interfaces";
import moment from "moment";
import DeleteDialogChatBotsServices from "../DialogChatBotsServices/DeleteDialogChatBotsServices";
import ShowQueueIntegrationService from "../QueueIntegrationServices/ShowQueueIntegrationService";
import typebotListenerOficial from "../TypebotServices/typebotListenerOficial";
import { handleMessageIntegration } from "../WbotServices/wbotMessageListener";
import sgpListenerOficial from "../IntegrationsServices/Sgp/sgpListenerOficial";

const verifyQueueOficial = async (
    msg: IMessageReceived,
    ticket: Ticket,
    settings?: CompaniesSettings,
    ticketTraking?: TicketTraking,
    fromMe?: boolean
) => {
    const companyId = ticket.companyId;
    // console.log("GETTING WHATSAPP VERIFY QUEUE", ticket.whatsappId, wbot.id)
    const { queues, greetingMessage, maxUseBotQueues, timeUseBotQueues, sendQueueEntryMessage, queueEntryMessage, queuesEnabled, sendGreetingMessage } = await ShowWhatsAppService(ticket.whatsappId!, companyId);

    let chatbot = false;

    if (queues.length === 1 && queuesEnabled === false) {
        chatbot = queues[0]?.chatbots?.length > 1;
    }

    const enableQueuePosition = settings.sendQueuePosition === "enabled";

    const autoAssignSingle =
        queues.length >= 1 &&
        (queues.length === 1 || queuesEnabled === false) &&
        !chatbot;

    if (autoAssignSingle) {
        const greetingText = String(greetingMessage || "").trim();
        const shouldSendSimpleGreeting =
            greetingText.length > 0 &&
            (Boolean(sendGreetingMessage) ||
                (queuesEnabled === false &&
                    settings.sendGreetingMessageOneQueues === "enabled"));

        if (shouldSendSimpleGreeting) {

            const body = formatBody(greetingText, ticket);

            if (ticket.whatsapp.greetingMediaAttachment !== null) {
                const filePath = path.resolve("public", `company${companyId}`, ticket.whatsapp.greetingMediaAttachment);

                const fileExists = fs.existsSync(filePath);

                if (fileExists) {

                    const messagePath = ticket.whatsapp.greetingMediaAttachment

                    const media = await getMessageOptions(messagePath, filePath, String(companyId), body);

                    await SendWhatsAppOficialMessage({
                        media, body, ticket, type: null
                    })
                } else {
                    await SendWhatsAppOficialMessage({
                        body, ticket, quotedMsg: null, type: 'text', media: null, vCard: null
                    })
                }
            } else {
                await SendWhatsAppOficialMessage({
                    body, ticket, quotedMsg: null, type: 'text', media: null, vCard: null
                })
            }
        }

        if (!isNil(queues[0].fileListId)) {
            try {
                const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");

                const files = await ShowFileService(queues[0].fileListId, ticket.companyId)

                const folder = path.resolve(publicFolder, `company${ticket.companyId}`, "fileList", String(files.id))

                const destinationFolder = path.resolve(publicFolder, `company${ticket.companyId}`);

                if (!fs.existsSync(destinationFolder)) {
                    fs.mkdirSync(destinationFolder, { recursive: true });
                }

                try {
                    if (fs.existsSync(folder)) {
                        const filesInFolder = fs.readdirSync(folder);

                        for (const file of filesInFolder) {
                            const sourcePath = path.resolve(folder, file);
                            const destPath = path.resolve(destinationFolder, file);

                            if (fs.statSync(sourcePath).isFile()) {
                                fs.copyFileSync(sourcePath, destPath);
                            }
                        }
                    } else {
                        logger.info(`Pasta de origem ${folder} não encontrada`);
                    }
                } catch (err) {
                    logger.error(`Erro ao copiar arquivos: ${err}`);
                }

                for (const [index, file] of files.options.entries()) {
                    const mediaSrc = {
                        fieldname: 'medias',
                        originalname: path.basename(file.path),
                        encoding: '7bit',
                        mimetype: file.mediaType,
                        filename: file.path,
                        path: path.resolve(folder, file.path),
                    } as Express.Multer.File

                    await SendWhatsAppOficialMessage({
                        media: mediaSrc, body: file.name, ticket, type: null
                    })
                };

            } catch (error) {
                logger.info(error);
            }
        }

        if (queues[0].closeTicket) {
            await UpdateTicketService({
                ticketData: {
                    status: "closed",
                    queueId: queues[0].id,
                    sendFarewellMessage: false
                },
                ticketId: ticket.id,
                companyId
            });

            return;
        } else {
            await UpdateTicketService({
                ticketData: { queueId: queues[0].id, status: ticket.status === "lgpd" ? "pending" : ticket.status },
                ticketId: ticket.id,
                companyId
            });
        }

        const count = await Ticket.findAndCountAll({
            where: {
                userId: null,
                status: "pending",
                companyId,
                queueId: queues[0].id,
                isGroup: false
            }
        });

        if (enableQueuePosition) {
            const qtd = count.count === 0 ? 1 : count.count;
            const shouldSend = resolveShouldSendQueueEntryMessage({
                queueName: queues[0].name,
                contactName: (ticket as any).contact?.name,
                position: qtd,
                queueEntryMessage: queues[0].queueEntryMessage,
                queueSendEntryMessage: queues[0].sendQueueEntryMessage,
                connectionSendQueueEntryMessage: sendQueueEntryMessage,
                connectionQueueEntryMessage: queueEntryMessage,
                companySendQueuePosition: settings.sendQueuePosition
            });

            if (shouldSend) {
                const entryTemplate = resolveQueueEntryMessageTemplate({
                    queueName: queues[0].name,
                    queueEntryMessage: queues[0].queueEntryMessage,
                    connectionSendQueueEntryMessage: sendQueueEntryMessage,
                    connectionQueueEntryMessage: queueEntryMessage
                });
                const msgFila = buildQueueEntryMessageText({
                    queueName: queues[0].name,
                    contactName: (ticket as any).contact?.name,
                    position: qtd,
                    queueEntryMessage: entryTemplate
                });
                const bodyFila = formatBody(`${msgFila}`, ticket);
                await SendWhatsAppOficialMessage({
                    body: bodyFila, ticket, quotedMsg: null, type: 'text', media: null, vCard: null
                });
            }
        }

        return;
    }


    // REGRA PARA DESABILITAR O BOT PARA ALGUM CONTATO
    if (ticket.contact.disableBot) {
        return;
    }

    if (queuesEnabled === false || queues.length < 2) {
        return;
    }

    let selectedOption = "";

    if (ticket.status !== "lgpd") {
        selectedOption = msg.text
    } else {
        if (!isNil(ticket.lgpdAcceptedAt))
            await ticket.update({
                status: "pending"
            });

        await ticket.reload();
    }

    if (String(selectedOption).toLocaleLowerCase() === "sair") {
        const { complationMessage } = await ShowWhatsAppService(ticket.whatsappId!, companyId);

        // Enviar mensagem de conclusão antes de fechar o ticket para garantir exibição no frontend
        if (complationMessage) {
            await SendWhatsAppOficialMessage({
                body: complationMessage,
                ticket,
                type: 'text',
                media: null,
                vCard: null
            });
        }

        const ticketData = {
            isBot: false,
            status: "closed",
            // Já enviamos a mensagem de conclusão acima; evitar duplicidade pelo UpdateTicketService
            sendFarewellMessage: false,
            amountUsedBotQueues: 0
        };

        await UpdateTicketService({ ticketData, ticketId: ticket.id, companyId })

        if (ticket.contactId) {
            try {
                await DeleteDialogChatBotsServices(ticket.contactId);
            } catch (error) {
                console.error("Erro ao deletar dialogs", error);
            }
        }

        await ticketTraking.update({
            userId: ticket.userId,
            closedAt: moment().toDate(),
            finishedAt: moment().toDate()
        });

        await CreateLogTicketService({
            ticketId: ticket.id,
            type: "clientClosed",
            queueId: ticket.queueId,
            userId: ticket.userId
        });

        return;
    }

    // Tratamento para "#" - voltar ao menu principal
    if (selectedOption === "#") {
        // Resetar o ticket para voltar ao menu principal
        await ticket.update({
            queueId: null,
            userId: null,
            amountUsedBotQueues: 0
        });

        // Deletar dialogs existentes
        await DeleteDialogChatBotsServices(ticket.contactId);

        // Buscar filas do WhatsApp
        const { queues, greetingMessage, greetingMediaAttachment } = await ShowWhatsAppService(ticket.whatsappId!, ticket.companyId);

        if (queues.length === 0) {
            return;
        }

        let options = "";
        queues.forEach((option, index) => {
            options += `*[ ${index + 1} ]* - ${option.name}\n`;
        });
        options += `\n*[ Sair ]* - Encerrar Atendimento`;

        const body = formatBody(`\u200e${greetingMessage}\n\n${options}`, ticket);

        console.log('body1', body);

        await CreateLogTicketService({
            ticketId: ticket.id,
            type: "chatBot",
            queueId: ticket.queueId,
            userId: ticket.userId
        });

        if (greetingMediaAttachment !== null) {
            const filePath = path.resolve("public", `company${ticket.companyId}`, greetingMediaAttachment);
            const fileExists = fs.existsSync(filePath);

            if (fileExists) {
                const messageOptions = await getMessageOptions(
                    greetingMediaAttachment,
                    filePath,
                    String(ticket.companyId),
                    body
                );

                console.log('body2', body);

                await SendWhatsAppOficialMessage({
                    body,
                    ticket,
                    type: messageOptions.mimetype?.includes('image') ? 'image' :
                        messageOptions.mimetype?.includes('video') ? 'video' :
                            messageOptions.mimetype?.includes('audio') ? 'audio' : 'document',
                    media: messageOptions,
                    vCard: null
                });
            } else {
                console.log('body3', body);

                await SendWhatsAppOficialMessage({
                    body,
                    ticket,
                    type: 'text',
                    media: null,
                    vCard: null
                });
            }
        } else {
            console.log('body4', body);

            await SendWhatsAppOficialMessage({
                body,
                ticket,
                type: 'text',
                media: null,
                vCard: null
            });
        }

        return;
    }

    let choosenQueue = (chatbot && queues.length === 1) ? queues[+selectedOption] : queues[+selectedOption - 1];

    const typeBot = settings?.chatBotType || "text";

    // Serviço p/ escolher consultor aleatório para o ticket, ao selecionar fila.
    const botText = async () => {
        if (choosenQueue || (queues.length === 1 && chatbot)) {
            // console.log("entrou no choose", ticket.isOutOfHour, ticketTraking.chatbotAt)
            if (queues.length === 1) choosenQueue = queues[0]
            const queue = await Queue.findByPk(choosenQueue.id);

            if (ticket.isOutOfHour === false && ticketTraking.chatbotAt !== null) {
                await ticketTraking.update({
                    chatbotAt: null
                });
                await ticket.update({
                    amountUsedBotQueues: 0
                });
            }

            let currentSchedule;

            if (settings?.scheduleType === "queue") {
                currentSchedule = await VerifyCurrentSchedule(companyId, queue.id, 0);
            }

            if (
                settings?.scheduleType === "queue" && ticket.status !== "open" &&
                !isNil(currentSchedule) && (ticket.amountUsedBotQueues < maxUseBotQueues || maxUseBotQueues === 0)
                && (!currentSchedule || currentSchedule.inActivity === false)
                && (!ticket.isGroup || ticket.whatsapp?.groupAsTicket === "enabled")
            ) {
                if (timeUseBotQueues !== "0") {
                    //Regra para desabilitar o chatbot por x minutos/horas após o primeiro envio
                    //const ticketTraking = await FindOrCreateATicketTrakingService({ ticketId: ticket.id, companyId });
                    let dataLimite = new Date();
                    let Agora = new Date();

                    if (ticketTraking.chatbotAt !== null) {
                        dataLimite.setMinutes(ticketTraking.chatbotAt.getMinutes() + (Number(timeUseBotQueues)));

                        if (ticketTraking.chatbotAt !== null && Agora < dataLimite && timeUseBotQueues !== "0" && ticket.amountUsedBotQueues !== 0) {
                            return
                        }
                    }
                    await ticketTraking.update({
                        chatbotAt: null
                    })
                }

                const outOfHoursMessage = queue.outOfHoursMessage;

                if (outOfHoursMessage !== "") {
                    // console.log("entrei3");
                    const body = formatBody(`${outOfHoursMessage}`, ticket);

                    console.log('body5', body);

                    await SendWhatsAppOficialMessage({
                        body, ticket, quotedMsg: null, type: 'text', media: null, vCard: null
                    })
                }

                //atualiza o contador de vezes que enviou o bot e que foi enviado fora de hora
                await ticket.update({
                    queueId: queue.id,
                    isOutOfHour: true,
                    amountUsedBotQueues: ticket.amountUsedBotQueues + 1
                });

                return;
            }

            await UpdateTicketService({
                ticketData: {
                    amountUsedBotQueues: 0,
                    queueId: choosenQueue.id,
                    isBot: true
                },
                ticketId: ticket.id,
                companyId
            });
            // }

            // ✅ INICIA INTEGRAÇÃO TYPEBOT/DIALOGFLOW/N8N/SGP APÓS ESCOLHER FILA
            if (!fromMe && !ticket.isGroup && choosenQueue?.integrationId) {
                const integrations = await ShowQueueIntegrationService(
                    choosenQueue.integrationId,
                    companyId
                );

                // Criar um objeto msg simulado para compatibilidade
                const simulatedMsg = {
                    key: {
                        fromMe: false,
                        remoteJid: `${ticket.contact.number}@s.whatsapp.net`,
                        id: msg.idMessage || `ofc-${Date.now()}`
                    },
                    message: {
                        conversation: msg.text || "",
                        timestamp: msg.timestamp || Math.floor(Date.now() / 1000),
                        text: msg.text || ""
                    }
                };

                // ✅ VERIFICAR SE É TYPEBOT
                if (integrations.type === "typebot") {
                    console.log("[TYPEBOT OFICIAL - QUEUE] Iniciando Typebot da fila");
                    await typebotListenerOficial({
                        ticket,
                        msg: simulatedMsg,
                        typebot: integrations
                    });

                    await ticket.update({
                        useIntegration: true,
                        integrationId: integrations.id,
                        typebotSessionTime: moment().toDate()
                    });
                } else {
                    // ✅ CHECAR SE É SGP VIA TYPE OU jsonContent
                    let cfg: any = {};
                    try { cfg = integrations.jsonContent ? JSON.parse(integrations.jsonContent) : {}; } catch { cfg = {}; }

                    if (integrations.type === "SGP" || ((cfg?.sgpUrl || cfg?.tipoIntegracao) && integrations.type !== "typebot")) {
                        console.log("[SGP OFICIAL - QUEUE] SGP detectado: aguardando CPF do cliente");
                        // Não iniciar integração agora; apenas marcar no ticket
                        await ticket.update({ useIntegration: true, integrationId: integrations.id });
                    } else {
                        // ✅ OUTRAS INTEGRAÇÕES (n8n, dialogflow, flowbuilder, webhook)
                        await handleMessageIntegration(
                            simulatedMsg as any,
                            null, // wbot é null para API Oficial
                            companyId,
                            integrations,
                            ticket
                        );

                        await ticket.update({
                            useIntegration: true,
                            integrationId: integrations.id
                        });
                    }
                }
            }

            if (choosenQueue.chatbots.length > 0 && !ticket.isGroup) {
                // let buttonsData: IMetaMessageinteractive;

                // if (choosenQueue.chatbots.length > 3) {
                let options = "";
                choosenQueue.chatbots.forEach((chatbot, index) => {
                    options += `*[ ${index + 1} ]* - ${chatbot.name}\n`;
                });

                const body = formatBody(
                    `${choosenQueue.greetingMessage}\n\n${options}\n*[ # ]* Voltar para o menu principal\n*[ Sair ]* Encerrar atendimento`,
                    ticket
                );

                console.log('body6', body);

                await SendWhatsAppOficialMessage({
                    body, ticket, quotedMsg: null, type: 'text', media: null, vCard: null
                })

                if (settings?.userRandom === "enabled") {
                    let randomUserId;

                    if (choosenQueue) {
                        try {
                            const userQueue = await ListUserQueueServices(choosenQueue.id);

                            if (userQueue.userId > -1) {
                                randomUserId = userQueue.userId;
                            }

                        } catch (error) {
                            console.error(error);
                        }
                    }

                    if (randomUserId) {
                        await UpdateTicketService({
                            ticketData: { userId: randomUserId },
                            ticketId: ticket.id,
                            companyId
                        });
                    }
                }
            }

            if (!choosenQueue.chatbots.length && choosenQueue.greetingMessage.length !== 0) {
                const body = formatBody(
                    choosenQueue.greetingMessage,
                    ticket
                );

                console.log('body9', body);

                await SendWhatsAppOficialMessage({
                    body, ticket, quotedMsg: null, type: 'text', media: null, vCard: null
                })
            }

            if (!isNil(choosenQueue.fileListId)) {
                try {

                    const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");

                    const files = await ShowFileService(choosenQueue.fileListId, ticket.companyId)

                    const folder = path.resolve(publicFolder, `company${ticket.companyId}`, "fileList", String(files.id))

                    const destinationFolder = path.resolve(publicFolder, `company${ticket.companyId}`);

                    if (!fs.existsSync(destinationFolder)) {
                        fs.mkdirSync(destinationFolder, { recursive: true });
                    }

                    try {
                        if (fs.existsSync(folder)) {
                            const filesInFolder = fs.readdirSync(folder);

                            for (const file of filesInFolder) {
                                const sourcePath = path.resolve(folder, file);
                                const destPath = path.resolve(destinationFolder, file);

                                if (fs.statSync(sourcePath).isFile()) {
                                    fs.copyFileSync(sourcePath, destPath);
                                }
                            }
                        } else {
                            logger.info(`Pasta de origem ${folder} não encontrada`);
                        }
                    } catch (err) {
                        logger.error(`Erro ao copiar arquivos: ${err}`);
                    }

                    for (const [index, file] of files.options.entries()) {
                        const mediaSrc = {
                            fieldname: 'medias',
                            originalname: path.basename(file.path),
                            encoding: '7bit',
                            mimetype: file.mediaType,
                            filename: file.path,
                            path: path.resolve(folder, file.path),
                        } as Express.Multer.File

                        console.log('body10', file.name);

                        await SendWhatsAppOficialMessage({
                            media: mediaSrc, body: file.name, ticket, type: null
                        })
                    };


                } catch (error) {
                    logger.info(error);
                }
            }

            //se fila está parametrizada para encerrar ticket automaticamente
            if (choosenQueue.closeTicket) {
                try {

                    await UpdateTicketService({
                        ticketData: {
                            status: "closed",
                            queueId: choosenQueue.id,
                            sendFarewellMessage: false,
                        },
                        ticketId: ticket.id,
                        companyId,
                    });
                } catch (error) {
                    logger.info(error);
                }

                return;
            }

            const count = await Ticket.findAndCountAll({
                where: {
                    userId: null,
                    status: "pending",
                    companyId,
                    queueId: choosenQueue.id,
                    whatsappId: ticket.whatsappId,
                    isGroup: false
                }
            });

            await CreateLogTicketService({
                ticketId: ticket.id,
                type: "queue",
                queueId: choosenQueue.id,
                userId: ticket.userId
            });

            if (enableQueuePosition && !choosenQueue.chatbots.length) {
                const qtd = count.count === 0 ? 1 : count.count;
                const shouldSend = resolveShouldSendQueueEntryMessage({
                    queueName: choosenQueue.name,
                    contactName: (ticket as any).contact?.name,
                    position: qtd,
                    queueEntryMessage: choosenQueue.queueEntryMessage,
                    queueSendEntryMessage: choosenQueue.sendQueueEntryMessage,
                    connectionSendQueueEntryMessage: sendQueueEntryMessage,
                    connectionQueueEntryMessage: queueEntryMessage,
                    companySendQueuePosition: settings.sendQueuePosition
                });

                if (shouldSend) {
                    const entryTemplate = resolveQueueEntryMessageTemplate({
                        queueName: choosenQueue.name,
                        queueEntryMessage: choosenQueue.queueEntryMessage,
                        connectionSendQueueEntryMessage: sendQueueEntryMessage,
                        connectionQueueEntryMessage: queueEntryMessage
                    });
                    const msgFila = buildQueueEntryMessageText({
                        queueName: choosenQueue.name,
                        contactName: (ticket as any).contact?.name,
                        position: qtd,
                        queueEntryMessage: entryTemplate
                    });
                    const bodyFila = formatBody(`${msgFila}`, ticket);

                    await SendWhatsAppOficialMessage({
                        body: bodyFila, ticket, quotedMsg: null, type: 'text', media: null, vCard: null
                    });
                }
            }


        } else {

            if (ticket.isGroup) return;

            if (maxUseBotQueues && maxUseBotQueues !== 0 && ticket.amountUsedBotQueues >= maxUseBotQueues) {
                // await UpdateTicketService({
                //   ticketData: { queueId: queues[0].id },
                //   ticketId: ticket.id
                // });

                return;
            }

            if (timeUseBotQueues !== "0") {
                //Regra para desabilitar o chatbot por x minutos/horas após o primeiro envio
                //const ticketTraking = await FindOrCreateATicketTrakingService({ ticketId: ticket.id, companyId });
                let dataLimite = new Date();
                let Agora = new Date();


                if (ticketTraking.chatbotAt !== null) {
                    dataLimite.setMinutes(ticketTraking.chatbotAt.getMinutes() + (Number(timeUseBotQueues)));

                    if (ticketTraking.chatbotAt !== null && Agora < dataLimite && timeUseBotQueues !== "0" && ticket.amountUsedBotQueues !== 0) {
                        return
                    }
                }
                await ticketTraking.update({
                    chatbotAt: null
                })
            }

            let options = "";
            let body;
            let buttonsData: IMetaMessageinteractive;
            if (queues.length > 3) {
                queues.forEach((queue, index) => {
                    options += `*[ ${index + 1} ]* - ${queue.name}\n`;
                });
                options += `\n*[ Sair ]* - Encerrar atendimento`;

                body = formatBody(
                    `${greetingMessage}\n\n${options}`,
                    ticket
                );
            } else {
                buttonsData = {
                    type: 'button',
                    body: {
                        text: formatBody(greetingMessage, ticket)
                    },
                    action: {
                        buttons: queues.map((queue, index) => ({
                            type: 'reply',
                            reply: {
                                id: `${index + 1}`,
                                title: queue.name
                            }
                        }))
                    }
                } as IMetaMessageinteractive
            }
            let bodyToSave = '';
            if (queues.length <= 3) {
                const buttonTitles = buttonsData.action.buttons
                    .map(button => `* ${button.reply.title}`)
                    .join('\n');

                bodyToSave = `${formatBody(greetingMessage, ticket)}\n\n${buttonTitles}`;
            }

            await CreateLogTicketService({
                ticketId: ticket.id,
                type: "chatBot",
                userId: ticket.userId
            });

            if (ticket.whatsapp.greetingMediaAttachment !== null && queues.length > 3) {
                const filePath = path.resolve("public", `company${companyId}`, ticket.whatsapp.greetingMediaAttachment);

                const fileExists = fs.existsSync(filePath);
                // console.log(fileExists);
                if (fileExists) {
                    const messagePath = ticket.whatsapp.greetingMediaAttachment
                    const mediaSrc = await getMessageOptions(messagePath, filePath, String(companyId), body);

                    console.log('body12', body);

                    await SendWhatsAppOficialMessage({
                        media: mediaSrc, body, ticket, type: null
                    })
                } else {
                    console.log('body13', body);

                    await SendWhatsAppOficialMessage({
                        body, ticket, quotedMsg: null, type: 'text', media: null, vCard: null
                    })

                }
                await UpdateTicketService({
                    ticketData: { amountUsedBotQueues: ticket.amountUsedBotQueues + 1 },
                    ticketId: ticket.id,
                    companyId
                });

                return
            } else {
                console.log('body14', body);

                await SendWhatsAppOficialMessage({
                    body: queues.length > 3 ? body : bodyToSave, ticket, quotedMsg: null, type: queues.length <= 3 ? 'interactive' : 'text', media: null, vCard: null, interative: buttonsData
                })

                await UpdateTicketService({
                    ticketData: { amountUsedBotQueues: ticket.amountUsedBotQueues + 1 },
                    ticketId: ticket.id,
                    companyId
                });
            }
        }
    };

    const botButton = async () => {

    }
    if (typeBot === "button" && queues.length <= 3) {
        return botButton();
    }

    if (typeBot === "text") {
        return botText();
    }

    if (typeBot === "button" && queues.length > 3) {
        return botText();
    }

};

export default verifyQueueOficial;
