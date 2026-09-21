/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Contact from "../../models/Contact";
import ContactListItem from "../../models/ContactListItem";

function digits(s: string): string {
  return String(s || "").replace(/\D/g, "");
}

function numbersMatch(a: string, b: string): boolean {
  const da = digits(a);
  const db = digits(b);
  if (!da || !db) return false;
  if (da === db) return true;
  const tail = 9;
  const ta = da.length >= tail ? da.slice(-tail) : da;
  const tb = db.length >= tail ? db.slice(-tail) : db;
  return ta === tb;
}

export async function resolveContactIdsFromList(
  companyId: number,
  contactListId: number
): Promise<number[]> {
  const items = await ContactListItem.findAll({
    where: { companyId, contactListId },
    attributes: ["number"]
  });
  if (!items.length) return [];

  const contacts = await Contact.findAll({
    where: { companyId, isGroup: false },
    attributes: ["id", "number"]
  });

  const ids = new Set<number>();
  for (const item of items) {
    const c = contacts.find(co => numbersMatch(co.number, item.number));
    if (c) ids.add(c.id);
  }
  return Array.from(ids);
}
