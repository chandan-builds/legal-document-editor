import { Node, mergeAttributes } from '@tiptap/core';

export interface ClauseNodeAttributes {
  id: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    clause: {
      setClauseStatus: (id: string, status: ClauseNodeAttributes['status'], user?: string) => ReturnType;
      wrapInClause: (id?: string) => ReturnType;
    };
  }
}

export const ClauseNode = Node.create({
  name: 'clause',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-id'),
        renderHTML: attributes => ({ 'data-id': attributes.id }),
      },
      status: {
        default: 'draft',
        parseHTML: element => element.getAttribute('data-status'),
        renderHTML: attributes => ({ 'data-status': attributes.status }),
      },
      approvedBy: {
        default: null,
        parseHTML: element => element.getAttribute('data-approved-by'),
        renderHTML: attributes => ({ 'data-approved-by': attributes.approvedBy }),
      },
      approvedAt: {
        default: null,
        parseHTML: element => element.getAttribute('data-approved-at'),
        renderHTML: attributes => ({ 'data-approved-at': attributes.approvedAt }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="clause"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const status = node.attrs.status;
    let statusClass = 'clause-draft';
    if (status === 'pending') statusClass = 'clause-pending';
    if (status === 'approved') statusClass = 'clause-approved';
    if (status === 'rejected') statusClass = 'clause-rejected';

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'clause',
        class: `clause-container ${statusClass}`,
      }),
      ['div', { class: 'clause-label' }, status.toUpperCase()],
      ['div', { class: 'clause-content' }, 0],
    ];
  },

  addCommands() {
    return {
      setClauseStatus: (id, status, user) => ({ chain, state }) => {
        // Find the node with the given ID and update its attributes
        let pos = -1;
        state.doc.descendants((node, nodePos) => {
          if (node.type.name === 'clause' && node.attrs.id === id) {
            pos = nodePos;
            return false;
          }
        });

        if (pos !== -1) {
          const attrs: any = { status };
          if (status === 'approved' && user) {
            attrs.approvedBy = user;
            attrs.approvedAt = new Date().toISOString();
          }
          return chain().updateAttributes('clause', attrs).run();
        }
        return false;
      },
      wrapInClause: (id?: string) => ({ chain, state }) => {
        // Phase 3 — Replace random client-side ID with PostgreSQL UUID
        const clauseId = id || Math.random().toString(36).substr(2, 9);
        return chain()
          .wrapIn('clause', { id: clauseId, status: 'draft' })
          .run();
      },
    };
  },
});
