/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op, fn, where, col, Filterable, Includeable, literal } from "sequelize";
import { startOfDay, endOfDay, parseISO } from "date-fns";

import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Queue from "../../models/Queue";
import User from "../../models/User";
import ShowUserService from "../UserServices/ShowUserService";
import Tag from "../../models/Tag";

import { intersection } from "lodash";
import Whatsapp from "../../models/Whatsapp";
import ContactTag from "../../models/ContactTag";
import ContactWallet from "../../models/ContactWallet";

import removeAccents from "remove-accents";

import FindCompanySettingOneService from "../CompaniesSettings/FindCompanySettingOneService";

interface Request {
  searchParam?: string;
  pageNumber?: string;
  status?: string;
  date?: string;
  dateStart?: string;
  dateEnd?: string;
  updatedAt?: string;
  showAll?: string;
  userId: number;
  withUnreadMessages?: string;
  queueIds: number[];
  tags: number[];
  users: number[];
  contacts?: number[];
  updatedStart?: string;
  updatedEnd?: string;
  connections?: string[];
  whatsappIds?: number[];
  statusFilters?: string[];
  queuesFilter?: string[];
  isGroup?: string;
  companyId: number;
  allTicket?: string;
  sortTickets?: string;
  searchOnMessages?: string;
}

interface Response {
  tickets: Ticket[];
  count: number;
  hasMore: boolean;
}

