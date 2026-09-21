/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import { Op, Sequelize } from "sequelize";
import moment from "moment";
import sequelize from "../../database";
import Company from "../../models/Company";
import Plan from "../../models/Plan";
import Subscriptions from "../../models/Subscriptions";
import { getCompanyOptionalColumns } from "../../helpers/companyOptionalColumns";

export type ListCompaniesFilters = {
  nature?: "all" | "freemium" | "cadastro_gratis";
  dateFrom?: string;
  dateTo?: string;
  uf?: string;
};

const BASE_ATTRIBUTES = [
  "id",
  "name",
  "email",
  "phone",
  "planId",
  "status",
  "dueDate",
  "recurrence",
  "document",
  "paymentMethod",
  "generateInvoice",
  "createdAt",
  "lastLogin"
] as const;

const FindAllCompaniesService = async (
  filters?: ListCompaniesFilters
): Promise<Company[]> => {
  const f = filters || {};
  const cols = await getCompanyOptionalColumns();

  const conditions: any[] = [];

  if (f.dateFrom || f.dateTo) {
    const createdAt: any = {};
    if (f.dateFrom) {
      createdAt[Op.gte] = moment(f.dateFrom).startOf("day").toDate();
    }
    if (f.dateTo) {
      createdAt[Op.lte] = moment(f.dateTo).endOf("day").toDate();
    }
    conditions.push({ createdAt });
  }

  if (
    f.uf &&
    /^[A-Za-z]{2}$/.test(String(f.uf).trim()) &&
    cols.signupMetadata
  ) {
    const uf = String(f.uf).trim().toUpperCase();
    conditions.push(
      Sequelize.literal(
        `(COALESCE("Company"."signupMetadata"#>>'{address,uf}','') = ${sequelize.escape(
          uf
        )})`
      )
    );
  }

  if (f.nature === "freemium") {
    conditions.push({ recurrence: "freemium" });
  } else if (f.nature === "cadastro_gratis") {
    const subRows = await Subscriptions.findAll({
      attributes: ["companyId"],
      where: { providerSubscriptionId: "freemium_starter" } as any,
      raw: true
    });
    const fromSubscription = [
      ...new Set(
        (subRows as { companyId: number }[])
          .map((r) => r.companyId)
          .filter(Boolean)
      )
    ];

    const orBranches: any[] = [{ recurrence: "freemium" }];

    if (cols.signupMetadata) {
      orBranches.push(
        Sequelize.literal(
          `(COALESCE("Company"."signupMetadata"->>'signupSource','') = 'freemium')`
        )
      );
    }

    if (fromSubscription.length > 0) {
      orBranches.push({ id: { [Op.in]: fromSubscription } });
    }

    conditions.push({ [Op.or]: orBranches });
  }

  const where =
    conditions.length === 0
      ? {}
      : conditions.length === 1
        ? conditions[0]
        : { [Op.and]: conditions };

  const attributes: string[] = [...BASE_ATTRIBUTES];
  if (cols.signupMetadata) attributes.push("signupMetadata");
  if (cols.whiteLabelHostDomain) attributes.push("whiteLabelHostDomain");
  if (cols.allowOrgManualVisualIdentity) {
    attributes.push("allowOrgManualVisualIdentity");
  }
  if (cols.stripeProductKey) attributes.push("stripeProductKey");

  /** Sem include de Settings — join + serialização costumavam pesar e, em alguns PG, geravam 500. */
  const companies = await Company.findAll({
    where,
    attributes: attributes as any,
    order: [["name", "ASC"]],
    include: [{ model: Plan, as: "plan", attributes: ["id", "name", "amount"] }]
  });

  return companies;
};

export default FindAllCompaniesService;
