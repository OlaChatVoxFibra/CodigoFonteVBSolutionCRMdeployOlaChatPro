/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Migração única: injeta promptId nos JSONs cargo/cérebro/produtividade de cada Prompt.
 * Execução: npx ts-node -r tsconfig-paths/register src/scripts/backfill-prompt-json-owner.ts
 * (ou após build: node dist/scripts/backfill-prompt-json-owner.js se compilado)
 */
import sequelize from "../database";
import Prompt from "../models/Prompt";
import { attachPromptOwnerToPromptRow } from "../helpers/promptJsonOwner";

const run = async () => {
  const rows = await Prompt.findAll({ attributes: ["id", "cargo", "cerebro", "produtividade"] });
  let updated = 0;
  for (const p of rows) {
    const id = Number(p.id);
    const owned = attachPromptOwnerToPromptRow(id, {
      cargo: p.cargo,
      cerebro: p.cerebro,
      produtividade: p.produtividade
    });
    await p.update({
      cargo: owned.cargo as any,
      cerebro: owned.cerebro as any,
      produtividade: owned.produtividade as any
    });
    updated++;
    console.log(`OK promptId=${id}`);
  }
  console.log(`Concluído: ${updated} agentes (Prompt) atualizados.`);
  await sequelize.close();
  process.exit(0);
};

run().catch(async e => {
  console.error(e);
  try {
    await sequelize.close();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
