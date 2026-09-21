/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op } from "sequelize";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import ShowTicketUUIDService from "./ShowTicketFromUUIDService";

interface Request {
  companyId: number;
  contactId?: number | string | null;
  phone?: string | null;
  requestUserId?: number;
}

const digitsOnly = (value?: string | null): string =>
  String(value || "").replace(/\D/g, "");

function phoneFragments(digits: string): string[] {
  if (!digits || digits.length < 8) return [];
  const set = new Set<string>();
  set.add(digits);
  [13, 12, 11, 10, 9, 8].forEach((len) => {
    if (digits.length >= len) set.add(digits.slice(-len));
  });
  if (digits.startsWith("55") && digits.length > 10) {
    set.add(digits.slice(2));
    if (digits.length > 12) set.add(digits.slice(4));
  }
  return [...set].sort((a, b) => b.length - a.length);
}

function numbersMatch(a: string, b: string): boolean {
  const da = digitsOnly(a);
  const db = digitsOnly(b);
  if (!da || !db) return false;
  if (da === db) return true;
  const fragmentsA = phoneFragments(da);
  const fragmentsB = phoneFragments(db);
  return fragmentsA.some((fa) => fragmentsB.some((fb) => fa === fb || fa.endsWith(fb) || fb.endsWith(fa)));
}

async function resolveContactId(
  companyId: number,
  contactId?: number | string | null,
  phone?: string | null
): Promise<number | null> {
  if (contactId != null && String(contactId).trim() !== "") {
    const parsed = Number(contactId);
    if (Number.isFinite(parsed) && parsed > 0) {
      const exists = await Contact.findOne({
        where: { id: parsed, companyId },
        attributes: ["id"]
      });
      if (exists?.id) return exists.id;
    }
  }

  const phoneDigits = digitsOnly(phone);
  if (phoneDigits.length < 8) return null;

  for (const fragment of phoneFragments(phoneDigits)) {
    const contacts = await Contact.findAll({
      where: {
        companyId,
        number: { [Op.like]: `%${fragment}%` }
      },
      attributes: ["id", "number"],
      order: [["updatedAt", "DESC"]],
      limit: 20
    });
    const matched = contacts.find((c) => numbersMatch(c.number, phoneDigits));
    if (matched?.id) return matched.id;
  }

  return null;
}

async function findTicketByPhoneJoin(
  companyId: number,
  phone?: string | null
): Promise<Ticket | null> {
  const phoneDigits = digitsOnly(phone);
  if (phoneDigits.length < 8) return null;

  for (const fragment of phoneFragments(phoneDigits)) {
    const ticket = await Ticket.findOne({
      where: { companyId },
      include: [
        {
          model: Contact,
          as: "contact",
          required: true,
          where: {
            number: { [Op.like]: `%${fragment}%` }
          }
        }
      ],
      order: [["updatedAt", "DESC"]]
    });
    if (ticket?.uuid) return ticket;
  }

  return null;
}

const ResolveTicketForLeadPreviewService = async ({
  companyId,
  contactId,
  phone,
  requestUserId
}: Request) => {
  let ticket: Ticket | null = null;

  const resolvedContactId = await resolveContactId(companyId, contactId, phone);
  if (resolvedContactId) {
    ticket = await Ticket.findOne({
      where: { companyId, contactId: resolvedContactId },
      order: [["updatedAt", "DESC"]]
    });
  }

  if (!ticket?.uuid) {
    ticket = await findTicketByPhoneJoin(companyId, phone);
  }

  if (!ticket?.uuid) return null;

  return ShowTicketUUIDService(ticket.uuid, companyId, requestUserId);
};

export default ResolveTicketForLeadPreviewService;

export { digitsOnly, numbersMatch, phoneFragments };
