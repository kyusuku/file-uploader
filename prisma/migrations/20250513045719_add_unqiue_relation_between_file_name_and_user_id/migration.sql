/*
  Warnings:

  - A unique constraint covering the columns `[name,userId]` on the table `File` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "File_name_key";

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "File_name_userId_key" ON "File"("name", "userId");

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
