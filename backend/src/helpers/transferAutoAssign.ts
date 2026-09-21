/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Resolve se transferência manual deve acionar roteador automático da nova fila.
 * Estilo Komo: transferir só para fila → atribuição automática; transferir para usuário → manual.
 */
export function shouldAutoAssignOnTransfer(params: {
  isTransfered: boolean;
  userId?: number | null;
  oldQueueId?: number | null;
  newQueueId?: number | null;
}): boolean {
  if (!params.isTransfered) {
    return true;
  }
  const hasTargetUser =
    params.userId !== null &&
    params.userId !== undefined &&
    Number(params.userId) > 0;
  if (hasTargetUser) {
    return false;
  }
  return (
    params.oldQueueId !== params.newQueueId &&
    params.newQueueId !== null &&
    params.newQueueId !== undefined
  );
}
