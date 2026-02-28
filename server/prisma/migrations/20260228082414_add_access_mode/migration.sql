-- CreateEnum
CREATE TYPE "AccessMode" AS ENUM ('VIEW', 'COMMENT', 'SUGGEST', 'EDIT');

-- AlterTable
ALTER TABLE "document_collaborators" ADD COLUMN     "access_mode" "AccessMode" NOT NULL DEFAULT 'VIEW';
