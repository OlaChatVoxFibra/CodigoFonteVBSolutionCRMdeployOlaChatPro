/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Whatsapp from "../../models/Whatsapp";
import AppError from "../../errors/AppError";
import Queue from "../../models/Queue";
import QueueOption from "../../models/QueueOption";
import { FindOptions } from "sequelize/types";
import Chatbot from "../../models/Chatbot";
import Prompt from "../../models/Prompt";

function parseWhatsappId(id: string | number): number | null {
  if (id === null || id === undefined) return null;
  const raw = String(id).trim().toLowerCase();
  if (!raw || raw === "null" || raw === "undefined" || raw === "nan") return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

const ShowWhatsAppServiceAdmin = async (
  id: string | number,
): Promise<Whatsapp> => {
  const whatsappId = parseWhatsappId(id);
  if (!whatsappId) {
    throw new AppError("ERR_NO_WAPP_FOUND", 404);
  }

  const findOptions: FindOptions = {
    include: [
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
  const whatsapp = await Whatsapp.findByPk(whatsappId, findOptions);

  if (!whatsapp) {
    throw new AppError("ERR_NO_WAPP_FOUND", 404);
  }

  return whatsapp;
};

export default ShowWhatsAppServiceAdmin;
