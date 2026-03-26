-- AlterTable
ALTER TABLE "document_versions" ADD COLUMN     "version_path" VARCHAR(1000),
ALTER COLUMN "snapshot" DROP NOT NULL;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "file_name" VARCHAR(255),
ADD COLUMN     "file_path" VARCHAR(1000);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "account_locked_until" TIMESTAMP(3),
ADD COLUMN     "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reset_password_expiry" TIMESTAMP(3),
ADD COLUMN     "reset_password_token" VARCHAR(255);
