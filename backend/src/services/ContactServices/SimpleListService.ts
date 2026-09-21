/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import Contact from "../../models/Contact";
import Tag from "../../models/Tag";
import AppError from "../../errors/AppError";
import { FindOptions, Op, Sequelize } from "sequelize";

export interface SearchContactParams {
  companyId: string | number;
  name?: string;
  userId?: number;
  tagId?: number;
}

const SimpleListService = async ({ name, companyId, userId, tagId }: SearchContactParams): Promise<Contact[]> => {

  let options: FindOptions = {
    order: [
      ['name', 'ASC']
    ],
    include: [
      {
        model: Tag,
        as: "tags",
        attributes: ["id", "name"],
        through: { attributes: [] }
      }
    ]
  };

  let whereCondition: any = { companyId };

  if (tagId) {
    whereCondition[Op.and] = [
      ...(Array.isArray(whereCondition[Op.and]) ? whereCondition[Op.and] : []),
      Sequelize.literal(`id IN (SELECT "contactId" FROM "ContactTags" WHERE "tagId" = ${Number(tagId)})`)
    ];
  }

  if (name && name.trim()) {
    const term = `%${name.trim()}%`;
    const digits = name.trim().replace(/\D/g, "");
    whereCondition[Op.or] = [
      { name: { [Op.iLike]: term } },
      ...(digits.length > 0 ? [{ number: { [Op.iLike]: `%${digits}%` } }] : [])
    ];
  }

  options.where = whereCondition;

  const contacts = await Contact.findAll(options);

  if (!contacts) {
    throw new AppError("ERR_NO_CONTACT_FOUND", 404);
  }

  return contacts;
};

export default SimpleListService;
