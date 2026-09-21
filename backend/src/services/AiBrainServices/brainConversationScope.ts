/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AiBrainConversation from "../../models/AiBrainConversation";

export function assertConversationBelongsToProject(
  conversation: AiBrainConversation,
  projectId?: number
): void {
  if (
    projectId != null &&
    conversation.projectId != null &&
    Number(conversation.projectId) !== Number(projectId)
  ) {
    throw new Error("Esta conversa pertence a outro projeto Brain.");
  }
}
