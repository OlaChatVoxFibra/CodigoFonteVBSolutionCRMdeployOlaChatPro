/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Queue from "../../models/Queue";
import User from "../../models/User";

const SYSTEM_QUEUE_NAME = "Geral";
const SYSTEM_QUEUE_COLOR = "#6366f1";

const EnsureSystemQueueService = async (companyId: number): Promise<Queue> => {
  let systemQueue = await Queue.findOne({
    where: { companyId, isSystem: true }
  });

  if (!systemQueue) {
    systemQueue = await Queue.create({
      name: SYSTEM_QUEUE_NAME,
      color: SYSTEM_QUEUE_COLOR,
      companyId,
      isSystem: true,
      ativarRoteador: false,
      tempoRoteador: 0,
      orderQueue: 0,
      closeTicket: false,
      typeRandomMode: "RANDOM",
      randomizeImmediate: false,
      greetingMessage: "",
      outOfHoursMessage: "",
      sendQueueEntryMessage: false,
      queueEntryMessage: ""
    } as any);
  }

  const users = await User.findAll({
    where: { companyId },
    attributes: ["id"]
  });

  if (users.length > 0) {
    await systemQueue.$set(
      "users",
      users.map((u) => u.id)
    );
  }

  return systemQueue;
};

export default EnsureSystemQueueService;
