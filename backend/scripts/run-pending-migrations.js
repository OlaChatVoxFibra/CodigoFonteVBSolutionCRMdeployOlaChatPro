require("dotenv").config();
const path = require("path");
const { Sequelize } = require("sequelize");

const migrationFiles = [
  "20260516120000-add-contact-lead-to-activities.ts",
  "20260518120000-add-event-fields-to-activities.ts"
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL não definida");
    process.exit(1);
  }

  const sequelize = new Sequelize(url, {
    dialect: "postgres",
    logging: console.log,
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false }
    }
  });

  const queryInterface = sequelize.getQueryInterface();

  try {
    for (const file of migrationFiles) {
      const full = path.resolve("src/database/migrations", file);
      // eslint-disable-next-line import/no-dynamic-require, global-require
      const migration = require(full);
      const name = file.replace(/\.ts$/, "");
      const [existing] = await sequelize.query(
        'SELECT name FROM "SequelizeMeta" WHERE name = :name',
        { replacements: { name } }
      );
      if (existing.length) {
        console.log(`skip (already applied): ${name}`);
        continue;
      }
      console.log(`running: ${name}`);
      await migration.up(queryInterface, Sequelize);
      await sequelize.query(
        'INSERT INTO "SequelizeMeta" (name) VALUES (:name)',
        { replacements: { name } }
      );
      console.log(`done: ${name}`);
    }
  } finally {
    await sequelize.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
