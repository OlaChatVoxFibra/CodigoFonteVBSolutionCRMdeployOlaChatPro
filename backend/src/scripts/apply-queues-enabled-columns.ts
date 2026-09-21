/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import "../database";
import sequelize from "../database";

const MIGRATION_NAME =
  "20260618120000-add-queues-enabled-and-system-queue.ts";

async function main() {
  const qi = sequelize.getQueryInterface();

  const tableInfo = async (
    table: string
  ): Promise<Record<string, unknown>> => {
    try {
      return (await qi.describeTable(table)) as Record<string, unknown>;
    } catch {
      return {} as Record<string, unknown>;
    }
  };

  const queues = await tableInfo("Queues");
  if (!queues.isSystem) {
    await qi.addColumn("Queues", "isSystem", {
      type: "BOOLEAN",
      allowNull: false,
      defaultValue: false
    });
    console.log("Added Queues.isSystem");
  }

  const whatsapps = await tableInfo("Whatsapps");
  if (!whatsapps.queuesEnabled) {
    await qi.addColumn("Whatsapps", "queuesEnabled", {
      type: "BOOLEAN",
      allowNull: false,
      defaultValue: true
    });
    console.log("Added Whatsapps.queuesEnabled");
  }
  if (!whatsapps.sendGreetingMessage) {
    await qi.addColumn("Whatsapps", "sendGreetingMessage", {
      type: "BOOLEAN",
      allowNull: false,
      defaultValue: false
    });
    console.log("Added Whatsapps.sendGreetingMessage");
  }
  if (!whatsapps.sendFarewellMessage) {
    await qi.addColumn("Whatsapps", "sendFarewellMessage", {
      type: "BOOLEAN",
      allowNull: false,
      defaultValue: false
    });
    console.log("Added Whatsapps.sendFarewellMessage");
  }

  const [existing] = await sequelize.query(
    `SELECT name FROM "SequelizeMeta" WHERE name = :name`,
    { replacements: { name: MIGRATION_NAME } }
  );
  if (!(existing as any[]).length) {
    await sequelize.query(`INSERT INTO "SequelizeMeta" (name) VALUES (:name)`, {
      replacements: { name: MIGRATION_NAME }
    });
    console.log("Registered migration:", MIGRATION_NAME);
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
