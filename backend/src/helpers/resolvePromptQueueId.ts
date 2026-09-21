/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Normaliza queueId a partir do corpo da requisição e do registro anterior (update).
 * Retorna null quando nenhuma fila válida foi informada (coluna pode ser NULL após migração).
 */
export function resolvePromptQueueId(
  queueIdFromBody: unknown,
  previousQueueId: number | null | undefined
): number | null {
  const raw = queueIdFromBody as unknown;
  const parsed = raw === "" || raw == null ? NaN : Number(raw);
  const fromBody = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  if (fromBody != null) return fromBody;

  const prev =
    previousQueueId != null && Number(previousQueueId) > 0
      ? Number(previousQueueId)
      : null;
  if (prev != null) return prev;

  return null;
}
