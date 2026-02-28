'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import Link from 'next/link';
import ShareDocumentModal from '@/components/ShareDocumentModal';

interface Document {
    id: string;
    title: string;
    status: string;
    updatedAt: string;
    _count: { clauses: number; sections: number };
    owner: { displayName: string };
    collaborators: { user: { displayName: string; role: string } }[];
}

export default function DashboardPage() {
    const { user, logout } = useAuth();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [shareModalDocId, setShareModalDocId] = useState<string | null>(null);

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

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTitle.trim() && !selectedFile) return;

        setIsCreating(true);
        try {
            if (selectedFile) {
                const formData = new FormData();
                // Ensure the filename is explicitly passed. Some OS/Browser combos omit this, causing Multer's file.originalname to be undefined.
                formData.append('file', selectedFile, selectedFile.name);
                // Send the title only if the user explicitly typed one. NestJS validation handles optional fields strictly.
                if (newTitle.trim()) {
                    formData.append('title', newTitle.trim());
                }
                // Omit 'Content-Type' headers since Axios automatically sets it with the proper `boundary=`
                await api.post('/documents', formData);
            } else {
                await api.post('/documents', { title: newTitle });
            }
            setNewTitle('');
            setSelectedFile(null);
            await fetchDocuments();
        } catch (error: any) {
            console.error('Failed to create document:', error);
            if (error.response?.data) {
                console.error('Backend validation error specifics:', error.response.data);
                alert(`Upload failed: ${JSON.stringify(error.response.data.message || error.response.data)}`);
            }
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            {/* Navbar */}
            <nav className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md">
                        LE
                    </div>
                    <span className="font-semibold text-lg">Legal Editor</span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-medium">{user?.displayName}</span>
                        <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full">
                            {user?.role}
                        </span>
                    </div>
                    <button
                        onClick={logout}
                        className="text-sm text-slate-500 hover:text-slate-700 transition font-medium"
                    >
                        Sign Out
                    </button>
                </div>
            </nav>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-6 py-10">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Documents</h1>
                        <p className="text-slate-500 mt-1">Manage and collaborate on your legal contracts.</p>
                    </div>

                    <form onSubmit={handleCreate} className="flex gap-2 items-center">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder={selectedFile ? selectedFile.name : "New Document Title..."}
                                value={newTitle}
                                onChange={(e) => setNewTitle(e.target.value)}
                                className="pl-4 pr-10 py-2 border border-slate-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition w-64"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-2">
                                <label className="cursor-pointer text-slate-400 hover:text-indigo-600 transition" title="Upload Word Document (.docx)">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                    </svg>
                                    <input
                                        type="file"
                                        accept=".docx"
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files.length > 0) {
                                                setSelectedFile(e.target.files[0]);
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                        </div>
                        {selectedFile && (
                            <button
                                type="button"
                                onClick={() => setSelectedFile(null)}
                                className="text-slate-400 hover:text-red-500 transition"
                                title="Remove file"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                        <button
                            type="submit"
                            disabled={isCreating || (!newTitle.trim() && !selectedFile)}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm transition flex items-center gap-2"
                        >
                            {isCreating ? 'Creating...' : 'Create New'}
                        </button>
                    </form>
                </div>

                {/* Document Grid */}
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : documents.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
                        <div className="text-4xl mb-4">📄</div>
                        <h3 className="text-lg font-medium text-slate-900">No documents yet</h3>
                        <p className="text-slate-500 mt-1">Create your first document to get started.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {documents.map((doc) => (
                            <Link href={`/docs/${doc.id}`} key={doc.id} className="group">
                                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer h-full flex flex-col">

                                    <div className="flex justify-between items-start mb-4">
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider
                      ${doc.status === 'draft' ? 'bg-slate-100 text-slate-600' :
                                                doc.status === 'in_review' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-emerald-100 text-emerald-700'}`
                                        }>
                                            {doc.status.replace('_', ' ')}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {doc.owner.displayName === user?.displayName && (
                                                <button
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setShareModalDocId(doc.id);
                                                    }}
                                                    className="p-1 rounded-md text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                                                    title="Share Document"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                                    </svg>
                                                </button>
                                            )}
                                            <span className="text-xs text-slate-400 font-medium">
                                                {new Date(doc.updatedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-semibold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2">
                                        {doc.title}
                                    </h3>

                                    <div className="mt-auto pt-6 flex items-center justify-between text-sm text-slate-500">
                                        <div className="flex items-center gap-1.5">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                            </svg>
                                            {doc._count.clauses} Clauses
                                        </div>
                                        <div className="flex -space-x-2">
                                            {doc.collaborators.slice(0, 3).map((c, i) => (
                                                <div key={i} className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600" title={`${c.user.displayName} (${c.user.role})`}>
                                                    {c.user.displayName.charAt(0)}
                                                </div>
                                            ))}
                                            {doc.collaborators.length > 3 && (
                                                <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                    +{doc.collaborators.length - 3}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
                {shareModalDocId && (
                    <ShareDocumentModal
                        documentId={shareModalDocId}
                        isOpen={!!shareModalDocId}
                        onClose={() => setShareModalDocId(null)}
                        onSuccess={() => {
                            fetchDocuments();
                            // Optional: Add toast for success
                        }}
                    />
                )}
            </main>
        </div>
    );
}
