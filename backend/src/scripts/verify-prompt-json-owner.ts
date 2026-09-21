/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

/**
 * Contagem de divergências: blobs cargo/cérebro/produtividade sem promptId ou com promptId ≠ Prompt.id.
 * Execução: npx ts-node -r tsconfig-paths/register src/scripts/verify-prompt-json-owner.ts
 */
import sequelize from "../database";
import Prompt from "../models/Prompt";
import { auditPromptBlobField, PromptBlobField } from "../helpers/promptJsonOwner";

const FIELDS: PromptBlobField[] = ["cargo", "cerebro", "produtividade"];

const run = async () => {
  const rows = await Prompt.findAll({
    attributes: ["id", "name", "companyId", "cargo", "cerebro", "produtividade"]
  });

  const counts = {
    rows: 0,
    empty: 0,
    legacy_no_owner: 0,
    mismatch: 0,
    ok: 0
  };

  const mismatchSamples: string[] = [];

  for (const p of rows) {
    counts.rows++;
    const id = Number(p.id);
    for (const f of FIELDS) {
      const raw = f === "cargo" ? p.cargo : f === "cerebro" ? p.cerebro : p.produtividade;
      const st = auditPromptBlobField(id, raw);
      counts[st]++;
      if (st === "mismatch") {
        const o = raw && typeof raw === "object" ? (raw as any).promptId : "?";
        mismatchSamples.push(`prompt#${id} (${p.name}) campo=${f} blob.promptId=${o}`);
      }
    }
  }

  console.log(JSON.stringify({ sample: "verify-prompt-json-owner", ...counts }, null, 2));
  if (mismatchSamples.length) {
    console.log("Amostras de mismatch (até 20):");
    mismatchSamples.slice(0, 20).forEach(s => console.log(" -", s));
  }

  await sequelize.close();
  process.exit(counts.mismatch > 0 ? 2 : 0);
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
