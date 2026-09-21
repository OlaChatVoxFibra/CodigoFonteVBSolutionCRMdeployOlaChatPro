/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import "dotenv/config";
import { Op } from "sequelize";
import sequelize from "../database";
import User from "../models/User";
import AuthUserService from "../services/UserServices/AuthUserService";

async function main() {
  const email = process.argv[2] || "thiagocsr83@gmail.com";
  const newPassword = process.argv[3] || "123456";

  await sequelize.authenticate();

  const user = await User.findOne({
    where: { email: { [Op.iLike]: email } } as any
  });

  if (!user) {
    console.error(`[reset-password] Usuário não encontrado: ${email}`);
    process.exit(1);
    return;
  }

  const before123456 = await user.checkPassword("123456");
  const beforeNew = await user.checkPassword(newPassword);

  console.log(
    `[reset-password] Antes — checkPassword('123456'): ${before123456}, checkPassword('${newPassword}'): ${beforeNew}`
  );

  user.password = newPassword;
  await user.save();

  await user.reload();
  const after123456 = await user.checkPassword("123456");
  const afterNew = await user.checkPassword(newPassword);

  console.log(
    `[reset-password] Depois — checkPassword('123456'): ${after123456}, checkPassword('${newPassword}'): ${afterNew}`
  );

  try {
    const auth = await AuthUserService({ email, password: newPassword });
    console.log(
      `[reset-password] AuthUserService OK — userId=${auth.serializedUser.id}, companyId=${auth.serializedUser.companyId}`
    );
  } catch (err: any) {
    console.error(`[reset-password] AuthUserService falhou:`, err?.message || err);
    process.exit(1);
    return;
  }

  console.log(`[reset-password] Senha atualizada para ${email}`);
  await sequelize.close();
}

main().catch(err => {
  console.error("[reset-password] Erro:", err);
  process.exit(1);
});
