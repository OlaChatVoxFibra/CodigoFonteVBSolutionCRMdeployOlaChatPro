-- CreateEnum
CREATE TYPE "typeMessage" AS ENUM ('text', 'reaction', 'audio', 'document', 'image', 'sticker', 'video', 'location', 'contacts', 'interactive', 'template');

-- CreateTable
CREATE TABLE "company" (
    "id" SERIAL NOT NULL,
    "create_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "name" TEXT NOT NULL,
    "idEmpresaMult100" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "usersId" INTEGER NOT NULL,

    CONSTRAINT "company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsappOficial" (
    "id" SERIAL NOT NULL,
    "phone_number_id" TEXT NOT NULL,
    "waba_id" TEXT NOT NULL,
    "send_token" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,
    "use_rabbitmq" BOOLEAN NOT NULL DEFAULT false,
    "token_mult100" TEXT NOT NULL,
    "create_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "chatwoot_webhook_url" TEXT,
    "auth_token_chatwoot" TEXT,
    "n8n_webhook_url" TEXT,
    "auth_token_n8n" TEXT,
    "crm_webhook_url" TEXT,
    "auth_token_crm" TEXT,
    "typebot_webhook_url" TEXT,
    "auth_token_typebot" TEXT,
    "rabbitmq_exchange" TEXT,
    "rabbitmq_queue" TEXT,
    "rabbitmq_routing_key" TEXT,

    CONSTRAINT "whatsappOficial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sendMessageWhatsApp" (
    "id" SERIAL NOT NULL,
    "create_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3),
    "deleted_at" TIMESTAMP(3),
    "type" "typeMessage" NOT NULL,
    "to" TEXT NOT NULL,
    "text" JSONB,
    "reaction" JSONB,
    "audio" JSONB,
    "document" JSONB,
    "image" JSONB,
    "sticker" JSONB,
    "video" JSONB,
    "location" JSONB,
    "contacts" JSONB,
    "interactive" JSONB,
    "template" JSONB,
    "enviada" BOOLEAN NOT NULL DEFAULT false,
    "pathFile" TEXT,
    "idFileMeta" TEXT,
    "whatsappOficialId" INTEGER NOT NULL,
    "idMessageWhatsApp" JSONB,

    CONSTRAINT "sendMessageWhatsApp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_idEmpresaMult100_key" ON "company"("idEmpresaMult100");

-- CreateIndex
CREATE UNIQUE INDEX "whatsappOficial_token_mult100_key" ON "whatsappOficial"("token_mult100");

-- AddForeignKey
ALTER TABLE "whatsappOficial" ADD CONSTRAINT "whatsappOficial_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sendMessageWhatsApp" ADD CONSTRAINT "sendMessageWhatsApp_whatsappOficialId_fkey" FOREIGN KEY ("whatsappOficialId") REFERENCES "whatsappOficial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
