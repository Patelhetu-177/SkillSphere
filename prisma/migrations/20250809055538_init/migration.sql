/*
  Warnings:

  - You are about to drop the column `companionId` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the `Category` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Companion` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Companion" DROP CONSTRAINT "Companion_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_companionId_fkey";

-- DropIndex
DROP INDEX "Message_companionId_idx";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "companionId";

-- DropTable
DROP TABLE "Category";

-- DropTable
DROP TABLE "Companion";
