'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Editor } from '@tiptap/react';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { Search, Replace, ChevronUp, ChevronDown, X, CaseSensitive } from 'lucide-react';

// ── Plugin Key ──────────────────────────────────────────────────────
const searchPluginKey = new PluginKey('findReplace');

// ── Types ───────────────────────────────────────────────────────────
interface FindReplaceProps {
    editor: Editor;
    onClose: () => void;
    initialMode?: 'find' | 'replace';
}

interface MatchResult {
    from: number;
    to: number;
}

// ── Find all matches in document ────────────────────────────────────
function findAllMatches(doc: any, query: string, caseSensitive: boolean): MatchResult[] {
    if (!query) return [];

    const results: MatchResult[] = [];
    const searchText = caseSensitive ? query : query.toLowerCase();
    const searchLen = searchText.length;

    doc.descendants((node: any, pos: number) => {
        if (node.isText && node.text) {
            const text = caseSensitive ? node.text : node.text.toLowerCase();
            let idx = 0;
            while ((idx = text.indexOf(searchText, idx)) !== -1) {
                results.push({ from: pos + idx, to: pos + idx + searchLen });
                idx += searchLen;
            }
        }
    });

    return results;
}

// ── Decoration Plugin ───────────────────────────────────────────────
// This plugin reads from a shared mutable ref to get the current
// decoration state, avoiding the need to swap plugins on every keystroke.
function createDecorationPlugin(stateRef: React.MutableRefObject<{
    results: MatchResult[];
    currentIndex: number;
}>) {
    return new Plugin({
        key: searchPluginKey,
        props: {
            decorations(editorState) {
                const { results, currentIndex } = stateRef.current;
                if (results.length === 0) return DecorationSet.empty;

                const decorations: Decoration[] = [];
                for (let i = 0; i < results.length; i++) {
                    const { from, to } = results[i];
                    // Validate positions are within doc bounds
                    if (from < 0 || to > editorState.doc.content.size) continue;
                    const cls = i === currentIndex ? 'find-replace-current' : 'find-replace-match';
                    decorations.push(Decoration.inline(from, to, { class: cls }));
                }

                try {
                    return DecorationSet.create(editorState.doc, decorations);
                } catch {
                    return DecorationSet.empty;
                }
            },
        },
    });
}

