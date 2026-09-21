/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Mustache from "mustache";
import Ticket from "../models/Ticket";

function makeid(length) {
  var result = '';
  var characters = '0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export const msgsd = (): string => {

  let ms = "";

  const hh = new Date().getHours();

  if (hh >= 6) { ms = "Bom dia"; }
  if (hh > 11) { ms = "Boa tarde"; }
  if (hh > 17) { ms = "Boa noite"; }
  if (hh > 23 || hh < 6) { ms = "Boa madrugada"; }

  return ms;
};

export const control = (): string => {
  const Hr = new Date();

  const dd: string = ("0" + Hr.getDate()).slice(-2);
  const mm: string = ("0" + (Hr.getMonth() + 1)).slice(-2);
  const yyyy: string = Hr.getFullYear().toString();
  const minute: string = Hr.getMinutes().toString();
  const second: string = Hr.getSeconds().toString();
  const millisecond: string = Hr.getMilliseconds().toString();

  const ctrl = yyyy + mm + dd + minute + second + millisecond;
  return ctrl;
};

export const date = (): string => {
  const Hr = new Date();

  const dd: string = ("0" + Hr.getDate()).slice(-2);
  const mm: string = ("0" + (Hr.getMonth() + 1)).slice(-2);
  const yy: string = Hr.getFullYear().toString();

  const dates = dd + "-" + mm + "-" + yy;
  return dates;
};

export const hour = (): string => {
  const Hr = new Date();

  const hh: number = Hr.getHours();
  const min: string = ("0" + Hr.getMinutes()).slice(-2);
  const ss: string = ("0" + Hr.getSeconds()).slice(-2);

  const hours = hh + ":" + min + ":" + ss;
  return hours;
};

export const firstName = (ticket?: Ticket): string => {
  if (ticket && ticket?.contact?.name) {
    const nameArr = ticket?.contact?.name.split(' ');
    return nameArr[0];
  }
  return '';
};

const expandBraceVariables = (body: string, ticket?: Ticket): string => {
  if (!body || !body.includes("{")) return body;

  const Hr = new Date();
  const dd = ("0" + Hr.getDate()).slice(-2);
  const mm = ("0" + (Hr.getMonth() + 1)).slice(-2);
  const yyyy = Hr.getFullYear().toString();
  const min = ("0" + Hr.getMinutes()).slice(-2);

  const map: Record<string, string> = {
    nome: ticket?.contact?.name || "",
    empresa: ticket?.company?.name || "",
    telefone: ticket?.contact?.number || "",
    email: ticket?.contact?.email || "",
    data: `${dd}/${mm}/${yyyy}`,
    hora: `${Hr.getHours()}:${min}`,
    ano: yyyy,
    mes: Hr.toLocaleString("pt-BR", { month: "long" }),
    ticket: ticket?.id != null ? String(ticket.id) : "",
    atendente: ticket?.user?.name || "",
  };

  return body.replace(/\{([a-zA-Z0-9_]+)\}/gi, (full, key) => {
    const k = String(key || "").toLowerCase();
    if (Object.prototype.hasOwnProperty.call(map, k)) {
      return map[k];
    }
    return full;
  });
};

export default (body: string, ticket?: Ticket): string => {
  const view = {
    firstName: firstName(ticket),
    name: ticket ? ticket?.contact?.name : "",
    ticket_id: ticket ? ticket.id : "",
    userName: ticket ? ticket?.user?.name : "",
    ms: msgsd(),
    hour: hour(),
    date: date(),
    queue: ticket ? ticket?.queue?.name : "",
    connection: ticket ? ticket?.whatsapp?.name : "",
    data_hora: new Array(date(), hour()).join(" às "),
    protocol: new Array(control(), ticket ? ticket.id.toString() : "").join(""),
    name_company: ticket ? ticket?.company?.name : "",
    nome: ticket ? ticket?.contact?.name : "",
    empresa: ticket ? ticket?.company?.name : "",
    telefone: ticket ? ticket?.contact?.number : "",
    email: ticket ? ticket?.contact?.email : "",
    ano: new Date().getFullYear().toString(),
    atendente: ticket ? ticket?.user?.name : "",
  };

  const withBraces = expandBraceVariables(body, ticket);
  return Mustache.render(withBraces, view);
};
