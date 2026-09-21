/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

// src/services/UserServices/ShowUserService.ts - ATUALIZADO COM NOVA COLUNA
import User from "../../models/User";
import AppError from "../../errors/AppError";
import Queue from "../../models/Queue";
import Company from "../../models/Company";
import Plan from "../../models/Plan";
import { getCompanyAttributesForUserInclude } from "../../helpers/companyOptionalColumns";

const ShowUserService = async (
  id: string | number,
  companyId: string | number,
  skipCompanyCheck: boolean = false
): Promise<User> => {
  const whereCondition: any = { id };

  if (!skipCompanyCheck) {
    whereCondition.companyId = companyId;
  }

  const companyAttributes = await getCompanyAttributesForUserInclude();

  const user = await User.findOne({
    where: whereCondition,
    attributes: [
      "id",
      "name",
      "email",
      "profile",
      "profileImage",
      "super",
      "whatsappId",
      "online",
      "startWork",
      "endWork",
      "allTicket",
      "companyId",
      "tokenVersion",
      "defaultTheme",
      "allowGroup",
      "defaultMenu",
      "farewellMessage",
      "userClosePendingTicket",
      "showDashboard",
      "defaultTicketsManagerWidth",
      "allUserChat",
      "allHistoric",
      "ticketVisibility",
      "allowRealTime",
      "allowConnections",
      "showContacts",
      "showCampaign",
      "showFlow",
      "finalizacaoComValorVendaAtiva",
      "birthDate",
      "allowSeeMessagesInPendingTickets" // 🆕 INCLUIR NO ATTRIBUTES
    ],
    include: [
      { model: Queue, as: "queues", attributes: ["id", "name", "color"] },
      {
        model: Company,
        as: "company",
        attributes: companyAttributes as any,
        include: [
          {
            model: Plan,
            as: "plan",
            attributes: [
              "id",
              "name",
              "amount",
              "trial",
              "trialDays",
              "useWhatsapp",
              "useFacebook",
              "useInstagram",
              "useCampaigns",
              "useSchedules",
              "useInternalChat",
              "useExternalApi",
              "useIntegrations",
              "useOpenAi",
              "useKanban"
            ]
          }
        ]
      }
    ]
  });

  if (!user) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }

  return user;
};

export default ShowUserService;