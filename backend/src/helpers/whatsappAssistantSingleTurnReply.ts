/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Evita que, na mesma rodada de envio, o assistente “simule” a resposta do cliente
 * (ex.: “Perfeito, vou verificar…” logo após perguntar a data).
 * Cobre tanto parágrafos separados por linha em branco quanto um único bloco com quebras \n.
 * Não altera ações /comando — só o texto enviado ao WhatsApp.
 */

function isPrematureProgressParagraph(p: string): boolean {
  const t = String(p || "").trim();
  if (!t) return true;
  if (
    /^(perfeito|perfeita|ótimo|otimo|ótim[oa]|legal|beleza|certo|massa|show|combinado|anotado|excelente|maravilha)\b/i.test(
      t
    )
  ) {
    return true;
  }
  if (/\bvou (registrar|anotar|salvar|guardar)\b/i.test(t)) return true;
  if (/\b(registr(ar|ando)|anot(ar|ando))\b.*\b(prefer(ê|e)ncia|período|periodo|hospedagem|reserva)\b/i.test(t))
    return true;
  if (/\bvou (verificar|conferir|checar|buscar|analisa(r)?|providenciar)\b/i.test(t)) return true;
  if (/\b(já |ja )?(estou|vou) (verificando|conferindo|checando|separando)\b/i.test(t)) return true;
  if (/^(entendi|beleza|ok),?\s+vou\b/i.test(t)) return true;
  if (/^combinado\b/i.test(t)) return true;
  return false;
}

/** Vários parágrafos (\n\n): remove trechos após a última linha que termina com ? se forem só “antecipação”. */
function clipMultiParagraph(raw: string): string {
  const paras = raw.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  if (paras.length <= 1) return raw;
  let lastQ = -1;
  for (let i = 0; i < paras.length; i++) {
    if (/\?\s*$/.test(paras[i])) lastQ = i;
  }
  if (lastQ < 0 || lastQ >= paras.length - 1) return raw;
  const tail = paras.slice(lastQ + 1);
  if (!tail.length) return raw;
  if (!tail.every(isPrematureProgressParagraph)) return raw;
  return paras.slice(0, lastQ + 1).join("\n\n").trim();
}

/**
 * Um único “parágrafo” (muito comum na saída da LLM: só \n entre frases).
 * Corta tudo após o último ? se o restante for só confirmação antecipada.
 */
function clipAfterLastQuestionTailPremature(raw: string): string {
  const text = raw.trim();
  const qPos = text.lastIndexOf("?");
  if (qPos < 0) return text;
  const after = text.slice(qPos + 1).trim();
  if (!after) return text;
  const subBlocks = after.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  const chunks = subBlocks.length ? subBlocks : [after];
  if (!chunks.every(isPrematureProgressParagraph)) return text;
  return text.slice(0, qPos + 1).trim();
}

export function clipPrematureAssistantProgressAfterQuestion(text: string): string {
  let t = String(text || "").trim();
  if (!t) return t;
  t = clipMultiParagraph(t);
  t = clipAfterLastQuestionTailPremature(t);
  return t;
}
