/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import "dotenv/config";
import { Op } from "sequelize";
import sequelize from "../database";
import User from "../models/User";
import Company from "../models/Company";
import Subscriptions from "../models/Subscriptions";
import PaymentConfirmationToken from "../models/PaymentConfirmationToken";

async function main() {
  const email = process.argv[2] || "thiagocsr83@gmail.com";
  await sequelize.authenticate();

  const user = await User.findOne({
    where: { email: { [Op.iLike]: email } } as any
  });
  const company = await Company.findOne({
    where: { email: { [Op.iLike]: email } } as any
  });
  const tokens = await PaymentConfirmationToken.findAll({
    where: { email: { [Op.iLike]: email } } as any,
    order: [["createdAt", "DESC"]],
    limit: 5
  });

  let userCompany = null;
  if (user) {
    userCompany = await Company.findByPk(user.companyId as any, {
      include: ["plan"]
    });
  }

  let sub = null;
  if (userCompany) {
    sub = await Subscriptions.findOne({
      where: { companyId: userCompany.id } as any
    });
  }

  console.log(
    JSON.stringify(
      {
        email,
        user: user
          ? {
              id: user.id,
              email: user.email,
              companyId: user.companyId,
              profile: user.profile,
              startWork: user.startWork,
              endWork: user.endWork
            }
          : null,
        companyByEmail: company
          ? {
              id: company.id,
              name: company.name,
              email: company.email,
              planId: company.planId,
              dueDate: company.dueDate,
              status: company.status,
              recurrence: company.recurrence
            }
          : null,
        userCompany: userCompany
          ? {
              id: userCompany.id,
              name: userCompany.name,
              plan: (userCompany as any).plan?.name,
              dueDate: userCompany.dueDate,
              status: userCompany.status,
              recurrence: userCompany.recurrence
            }
          : null,
        subscription: sub,
        tokens: tokens.map(t => ({
          tokenPreview: `${String(t.token).slice(0, 8)}...`,
          usedAt: t.usedAt,
          expiresAt: t.expiresAt,
          desiredPlanName: t.desiredPlanName,
          companyId: t.companyId,
          createdAt: t.createdAt
        }))
      },
      null,
      2
    )
  );

  await sequelize.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
