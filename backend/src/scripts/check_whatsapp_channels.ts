/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import sequelize from "../database";

async function main() {
  const distinctQuery = `
    SELECT DISTINCT "channel"
    FROM "Whatsapps"
    ORDER BY "channel" ASC;
  `;
  const distinctRows: any = await sequelize.query(distinctQuery, { type: (sequelize as any).QueryTypes?.SELECT ?? undefined });
  const distinct = Array.isArray(distinctRows) ? distinctRows : distinctRows?.[0] ?? [];
  console.log("=== Whatsapps.channel (distinct) ===");
  console.log(JSON.stringify(distinct, null, 2));

  const totalQuery = `
    SELECT COUNT(*)::int AS "total",
           SUM(CASE WHEN LOWER("channel") = 'facebook' THEN 1 ELSE 0 END)::int AS "facebookCount",
           SUM(CASE WHEN LOWER("channel") = 'instagram' THEN 1 ELSE 0 END)::int AS "instagramCount",
           SUM(CASE WHEN LOWER("channel") = 'whatsapp' THEN 1 ELSE 0 END)::int AS "whatsappCount"
    FROM "Whatsapps";
  `;
  const totalRows: any = await sequelize.query(totalQuery, { type: (sequelize as any).QueryTypes?.SELECT ?? undefined });
  const total = Array.isArray(totalRows) ? totalRows : totalRows?.[0] ?? {};
  console.log("=== Whatsapps totals ===");
  console.log(JSON.stringify(total, null, 2));

  const query = `
    SELECT "companyId", "channel", COUNT(*)::int AS "count"
    FROM "Whatsapps"
    WHERE LOWER("channel") IN ('facebook','instagram')
    GROUP BY "companyId", "channel"
    ORDER BY "companyId" ASC, "channel" ASC;
  `;

  const rows: any[] = await sequelize.query(query, { type: (sequelize as any).QueryTypes?.SELECT ?? undefined });
  // sequelize.query pode retornar [rows] dependendo do tipo usado; normaliza
  const normalized = Array.isArray(rows) ? rows : rows?.[0];

  console.log(JSON.stringify(normalized, null, 2));

  const listQuery = `
    SELECT "id", "companyId", "channel", "name", "facebookPageUserId", "createdAt", "updatedAt"
    FROM "Whatsapps"
    WHERE LOWER("channel") IN ('facebook','instagram')
    ORDER BY "companyId" ASC, "channel" ASC, "updatedAt" DESC
    LIMIT 200;
  `;
  const listRows: any = await sequelize.query(listQuery, { type: (sequelize as any).QueryTypes?.SELECT ?? undefined });
  const normalizedList = Array.isArray(listRows) ? listRows : listRows?.[0];
  console.log(JSON.stringify(normalizedList, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

