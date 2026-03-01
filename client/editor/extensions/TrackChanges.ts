import { Extension } from '@tiptap/core';
import { Transaction, TextSelection } from '@tiptap/pm/state';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TRACK CHANGES EXTENSION — Commands for Accept / Reject / Navigate
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * This extension provides Tiptap commands that operate on the ProseMirror
 * document by scanning ALL text nodes for `insertion` or `deletion` marks
 * with a matching `changeId`.
 *
 * HOW IT WORKS:
 *
 * acceptChange(changeId):
 *   - Finds every text range in the document that carries the mark with
 *     the given changeId.
 *   - For INSERTION marks: removes the mark (keeping the text — it's accepted).
 *   - For DELETION marks: deletes the text (the deletion is confirmed).
 *   - Operates in reverse document order to preserve positions.
 *
 * rejectChange(changeId):
 *   - Opposite logic:
 *   - For INSERTION marks: deletes the inserted text (reverting the insert).
 *   - For DELETION marks: removes the mark (keeping the text — deletion undone).
 *   - Operates in reverse document order to preserve positions.
 *
 * navigateToChange(changeId):
 *   - Finds the first occurrence of the changeId in the document.
 *   - Sets the text selection to that range and scrolls the editor viewport.
 *
 * acceptAllChanges() / rejectAllChanges():
 *   - Batch operations that collect all unique changeIds and process them.
 */

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    trackChanges: {
      /**
       * Accept a specific tracked change by its changeId.
       * - Insertion: mark is removed, text stays.
       * - Deletion: marked text is deleted.
       */
      acceptChange: (changeId: string) => ReturnType;

      /**
       * Reject a specific tracked change by its changeId.
       * - Insertion: inserted text is deleted.
       * - Deletion: mark is removed, text stays.
       */
      rejectChange: (changeId: string) => ReturnType;

      /**
       * Navigate the editor cursor to a specific change.
       */
      navigateToChange: (changeId: string) => ReturnType;

      /**
       * Accept multiple tracked changes by their changeIds.
       */
      acceptChanges: (changeIds: string[]) => ReturnType;

      /**
       * Reject multiple tracked changes by their changeIds.
       */
      rejectChanges: (changeIds: string[]) => ReturnType;

      /**
       * Accept ALL tracked changes in the document.
       */
      acceptAllChanges: () => ReturnType;

      /**
       * Reject ALL tracked changes in the document.
       */
      rejectAllChanges: () => ReturnType;
    };
  }
}

// ─── Type for a located mark range ───────────────────────────────────────────
interface MarkRange {
  from: number;
  to: number;
  markType: 'insertion' | 'deletion';
  changeId: string;
}

/**
 * Scans the entire ProseMirror document and returns all ranges that carry
 * an `insertion` or `deletion` mark with a `changeId` attribute.
 *
 * Results are sorted by `from` position (ascending).
 */
function findAllTrackChangeRanges(state: any): MarkRange[] {
  const ranges: MarkRange[] = [];
  const { doc, schema } = state;
  const insertionType = schema.marks.insertion;
  const deletionType = schema.marks.deletion;

  if (!insertionType && !deletionType) return ranges;

  doc.descendants((node: any, pos: number) => {
    if (!node.isText) return;

    for (const mark of node.marks) {
      if (mark.type === insertionType || mark.type === deletionType) {
        const changeId = mark.attrs.changeId;
        if (!changeId) continue;

        ranges.push({
          from: pos,
          to: pos + node.nodeSize,
          markType: mark.type === insertionType ? 'insertion' : 'deletion',
          changeId,
        });
      }
    }
  });

  // Sort ascending by position
  ranges.sort((a, b) => a.from - b.from);
  return ranges;
}

/**
 * Filters ranges to only those matching a specific changeId.
 */
function findRangesForChange(state: any, changeId: string): MarkRange[] {
  return findAllTrackChangeRanges(state).filter(r => r.changeId === changeId);
}

