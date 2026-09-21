/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import moment from "moment";

export const DEFAULT_MESSAGE_VARIABLES = [
  { token: "{nome}", label: "Nome do contato", keys: ["nome", "name", "contato"] },
  { token: "{empresa}", label: "Nome da empresa", keys: ["empresa", "company"] },
  { token: "{telefone}", label: "Telefone do contato", keys: ["telefone", "phone", "celular"] },
  { token: "{email}", label: "E-mail do contato", keys: ["email", "mail"] },
  { token: "{data}", label: "Data (DD/MM/AAAA)", keys: ["data", "date", "dia"] },
  { token: "{hora}", label: "Hora (HH:mm)", keys: ["hora", "time", "horario"] },
  { token: "{ano}", label: "Ano atual", keys: ["ano", "year"] },
  { token: "{mes}", label: "Mês atual", keys: ["mes", "mês", "month"] },
  { token: "{ticket}", label: "Número do ticket", keys: ["ticket", "chamado"] },
  { token: "{atendente}", label: "Nome do atendente", keys: ["atendente", "agente", "user"] },
];

export function buildMessageVariableContext({ contact, user, ticketId }) {
  const now = moment();
  return {
    nome: contact?.name || "",
    empresa: user?.company?.name || user?.companyName || "",
    telefone: contact?.number || "",
    email: contact?.email || "",
    data: now.format("DD/MM/YYYY"),
    hora: now.format("HH:mm"),
    ano: now.format("YYYY"),
    mes: now.locale("pt-br").format("MMMM"),
    ticket: ticketId != null ? String(ticketId) : "",
    atendente: user?.name || "",
  };
}

export function filterMessageVariables(query, variables = DEFAULT_MESSAGE_VARIABLES) {
  const q = String(query || "").toLowerCase().trim();
  if (!q) return variables;
  return variables.filter((v) => {
    const token = v.token.replace(/[{}]/g, "").toLowerCase();
    return (
      token.includes(q) ||
      v.label.toLowerCase().includes(q) ||
      (v.keys || []).some((k) => k.includes(q))
    );
  });
}

/** Detecta filtro ativo após `*` no final da mensagem. */
export function getActiveVariableQuery(message) {
  if (!message || typeof message !== "string") return null;
  const match = message.match(/\*([^\s*]*)$/);
  if (!match) return null;
  return match[1];
}

export function insertVariableToken(message, token) {
  const raw = String(message || "");
  const match = raw.match(/\*([^\s*]*)$/);
  if (!match) return `${raw}${token}`;
  return raw.slice(0, match.index) + token;
}

/** Substitui `{nome}`, `{ano}`, etc. pelos valores reais antes do envio. */
export function expandMessageVariables(text, context = {}) {
  const raw = String(text ?? "");
  if (!raw.includes("{")) return raw;

  const map = {
    nome: String(context.nome ?? ""),
    empresa: String(context.empresa ?? ""),
    telefone: String(context.telefone ?? ""),
    email: String(context.email ?? ""),
    data: String(context.data ?? ""),
    hora: String(context.hora ?? ""),
    ano: String(context.ano ?? ""),
    mes: String(context.mes ?? ""),
    ticket: String(context.ticket ?? ""),
    atendente: String(context.atendente ?? ""),
  };

  return raw.replace(/\{([a-zA-Z0-9_]+)\}/gi, (full, key) => {
    const normalized = String(key || "").toLowerCase();
    if (Object.prototype.hasOwnProperty.call(map, normalized)) {
      return map[normalized];
    }
    return full;
  });
}

export function formatProductPriceLine(item) {
  const name = String(item?.name || item?.product || "Produto").trim();
  const price =
    item?.price != null && item?.price !== ""
      ? Number(item.price)
      : item?.salePrice != null
        ? Number(item.salePrice)
        : null;
  if (price != null && !Number.isNaN(price)) {
    const formatted = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
    return `*${name}*: ${formatted}`;
  }
  return `*${name}*`;
}
