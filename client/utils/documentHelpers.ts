import { Section, Clause, LegalDocument, Paragraph, TextRun } from '@/types/document';

/**
 * Generates a unique ID (RFC 4122 v4 compliant)
 * Uses native crypto.randomUUID() if available, otherwise a fallback.
 */
export function generateId(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Creates a new blank clause with initial metadata
 */
export function createClause(authorId: string, title?: string): Clause {
  const timestamp = new Date().toISOString();
  
  return {
    id: generateId(),
    title,
    paragraphs: [
      {
        id: generateId(),
        textRuns: [{ text: '' }]
      }
    ],
    metadata: {
      authorId,
      createdAt: timestamp,
      updatedAt: timestamp,
      status: 'draft',
    }
  };
}

/**
 * Updates a clause within a section, returning a new Section object
 */
export function updateClause(section: Section, clauseId: string, updates: Partial<Clause>): Section {
  return {
    ...section,
    clauses: section.clauses.map((c) => {
      if (c.id === clauseId) {
        return {
          ...c,
          ...updates,
          metadata: {
            ...c.metadata,
            ...updates.metadata,
            updatedAt: new Date().toISOString()
          }
        };
      }
      return c;
    })
  };
}

/**
 * Deletes a clause from a section, returning a new Section object
 */
export function deleteClause(section: Section, clauseId: string): Section {
  return {
    ...section,
    clauses: section.clauses.filter((c) => c.id !== clauseId)
  };
}

/**
 * Deletes a clause from the entire document, regardless of its section
 */
export function deleteClauseFromDocument(doc: LegalDocument, clauseId: string): LegalDocument {
  return {
    ...doc,
    sections: doc.sections.map((s) => ({
      ...s,
      clauses: s.clauses.filter((c) => c.id !== clauseId)
    })),
    metadata: {
      ...doc.metadata,
      updatedAt: new Date().toISOString()
    }
  };
}

/**
 * Helper to find a clause across all sections of a document
 */
export function findClauseInDocument(doc: LegalDocument, clauseId: string): { clause: Clause; sectionId: string } | null {
  for (const section of doc.sections) {
    const clause = section.clauses.find((c) => c.id === clauseId);
    if (clause) {
      return { clause, sectionId: section.id };
    }
  }
  return null;
}

/**
 * Helper to add a clause to a specific section in a document
 */
export function addClauseToDocument(doc: LegalDocument, sectionId: string, clause: Clause): LegalDocument {
  return {
    ...doc,
    sections: doc.sections.map((s) => {
      if (s.id === sectionId) {
        return {
          ...s,
          clauses: [...s.clauses, clause]
        };
      }
      return s;
    }),
    metadata: {
      ...doc.metadata,
      updatedAt: new Date().toISOString()
    }
  };
}