const ListTicketsService = async ({
  searchParam = "",
  pageNumber = "1",
  queueIds,
  tags,
  users,
  contacts = [],
  status,
  date,
  dateStart,
  dateEnd,
  updatedAt,
  updatedStart,
  updatedEnd,
  showAll,
  userId,
  withUnreadMessages = "false",
  whatsappIds,
  statusFilters,
  companyId,
  sortTickets = "DESC",
  searchOnMessages = "false"
}: Request): Promise<Response> => {
  const user = await ShowUserService(userId, companyId);

  const showTicketAllQueues = user.allHistoric === "enabled";
  const showTicketWithoutQueue =
    user.allTicket === "enable" || user.allTicket === "enabled";
  const canSeeOtherUsers =
    user.profile === "admin" || user.allUserChat === "enabled" || user.super;
  const showGroups = user.allowGroup === true;
  const showPendingNotification = await FindCompanySettingOneService({ companyId, column: "showNotificationPending" });
  const showNotificationPendingValue =
    Array.isArray(showPendingNotification) && showPendingNotification.length > 0
      ? Boolean((showPendingNotification as any)[0]?.showNotificationPending)
      : false;
    let whereCondition: Filterable["where"];

  // Regra: A aba Aguardando deve sempre listar todas as conversas pendentes,
  // independente de filtros de fila/usuário. Para os demais status, mantém filtros.
  if (status === "pending") {
    whereCondition = {
      status: { [Op.in]: ["pending", "lgpd", "chatbot"] },
      companyId: !user.super ? companyId : { [Op.or]: [companyId, { [Op.ne]: null }] }
    };
  } else {
    // Manter lógica: mostrar tickets atendidos pelo usuário OU pendentes
    // Regra adicional: quando filtrando "open", exibir também tickets em open que estejam sob atendimento do Agente IA (isBot=true),
    // mesmo sem userId atribuído — assim a conversa permanece visível em "Atendendo" após resposta do agente.
    const baseOr: any = [{ userId }, { status: "pending" }];
    if (status === "open") {
      // Incluir tickets abertos do Agente IA (isBot) ou com integração ativa (useIntegration)
      baseOr.push({ status: "open", isBot: true });
      baseOr.push({ status: "open", useIntegration: true });
    }
    whereCondition = {
      [Op.or]: baseOr,
      queueId:
        status === "open"
          ? { [Op.or]: [queueIds, null] } // Em "Atendendo", permitir null para tickets do Agente IA
          : showTicketWithoutQueue
            ? { [Op.or]: [queueIds, null] }
            : { [Op.or]: [queueIds] },
      companyId: !user.super ? companyId : { [Op.or]: [companyId, { [Op.ne]: null }] }
    };
  }


  let includeCondition: Includeable[];

  includeCondition = [
    {
      model: Contact,
      as: "contact",
      attributes: ["id", "name", "number", "email", "profilePicUrl", "acceptAudioMessage", "active", "urlPicture", "companyId", "isGroup", "remoteJid", "lid"],
      include: ["extraInfo", "tags",
        {
          model: ContactWallet,
          include: [
            {
              model: User,
              attributes: ["id", "name"]
            },
            {
              model: Queue,
              attributes: ["id", "name"]
            }
          ]
        }]
    },
    {
      model: Queue,
      as: "queue",
      attributes: ["id", "name", "color"]
    },
    {
      model: User,
      as: "user",
      attributes: ["id", "name"]
    },
    {
      model: Tag,
      as: "tags",
      attributes: ["id", "name", "color"]
    },
    {
      model: Whatsapp,
      as: "whatsapp",
      attributes: ["id", "name", "expiresTicket", "groupAsTicket", "color", "channel", "status", "promptId", "anthropicMultiAgentId", "agentDisabled"]
    },
  ];

  const userQueueIds = user.queues.map(queue => queue.id);

  if (status === "open") {
    /**
     * Fila na UI (queueIds) não pode esconder tickets já atribuídos a mim — senão some após F5
     * se o ticket estiver numa fila fora do filtro ou herdada do canal.
     * Filtro de fila aplica só a: sem atendente, bot ou integração.
     */
    const effectiveOpenQueueIds = queueIds.length > 0 ? queueIds : userQueueIds;
    const openSharedQueueId =
      effectiveOpenQueueIds.length > 0
        ? showTicketWithoutQueue
          ? { [Op.or]: [effectiveOpenQueueIds, null] }
          : { [Op.or]: [effectiveOpenQueueIds] }
        : { [Op.or]: [null] };

    /** Tickets do Agente IA / integração / API Oficial Meta devem persistir após F5. */
    const openBotOrIntegrationClause = [
      { [Op.and]: [{ isBot: true }, { userId: null }] },
      { [Op.and]: [{ useIntegration: true }, { userId: null }] },
      {
        [Op.and]: [
          { channel: "whatsapp_oficial" },
          { userId: null }
        ]
      }
    ];

    if (canSeeOtherUsers || showAll === "true") {
      const adminQueueFilter =
        showTicketAllQueues && queueIds.length === 0
          ? undefined
          : openSharedQueueId;
      whereCondition = {
        companyId: !user.super ? companyId : { [Op.or]: [companyId, { [Op.ne]: null }] },
        status: "open",
        // Sempre incluir tickets atribuídos a mim — filtro de fila não pode esconder após F5
        // (API Oficial / filas herdadas fora do seletor da UI).
        ...(adminQueueFilter
          ? {
              [Op.or]: [
                { userId },
                { queueId: adminQueueFilter },
                ...openBotOrIntegrationClause
              ]
            }
          : {})
      };
    } else {
      whereCondition = {
        companyId: !user.super ? companyId : { [Op.or]: [companyId, { [Op.ne]: null }] },
        status: "open",
        [Op.or]: [
          { userId },
          { [Op.and]: [{ userId: null }, { queueId: openSharedQueueId }] },
          ...openBotOrIntegrationClause
        ]
      };
    }
  } else
    if (status === "group" && user.allowGroup && user.whatsappId) {
      whereCondition = {
        companyId: !user.super ? companyId : { [Op.or]: [companyId, { [Op.ne]: null }] },
        queueId: { [Op.or]: [queueIds, null] },
        whatsappId: user.whatsappId
      };
    }
    else
      if (status === "group" && (user.allowGroup) && !user.whatsappId) {
        whereCondition = {
          companyId: !user.super ? companyId : { [Op.or]: [companyId, { [Op.ne]: null }] },
          queueId: { [Op.or]: [queueIds, null] },
        };
      }
      else
        // NOVA LÓGICA PARA STATUS CHATBOT
        if (status === "chatbot") {
          // Para status chatbot, mostrar tickets que estão sendo processados pelo flowbuilder
          // Admins podem ver todos, usuários comuns só os seus ou os sem responsável
          if (user.profile === "admin" || showAll === "true" || user.super) {
            whereCondition = {
              companyId: !user.super ? companyId : { [Op.or]: [companyId, { [Op.ne]: null }] },
              status: "chatbot",
              queueId: showTicketWithoutQueue ? { [Op.or]: [queueIds, null] } : { [Op.or]: [queueIds] }
            };
          } else {
            whereCondition = {
              companyId: !user.super ? companyId : { [Op.or]: [companyId, { [Op.ne]: null }] },
              status: "chatbot",
              [Op.or]: [{ userId }, { userId: null }],
              queueId: showTicketWithoutQueue ? { [Op.or]: [queueIds, null] } : { [Op.or]: [queueIds] }
            };
          }
        }

  // Pending: whereCondition já definido no início (todos os pendentes da empresa).
  // Blocos antigos que restringiam por fila/userId foram removidos — quebravam a aba Aguardando.

  // Para Aguardando não restringir por userId; para Atendendo também não restringir,
  // pois tickets em open podem estar sob Agente IA/Integração ou ainda sem atendente.
  if (user.profile === "user" && !canSeeOtherUsers && status !== "pending" && status !== "open") {
    whereCondition = {
      ...whereCondition,
      userId
    };
  }

  // Se for admin ou super, pode ver tudo se quiser (não sobrescrever "Aguardando": senão queueId sem `null`
  // escondia tickets SEM FILA / agente IA e parecia que mensagem "não virava ticket").
  if (
    showAll === "true" &&
    canSeeOtherUsers &&
    status !== "search" &&
    status !== "pending" &&
    status !== "open"
  ) {
     if (user.allHistoric === "enabled" && showTicketWithoutQueue) {
       whereCondition = { companyId: !user.super ? companyId : { [Op.or]: [companyId, { [Op.ne]: null }] } };
     } else if (user.allHistoric === "enabled" && !showTicketWithoutQueue) {
       whereCondition = { companyId: !user.super ? companyId : { [Op.or]: [companyId, { [Op.ne]: null }] }, queueId: { [Op.ne]: null } };
     } else if (user.allHistoric === "disabled" && showTicketWithoutQueue) {
       whereCondition = { companyId: !user.super ? companyId : { [Op.or]: [companyId, { [Op.ne]: null }] }, queueId: { [Op.or]: [queueIds, null] } };
     } else if (user.allHistoric === "disabled" && !showTicketWithoutQueue) {
       whereCondition = { companyId: !user.super ? companyId : { [Op.or]: [companyId, { [Op.ne]: null }] }, queueId: queueIds };
     }
  }


  if (status && status !== "search") {
    whereCondition = {
      ...whereCondition,
      status: status === "pending" ? { [Op.in]: ["pending", "lgpd", "chatbot"] } : status
    };
  }


  if (status === "closed") {
    let latestTickets;
    const effectiveClosedQueueIds = queueIds.length > 0 ? queueIds : userQueueIds;
    const closedQueueFilter = showTicketWithoutQueue
      ? { [Op.or]: [effectiveClosedQueueIds, null] }
      : effectiveClosedQueueIds;
    const closedUserVisibilityFilter = {
      [Op.or]: [
        { userId },
        { [Op.and]: [{ userId: null }, { queueId: closedQueueFilter }] }
      ]
    };

    if (!showTicketAllQueues) {
      let whereCondition2: Filterable["where"] = {
        companyId: !user.super ? companyId : { [Op.or]: [companyId, { [Op.ne]: null }] },
        status: "closed",
      }

      // Admin/usuário com permissão de ver outros usuários não fica preso ao próprio userId.
      if (canSeeOtherUsers) {
        whereCondition2 = {
          ...whereCondition2,
          queueId: closedQueueFilter,
        }
      } else {
        // Tickets finalizados atribuídos ao usuário devem continuar visíveis,
        // mesmo se a fila do ticket não estiver mais no filtro atual.
        whereCondition2 = {
          ...whereCondition2,
          ...closedUserVisibilityFilter
        }
      }

      latestTickets = await Ticket.findAll({
        attributes: ['companyId', 'contactId', 'whatsappId', [literal('MAX("id")'), 'id']],
        where: whereCondition2,
        group: ['companyId', 'contactId', 'whatsappId'],
      });

    } else {
      let whereCondition2: Filterable["where"] = {
        companyId: !user.super ? companyId : { [Op.or]: [companyId, { [Op.ne]: null }] },
        status: "closed",
      }

      // Com histórico completo habilitado, admin/usuário permitido vê todos.
      // Se a UI enviou filtro de filas, respeita; se não enviou, não restringe por fila.
      if (canSeeOtherUsers) {
        whereCondition2 = {
          ...whereCondition2,
          ...(queueIds.length > 0
            ? { queueId: showTicketWithoutQueue ? { [Op.or]: [queueIds, null] } : queueIds }
            : {})
        }
      } else {
        // Tickets finalizados atribuídos ao usuário devem continuar visíveis,
        // mesmo se a fila do ticket não estiver mais no filtro atual.
        whereCondition2 = {
          ...whereCondition2,
          ...closedUserVisibilityFilter
        }
      }

      latestTickets = await Ticket.findAll({
        attributes: ['companyId', 'contactId', 'whatsappId', [literal('MAX("id")'), 'id']],
        where: whereCondition2,
        group: ['companyId', 'contactId', 'whatsappId'],
      });

    }

    const ticketIds = latestTickets.map((t) => t.id);

    whereCondition = {
      id: ticketIds

    };
  }
  else
    if (status === "search") {
      whereCondition = {
        companyId
      }
      const hasAdvancedFilters =
        (Array.isArray(tags) && tags.length > 0) ||
        (Array.isArray(whatsappIds) && whatsappIds.length > 0) ||
        (Array.isArray(statusFilters) && statusFilters.length > 0) ||
        (Array.isArray(users) && users.length > 0);
      // Quando queueIds vem vazio (ex.: modal do lead), usar filas do usuário para não restringir demais
      const effectiveQueueIds = queueIds.length > 0 ? queueIds : userQueueIds;
      const searchBaseWhere: Filterable["where"] = hasAdvancedFilters && user.profile === "admin"
        ? {
            companyId,
            ...(Array.isArray(contacts) && contacts.length > 0 ? { contactId: { [Op.in]: contacts } } : {})
          }
        : {
            companyId,
            [Op.or]: [{ userId }, { status: ["pending", "closed", "group", "chatbot"] }],
            ...(Array.isArray(contacts) && contacts.length > 0 ? { contactId: { [Op.in]: contacts } } : {})
          };
      let latestTickets;
      if (!showTicketAllQueues && user.profile === "user") {
        latestTickets = await Ticket.findAll({
          attributes: ['companyId', 'contactId', 'whatsappId', [literal('MAX("id")'), 'id']],
          where: {
            ...searchBaseWhere,
            queueId: showAll === "true" || showTicketWithoutQueue ? { [Op.or]: [effectiveQueueIds, null] } : effectiveQueueIds
          },
          group: ['companyId', 'contactId', 'whatsappId'],
        });
      } else {
        let whereCondition2: Filterable["where"] = {
          ...searchBaseWhere
        }

        if (showAll === "false" && user.profile === "admin") {
          whereCondition2 = {
            ...whereCondition2,
            queueId: effectiveQueueIds,
          }

        } else if (showAll === "true" && user.profile === "admin") {
          whereCondition2 = {
            ...whereCondition2,
            companyId,
            queueId: { [Op.or]: [effectiveQueueIds, null] },
          }
        }

        latestTickets = await Ticket.findAll({
          attributes: ['companyId', 'contactId', 'whatsappId', [literal('MAX("id")'), 'id']],
          where: whereCondition2,
          group: ['companyId', 'contactId', 'whatsappId'],
        });

      }

      const ticketIds = latestTickets.map((t) => t.id);

      whereCondition = {
        ...whereCondition,
        id: ticketIds
      };

      if (searchParam) {
        const sanitizedSearchParam = removeAccents(searchParam.toLocaleLowerCase().trim());
        if (searchOnMessages === "true") {
          includeCondition = [
            ...includeCondition,
            {
              model: Message,
              as: "messages",
              attributes: ["id", "body"],
              where: {
                body: where(
                  fn("LOWER", fn('unaccent', col("body"))),
                  "LIKE",
                  `%${sanitizedSearchParam}%`
                ),
              },
              required: false,
              duplicating: false
            }
          ];
          whereCondition = {
            ...whereCondition,
            [Op.or]: [
              {
                "$contact.name$": where(
                  fn("LOWER", fn("unaccent", col("contact.name"))),
                  "LIKE",
                  `%${sanitizedSearchParam}%`
                )
              },
              { "$contact.number$": { [Op.like]: `%${sanitizedSearchParam}%` } },
              {
                "$message.body$": where(
                  fn("LOWER", fn("unaccent", col("body"))),
                  "LIKE",
                  `%${sanitizedSearchParam}%`
                )
              }
            ]
          };
        } else {
          whereCondition = {
            ...whereCondition,
            [Op.or]: [
              {
                "$contact.name$": where(
                  fn("LOWER", fn("unaccent", col("contact.name"))),
                  "LIKE",
                  `%${sanitizedSearchParam}%`
                )
              },
              { "$contact.number$": { [Op.like]: `%${sanitizedSearchParam}%` } },
            ]
          };
        }

      }

      if (Array.isArray(tags) && tags.length > 0) {
        const contactTags = await ContactTag.findAll({
          where: { tagId: tags }
        });
        const tagGroups = tags.map((tagId) =>
          contactTags
            .filter((ct) => ct.tagId === tagId)
            .map((ct) => ct.contactId)
        );
        const contactsIntersection: number[] =
          tags.length > 1
            ? intersection(...tagGroups)
            : tagGroups[0] || [];

        whereCondition = {
          ...whereCondition,
          contactId:
            contactsIntersection.length > 0
              ? contactsIntersection
              : { [Op.in]: [-1] }
        };
      }

      if (Array.isArray(users) && users.length > 0) {
        whereCondition = {
          ...whereCondition,
          userId: users
        };
      }


      if (Array.isArray(whatsappIds) && whatsappIds.length > 0) {
        whereCondition = {
          ...whereCondition,
          whatsappId: whatsappIds
        };
      }

      if (Array.isArray(statusFilters) && statusFilters.length > 0) {
        whereCondition = {
          ...whereCondition,
          status: { [Op.in]: statusFilters }
        };
      }

    } else
      if (withUnreadMessages === "true" && !status) {
        whereCondition = {
          [Op.or]: [
            {
              userId,
              status: showNotificationPendingValue ? { [Op.notIn]: ["closed", "lgpd", "nps"] } : { [Op.notIn]: ["pending", "closed", "lgpd", "nps", "group"] },
              queueId: { [Op.in]: userQueueIds },
              unreadMessages: { [Op.gt]: 0 },
              companyId,
              isGroup: showGroups ? { [Op.or]: [true, false] } : false
            },
            {
              status: showNotificationPendingValue ? { [Op.in]: ["pending", "group", "chatbot"] } : { [Op.in]: ["group", "chatbot"] }, // INCLUINDO CHATBOT
              queueId: showTicketWithoutQueue ? { [Op.or]: [userQueueIds, null] } : { [Op.or]: [userQueueIds] },
              unreadMessages: { [Op.gt]: 0 },
              companyId,
              isGroup: showGroups ? { [Op.or]: [true, false] } : false
            }
          ]
        };

        if (status === "group" && (user.allowGroup || showAll === "true")) {
          whereCondition = {
            ...whereCondition,
            queueId: { [Op.or]: [userQueueIds, null] },
          };
        }
      }

  whereCondition = {
    ...whereCondition,
    companyId
  };

  if (withUnreadMessages === "true" && status) {
    whereCondition = {
      ...whereCondition,
      unreadMessages: { [Op.gt]: 0 }
    };
  }

  if (updatedStart && updatedEnd) {
    whereCondition = {
      ...whereCondition,
      updatedAt: {
        [Op.between]: [
          +startOfDay(parseISO(updatedStart)),
          +endOfDay(parseISO(updatedEnd))
        ]
      }
    };
  } else if (dateStart && dateEnd) {
    whereCondition = {
      ...whereCondition,
      updatedAt: {
        [Op.between]: [
          +startOfDay(parseISO(dateStart)),
          +endOfDay(parseISO(dateEnd))
        ]
      }
    };
  }

  const limit = 40;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: tickets } = await Ticket.findAndCountAll({
    where: whereCondition,
    include: includeCondition,
    attributes: [
      "id",
      "uuid",
      "userId",
      "queueId",
      "whatsappId",
      "isGroup",
      "channel",
      "status",
      "contactId",
      "useIntegration",
      "isBot",
      "lastMessage",
      "fromMe",
      "updatedAt",
      "unreadMessages",
      "dataWebhook",
      [
        literal(
          `(SELECT COUNT(*) > 0 FROM "Messages" AS "agentMsgs" WHERE "agentMsgs"."ticketId" = "Ticket"."id" AND "agentMsgs"."fromAgent" = true)`
        ),
        "hasAgentMessage"
      ]
    ],
    distinct: true,
    limit,
    offset,
    order: [["updatedAt", sortTickets]],
    subQuery: false
  });

  const hasMore = count > offset + tickets.length;

  return {
    tickets,
    count,
    hasMore
  };
};

export default ListTicketsService;
