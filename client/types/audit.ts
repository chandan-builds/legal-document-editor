/** Matches the full backend AuditAction Prisma enum */
export type AuditAction =
  | 'DOCUMENT_CREATED'
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_FINALIZED'
  | 'DOCUMENT_EXPORTED'
  | 'TEXT_INSERTED'
  | 'TEXT_DELETED'
  | 'FORMATTING_CHANGED'
  | 'CLAUSE_CREATED'
  | 'CLAUSE_EDITED'
  | 'CLAUSE_LOCKED'
  | 'CLAUSE_UNLOCKED'
  | 'CLAUSE_SUBMITTED_FOR_APPROVAL'
  | 'CLAUSE_APPROVED'
  | 'CLAUSE_REJECTED'
  | 'CLAUSE_OMITTED'
  | 'CLAUSE_COUNTER_PROPOSED'
  | 'COMMENT_ADDED'
  | 'COMMENT_RESOLVED'
  | 'COMMENT_DELETED'
  | 'VERSION_CREATED'
  | 'VERSION_RESTORED'
  | 'USER_JOINED'
  | 'USER_LEFT'
  | 'INTEGRITY_CHECK_PASSED'
  | 'INTEGRITY_CHECK_FAILED'
  | 'EDIT_ACCEPTED'
  | 'EDIT_REJECTED'
  | 'SUGGESTION_CREATED'
  | 'SUGGESTION_VIEWED'
  | 'SUGGESTION_APPROVED'
  | 'SUGGESTION_REJECTED'
  | 'SUGGESTION_MERGED'
  | 'SUGGESTION_REVERTED';

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: AuditAction;
  content?: string; // e.g., the text inserted/deleted or the comment text
  position?: number;
  timestamp: string;
  documentVersion: number;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

export interface VersionMetadata {
  id: string;
  version: number;
  timestamp: string;
  author: string;
  description?: string;
  snapshot: Uint8Array; // Binary Yjs state
  hash: string; // SHA256 of the snapshot
  changeSummary?: {
    insertions: number;
    deletions: number;
    comments: number;
  };
}
