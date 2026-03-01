import { Mark, mergeAttributes } from '@tiptap/core';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TRACK CHANGE MARKS — Insertion & Deletion
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Each mark stores:
 *   - changeId:      A UUID that groups keystrokes belonging to the same logical
 *                    change. The ReviewPane uses this to render one card per
 *                    changeId and to target accept/reject at the document level.
 *   - suggestionId:  Optional DB-level EditSuggestion ID for backend correlation.
 *   - userId:        The authenticated user's ID (for backend correlation).
 *   - userName:      Display name shown in the ReviewPane card and bubble menu.
 *   - timestamp:     ISO-8601 creation time, used for sorting and display.
 *
 * Rendering:
 *   - <ins class="track-insertion" data-change-id="..." data-suggestion-id="...">  → green underline
 *   - <del class="track-deletion"  data-change-id="..." data-suggestion-id="...">  → red strikethrough
 *
 * The `excludes` property is set so these marks can coexist with bold, italic,
 * and other formatting marks. Each mark excludes only the other track mark.
 */

export interface TrackChangeAttributes {
  changeId: string;
  suggestionId: string | null;
  userId: string;
  userName: string;
  timestamp: string;
}

// ─── Shared attribute definitions ────────────────────────────────────────────

const trackChangeAttributes = {
  changeId: {
    default: null,
    parseHTML: (el: HTMLElement) => el.getAttribute('data-change-id'),
    renderHTML: (attrs: Record<string, any>) => ({ 'data-change-id': attrs.changeId }),
  },
  suggestionId: {
    default: null,
    parseHTML: (el: HTMLElement) => el.getAttribute('data-suggestion-id'),
    renderHTML: (attrs: Record<string, any>) => {
      if (!attrs.suggestionId) return {};
      return { 'data-suggestion-id': attrs.suggestionId };
    },
  },
  userId: {
    default: null,
    parseHTML: (el: HTMLElement) => el.getAttribute('data-user-id'),
    renderHTML: (attrs: Record<string, any>) => ({ 'data-user-id': attrs.userId }),
  },
  userName: {
    default: null,
    parseHTML: (el: HTMLElement) => el.getAttribute('data-user-name'),
    renderHTML: (attrs: Record<string, any>) => ({ 'data-user-name': attrs.userName }),
  },
  timestamp: {
    default: null,
    parseHTML: (el: HTMLElement) => el.getAttribute('data-timestamp'),
    renderHTML: (attrs: Record<string, any>) => ({ 'data-timestamp': attrs.timestamp }),
  },
};

// ─── INSERTION MARK ──────────────────────────────────────────────────────────

export const Insertion = Mark.create<TrackChangeAttributes>({
  name: 'insertion',

  // Allow coexistence with all marks EXCEPT deletion
  excludes: 'deletion',

  addAttributes() {
    return trackChangeAttributes;
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
    return trackChangeAttributes;
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
