/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Detecta quando o texto do assistente declara transferência/encaminhamento a humano (PT-BR),
 * ou quando o cliente pede/confirma transferência para humano.
 */

/** Mensagem enviada ao cliente após transferência quando a ação não define outra. */
export const DEFAULT_TRANSFER_CUSTOMER_MESSAGE =
  "Você foi transferido para um atendente humano. Em instantes alguém da nossa equipe continuará o atendimento.";

export function resolveTransferCustomerMessage(
  variables?: Record<string, unknown>,
  actionResponseMessage?: string | null
): string {
  const fromVars = String(
    variables?.msgTransfer ?? variables?.responseMessage ?? ""
  ).trim();
  if (fromVars) return fromVars;
  const fromAction = String(actionResponseMessage ?? "").trim();
  if (fromAction) return fromAction;
  return DEFAULT_TRANSFER_CUSTOMER_MESSAGE;
}

const NEGATIVE_REPLY_RE = /\b(n[aã]o|nao|negativo|nem|deixa|prefiro\s+n[aã]o|sem)\b/i;

function stripDiacritics(text: string): string {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function assistantTextImpliesTransferToHuman(text: string): boolean {
  const raw = String(text || "");
  if (/ação:\s*transferir/i.test(raw)) return true;

  const t = stripDiacritics(raw);

  if (/\b(nao|não)\s+vou\s+transfer/i.test(t)) return false;
  if (/\bsem\s+transfer/i.test(t)) return false;
  if (/\bnão\s+é\s+necessário\s+transfer/i.test(t)) return false;

  const patterns = [
    /\bvou\s+te\s+transferir\b/,
    /\b(vou|irei)\s+(te\s+)?transfer(ir|i-lo|i-la)\b/,
    /\btransferir\s+(a|para|pra)\s+(conversa|atendimento|chamado|você|voce)\b/,
    /\btransferencia\s+para\s+(o\s+)?atendente\b/,
    /\bencaminhar\s+(para\s+)?(um\s+)?atendente\b/,
    /\bpassar\s+(para\s+)?(um\s+)?atendente\b/,
    /\bpassei\s+para\s+(um\s+)?atendente\b/,
    /\bconversa\s+para\s+um\s+atendente\b/,
    /\batendente\s+(humano\s+)?vai\s+continuar\b/,
    /\batendente\s+para\s+continuar\b/
  ];
  return patterns.some((p) => p.test(t));
}

/** Cliente pede atendimento humano de forma explícita (não basta "sim" genérico). */
export function userRequestsHumanTransfer(text: string): boolean {
  const t = stripDiacritics(text).trim();
  if (!t || t.length < 4) return false;
  if (NEGATIVE_REPLY_RE.test(t) && /\b(atendente|humano|transfer)\b/.test(t)) return false;

  const patterns = [
    /\b(quero|preciso|gostaria|posso)\s+(de\s+)?(falar|ser\s+atendid[oa])\s+(com\s+)?(um\s+)?(atendente|humano|pessoa|especialista)\b/,
    /\b(quero|preciso)\s+(de\s+)?(suporte|atendimento)\s+humano\b/,
    /\b(me\s+)?(transfere|transferir|encaminhe|encaminhar|passe|passar)\s+(para\s+)?(um\s+)?(atendente|humano|atendimento\s+humano)\b/,
    /\b(me\s+)?transfere\b/,
    /\bchama(r)?\s+(um\s+)?(atendente|humano|especialista)\b/,
    /\bfalar\s+com\s+(um\s+)?(atendente|humano|pessoa|especialista)\b/,
    /\batendente\s+humano\b/,
    /\b(suporte|atendimento)\s+humano\b/
  ];
  return patterns.some((p) => p.test(t));
}

/**
 * Confirmação válida só depois que o agente declarou que vai transferir.
 * Evita "sim"/"ok" soltos dispararem transferência fora de contexto.
 */
export function userConfirmsTransferAfterAgentOffer(
  userText: string,
  lastAssistantText?: string
): boolean {
  const assistant = String(lastAssistantText || "").trim();
  if (!assistantTextImpliesTransferToHuman(assistant)) return false;

  const body = String(userText || "").trim();
  if (!body) return false;

  if (userRequestsHumanTransfer(body)) return true;

  const t = stripDiacritics(body).trim();
  if (!t || t.length > 56) return false;
  if (/\b(nao|não|negativo|nem quero)\b/.test(t)) return false;

  if (/^(sim|ok|pode|claro|beleza|confirmo|aceito|pode sim|sim,? pode|tudo bem)[.!\s?]*$/.test(t)) {
    return true;
  }

  return (
    /\b(sim|claro|pode|ok|beleza|confirmo|aceito)\b/.test(t) &&
    /\b(transferir|transfer|atendente|humano)\b/.test(t)
  );
}

export function transferExecutionAuthorized(params: {
  transferAuthorized?: unknown;
  userRequestedTransfer?: unknown;
  assistantDeclaredTransfer?: unknown;
  scriptTransferWithDeclaration?: unknown;
}): boolean {
  if (params.transferAuthorized === true) return true;
  if (params.userRequestedTransfer === true) return true;
  if (params.assistantDeclaredTransfer === true) return true;
  if (params.scriptTransferWithDeclaration === true) return true;
  return false;
}

/** Evita enviar, na mesma mensagem, conteúdo de etapas posteriores após declarar transferência. */
export function truncateAssistantResponseAfterDeclaredTransfer(text: string): string {
  const raw = String(text || "").trim();
  if (!raw) return raw;
  const blocks = raw.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length <= 1) return raw;
  const idx = blocks.findIndex((b) => assistantTextImpliesTransferToHuman(b));
  if (idx < 0) return raw;
  return blocks.slice(0, idx + 1).join("\n\n");
}
