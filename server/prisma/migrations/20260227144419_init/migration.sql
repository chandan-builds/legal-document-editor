-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CLIENT', 'VENDOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PENDING_FINALIZATION', 'FINALIZED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CollaboratorRole" AS ENUM ('OWNER', 'EDITOR', 'REVIEWER', 'VIEWER');

-- CreateEnum
CREATE TYPE "ClauseStatus" AS ENUM ('DRAFT', 'PENDING_CLIENT_APPROVAL', 'PENDING_VENDOR_APPROVAL', 'PENDING_MUTUAL_APPROVAL', 'CLIENT_APPROVED', 'VENDOR_APPROVED', 'MUTUALLY_APPROVED', 'REJECTED', 'OMITTED');

-- CreateEnum
CREATE TYPE "EditType" AS ENUM ('INSERTION', 'DELETION', 'FORMATTING', 'REPLACEMENT');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovalAction" AS ENUM ('APPROVE', 'REJECT', 'REQUEST_CHANGES', 'OMIT');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('DOCUMENT_CREATED', 'DOCUMENT_UPLOADED', 'DOCUMENT_FINALIZED', 'TEXT_INSERTED', 'TEXT_DELETED', 'FORMATTING_CHANGED', 'CLAUSE_CREATED', 'CLAUSE_EDITED', 'CLAUSE_LOCKED', 'CLAUSE_UNLOCKED', 'CLAUSE_SUBMITTED_FOR_APPROVAL', 'CLAUSE_APPROVED', 'CLAUSE_REJECTED', 'CLAUSE_OMITTED', 'CLAUSE_COUNTER_PROPOSED', 'COMMENT_ADDED', 'COMMENT_RESOLVED', 'COMMENT_DELETED', 'VERSION_CREATED', 'VERSION_RESTORED', 'USER_JOINED', 'USER_LEFT', 'INTEGRITY_CHECK_PASSED', 'INTEGRITY_CHECK_FAILED', 'EDIT_ACCEPTED', 'EDIT_REJECTED', 'DOCUMENT_EXPORTED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL,
    "organization_id" UUID,
    "avatar_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "owner_id" UUID NOT NULL,
    "current_version" INTEGER NOT NULL DEFAULT 1,
    "yjs_state" BYTEA,
    "content_hash" VARCHAR(128),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_collaborators" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "CollaboratorRole" NOT NULL DEFAULT 'VIEWER',
    "invited_by" UUID,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_collaborators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sections" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "order_index" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clauses" (
    "id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "title" VARCHAR(500),
    "content_json" JSONB NOT NULL,
    "status" "ClauseStatus" NOT NULL DEFAULT 'DRAFT',
    "order_index" INTEGER NOT NULL,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "locked_by" UUID,
    "locked_at" TIMESTAMP(3),
    "original_hash" VARCHAR(128),
    "current_hash" VARCHAR(128),
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clauses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "edit_suggestions" (
    "id" UUID NOT NULL,
    "clause_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "edit_type" "EditType" NOT NULL,
    "original_content" TEXT,
    "suggested_content" TEXT,
    "position_from" INTEGER,
    "position_to" INTEGER,
    "formatting_attrs" JSONB,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "version_ref" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "edit_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clause_approvals" (
    "id" UUID NOT NULL,
    "clause_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "user_role" "UserRole" NOT NULL,
    "action" "ApprovalAction" NOT NULL,
    "reason" TEXT,
    "version_ref" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clause_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL,
    "clause_id" UUID,
    "document_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "quoted_text" TEXT,
    "position_from" INTEGER,
    "position_to" INTEGER,
    "is_resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_by" UUID,
    "resolved_at" TIMESTAMP(3),
    "parent_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "snapshot" BYTEA NOT NULL,
    "diff_from_prev" BYTEA,
    "content_hash" VARCHAR(128) NOT NULL,
    "prev_hash" VARCHAR(128),
    "description" TEXT,
    "author_id" UUID NOT NULL,
    "change_summary" JSONB,
    "is_major" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "user_role" "UserRole" NOT NULL,
    "action" "AuditAction" NOT NULL,
    "entity_type" VARCHAR(50),
    "entity_id" UUID,
    "previous_value" JSONB,
    "new_value" JSONB,
    "metadata" JSONB,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "version_ref" INTEGER NOT NULL,
    "session_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "document_collaborators_document_id_user_id_key" ON "document_collaborators"("document_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "clause_approvals_clause_id_user_id_version_ref_key" ON "clause_approvals"("clause_id", "user_id", "version_ref");

-- CreateIndex
CREATE UNIQUE INDEX "document_versions_document_id_version_number_key" ON "document_versions"("document_id", "version_number");

-- CreateIndex
CREATE INDEX "idx_audit_document" ON "audit_logs"("document_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_user" ON "audit_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_action" ON "audit_logs"("action", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_entity" ON "audit_logs"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_collaborators" ADD CONSTRAINT "document_collaborators_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_collaborators" ADD CONSTRAINT "document_collaborators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_collaborators" ADD CONSTRAINT "document_collaborators_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sections" ADD CONSTRAINT "sections_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clauses" ADD CONSTRAINT "clauses_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clauses" ADD CONSTRAINT "clauses_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clauses" ADD CONSTRAINT "clauses_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clauses" ADD CONSTRAINT "clauses_locked_by_fkey" FOREIGN KEY ("locked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edit_suggestions" ADD CONSTRAINT "edit_suggestions_clause_id_fkey" FOREIGN KEY ("clause_id") REFERENCES "clauses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edit_suggestions" ADD CONSTRAINT "edit_suggestions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edit_suggestions" ADD CONSTRAINT "edit_suggestions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edit_suggestions" ADD CONSTRAINT "edit_suggestions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clause_approvals" ADD CONSTRAINT "clause_approvals_clause_id_fkey" FOREIGN KEY ("clause_id") REFERENCES "clauses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clause_approvals" ADD CONSTRAINT "clause_approvals_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clause_approvals" ADD CONSTRAINT "clause_approvals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_clause_id_fkey" FOREIGN KEY ("clause_id") REFERENCES "clauses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
