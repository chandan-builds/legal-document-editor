import { Mark, mergeAttributes } from '@tiptap/core';

export interface CommentMarkAttributes {
  commentId: string;
}

export const CommentMark = Mark.create<CommentMarkAttributes>({
  name: 'comment',

  addAttributes() {
    return {
      commentId: { 
        default: null,
        parseHTML: (element) => element.getAttribute('data-comment-id'),
        renderHTML: (attributes) => ({
          'data-comment-id': attributes.commentId,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'mark[data-comment-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['mark', mergeAttributes(HTMLAttributes, { class: 'comment-highlight' }), 0];
  },
});
