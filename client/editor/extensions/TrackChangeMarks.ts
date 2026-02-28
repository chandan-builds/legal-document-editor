import { Mark, mergeAttributes } from '@tiptap/core';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TRACK CHANGE MARKS — Insertion & Deletion
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Each mark stores:
 *   - changeId:  A UUID that groups keystrokes belonging to the same logical
 *                change. The ReviewPane uses this to render one card per
 *                changeId and to target accept/reject at the document level.
 *   - userId:    The authenticated user's ID (for backend correlation).
 *   - userName:  Display name shown in the ReviewPane card and bubble menu.
 *   - timestamp: ISO-8601 creation time, used for sorting and display.
 *
 * Rendering:
 *   - <ins class="track-insertion" data-change-id="...">  → green underline
 *   - <del class="track-deletion"  data-change-id="...">  → red strikethrough
 *
 * The `excludes` property is set to '' (empty string) so these marks can
 * coexist with bold, italic, and other formatting marks. Each mark excludes
 * the other (you can't have an insertion AND deletion on the same text).
 */

export interface TrackChangeAttributes {
  changeId: string;
  userId: string;
  userName: string;
  timestamp: string;
}

// ─── INSERTION MARK ──────────────────────────────────────────────────────────

export const Insertion = Mark.create<TrackChangeAttributes>({
  name: 'insertion',

  // Allow coexistence with all marks EXCEPT deletion
  excludes: 'deletion',

  addAttributes() {
    return {
      changeId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-change-id'),
        renderHTML: (attrs) => ({ 'data-change-id': attrs.changeId }),
      },
      userId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-user-id'),
        renderHTML: (attrs) => ({ 'data-user-id': attrs.userId }),
      },
      userName: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-user-name'),
        renderHTML: (attrs) => ({ 'data-user-name': attrs.userName }),
      },
      timestamp: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-timestamp'),
        renderHTML: (attrs) => ({ 'data-timestamp': attrs.timestamp }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'ins[data-change-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'ins',
      mergeAttributes(HTMLAttributes, { class: 'track-insertion' }),
      0,
    ];
  },
});

// ─── DELETION MARK ───────────────────────────────────────────────────────────

export const Deletion = Mark.create<TrackChangeAttributes>({
  name: 'deletion',

  // Allow coexistence with all marks EXCEPT insertion
  excludes: 'insertion',

  addAttributes() {
    return {
      changeId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-change-id'),
        renderHTML: (attrs) => ({ 'data-change-id': attrs.changeId }),
      },
      userId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-user-id'),
        renderHTML: (attrs) => ({ 'data-user-id': attrs.userId }),
      },
      userName: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-user-name'),
        renderHTML: (attrs) => ({ 'data-user-name': attrs.userName }),
      },
      timestamp: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-timestamp'),
        renderHTML: (attrs) => ({ 'data-timestamp': attrs.timestamp }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'del[data-change-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'del',
      mergeAttributes(HTMLAttributes, { class: 'track-deletion' }),
      0,
    ];
  },
});
