/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import AppError from "../errors/AppError";

function normalizePromptBody(s: string): string {
  return String(s || "")
    .replace(/\r\n/g, "\n")
    .replace(/[\s\u00a0]+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Garante tamanho mínimo do texto agregado de instruções (evita registro vazio/ruído).
 *
 * A checagem antiga de corpo duplicado na empresa fazia vários "Novo agente" com o mesmo
 * template v2 gerarem o mesmo `prompt` expandido e o segundo save falhava com ERR_PROMPT_DUPLICATE_BODY.
 * Removida para o fluxo de criação ser previsível; duplicidade de conteúdo fica a critério do operador.
 */
export function assertPromptUniqueInCompany(
  companyId: number,
  promptText: string,
  _excludePromptId?: number | null
): void {
  void companyId;
  void _excludePromptId;
  const target = normalizePromptBody(promptText);
  if (target.length < 16) {
    throw new AppError("ERR_PROMPT_BODY_TOO_SHORT", 400);
  }
}
