'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Editor } from '@tiptap/react';
import { extractTrackedChanges, TrackedChange } from '@/editor/extensions/TrackChanges';
import { useAppStore } from '@/hooks/useAppStore';
import {
    Check,
    X,
    ChevronLeft,
    ChevronRight,
    Filter,
    Eye,
    CheckCheck,
    XCircle,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// REVIEW PANE — MS Word-style right sidebar for Track Changes
// ═══════════════════════════════════════════════════════════════════════════

interface ReviewPaneProps {
    editor: Editor;
    accessMode: string;
    onClose: () => void;
}

export default function ReviewPane({ editor, accessMode, onClose }: ReviewPaneProps) {
    const [changes, setChanges] = useState<TrackedChange[]>([]);
    const [activeChangeId, setActiveChangeId] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<'all' | 'insertion' | 'deletion'>('all');
    const [filterUser, setFilterUser] = useState<string>('all');

    const trackChangesToggle = useAppStore((s) => s.trackChanges);
    const toggleTrackChanges = useAppStore((s) => s.toggleTrackChanges);
    const currentUser = useAppStore((s) => s.currentUser);

    const isSuggesting = accessMode === 'SUGGEST';
    const trackChanges = isSuggesting || trackChangesToggle;

    // Can this user accept/reject? Only EDIT (owner) can.
    const canReview = accessMode === 'EDIT';

    // ── Scan the editor document for tracked changes ───────────────────
    const refreshChanges = useCallback(() => {
        if (!editor || !editor.state) return;
        const extracted = extractTrackedChanges(editor.state);
        setChanges(extracted);
    }, [editor]);

    // Refresh on mount and on every editor transaction
    useEffect(() => {
        refreshChanges();

        if (!editor) return;

        // Listen to every transaction to keep the list in sync
        const handler = () => refreshChanges();
        editor.on('transaction', handler);
        return () => {
            editor.off('transaction', handler);
        };
    }, [editor, refreshChanges]);

    // ── Filtered + unique users ────────────────────────────────────────
    const uniqueUsers = useMemo(() => {
        const users = new Map<string, string>();
        changes.forEach((c) => {
            if (c.userId) users.set(c.userId, c.userName);
        });
        return Array.from(users.entries()); // [[id, name], ...]
    }, [changes]);

    const filteredChanges = useMemo(() => {
        return changes.filter((c) => {
            if (filterType !== 'all' && c.type !== filterType) return false;
            if (filterUser !== 'all' && c.userId !== filterUser) return false;
            return true;
        });
    }, [changes, filterType, filterUser]);

    // ── Active index tracking ──────────────────────────────────────────
    const activeIndex = useMemo(() => {
        if (!activeChangeId) return -1;
        return filteredChanges.findIndex((c) => c.changeId === activeChangeId);
    }, [filteredChanges, activeChangeId]);

    // ── Navigation ─────────────────────────────────────────────────────
    const navigateTo = useCallback(
        (changeId: string) => {
            setActiveChangeId(changeId);
            editor.commands.navigateToChange(changeId);
        },
        [editor],
    );

    const goNext = useCallback(() => {
        if (filteredChanges.length === 0) return;
        const nextIndex = activeIndex < filteredChanges.length - 1 ? activeIndex + 1 : 0;
        navigateTo(filteredChanges[nextIndex].changeId);
    }, [filteredChanges, activeIndex, navigateTo]);

    const goPrev = useCallback(() => {
        if (filteredChanges.length === 0) return;
        const prevIndex = activeIndex > 0 ? activeIndex - 1 : filteredChanges.length - 1;
        navigateTo(filteredChanges[prevIndex].changeId);
    }, [filteredChanges, activeIndex, navigateTo]);

    // ── Accept / Reject handlers ───────────────────────────────────────
    const handleAccept = useCallback(
        (changeId: string) => {
            editor.commands.acceptChange(changeId);
            setActiveChangeId(null);
        },
        [editor],
    );

    const handleReject = useCallback(
        (changeId: string) => {
            editor.commands.rejectChange(changeId);
            setActiveChangeId(null);
        },
        [editor],
    );

    const handleAcceptAll = useCallback(() => {
        const currentUserId = currentUser?.userId || currentUser?.email || currentUser?.name || 'anonymous';
        const reviewableChanges = filteredChanges.filter(c => c.userId !== currentUserId);

        if (reviewableChanges.length === 0) {
            alert('No pending changes available for you to accept.');
            return;
        }

        if (!confirm(`Accept ${reviewableChanges.length} reviewable changes?`)) return;
        editor.commands.acceptChanges(reviewableChanges.map(c => c.changeId));
        setActiveChangeId(null);
    }, [editor, filteredChanges, currentUser]);

    const handleRejectAll = useCallback(() => {
        const currentUserId = currentUser?.userId || currentUser?.email || currentUser?.name || 'anonymous';
        const reviewableChanges = filteredChanges.filter(c => c.userId !== currentUserId);

        if (reviewableChanges.length === 0) {
            alert('No pending changes available for you to reject.');
            return;
        }

        if (!confirm(`Reject ${reviewableChanges.length} reviewable changes?`)) return;
        editor.commands.rejectChanges(reviewableChanges.map(c => c.changeId));
        setActiveChangeId(null);
    }, [editor, filteredChanges, currentUser]);

    // ── Relative time helper ───────────────────────────────────────────
    const relativeTime = (ts: string) => {
        if (!ts) return '';
        const diff = Date.now() - new Date(ts).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return new Date(ts).toLocaleDateString();
    };

    return (
        <div className="flex flex-col h-full bg-white border-l w-80 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]">
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
                <div className="flex items-center gap-2">
                    <span className="text-red-500 font-bold text-lg">┃</span>
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 tracking-tight">CHANGES</h2>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                            {filteredChanges.length} pending
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 transition"
                >
                    <X size={16} />
                </button>
            </div>

            {/* ── Toolbar: Toggle + Filters + Navigation ──────────────────── */}
            <div className="px-3 py-2 border-b space-y-2 bg-slate-50/50">
                {/* Row 1: Track Changes Toggle + Navigation */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={toggleTrackChanges}
                        disabled={isSuggesting}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition ${trackChanges
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            } ${isSuggesting ? 'opacity-60 cursor-not-allowed' : ''}`}
                        title={isSuggesting ? 'Always ON in Suggestion Mode' : 'Toggle Track Changes'}
                    >
                        <Eye size={12} />
                        {trackChanges ? 'ON' : 'OFF'}
                    </button>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={goPrev}
                            disabled={filteredChanges.length === 0}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30 transition"
                            title="Previous Change"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        <span className="text-[10px] text-slate-400 font-medium min-w-[3rem] text-center tabular-nums">
                            {filteredChanges.length > 0
                                ? `${activeIndex + 1} / ${filteredChanges.length}`
                                : '0 / 0'}
                        </span>
                        <button
                            onClick={goNext}
                            disabled={filteredChanges.length === 0}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30 transition"
                            title="Next Change"
                        >
                            <ChevronRight size={14} />
                        </button>
                    </div>
                </div>

                {/* Row 2: Filters */}
                <div className="flex items-center gap-2">
                    <Filter size={10} className="text-slate-400 shrink-0" />
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as any)}
                        className="text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-600 flex-1"
                    >
                        <option value="all">All Types</option>
                        <option value="insertion">Insertions</option>
                        <option value="deletion">Deletions</option>
                    </select>
                    <select
                        value={filterUser}
                        onChange={(e) => setFilterUser(e.target.value)}
                        className="text-[10px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-600 flex-1"
                    >
                        <option value="all">All Users</option>
                        {uniqueUsers.map(([id, name]) => (
                            <option key={id} value={id}>
                                {name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Row 3: Batch Actions (only for reviewers) */}
                {canReview && filteredChanges.length > 0 && (
                    <div className="flex gap-1.5">
                        <button
                            onClick={handleAcceptAll}
                            className="flex-1 flex items-center justify-center gap-1 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-bold uppercase hover:bg-emerald-100 transition"
                        >
                            <CheckCheck size={11} /> Accept All
                        </button>
                        <button
                            onClick={handleRejectAll}
                            className="flex-1 flex items-center justify-center gap-1 py-1 bg-red-50 text-red-700 border border-red-200 rounded text-[10px] font-bold uppercase hover:bg-red-100 transition"
                        >
                            <XCircle size={11} /> Reject All
                        </button>
                    </div>
                )}
            </div>

            {/* ── Change Cards List ───────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto">
                {filteredChanges.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 px-6">
                        <CheckCheck size={32} className="text-slate-300" />
                        <p className="text-xs text-center">No tracked changes to review.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredChanges.map((change, index) => {
                            const isActive = change.changeId === activeChangeId;
                            const isInsertion = change.type === 'insertion';
                            const typeBadge = isInsertion
                                ? { label: 'INSERTED', bg: 'bg-emerald-100', text: 'text-emerald-700' }
                                : { label: 'DELETED', bg: 'bg-red-100', text: 'text-red-700' };

                            return (
                                <div
                                    key={change.changeId}
                                    onClick={() => navigateTo(change.changeId)}
                                    className={`cursor-pointer transition-colors ${isActive
                                        ? 'bg-blue-50 border-l-2 border-l-blue-500'
                                        : 'hover:bg-slate-50 border-l-2 border-l-transparent'
                                        }`}
                                >
                                    {/* Card Header */}
                                    <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
                                        <div className="flex items-center gap-2">
                                            {/* Avatar */}
                                            <div
                                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${isInsertion
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-red-100 text-red-700'
                                                    }`}
                                            >
                                                {change.userName?.charAt(0)?.toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <span className="text-xs font-semibold text-slate-800">
                                                    {change.userName || 'Unknown'}
                                                </span>
                                                <p className="text-[10px] text-slate-400">{relativeTime(change.timestamp)}</p>
                                            </div>
                                        </div>
                                        <span
                                            className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${typeBadge.bg} ${typeBadge.text}`}
                                        >
                                            {typeBadge.label}
                                        </span>
                                    </div>

                                    {/* Text Snippet */}
                                    <div className="px-3 pb-1.5">
                                        <div
                                            className={`text-xs px-2 py-1 rounded ${isInsertion
                                                ? 'bg-emerald-50/70 text-emerald-800'
                                                : 'bg-red-50/70 text-red-800 line-through'
                                                }`}
                                        >
                                            {isInsertion ? '+ ' : '− '}
                                            {change.text.length > 120
                                                ? change.text.substring(0, 120) + '…'
                                                : change.text}
                                        </div>
                                    </div>

                                    {/* Accept / Reject Buttons */}
                                    {canReview && change.userId !== (currentUser?.userId || currentUser?.email || currentUser?.name || 'anonymous') && (
                                        <div className="flex border-t border-slate-100 divide-x divide-slate-100">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAccept(change.changeId);
                                                }}
                                                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 transition uppercase"
                                            >
                                                <Check size={12} /> Accept
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleReject(change.changeId);
                                                }}
                                                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold text-red-600 hover:bg-red-50 transition uppercase"
                                            >
                                                <X size={12} /> Reject
                                            </button>
                                        </div>
                                    )}
                                    {canReview && change.userId === (currentUser?.userId || currentUser?.email || currentUser?.name || 'anonymous') && (
                                        <div className="px-3 py-2 text-center text-[10px] italic text-slate-400 border-t border-slate-100 bg-slate-50/50">
                                            Waiting for others to review
                                        </div>
                                    )}

                                    {/* Change counter */}
                                    <div className="px-3 pb-2 flex justify-end">
                                        <span className="text-[9px] text-slate-400">
                                            Changes {index + 1} of {filteredChanges.length}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
