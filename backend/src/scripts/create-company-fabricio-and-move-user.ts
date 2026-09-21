/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import "dotenv/config";
import sequelize from "../database";
import Company from "../models/Company";
import User from "../models/User";
import Plan from "../models/Plan";

async function main() {
  const email = "fabriciomonteiro@gmail.com";
  const companyName = "Empresa do Fabricio";

  try {
    await sequelize.authenticate();

    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.error(`[fabricio-move] Usuário não encontrado: ${email}`);
      process.exit(1);
      return;
    }

    let company = await Company.findOne({ where: { name: companyName } });
    if (!company) {
      const plan = await Plan.findOne({ order: [["id", "ASC"]] });
      if (!plan) {
        console.error("[fabricio-move] Nenhum plano encontrado para vincular à empresa.");
        process.exit(1);
        return;
      }
      company = await Company.create({
        name: companyName,
        email,
        phone: "",
        status: true,
        dueDate: null,
        planId: plan.id,
        generateInvoice: true,
      } as any);
      console.log(`[fabricio-move] Empresa criada: id=${company.id}, nome=${company.name}, plano=${plan.name}`);
    } else {
      console.log(`[fabricio-move] Empresa já existia: id=${company.id}, nome=${company.name}`);
    }

    const oldCompanyId = user.companyId;
    user.set("companyId", company.id);
    await user.save();

    console.log(`[fabricio-move] Usuário ${user.email} movido da empresa ${oldCompanyId} para ${company.id}`);
    process.exit(0);
  } catch (err) {
    console.error("[fabricio-move] Erro:", err);
    process.exit(1);
  } finally {
    try {
      await sequelize.close();
    } catch {}
  }
}

main();

