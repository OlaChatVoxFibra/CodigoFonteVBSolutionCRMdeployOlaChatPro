/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Sequelize, fn, col, where, Op, Filterable } from "sequelize";
import Contact from "../../models/Contact";
import ContactTag from "../../models/ContactTag";
import Tag from "../../models/Tag";
import ContactCustomField from "../../models/ContactCustomField";
import removeAccents from "remove-accents";
import { intersection } from "lodash";
import ContactWallet from "../../models/ContactWallet";
import User from "../../models/User";
import Queue from "../../models/Queue";

interface Request {
  searchParam?: string;
  pageNumber?: string;
  companyId: number;
  tagsIds?: number[];
  isGroup?: string;
}

interface Response {
  contacts: Contact[];
  count: number;
  hasMore: boolean;
}

const buildWhereCondition = async ({
  searchParam,
  companyId,
  tagsIds,
  isGroup
}: Omit<Request, "pageNumber">): Promise<Filterable["where"]> => {
  let whereCondition: Filterable["where"] = { companyId };

  if (searchParam) {
    const sanitizedSearchParam = removeAccents(searchParam.toLocaleLowerCase().trim());
    whereCondition = {
      ...whereCondition,
      [Op.or]: [
        {
          name: where(
            fn("LOWER", fn("unaccent", col("Contact.name"))),
            "LIKE",
            `%${sanitizedSearchParam}%`
          )
        },
        { number: { [Op.like]: `%${sanitizedSearchParam}%` } }
      ]
    };
  }

  if (Array.isArray(tagsIds) && tagsIds.length > 0) {
    const contactTags = await ContactTag.findAll({
      where: { tagId: { [Op.in]: tagsIds } },
      attributes: ["contactId"]
    });

    const contactTagsIntersection = intersection(contactTags.map(t => t.contactId));
    
    whereCondition = {
      ...whereCondition,
      id: {
        [Op.in]: contactTagsIntersection
      }
    };
  }

  if (isGroup === "false") {
    whereCondition = {
      ...whereCondition,
      isGroup: false
    };
  }

  return whereCondition;
};

const ListContactsService = async ({
  searchParam = "",
  pageNumber = "1",
  companyId,
  tagsIds,
  isGroup
}: Request): Promise<Response> => {

  const whereCondition = await buildWhereCondition({
    searchParam,
    companyId,
    tagsIds,
    isGroup
  });

  const limit = 100;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: contacts } = await Contact.findAndCountAll({
    where: whereCondition,
    attributes: [
      "id",
      "name",
      "number",
      "email",
      "birthDate",
      "isGroup",
      "urlPicture",
      "profilePicUrl",
      "active",
      "companyId",
      "channel"
    ],
    limit,
    offset,
    include: [
      {
        model: Tag,
        as: "tags",
        attributes: ["id", "name"]
      },
      {
        model: ContactCustomField,
        as: "extraInfo"
      },
      {
        model: ContactWallet,
        as: "contactWallets",
        include: [
          {
            model: User,
            as: "wallet",
            attributes: ["id", "name"]
          },
          {
            model: Queue,
            as: "queue",
            attributes: ["id", "name"]
          }
        ]
      }
    ],
    order: [["name", "ASC"]]
  });

  const hasMore = count > offset + contacts.length;

  const enriched = contacts;

  return {
    contacts: enriched as Contact[],
    count,
    hasMore
  };
};

export default ListContactsService;
