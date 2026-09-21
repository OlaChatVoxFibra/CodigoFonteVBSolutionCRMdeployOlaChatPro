/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/** GPT e Claude podem coexistir — mantido por compatibilidade (sempre false). */
export async function getAnthropicBlockingOpenAi(
  _companyId: number
): Promise<{ blocking: boolean }> {
  return { blocking: false };
}
