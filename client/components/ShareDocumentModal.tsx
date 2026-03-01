'use client';

import { useState, useEffect } from 'react';
import { documentApi } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

interface User {
    id: string;
    email: string;
    displayName: string;
    role: string;
}

interface ShareDocumentModalProps {
    documentId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ShareDocumentModal({ documentId, isOpen, onClose, onSuccess }: ShareDocumentModalProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const [collaborators, setCollaborators] = useState<any[]>([]);
    const [isOwner, setIsOwner] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setQuery('');
            setResults([]);
            setSelectedUser(null);
            setError('');
            return;
        }

        const fetchDocument = async () => {
            try {
                const { data } = await documentApi.getOne(documentId);
                setCollaborators(data.collaborators || []);
                setIsOwner(data.ownerId === user?.id);
            } catch (err) {
                console.error('Failed to fetch document', err);
            }
        };

        fetchDocument();
    }, [isOpen, documentId, user?.id]);

    useEffect(() => {
        if (!query || query.length < 2) {
            setResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            setIsLoading(true);
            setError('');
            try {
                const { data } = await documentApi.searchUsers(query);
                setResults(data);
            } catch (err) {
                console.error('Failed to search users:', err);
                setError('Failed to search users. Please try again.');
            } finally {
                setIsLoading(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [query]);

    const handleShare = async () => {
        if (!selectedUser) return;

        setIsSubmitting(true);
        setError('');
        try {
            await documentApi.addCollaborator(documentId, selectedUser.id, 'EDITOR', 'SUGGEST');

            const { data } = await documentApi.getOne(documentId);
            setCollaborators(data.collaborators || []);

            setSelectedUser(null);
            onSuccess();
        } catch (err: any) {
            console.error('Failed to add collaborator:', err);
            setError(err.response?.data?.message || 'Failed to share document.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemove = async (userId: string) => {
        if (!confirm('Are you sure you want to remove this collaborator?')) return;
        try {
            await documentApi.removeCollaborator(documentId, userId);
            setCollaborators(prev => prev.filter(c => c.userId !== userId));
            onSuccess();
        } catch (err: any) {
            console.error('Failed to remove collaborator:', err);
            setError(err.response?.data?.message || 'Failed to remove collaborator.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-in fade-in zoom-in duration-200 dark:bg-slate-900">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center dark:border-slate-800">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Share Document</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition dark:text-slate-500 dark:hover:text-slate-300">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6">
                    {error && (
                        <div className="mb-4 bg-red-50 text-red-600 px-3 py-2 rounded-lg text-sm dark:bg-red-900/20 dark:text-red-400">
                            {error}
                        </div>
                    )}

                    {collaborators.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-sm font-medium text-slate-700 mb-2 dark:text-slate-300">Current Collaborators</h3>
                            <ul className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                {collaborators.map((c: any) => (
                                    <li key={c.userId} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                                        <div>
                                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{c.user?.displayName} {c.role === 'OWNER' && '(Owner)'}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{c.user?.email}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[10px] font-bold tracking-wider bg-slate-200 text-slate-700 px-2 py-1 rounded-full uppercase dark:bg-slate-700 dark:text-slate-300">{c.role}</span>
                                            {isOwner && c.role !== 'OWNER' && (
                                                <button
                                                    onClick={() => handleRemove(c.userId)}
                                                    className="text-xs text-red-600 hover:text-red-800 font-medium dark:text-red-400 dark:hover:text-red-300"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {!selectedUser ? (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300">Search User</label>
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Name or email..."
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder-slate-400"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                            />

                            <div className="mt-4 max-h-48 overflow-y-auto">
                                {isLoading && <div className="text-sm text-center py-4 text-slate-500 dark:text-slate-400">Searching...</div>}

                                {!isLoading && query.length >= 2 && results.length === 0 && (
                                    <div className="text-sm text-center py-4 text-slate-500 dark:text-slate-400">No users found.</div>
                                )}

                                {!isLoading && results.length > 0 && (
                                    <ul className="space-y-2">
                                        {results.map(user => (
                                            <li
                                                key={user.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedUser(user);
                                                }}
                                                className="p-3 rounded-lg border border-slate-100 hover:border-indigo-200 cursor-pointer transition flex justify-between items-center dark:border-slate-700 dark:hover:border-indigo-700"
                                            >
                                                <div>
                                                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.displayName}</p>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                                                </div>
                                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full dark:bg-slate-700 dark:text-slate-300">{user.role}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4 dark:bg-slate-800 dark:border-slate-700">
                                <div>
                                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{selectedUser.displayName}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{selectedUser.email}</p>
                                </div>
                                <button
                                    onClick={() => setSelectedUser(null)}
                                    className="text-xs text-indigo-600 font-medium hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                                >
                                    Change
                                </button>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 mb-1 dark:text-slate-300">Permissions</label>
                                <p className="text-sm text-slate-500 bg-white border border-slate-200 p-3 rounded-lg shadow-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">
                                    This user will be invited as a Collaborator. They can view the document and suggest edits (track changes), which require mutual agreement before becoming final.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 dark:bg-slate-800 dark:border-slate-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleShare}
                        disabled={!selectedUser || isSubmitting}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-sm font-medium rounded-lg transition flex items-center gap-2"
                    >
                        {isSubmitting ? 'Sharing...' : 'Share'}
                    </button>
                </div>
            </div>
        </div>
    );
}
