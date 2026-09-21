/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

// src/services/UserServices/CreateUserService.ts - ATUALIZADO COM NOVA COLUNA
import * as Yup from "yup";

import AppError from "../../errors/AppError";
import { SerializeUser } from "../../helpers/SerializeUser";
import User from "../../models/User";
import {
  ticketVisibilityToFlags,
  normalizeTicketVisibility
} from "../../helpers/ticketVisibility";
import Plan from "../../models/Plan";
import Company from "../../models/Company";
import EnsureSystemQueueService from "../QueueService/EnsureSystemQueueService";

interface Request {
  email: string;
  password: string;
  name: string;
  queueIds?: number[];
  companyId?: number;
  profile?: string;
  startWork?: string;
  endWork?: string;
  whatsappId?: number;
  allTicket?: string;
  defaultTheme?: string;
  defaultMenu?: string;
  allowGroup?: boolean;
  allHistoric?: string;
  allUserChat?: string;
  userClosePendingTicket?: string;
  showDashboard?: string;
  defaultTicketsManagerWidth?: number;
  allowRealTime?: string;
  allowConnections?: string;
  showContacts?: string;
  showCampaign?: string;
  showFlow?: string;
  finalizacaoComValorVendaAtiva?: boolean;
  birthDate?: Date | string;
  allowSeeMessagesInPendingTickets?: string;
  ticketVisibility?: string;
}

interface Response {
  email: string;
  name: string;
  id: number;
  profile: string;
}

const CreateUserService = async ({
  email,
  password,
  name,
  queueIds = [],
  companyId,
  profile = "admin",
  startWork,
  endWork,
  whatsappId,
  allTicket,
  defaultTheme,
  defaultMenu,
  allowGroup,
  allHistoric,
  allUserChat,
  userClosePendingTicket,
  showDashboard,
  defaultTicketsManagerWidth = 550,
  allowRealTime,
  allowConnections,
  showContacts,
  showCampaign,
  showFlow,
  finalizacaoComValorVendaAtiva,
  birthDate,
  allowSeeMessagesInPendingTickets = "enabled",
  ticketVisibility
}: Request): Promise<Response> => {
  if (companyId !== undefined) {
    const company = await Company.findOne({
      where: {
        id: companyId
      },
      include: [{ model: Plan, as: "plan" }]
    });

    if (company !== null) {
      const usersCount = await User.count({
        where: {
          companyId
        }
      });

      if (usersCount >= company.plan.users) {
        throw new AppError(
          `Número máximo de usuários já alcançado: ${usersCount}`
        );
      }
    }
  }

  const schema = Yup.object().shape({
    name: Yup.string().required().min(2),
    allHistoric: Yup.string(),
    email: Yup.string()
      .email()
      .required()
      .test(
        "Check-email",
        "An user with this email already exists.",
        async value => {
          if (!value) return false;
          const emailExists = await User.findOne({
            where: { email: value }
          });
          return !emailExists;
        }
      ),
    password: Yup.string().required().min(5),
    birthDate: Yup.date().nullable().max(new Date(), "Data de nascimento não pode ser no futuro"),
    // 🆕 VALIDAÇÃO PARA NOVA COLUNA
    allowSeeMessagesInPendingTickets: Yup.string()
      .oneOf(["enabled", "disabled"], "allowSeeMessagesInPendingTickets deve ser 'enabled' ou 'disabled'")
      .default("enabled")
  });

  try {
    await schema.validate({ 
      email, 
      password, 
      name, 
      birthDate
    });
  } catch (err) {
    throw new AppError(err.message);
  }

  // Processar data de nascimento
  let processedBirthDate: Date | null = null;
  if (birthDate) {
    if (typeof birthDate === 'string') {
      const dateOnly = birthDate.split('T')[0];
      processedBirthDate = new Date(dateOnly + 'T12:00:00');
    } else if (birthDate instanceof Date) {
      const year = birthDate.getFullYear();
      const month = birthDate.getMonth();
      const day = birthDate.getDate();
      processedBirthDate = new Date(year, month, day, 12, 0, 0);
    }
  }

  let resolvedAllTicket = allTicket;
  let resolvedAllHistoric = allHistoric;
  let resolvedAllUserChat = allUserChat;
  let resolvedTicketVisibility = ticketVisibility || "own_only";

  if (ticketVisibility) {
    const flags = ticketVisibilityToFlags(
      normalizeTicketVisibility(ticketVisibility)
    );
    resolvedAllTicket = flags.allTicket;
    resolvedAllHistoric = flags.allHistoric;
    resolvedAllUserChat = flags.allUserChat;
    resolvedTicketVisibility = normalizeTicketVisibility(ticketVisibility);
  }

  const user = await User.create(
    {
      email,
      password,
      name,
      companyId,
      profile,
      startWork,
      endWork,
      whatsappId: whatsappId || null,
      allTicket: resolvedAllTicket,
      defaultTheme,
      defaultMenu,
      allowGroup,
      allHistoric: resolvedAllHistoric,
      allUserChat: resolvedAllUserChat,
      ticketVisibility: resolvedTicketVisibility,
      userClosePendingTicket,
      showDashboard,
      defaultTicketsManagerWidth,
      allowRealTime,
      allowConnections,
      showContacts,
      showCampaign,
      showFlow,
      finalizacaoComValorVendaAtiva,
      birthDate: processedBirthDate,
      allowSeeMessagesInPendingTickets // 🆕 INCLUIR NO CREATE
    },
    { include: ["queues", "company"] }
  );

  const resolvedQueueIds = [...queueIds];
  if (companyId !== undefined) {
    const systemQueue = await EnsureSystemQueueService(companyId);
    if (!resolvedQueueIds.includes(systemQueue.id)) {
      resolvedQueueIds.push(systemQueue.id);
    }
  }

  await user.$set("queues", resolvedQueueIds);

  await user.reload();

  const serializedUser = SerializeUser(user);

  return serializedUser;
};

export default CreateUserService;