async function main() {
  // Reaproveita a configuração Sequelize do próprio backend
  const sequelize = require("../src/database").default || require("../src/database");

  const query = `
    SELECT "companyId", "channel", "name", "facebookPageUserId", "id", "status", "updatedAt"
    FROM "Whatsapps"
    WHERE "companyId" IN (1,2,3)
      AND "channel" IN ('facebook','instagram')
    ORDER BY "companyId", "channel", "updatedAt" DESC
    LIMIT 200;
  `;

  const [rows] = await sequelize.query(query);
  console.log(JSON.stringify(rows, null, 2));
  // Não fecha aqui para evitar efeito colateral em runtime (só usamos como script).
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

