const { Client } = require("pg");
(async () => {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  const u = await c.query(
    `SELECT id, name, email, "companyId", profile, super FROM "Users" ORDER BY id`
  );
  console.log("USERS", JSON.stringify(u.rows, null, 2));
  const co = await c.query(
    `SELECT id, name, email, "dueDate", status FROM "Companies" ORDER BY id`
  );
  console.log("COMPANIES", JSON.stringify(co.rows, null, 2));
  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