// ── Component ───────────────────────────────────────────────────────
export default function FindReplace({ editor, onClose, initialMode = 'find' }: FindReplaceProps) {
    const [mode, setMode] = useState<'find' | 'replace'>(initialMode);
    const [query, setQuery] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const [caseSensitive, setCaseSensitive] = useState(false);
    const [results, setResults] = useState<MatchResult[]>([]);
    const [currentIndex, setCurrentIndex] = useState(-1);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Shared mutable ref for the decoration plugin to read from
    const decoStateRef = useRef<{ results: MatchResult[]; currentIndex: number }>({
        results: [],
        currentIndex: -1,
    });
    const pluginAddedRef = useRef(false);

    // ── Install decoration plugin once on mount ─────────────────────
    useEffect(() => {
        const plugin = createDecorationPlugin(decoStateRef);
        const { state } = editor.view;
        editor.view.updateState(state.reconfigure({ plugins: [...state.plugins, plugin] }));
        pluginAddedRef.current = true;

        return () => {
            // Remove plugin on unmount
            try {
                const currentState = editor.view.state;
                const filtered = currentState.plugins.filter(
                    (p) => p !== plugin
                );
                editor.view.updateState(currentState.reconfigure({ plugins: filtered }));
            } catch {
                // editor may already be destroyed
            }
        };
    }, [editor]);

    // Focus search input on mount
    useEffect(() => {
        setTimeout(() => searchInputRef.current?.focus(), 50);
    }, []);

    // ── Run search whenever query or caseSensitive changes ──────────
    const runSearch = useCallback(
        (q: string, cs: boolean, desiredIndex: number) => {
            const matches = findAllMatches(editor.state.doc, q, cs);
            const newIndex = matches.length > 0 ? Math.min(Math.max(0, desiredIndex), matches.length - 1) : -1;

            setResults(matches);
            setCurrentIndex(newIndex);

            // Update the shared ref so the decoration plugin picks up the new state
            decoStateRef.current = { results: matches, currentIndex: newIndex };

            // Force ProseMirror to re-render decorations by dispatching an empty transaction
            // BUT do NOT steal focus from the search input!
            const { tr } = editor.state;
            tr.setMeta('findReplace', true);
            tr.setMeta('addToHistory', false);
            editor.view.dispatch(tr);

            // Scroll to the current match WITHOUT stealing focus
            if (matches.length > 0 && newIndex >= 0) {
                const match = matches[newIndex];
                try {
                    const coords = editor.view.coordsAtPos(match.from);
                    const editorEl = editor.view.dom.closest('.ProseMirror')?.parentElement;
                    if (editorEl && coords) {
                        const rect = editorEl.getBoundingClientRect();
                        const scrollTop = editorEl.scrollTop;
                        const targetY = coords.top - rect.top + scrollTop - rect.height / 3;
                        editorEl.scrollTo({ top: targetY, behavior: 'smooth' });
                    }
                } catch {
                    // coords may fail at edge positions
                }
            }

            return matches;
        },
        [editor]
    );

    // ── Trigger search on query/caseSensitive change ────────────────
    useEffect(() => {
        runSearch(query, caseSensitive, 0);
    }, [query, caseSensitive, runSearch]);

    // ── Navigate matches ────────────────────────────────────────────
    const goToNext = useCallback(() => {
        if (results.length === 0) return;
        const next = (currentIndex + 1) % results.length;
        runSearch(query, caseSensitive, next);
    }, [results.length, currentIndex, query, caseSensitive, runSearch]);

    const goToPrev = useCallback(() => {
        if (results.length === 0) return;
        const prev = (currentIndex - 1 + results.length) % results.length;
        runSearch(query, caseSensitive, prev);
    }, [results.length, currentIndex, query, caseSensitive, runSearch]);

    // ── Replace ─────────────────────────────────────────────────────
    const replaceOne = useCallback(() => {
        if (results.length === 0 || currentIndex < 0) return;
        const match = results[currentIndex];

        const { tr } = editor.state;
        tr.insertText(replaceText, match.from, match.to);
        tr.setMeta('addToHistory', true);
        editor.view.dispatch(tr);

        // Re-search after replacement
        setTimeout(() => {
            runSearch(query, caseSensitive, currentIndex);
            searchInputRef.current?.focus();
        }, 30);
    }, [editor, results, currentIndex, replaceText, query, caseSensitive, runSearch]);

    const replaceAll = useCallback(() => {
        if (results.length === 0) return;

        // Replace from bottom to top so positions don't shift
        const sorted = [...results].sort((a, b) => b.from - a.from);
        const { tr } = editor.state;
        for (const match of sorted) {
            tr.insertText(replaceText, match.from, match.to);
        }
        tr.setMeta('addToHistory', true);
        editor.view.dispatch(tr);

        // Re-search
        setTimeout(() => {
            runSearch(query, caseSensitive, 0);
            searchInputRef.current?.focus();
        }, 30);
    }, [editor, results, replaceText, query, caseSensitive, runSearch]);

    // ── Keyboard shortcuts ──────────────────────────────────────────
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (e.shiftKey) goToPrev();
                else goToNext();
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        },
        [goToNext, goToPrev, onClose]
    );

    const btnBase =
        'p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors text-gray-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed';

    return (
        <div className="absolute top-0 right-4 z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-b-lg shadow-2xl p-3 min-w-[340px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <button
                    onClick={() => setMode(mode === 'find' ? 'replace' : 'find')}
                    className="text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-blue-600 transition-colors"
                >
                    {mode === 'find' ? '▶ REPLACE' : '▼ REPLACE'}
                </button>
                <button onClick={onClose} className={btnBase} title="Close (Esc)">
                    <X size={14} />
                </button>
            </div>

            {/* Find Row */}
            <div className="flex items-center gap-1 mb-1.5">
                <div className="relative flex-1">
                    <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Find..."
                        className="w-full pl-7 pr-2 py-1.5 text-sm rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-slate-200"
                    />
                </div>
                <button
                    onClick={() => setCaseSensitive(!caseSensitive)}
                    className={`${btnBase} ${caseSensitive ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : ''}`}
                    title="Match Case"
                >
                    <CaseSensitive size={16} />
                </button>
                <span className="text-xs text-gray-400 dark:text-slate-500 min-w-[50px] text-center tabular-nums">
                    {results.length > 0 ? `${currentIndex + 1}/${results.length}` : 'No results'}
                </span>
                <button onClick={goToPrev} className={btnBase} disabled={results.length === 0} title="Previous (Shift+Enter)">
                    <ChevronUp size={14} />
                </button>
                <button onClick={goToNext} className={btnBase} disabled={results.length === 0} title="Next (Enter)">
                    <ChevronDown size={14} />
                </button>
            </div>

            {/* Replace Row */}
            {mode === 'replace' && (
                <div className="flex items-center gap-1">
                    <div className="relative flex-1">
                        <Replace size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={replaceText}
                            onChange={(e) => setReplaceText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Replace with..."
                            className="w-full pl-7 pr-2 py-1.5 text-sm rounded border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-slate-200"
                        />
                    </div>
                    <button
                        onClick={replaceOne}
                        className="px-2 py-1 text-xs font-semibold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-40"
                        disabled={results.length === 0}
                        title="Replace current"
                    >
                        Replace
                    </button>
                    <button
                        onClick={replaceAll}
                        className="px-2 py-1 text-xs font-semibold rounded bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-900/50 transition-colors disabled:opacity-40"
                        disabled={results.length === 0}
                        title="Replace all"
                    >
                        All
                    </button>
                </div>
            )}
        </div>
    );
}
