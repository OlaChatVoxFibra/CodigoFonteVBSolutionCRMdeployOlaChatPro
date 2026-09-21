/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import ShowChatBotServices from "./ShowChatBotServices";

const DeleteChatBotServices = async (
  chatbotId: number | string,
): Promise<void> => {
  const chatbot = await ShowChatBotServices(chatbotId);

  await chatbot.destroy();
};

export default DeleteChatBotServices;
