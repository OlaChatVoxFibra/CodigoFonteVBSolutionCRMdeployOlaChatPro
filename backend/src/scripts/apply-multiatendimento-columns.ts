/**
 * Copyright (c) Visão Business. Todos os direitos reservados.
 * VB Solution CRM — propriedade intelectual da Visão Business.
 * Uso conforme LICENSE na raiz do repositório.
 */

import "../database";
import sequelize from "../database";

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
  if (!queues.sendQueueEntryMessage) {
    await qi.addColumn("Queues", "sendQueueEntryMessage", {
      type: "BOOLEAN",
      allowNull: false,
      defaultValue: true
    });
    console.log("Added Queues.sendQueueEntryMessage");
  }

  if (!queues.queueEntryMessage) {
    await qi.addColumn("Queues", "queueEntryMessage", {
      type: "TEXT",
      allowNull: false,
      defaultValue: "Você está na fila *{{queue}}*. Em breve será atendido!"
    });
    console.log("Added Queues.queueEntryMessage");
  }

  const whatsapps = await tableInfo("Whatsapps");
  if (!whatsapps.sendQueueEntryMessage) {
    await sequelize.query(`
      ALTER TABLE "Whatsapps"
      ADD COLUMN IF NOT EXISTS "sendQueueEntryMessage" VARCHAR(255) NOT NULL DEFAULT 'inherit'
    `);
    console.log("Added Whatsapps.sendQueueEntryMessage");
  }

  if (!whatsapps.queueEntryMessage) {
    await sequelize.query(`
      ALTER TABLE "Whatsapps"
      ADD COLUMN IF NOT EXISTS "queueEntryMessage" TEXT NOT NULL DEFAULT ''
    `);
    console.log("Added Whatsapps.queueEntryMessage");
  }

  const users = await tableInfo("Users");
  if (!users.ticketVisibility) {
    await sequelize.query(`
      ALTER TABLE "Users"
      ADD COLUMN IF NOT EXISTS "ticketVisibility" VARCHAR(255) NOT NULL DEFAULT 'own_only'
    `);
    console.log("Added Users.ticketVisibility");

    await sequelize.query(`
      UPDATE "Users"
      SET "ticketVisibility" = CASE
        WHEN "allTicket" IN ('enable', 'enabled')
          AND "allHistoric" = 'enabled'
          AND "allUserChat" = 'enabled' THEN 'all'
        WHEN "allHistoric" = 'enabled'
          AND "allUserChat" = 'enabled' THEN 'own_queues'
        ELSE 'own_only'
      END
    `);
  }

  const migrations = [
    "20260617140000-add-queue-entry-message-and-ticket-visibility.ts",
    "20260617210000-fix-missing-multiatendimento-columns.ts",
    "20260619120000-add-queue-entry-message-to-whatsapps.ts"
  ];

  for (const name of migrations) {
    const [existing] = await sequelize.query(
      `SELECT name FROM "SequelizeMeta" WHERE name = :name`,
      { replacements: { name } }
    );
    if (!(existing as any[]).length) {
      await sequelize.query(`INSERT INTO "SequelizeMeta" (name) VALUES (:name)`, {
        replacements: { name }
      });
      console.log("Registered migration:", name);
    }
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
