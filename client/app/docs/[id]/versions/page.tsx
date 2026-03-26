'use client';

import { use, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import ThemeToggle from '@/components/ThemeToggle';

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

export default function VersionHistoryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { user, isLoading: authLoading } = useAuth();
    const [versions, setVersions] = useState<Version[]>([]);
    const [docTitle, setDocTitle] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [restoringId, setRestoringId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [isOwner, setIsOwner] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [{ data: versions }, { data: doc }] = await Promise.all([
                api.get(`/documents/${id}/versions`),
                api.get(`/documents/${id}`),
            ]);
            setVersions(versions);
            setDocTitle(doc.title || `Draft_${id.substring(0, 8)}`);
            setIsOwner(doc.ownerId === user?.id);
        } catch (err) {
            console.error('Failed to fetch version history:', err);
        } finally {
            setIsLoading(false);
        }
    }, [id, user?.id]);

    useEffect(() => {
        if (authLoading || !user) return;
        fetchData();
    }, [authLoading, user, fetchData]);

    const handleRestore = async (versionId: string) => {
        if (!confirm('Restore this version? The current document will be saved as a new version before restoring.')) return;
        setRestoringId(versionId);
        try {
            await api.post(`/documents/${id}/restore/${versionId}`);
            await fetchData();
        } catch (err) {
            console.error('Failed to restore version:', err);
        } finally {
            setRestoringId(null);
        }
    };

    const handleDelete = async (versionId: string) => {
        if (!confirm('Delete this version? This cannot be undone.')) return;
        setDeletingId(versionId);
        try {
            await api.delete(`/documents/${id}/versions/${versionId}`);
            setVersions(prev => prev.filter(v => v.id !== versionId));
        } catch (err) {
            console.error('Failed to delete version:', err);
        } finally {
            setDeletingId(null);
        }
    };

    if (authLoading || isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center dark:bg-slate-950">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    Loading version history...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Navbar */}
            <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => router.push(`/docs/${id}`)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition dark:hover:text-indigo-400 dark:hover:bg-slate-800"
                        title="Back to document"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 dark:text-white">Version History</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{docTitle}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <span className="text-xs text-slate-500 font-medium dark:text-slate-400">{user?.displayName}</span>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-6 py-10">
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    {/* Table Header */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Version</th>
                                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Label</th>
                                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Created By</th>
                                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                                    <th className="text-center px-5 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {versions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-12">
                                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                            </div>
                                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">No versions yet</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Versions are created when you save changes.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    versions.map((version, idx) => (
                                        <tr key={version.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            {/* Version Number */}
                                            <td className="px-5 py-4">
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
                                            </td>

                                            {/* Label */}
                                            <td className="px-5 py-4">
                                                <span className="text-sm text-slate-600 dark:text-slate-400 truncate max-w-[200px] block" title={version.label}>
                                                    {version.label || '—'}
                                                </span>
                                            </td>

                                            {/* Created By */}
                                            <td className="px-5 py-4">
                                                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                                                    {version.createdBy?.displayName || 'Unknown'}
                                                </span>
                                            </td>

                                            {/* Date */}
                                            <td className="px-5 py-4">
                                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                                    {new Date(version.createdAt).toLocaleDateString('en-US', {
                                                        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    {idx > 0 && (
                                                        <button
                                                            onClick={() => handleRestore(version.id)}
                                                            disabled={!!restoringId}
                                                            className="px-3 py-1.5 text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40 disabled:opacity-40 flex items-center gap-1"
                                                        >
                                                            {restoringId === version.id ? (
                                                                <>
                                                                    <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                                                                    Restoring...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                    </svg>
                                                                    Restore
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                    {isOwner && versions.length > 1 && (
                                                        <button
                                                            onClick={() => handleDelete(version.id)}
                                                            disabled={!!deletingId}
                                                            className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 disabled:opacity-40 flex items-center gap-1"
                                                        >
                                                            {deletingId === version.id ? (
                                                                <>
                                                                    <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                                                                    Deleting...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                    Delete
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                    {idx === 0 && !isOwner && (
                                                        <span className="text-xs text-slate-400 dark:text-slate-500 italic">Current</span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
