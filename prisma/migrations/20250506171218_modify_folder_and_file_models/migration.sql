/*
  Warnings:

  - You are about to drop the column `parentId` on the `Folder` table. All the data in the column will be lost.
  - Added the required column `size` to the `File` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Folder" DROP CONSTRAINT "Folder_parentId_fkey";

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "size" INTEGER NOT NULL,
ADD COLUMN     "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Folder" DROP COLUMN "parentId";
