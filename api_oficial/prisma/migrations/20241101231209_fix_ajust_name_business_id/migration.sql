/*
  Warnings:

  - You are about to drop the column `business_id` on the `whatsappOficial` table. All the data in the column will be lost.
  - Added the required column `business_id` to the `whatsappOficial` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "whatsappOficial" DROP COLUMN "business_id",
ADD COLUMN     "business_id" TEXT NOT NULL;
