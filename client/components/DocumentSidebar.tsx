'use client';

import { useState, useEffect } from 'react';
import api from '@/services/api';
import VersionHistoryPanel from './VersionHistoryPanel';

type Tab = 'info' | 'collaborators' | 'versions';

interface DocumentData {
    id: string;
    title: string;
    status: string;
    fileName?: string;
    filePath?: string;
    currentVersion: number;
    createdAt: string;
    updatedAt: string;
    ownerId: string;
    owner: { displayName: string };
    collaborators: { userId: string; role: string; accessMode: string; user: { displayName: string; email: string } }[];
}

interface DocumentSidebarProps {
    documentId: string;
    currentUserId?: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function DocumentSidebar({ documentId, currentUserId, isOpen, onClose }: DocumentSidebarProps) {
    const [activeTab, setActiveTab] = useState<Tab>('info');
    const [doc, setDoc] = useState<DocumentData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isOpen || !documentId) return;
        const fetchDoc = async () => {
            try {
                const { data } = await api.get(`/documents/${documentId}`);
                setDoc(data);
            } catch (err) {
                console.error('Failed to fetch document:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDoc();
    }, [documentId, isOpen]);

    if (!isOpen) return null;

    const isOwner = doc?.ownerId === currentUserId;

    const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
        {
            id: 'info', label: 'Info', icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
        {
            id: 'collaborators', label: 'Team', icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            )
        },
        {
            id: 'versions', label: 'History', icon: (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
    ];

    const statusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
            case 'in_review': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
            case 'FINALIZED': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
            default: return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
        }
    };

    const roleColor = (role: string) => {
        switch (role) {
            case 'OWNER': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
            case 'EDITOR': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
            case 'REVIEWER': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
            case 'VIEWER': return 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300';
            default: return 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300';
        }
    };

    return (
        <div className="w-80 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col h-full shrink-0 overflow-hidden">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Details</h2>
                <button
                    onClick={onClose}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-300 dark:hover:bg-slate-800 transition"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 shrink-0">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold transition-colors ${activeTab === tab.id
                                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto min-h-0">
                {isLoading ? (
                    <div className="flex items-center justify-center p-8">
                        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Info Tab */}
                        {activeTab === 'info' && doc && (
                            <div className="p-4 space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Title</label>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{doc.title}</p>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Status</label>
                                    <div className="mt-1">
                                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ${statusColor(doc.status)}`}>
                                            {doc.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Owner</label>
                                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-0.5">{doc.owner.displayName}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Created</label>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                            {new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Updated</label>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                            {new Date(doc.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Version</label>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">v{doc.currentVersion}</p>
                                </div>
                                {doc.fileName && (
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">File</label>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 truncate" title={doc.fileName}>
                                            {doc.fileName}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Collaborators Tab */}
                        {activeTab === 'collaborators' && doc && (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {/* Owner */}
                                <div className="px-4 py-3 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-xs font-bold text-purple-700 dark:text-purple-300 shrink-0">
                                        {doc.owner.displayName.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{doc.owner.displayName}</p>
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${roleColor('OWNER')}`}>
                                        Owner
                                    </span>
                                </div>

                                {/* Collaborators */}
                                {doc.collaborators
                                    .filter(c => c.userId !== doc.ownerId)
                                    .map((collab) => (
                                        <div key={collab.userId} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                                                {collab.user.displayName.charAt(0)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{collab.user.displayName}</p>
                                                <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{collab.user.email}</p>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${roleColor(collab.role)}`}>
                                                {collab.role}
                                            </span>
                                        </div>
                                    ))}

                                {doc.collaborators.filter(c => c.userId !== doc.ownerId).length === 0 && (
                                    <div className="p-6 text-center">
                                        <p className="text-sm text-slate-500 dark:text-slate-400">No collaborators yet.</p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Share the document to add team members.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Versions Tab */}
                        {activeTab === 'versions' && (
                            <VersionHistoryPanel
                                documentId={documentId}
                                currentUserId={currentUserId}
                                isOwner={isOwner}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
