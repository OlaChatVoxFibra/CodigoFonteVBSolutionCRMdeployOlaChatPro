/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { WASocket } from "baileys";
import { getWbot, Session } from "../libs/wbot";
import GetDefaultWhatsApp from "./GetDefaultWhatsApp";
import Ticket from "../models/Ticket";
import Whatsapp from "../models/Whatsapp";

const GetTicketWbot = async (ticket: Ticket): Promise<Session> => {
  const whatsapp = await Whatsapp.findByPk(ticket.whatsappId);

  if (whatsapp.channel !== "whatsapp_oficial") {
    if (!ticket.whatsappId) {
      const defaultWhatsapp = await GetDefaultWhatsApp(ticket.companyId);

      await ticket.$set("whatsapp", defaultWhatsapp);
    }

    const wbot = await getWbot(ticket.whatsappId);

    return wbot;
  }
};

export default GetTicketWbot;