export const TrackChanges = Extension.create({
  name: 'trackChanges',

  addCommands() {
    return {
      // ─── ACCEPT CHANGE ─────────────────────────────────────────────
      acceptChange:
        (changeId: string) =>
          ({ state, dispatch }) => {
            const ranges = findRangesForChange(state, changeId);
            if (ranges.length === 0) return false;

            if (dispatch) {
              let tr: Transaction = state.tr;

              // Process in REVERSE order so that position shifts from
              // deletions don't invalidate earlier ranges.
              const reversed = [...ranges].reverse();

              for (const range of reversed) {
                if (range.markType === 'insertion') {
                  // Accept insertion: remove the mark, keep the text.
                  tr = tr.removeMark(range.from, range.to, state.schema.marks.insertion);
                } else {
                  // Accept deletion: delete the text entirely.
                  tr = tr.delete(range.from, range.to);
                }
              }

              dispatch(tr);
            }

            return true;
          },

      // ─── REJECT CHANGE ─────────────────────────────────────────────
      rejectChange:
        (changeId: string) =>
          ({ state, dispatch }) => {
            const ranges = findRangesForChange(state, changeId);
            if (ranges.length === 0) return false;

            if (dispatch) {
              let tr: Transaction = state.tr;

              const reversed = [...ranges].reverse();

              for (const range of reversed) {
                if (range.markType === 'insertion') {
                  // Reject insertion: delete the inserted text.
                  tr = tr.delete(range.from, range.to);
                } else {
                  // Reject deletion: remove the mark, restore the text.
                  tr = tr.removeMark(range.from, range.to, state.schema.marks.deletion);
                }
              }

              dispatch(tr);
            }

            return true;
          },

      // ─── NAVIGATE TO CHANGE ────────────────────────────────────────
      navigateToChange:
        (changeId: string) =>
          ({ state, dispatch, view }) => {
            const ranges = findRangesForChange(state, changeId);
            if (ranges.length === 0) return false;

            if (dispatch) {
              const firstRange = ranges[0];
              const tr = state.tr.setSelection(
                TextSelection.create(state.doc, firstRange.from, firstRange.to)
              );
              dispatch(tr.scrollIntoView());
            }

            return true;
          },

      // ─── ACCEPT MULTIPLE CHANGES ───────────────────────────────────
      acceptChanges:
        (changeIds: string[]) =>
          ({ state, dispatch }) => {
            const allRanges = findAllTrackChangeRanges(state).filter(r => changeIds.includes(r.changeId));
            if (allRanges.length === 0) return false;

            if (dispatch) {
              let tr: Transaction = state.tr;
              const reversed = [...allRanges].reverse();

              for (const range of reversed) {
                if (range.markType === 'insertion') {
                  tr = tr.removeMark(range.from, range.to, state.schema.marks.insertion);
                } else {
                  tr = tr.delete(range.from, range.to);
                }
              }

              dispatch(tr);
            }

            return true;
          },

      // ─── REJECT MULTIPLE CHANGES ───────────────────────────────────
      rejectChanges:
        (changeIds: string[]) =>
          ({ state, dispatch }) => {
            const allRanges = findAllTrackChangeRanges(state).filter(r => changeIds.includes(r.changeId));
            if (allRanges.length === 0) return false;

            if (dispatch) {
              let tr: Transaction = state.tr;
              const reversed = [...allRanges].reverse();

              for (const range of reversed) {
                if (range.markType === 'insertion') {
                  tr = tr.delete(range.from, range.to);
                } else {
                  tr = tr.removeMark(range.from, range.to, state.schema.marks.deletion);
                }
              }

              dispatch(tr);
            }

            return true;
          },

      // ─── ACCEPT ALL ────────────────────────────────────────────────
      acceptAllChanges:
        () =>
          ({ state, dispatch }) => {
            const allRanges = findAllTrackChangeRanges(state);
            if (allRanges.length === 0) return false;

            if (dispatch) {
              let tr: Transaction = state.tr;
              const reversed = [...allRanges].reverse();

              for (const range of reversed) {
                if (range.markType === 'insertion') {
                  tr = tr.removeMark(range.from, range.to, state.schema.marks.insertion);
                } else {
                  tr = tr.delete(range.from, range.to);
                }
              }

              dispatch(tr);
            }

            return true;
          },

      // ─── REJECT ALL ────────────────────────────────────────────────
      rejectAllChanges:
        () =>
          ({ state, dispatch }) => {
            const allRanges = findAllTrackChangeRanges(state);
            if (allRanges.length === 0) return false;

            if (dispatch) {
              let tr: Transaction = state.tr;
              const reversed = [...allRanges].reverse();

              for (const range of reversed) {
                if (range.markType === 'insertion') {
                  tr = tr.delete(range.from, range.to);
                } else {
                  tr = tr.removeMark(range.from, range.to, state.schema.marks.deletion);
                }
              }

              dispatch(tr);
            }

            return true;
          },
    };
  },
});

