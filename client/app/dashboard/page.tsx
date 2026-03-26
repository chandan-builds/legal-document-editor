'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { useRouter } from 'next/navigation';
import ShareDocumentModal from '@/components/ShareDocumentModal';
import DeleteDocumentModal from '@/components/DeleteDocumentModal';
import UploadDocumentWizard from '@/components/UploadDocumentWizard';
import ThemeToggle from '@/components/ThemeToggle';

interface Document {
    id: string;
    title: string;
    status: string;
    updatedAt: string;
    createdAt: string;
    fileName?: string;
    filePath?: string;
    currentVersion: number;
    _count: { clauses: number; sections: number };
    owner: { displayName: string };
    collaborators: { user: { displayName: string; role: string } }[];
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function DashboardPage() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [shareModalDocId, setShareModalDocId] = useState<string | null>(null);
    const [showUploadWizard, setShowUploadWizard] = useState(false);

    // Delete modal state
    const [deleteModalDoc, setDeleteModalDoc] = useState<Document | null>(null);

    // Pagination state
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const totalItems = documents.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const startIndex = (page - 1) * pageSize;
    const paginatedDocs = useMemo(
        () => documents.slice(startIndex, startIndex + pageSize),
        [documents, startIndex, pageSize]
    );

    useEffect(() => {
        if (page > totalPages && totalPages > 0) setPage(totalPages);
    }, [page, totalPages]);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            const { data } = await api.get('/documents');
            setDocuments(data);
        } catch (error) {
            console.error('Failed to fetch documents:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteModalDoc) return;
        try {
            await api.delete(`/documents/${deleteModalDoc.id}`);
            setDeleteModalDoc(null);
            await fetchDocuments();
        } catch (error) {
            console.error('Failed to delete document:', error);
            throw error; // Let the modal handle the error state
        }
    };

    const handleEdit = (docId: string) => {
        router.push(`/docs/${docId}/edit`);
    };

    const handleView = (docId: string) => {
        router.push(`/docs/${docId}`);
    };

    const statusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
            case 'in_review': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
            case 'FINALIZED': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
            default: return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            {/* Navbar */}
            <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm dark:bg-slate-900 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
                        LE
                    </div>
                    <span className="font-semibold text-lg dark:text-white">Legal Editor</span>
                </div>
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-medium dark:text-slate-200">{user?.displayName}</span>
                        <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full dark:bg-indigo-900/50 dark:text-indigo-300">
                            {user?.role}
                        </span>
                    </div>
                    <button
                        onClick={logout}
                        className="text-sm text-slate-500 hover:text-slate-700 transition font-medium dark:text-slate-400 dark:hover:text-slate-200"
                    >
                        Sign Out
                    </button>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-10">
                {/* Page Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Documents</h1>
                        <p className="text-slate-500 mt-1 dark:text-slate-400">Manage and collaborate on your legal contracts.</p>
                    </div>
                    <button
                        onClick={() => setShowUploadWizard(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-sm transition flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Document
                    </button>
                </div>

                {/* Documents Table Card */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Document Name</th>
                                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Owner</th>
                                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Last Updated</th>
                                    <th className="text-center px-5 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Version</th>
                                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Collaborators</th>
                                    <th className="text-center px-5 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-16">
                                            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-3">Loading documents...</p>
                                        </td>
                                    </tr>
                                ) : documents.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-16">
                                            <div className="text-4xl mb-3">📄</div>
                                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">No documents yet</h3>
                                            <p className="text-slate-500 mt-1 dark:text-slate-400">Create your first document to get started.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedDocs.map((doc) => (
                                        <tr
                                            key={doc.id}
                                            className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
                                            onClick={() => handleView(doc.id)}
                                        >
                                            {/* Document Name */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                                                        <svg className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-sm text-slate-900 dark:text-white truncate max-w-[250px]" title={doc.title}>
                                                            {doc.title}
                                                        </p>
                                                        {doc.fileName && (
                                                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{doc.fileName}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-5 py-4">
                                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${statusColor(doc.status)}`}>
                                                    {doc.status.replace('_', ' ')}
                                                </span>
                                            </td>

                                            {/* Owner */}
                                            <td className="px-5 py-4">
                                                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                                                    {doc.owner.displayName}
                                                </span>
                                            </td>

                                            {/* Last Updated */}
                                            <td className="px-5 py-4">
                                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                                    {new Date(doc.updatedAt).toLocaleDateString('en-US', {
                                                        month: 'short', day: 'numeric', year: 'numeric'
                                                    })}
                                                </span>
                                            </td>

                                            {/* Version */}
                                            <td className="px-5 py-4 text-center">
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                    v{doc.currentVersion}
                                                </span>
                                            </td>

                                            {/* Collaborators */}
                                            <td className="px-5 py-4">
                                                <div className="flex -space-x-2">
                                                    {doc.collaborators.slice(0, 3).map((c, i) => (
                                                        <div key={i} className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300" title={`${c.user.displayName} (${c.user.role})`}>
                                                            {c.user.displayName.charAt(0)}
                                                        </div>
                                                    ))}
                                                    {doc.collaborators.length > 3 && (
                                                        <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                                                            +{doc.collaborators.length - 3}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                                                    {/* View */}
                                                    <button
                                                        onClick={() => handleView(doc.id)}
                                                        className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors dark:hover:text-indigo-400 dark:hover:bg-slate-800"
                                                        title="View Document"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </button>

                                                    {/* Edit */}
                                                    {doc.filePath && (
                                                        <button
                                                            onClick={() => handleEdit(doc.id)}
                                                            className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors dark:hover:text-indigo-400 dark:hover:bg-slate-800"
                                                            title="Edit Document"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                    )}

                                                    {/* Share */}
                                                    {doc.owner.displayName === user?.displayName && (
                                                        <button
                                                            onClick={() => setShareModalDocId(doc.id)}
                                                            className="p-1.5 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors dark:hover:text-indigo-400 dark:hover:bg-slate-800"
                                                            title="Share Document"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                                            </svg>
                                                        </button>
                                                    )}

                                                    {/* Delete */}
                                                    {doc.owner.displayName === user?.displayName && (
                                                        <button
                                                            onClick={() => setDeleteModalDoc(doc)}
                                                            className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors dark:hover:text-red-400 dark:hover:bg-slate-800"
                                                            title="Delete Document"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    {!isLoading && documents.length > 0 && (
                        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-slate-500 dark:text-slate-400">
                                    Showing {startIndex + 1}–{Math.min(startIndex + pageSize, totalItems)} of {totalItems}
                                </span>
                                <label className="flex items-center gap-2 text-sm">
                                    <span className="text-slate-500 dark:text-slate-400">Rows</span>
                                    <select
                                        value={pageSize}
                                        onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                                        className="px-2 py-1 rounded-md border border-slate-300 dark:border-slate-600 text-sm bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                                    >
                                        {PAGE_SIZE_OPTIONS.map(n => (
                                            <option key={n} value={n}>{n}</option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    className="p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition disabled:opacity-40"
                                    aria-label="Previous page"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <span className="text-sm text-slate-500 dark:text-slate-400 min-w-[80px] text-center">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    className="p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition disabled:opacity-40"
                                    aria-label="Next page"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Modals */}
            <DeleteDocumentModal
                isOpen={!!deleteModalDoc}
                documentTitle={deleteModalDoc?.title || ''}
                onClose={() => setDeleteModalDoc(null)}
                onConfirm={handleDelete}
            />

            <UploadDocumentWizard
                isOpen={showUploadWizard}
                onClose={() => setShowUploadWizard(false)}
                onSuccess={fetchDocuments}
            />

            {shareModalDocId && (
                <ShareDocumentModal
                    documentId={shareModalDocId}
                    isOpen={!!shareModalDocId}
                    onClose={() => setShareModalDocId(null)}
                    onSuccess={fetchDocuments}
                />
            )}
        </div>
    );
}
