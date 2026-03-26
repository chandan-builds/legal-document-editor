'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/services/api';

interface Version {
    id: string;
    documentId: string;
    versionNumber: number;
    label: string;
    createdById: string;
    createdAt: string;
    fileHash?: string;
    filePath?: string;
    createdBy?: { displayName: string };
}

interface VersionHistoryPanelProps {
    documentId: string;
    currentUserId?: string;
    isOwner?: boolean;
}

export default function VersionHistoryPanel({ documentId, currentUserId, isOwner }: VersionHistoryPanelProps) {
    const [versions, setVersions] = useState<Version[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [restoringId, setRestoringId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const fetchVersions = useCallback(async () => {
        try {
            setError(null);
            const { data } = await api.get(`/documents/${documentId}/versions`);
            setVersions(data);
        } catch (err) {
            console.error('Failed to fetch versions:', err);
            setError('Failed to load version history.');
        } finally {
            setIsLoading(false);
        }
    }, [documentId]);

    useEffect(() => {
        fetchVersions();
    }, [fetchVersions]);

    const handleRestore = async (versionId: string) => {
        if (!confirm('Restore this version? The current document will be saved as a new version before restoring.')) return;
        setRestoringId(versionId);
        try {
            await api.post(`/documents/${documentId}/restore/${versionId}`);
            await fetchVersions();
            // Reload the page to pick up the restored document in the editor
            window.location.reload();
        } catch (err) {
            console.error('Failed to restore version:', err);
            setError('Failed to restore version.');
        } finally {
            setRestoringId(null);
        }
    };

    const handleDelete = async (versionId: string) => {
        if (!confirm('Delete this version? This cannot be undone.')) return;
        setDeletingId(versionId);
        try {
            await api.delete(`/documents/${documentId}/versions/${versionId}`);
            setVersions(prev => prev.filter(v => v.id !== versionId));
        } catch (err) {
            console.error('Failed to delete version:', err);
            setError('Failed to delete version.');
        } finally {
            setDeletingId(null);
        }
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">Loading versions...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
                    {error}
                </div>
                <button
                    onClick={fetchVersions}
                    className="mt-2 text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                >
                    Try again
                </button>
            </div>
        );
    }

    if (versions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No versions yet</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Versions are created when you save changes.</p>
            </div>
        );
    }

    return (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {versions.map((version, idx) => (
                <div key={version.id} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-900 dark:text-white">
                                    v{version.versionNumber}
                                </span>
                                {idx === 0 && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 uppercase">
                                        Latest
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 truncate" title={version.label}>
                                {version.label || 'No label'}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                                {version.createdBy && (
                                    <span className="font-medium">{version.createdBy.displayName}</span>
                                )}
                                <span>•</span>
                                <span>{formatDate(version.createdAt)}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                            {idx > 0 && (
                                <button
                                    onClick={() => handleRestore(version.id)}
                                    disabled={!!restoringId}
                                    className="p-1 rounded text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
                                    title="Restore this version"
                                >
                                    {restoringId === version.id ? (
                                        <div className="w-3.5 h-3.5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                    )}
                                </button>
                            )}
                            {isOwner && versions.length > 1 && (
                                <button
                                    onClick={() => handleDelete(version.id)}
                                    disabled={!!deletingId}
                                    className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
                                    title="Delete this version"
                                >
                                    {deletingId === version.id ? (
                                        <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
