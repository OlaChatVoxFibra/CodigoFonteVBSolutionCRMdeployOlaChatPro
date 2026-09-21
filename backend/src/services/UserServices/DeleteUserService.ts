/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import User from "../../models/User";
import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import UpdateDeletedUserOpenTicketsStatus from "../../helpers/UpdateDeletedUserOpenTicketsStatus";
import Chat from "../../models/Chat";
import { getIO } from "../../libs/socket";

const DeleteUserService = async (
  id: string | number,
  companyId: number,
  requestUserId?: number
): Promise<void> => {
  let requestUser = null;
  if (requestUserId) {
    requestUser = await User.findByPk(requestUserId);
  }

  const isRoot =
    requestUser?.super === true ||
    requestUser?.email === "admin@admin.com";

  const whereCondition: any = { id };
  if (!isRoot) {
    whereCondition.companyId = companyId;
  }

  const user = await User.findOne({
    where: whereCondition
  });

  if (!user) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }

  const userOpenTickets: Ticket[] = await user.$get("tickets", {
    where: { status: "open" }
  });

  if (userOpenTickets.length > 0) {
    UpdateDeletedUserOpenTicketsStatus(userOpenTickets, companyId);
  }

  // Find all chats owned by the user
  const userChats = await Chat.findAll({
    where: { ownerId: id }
  });

  // Delete all chats owned by the user and emit socket events
  for (const chat of userChats) {
    await chat.destroy();

    const io = getIO();
    io.of(String(companyId)).emit(`company-${companyId}-chat`, {
      action: "delete",
      id: chat.id
    });
  }

  await user.destroy();
};

export default DeleteUserService;
