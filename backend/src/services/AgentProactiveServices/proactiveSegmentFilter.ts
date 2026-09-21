/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op } from "sequelize";
import Contact from "../../models/Contact";
import ContactTag from "../../models/ContactTag";
import ContactListItem from "../../models/ContactListItem";
import { ProactiveContextType, ProactiveSegmentRule } from "../../types/agentProactiveSettings";

function digits(s: string): string {
  return String(s || "").replace(/\D/g, "");
}

function numbersMatch(contactNumber: string, listNumber: string): boolean {
  const a = digits(contactNumber);
  const b = digits(listNumber);
  if (!a || !b) return false;
  if (a === b) return true;
  const tail = 9;
  const ta = a.length >= tail ? a.slice(-tail) : a;
  const tb = b.length >= tail ? b.slice(-tail) : b;
  return ta === tb;
}

/**
 * Sem regra ou regra vazia: todos passam.
 * Com tagIds: contato precisa de pelo menos uma tag.
 * Com contactListId: número do contato deve constar na lista.
 */
export async function contactMatchesProactiveSegment(
  contact: Contact,
  companyId: number,
  context: ProactiveContextType,
  segments?: Partial<Record<ProactiveContextType, ProactiveSegmentRule>>
): Promise<boolean> {
  const rule = segments?.[context];
  if (!rule) return true;

  const tagIds = rule.tagIds?.filter(Boolean) || [];
  const listId = rule.contactListId;

  const needTags = tagIds.length > 0;
  const needList = listId != null && Number(listId) > 0;

  if (!needTags && !needList) return true;

  let okTags = !needTags;
  let okList = !needList;

  if (needTags) {
    const n = await ContactTag.count({
      where: { contactId: contact.id, tagId: { [Op.in]: tagIds } }
    });
    okTags = n > 0;
  }

  if (needList) {
    const items = await ContactListItem.findAll({
      where: { contactListId: listId, companyId },
      attributes: ["number"]
    });
    okList = items.some(it => numbersMatch(contact.number, it.number));
  }

  if (needTags && needList) {
    return okTags && okList;
  }
  return okTags && okList;
}
