/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";
import Queue from "../../models/Queue";
import Chatbot from "../../models/Chatbot";
import { FindOptions } from "sequelize/types";
import Prompt from "../../models/Prompt";
import { FlowBuilderModel } from "../../models/FlowBuilder";
import User from "../../models/User";

function parseWhatsappId(id: string | number): number | null {
  if (id === null || id === undefined) return null;
  const raw = String(id).trim().toLowerCase();
  if (!raw || raw === "null" || raw === "undefined" || raw === "nan") return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

const ShowWhatsAppService = async (
  id: string | number,
  companyId: number,
  session?: any,
  requestUserId?: number
): Promise<Whatsapp> => {
  const whatsappId = parseWhatsappId(id);
  if (!whatsappId) {
    throw new AppError("ERR_NO_WAPP_FOUND", 404);
  }

  const findOptions: FindOptions = {
    include: [
      {
        model: FlowBuilderModel,
      },
      {
        model: Queue,
        as: "queues",
        attributes: ["id", "name", "color", "greetingMessage", "integrationId", "fileListId", "closeTicket"],
        include: [
          {
            model: Chatbot,
            as: "chatbots",
            attributes: ["id", "name", "greetingMessage", "closeTicket"]
          }
        ]
      },
      {
        model: Prompt,
        as: "prompt",
      }
    ],
    order: [
      ["queues", "orderQueue", "ASC"],
      ["queues", "chatbots", "id", "ASC"]
    ]
  };

  if (session !== undefined && session == 0) {
    findOptions.attributes = { exclude: ["session"] };
  }

  const whatsapp = await Whatsapp.findByPk(whatsappId, findOptions);

  let requestUser: User | null = null;
  if (requestUserId) {
    requestUser = await User.findByPk(requestUserId);
  }

  if (!whatsapp) {
    throw new AppError("ERR_NO_WAPP_FOUND", 404);
  }

  if (!requestUser?.super && whatsapp.companyId !== companyId) {
    throw new AppError("Não é possível acessar registros de outra empresa");
  }

  // Campo virtual legado: a IA por conexão usa apenas promptId (agente cadastrado em Prompts).
  (whatsapp as any).setDataValue("useAgentSettings", false);

  return whatsapp;
};

export default ShowWhatsAppService;
