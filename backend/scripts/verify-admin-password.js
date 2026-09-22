const { Client } = require("pg");
const bcrypt = require("bcryptjs");

(async () => {
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  const r = await c.query(
    `SELECT id, email, "passwordHash", "startWork", "endWork", super, "companyId"
     FROM "Users" WHERE LOWER(email) = LOWER($1)`,
    ["admin@dev.local"]
  );
  if (!r.rows[0]) {
    console.log("USER_NOT_FOUND");
    process.exit(1);
  }
  const u = r.rows[0];
  const ok = await bcrypt.compare("123456", u.passwordHash);
  console.log(
    JSON.stringify(
      {
        id: u.id,
        email: u.email,
        companyId: u.companyId,
        startWork: u.startWork,
        endWork: u.endWork,
        super: u.super,
        passwordOK: ok,
      },
      null,
      2
    )
  );
  if (!ok) {
    const hash = await bcrypt.hash("123456", 8);
    await c.query(
      `UPDATE "Users" SET "passwordHash" = $1, "updatedAt" = NOW() WHERE id = $2`,
      [hash, u.id]
    );
    console.log("PASSWORD_RESET_DONE");
  }
  await c.end();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
