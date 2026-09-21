/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Chatbot from "../../models/Chatbot";

interface ChatbotData {
  name: string;
  color: string;
  greetingMessage?: string;
  queueType?: string;
  optUserId?: number;
  optQueueId?: number;
  optIntegrationId?: number;
  optFileId?: number;
  closeTicket?: boolean;
}

const CreateChatBotServices = async (
  chatBotData: ChatbotData
): Promise<Chatbot> => {
  const chatBot = await Chatbot.create(chatBotData);
  return chatBot;
};

export default CreateChatBotServices;
