import { createClause, updateClause, deleteClause, generateId } from './documentHelpers';
import { Section, Clause } from '@/types/document';

describe('Document Helpers', () => {
  const authorId = 'user-1';

  it('should generate unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('should create a new clause with default values', () => {
    const clause = createClause(authorId, 'Test Clause');
    
    expect(clause.id).toBeDefined();
    expect(clause.title).toBe('Test Clause');
    expect(clause.metadata.status).toBe('draft');
    expect(clause.metadata.authorId).toBe(authorId);
    expect(clause.paragraphs.length).toBe(1);
  });

  it('should update a clause within a section', async () => {
    const clause = createClause(authorId, 'Original Title');
    const section: Section = {
      id: 'sec-1',
      title: 'Section 1',
      clauses: [clause],
    };

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updatedSection = updateClause(section, clause.id, { title: 'Updated Title' });
    const updatedClause = updatedSection.clauses.find(c => c.id === clause.id);

    expect(updatedClause?.title).toBe('Updated Title');
    expect(updatedClause?.metadata.updatedAt).not.toBe(clause.metadata.updatedAt);
  });

  it('should delete a clause from a section', () => {
    const clause1 = createClause(authorId, 'Clause 1');
    const clause2 = createClause(authorId, 'Clause 2');
    const section: Section = {
      id: 'sec-1',
      title: 'Section 1',
      clauses: [clause1, clause2],
    };

    const updatedSection = deleteClause(section, clause1.id);
    
    expect(updatedSection.clauses.length).toBe(1);
    expect(updatedSection.clauses[0].id).toBe(clause2.id);
  });
});
