/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import sequelize from "../database";

function matches(name: string) {
  const n = name.toLowerCase();
  return (
    n.includes("facebook") ||
    n.includes("insta") ||
    n.includes("instagram") ||
    n.includes("whatsapp") ||
    n.includes("waba")
  );
}

async function main() {
  const rows: any = await sequelize.query(
    `SELECT "name" FROM "SequelizeMeta" ORDER BY "name" ASC;`,
    { type: (sequelize as any).QueryTypes?.SELECT ?? undefined }
  );

  const metaRows: any[] = Array.isArray(rows) ? rows : rows?.[0] ?? [];
  const filtered = metaRows.filter((r) => matches(String(r.name || "")));

  console.log("=== SequelizeMeta (facebook/insta/whatsapp-related) ===");
  console.log(JSON.stringify(filtered, null, 2));

  console.log("\n=== SequelizeMeta totals ===");
  console.log(JSON.stringify({ total: metaRows.length, matched: filtered.length }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

