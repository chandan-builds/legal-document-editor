-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'SUGGESTION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'SUGGESTION_VIEWED';
ALTER TYPE "AuditAction" ADD VALUE 'SUGGESTION_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'SUGGESTION_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE 'SUGGESTION_MERGED';
ALTER TYPE "AuditAction" ADD VALUE 'SUGGESTION_REVERTED';

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "new_hash" VARCHAR(128),
ADD COLUMN     "previous_hash" VARCHAR(128);
