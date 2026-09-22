/**
 * Fix company due dates to 2099 + soft unwanted demo companies.
 * Usage: DATABASE_URL=... DB_SSL=true node scripts/fix-companies-olachat.js
 */
require("dotenv").config();
const { Client } = require("pg");

const REMOVE_EMAILS = ["gestaovendas@gmail.com", "admin@local.dev"];
const REMOVE_NAMES = ["Gestão Vendas", "VB Solution Admin"];
const KEEP_DUE = "2099-12-31";

async function main() {
  const connectionString = (
    process.env.DATABASE_PUBLIC_URL ||
    process.env.DATABASE_URL ||
    ""
  ).trim();
  if (!connectionString) {
    console.error("Defina DATABASE_URL ou DATABASE_PUBLIC_URL");
    process.exit(1);
  }
  const ssl =
    String(process.env.DB_SSL || "").toLowerCase() === "true" ||
    /railway|rlwy\.net/i.test(connectionString)
      ? { rejectUnauthorized: false }
      : undefined;

  const client = new Client({ connectionString, ssl });
  await client.connect();
  try {
    await client.query("BEGIN");

    // Extend all active companies
    const upd = await client.query(
      `UPDATE "Companies" SET "dueDate" = $1::date, status = true, "updatedAt" = NOW()
       WHERE "dueDate" IS NULL OR "dueDate" < $1::date OR status IS DISTINCT FROM true
       RETURNING id, name, email`,
      [KEEP_DUE]
    );
    console.log(`[fix] dueDate → ${KEEP_DUE} for`, upd.rowCount, "companies");
    upd.rows.forEach((r) => console.log("  -", r.id, r.name, r.email));

    // Find companies to remove
    const toRemove = await client.query(
      `SELECT id, name, email FROM "Companies"
       WHERE LOWER(COALESCE(email,'')) = ANY($1::text[])
          OR name = ANY($2::text[])`,
      [REMOVE_EMAILS.map((e) => e.toLowerCase()), REMOVE_NAMES]
    );
    console.log("[fix] companies to remove:", toRemove.rowCount);
    for (const row of toRemove.rows) {
      console.log("  removing", row.id, row.name, row.email);
      const cid = row.id;
      // Soft-safe: delete users of that company first if FK allows, then company
      await client.query(`DELETE FROM "Users" WHERE "companyId" = $1`, [cid]);
      await client.query(`DELETE FROM "CompaniesSettings" WHERE "companyId" = $1`, [cid]).catch(() => {});
      await client.query(`DELETE FROM "Companies" WHERE id = $1`, [cid]);
    }

    // Ensure remaining display dueDate 2099
    await client.query(
      `UPDATE "Companies" SET "dueDate" = $1::date, status = true, "updatedAt" = NOW()`,
      [KEEP_DUE]
    );

    const left = await client.query(
      `SELECT id, name, email, "dueDate", status FROM "Companies" ORDER BY id`
    );
    console.log("[fix] remaining companies:");
    left.rows.forEach((r) =>
      console.log(" ", r.id, r.name, r.email, r.dueDate, r.status)
    );

    await client.query("COMMIT");
    console.log("[fix] OK");
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error(e);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

main();