/**
 * Exported helper: Extract all tracked changes from the editor state,
 * grouped by changeId. Used by the ReviewPane to render change cards.
 */
export interface TrackedChange {
  changeId: string;
  type: 'insertion' | 'deletion' | 'replacement';
  text: string;
  /** For replacement type: the deleted (original) text */
  deletedText?: string;
  /** For replacement type: the inserted (new) text */
  insertedText?: string;
  userId: string;
  userName: string;
  timestamp: string;
  from: number;
  to: number;
}

export function extractTrackedChanges(state: any): TrackedChange[] {
  const ranges = findAllTrackChangeRanges(state);
  const changeMap = new Map<string, TrackedChange>();

  for (const range of ranges) {
    const text = state.doc.textBetween(range.from, range.to, ' ');

    // Find the mark to extract user attrs
    let userId = '';
    let userName = '';
    let timestamp = '';

    state.doc.nodesBetween(range.from, range.to, (node: any) => {
      if (!node.isText) return;
      for (const mark of node.marks) {
        if (mark.attrs.changeId === range.changeId) {
          userId = mark.attrs.userId || '';
          userName = mark.attrs.userName || '';
          timestamp = mark.attrs.timestamp || '';
        }
      }
    });

    const existing = changeMap.get(range.changeId);
    if (existing) {
      // Same changeId but different mark type → replacement
      if (existing.type !== range.markType && existing.type !== 'replacement') {
        // Merge into a replacement
        const isDeletionFirst = existing.type === 'deletion';
        existing.type = 'replacement';
        existing.deletedText = isDeletionFirst ? existing.text : text;
        existing.insertedText = isDeletionFirst ? text : existing.text;
        existing.text = `${existing.deletedText} → ${existing.insertedText}`;
        existing.from = Math.min(existing.from, range.from);
        existing.to = Math.max(existing.to, range.to);
      } else if (existing.type === 'replacement') {
        // Additional range for an existing replacement
        if (range.markType === 'deletion') {
          existing.deletedText = (existing.deletedText || '') + text;
        } else {
          existing.insertedText = (existing.insertedText || '') + text;
        }
        existing.text = `${existing.deletedText} → ${existing.insertedText}`;
        existing.to = Math.max(existing.to, range.to);
      } else {
        // Same type — merge consecutive ranges
        existing.text += text;
        existing.to = Math.max(existing.to, range.to);
      }
    } else {
      changeMap.set(range.changeId, {
        changeId: range.changeId,
        type: range.markType,
        text,
        userId,
        userName,
        timestamp,
        from: range.from,
        to: range.to,
      });
    }
  }

  // Return sorted by document position
  return Array.from(changeMap.values()).sort((a, b) => a.from - b.from);
}
