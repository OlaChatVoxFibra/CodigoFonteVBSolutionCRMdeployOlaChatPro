/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import "dotenv/config";
import sequelize from "../database";
import User from "../models/User";
import Company from "../models/Company";

async function main() {
  const email = "fabriciomonteiro@gmail.com";
  const password = "123456";
  const name = "Fabricio Monteiro";

  try {
    await sequelize.authenticate();

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      console.log(`[create-admin-user] Usuário já existe: ${email} (id=${existing.id})`);
      process.exit(0);
      return;
    }

    const company = await Company.findOne({ order: [["id", "ASC"]] });
    if (!company) {
      console.error("[create-admin-user] Nenhuma empresa encontrada para associar o usuário.");
      process.exit(1);
      return;
    }

    const user = await User.create({
      email,
      password,
      name,
      companyId: company.id,
      profile: "admin",
      // manter super = false (não verá Financeiro/Planos pela UI padrão)
      startWork: "00:00",
      endWork: "23:59",
      showDashboard: "enabled",
      allowSeeMessagesInPendingTickets: "enabled"
    } as any);

    console.log(`[create-admin-user] Usuário criado com sucesso: id=${user.id}, email=${email}, companyId=${company.id}`);
    process.exit(0);
  } catch (err) {
    console.error("[create-admin-user] Erro ao criar usuário:", err);
    process.exit(1);
  } finally {
    try {
      await sequelize.close();
    } catch {}
  }
}

main();

