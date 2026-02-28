export interface TextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}

export interface Paragraph {
  id: string;
  textRuns: TextRun[];
}

export interface ClauseMetadata {
  authorId: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  tags?: string[];
}

export interface Clause {
  id: string; // Permanent ID for tracking across versions
  title?: string;
  paragraphs: Paragraph[];
  metadata: ClauseMetadata;
}

export interface Section {
  id: string;
  title: string;
  clauses: Clause[];
}

export interface DocumentMetadata {
  author: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  status: 'draft' | 'review' | 'final';
  customFields?: Record<string, any>;
}

export interface LegalDocument {
  id: string;
  title: string;
  sections: Section[];
  metadata: DocumentMetadata;
}
