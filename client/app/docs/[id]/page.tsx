'use client';

import { use, useEffect, useState } from 'react';
import OnlyOfficeEditor from '@/components/editor/OnlyOfficeEditor';
import DocumentSidebar from '@/components/DocumentSidebar';
import { useAppStore } from '@/hooks/useAppStore';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';

export default function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, isLoading: authLoading } = useAuth();
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);
  const router = useRouter();
  const [collaboratorRole, setCollaboratorRole] = useState<string | null>(null);
  const [accessMode, setAccessMode] = useState<string>('VIEW');
  const [isFinalized, setIsFinalized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [documentTitle, setDocumentTitle] = useState<string>('');

  // Derive a stable color from the user's ID
  const userColors = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2', '#4f46e5'];
  const getColorFromId = (uid: string) => {
    let hash = 0;
    for (let i = 0; i < uid.length; i++) hash = uid.charCodeAt(i) + ((hash << 5) - hash);
    return userColors[Math.abs(hash) % userColors.length];
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth');
      return;
    }

    // Fetch the document to get the user's collaborator role
    const fetchDocumentAccess = async () => {
      try {
        const { data } = await api.get(`/documents/${id}`);
        setIsFinalized(data.status === 'FINALIZED');
        setDocumentTitle(data.title || `Draft_${id.substring(0, 8)}`);
        // Find this user's collaborator entry
        const collab = data.collaborators?.find((c: any) => c.userId === user.id);
        const role = collab?.role || (data.ownerId === user.id ? 'OWNER' : null);

        if (!role) {
          alert('You do not have access to this document.');
          router.push('/dashboard');
          return;
        }

        setCollaboratorRole(role);

        const computeAccess = () => {
          return 'VIEW';
        };

        setAccessMode(computeAccess());

        setCurrentUser({
          userId: user.id,
          email: user.email,
          name: user.displayName,
          color: getColorFromId(user.id),
          role: user.role, // UserRole from backend (CLIENT, VENDOR, ADMIN)
          collaboratorRole: role, // CollaboratorRole (OWNER, EDITOR, REVIEWER, VIEWER)
        });
      } catch (err: any) {
        if (err.response?.status === 403 || err.response?.status === 404) {
          alert('You do not have access to this document.');
          router.push('/dashboard');
        } else {
          console.error('Failed to fetch document:', err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDocumentAccess();
  }, [user, authLoading, id, router, setCurrentUser]);

  const handleFinalize = async () => {
    try {
      const { data: readiness } = await api.get(`/documents/${id}/finalization/readiness`);
      if (!readiness.isReady) {
        alert('Document cannot be finalized yet. Please ensure all suggestions and comments are resolved, and all clauses are Mutually Approved or Omitted.');
        return;
      }
      if (confirm('Are you certain you want to finalize this document? This will lock all edits, suggestions, and comments. This action cannot be undone.')) {
        await api.post(`/documents/${id}/finalization/finalize`);
        setIsFinalized(true);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to finalize document.');
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center dark:bg-slate-950">
        <div className="text-gray-500 animate-pulse dark:text-slate-400">Loading document...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden dark:bg-slate-950">
      <header className="bg-white border-b sticky top-0 z-20 shadow-sm shrink-0 dark:bg-slate-900 dark:border-slate-800">
        <div className="max-w-full mx-auto px-4 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2 dark:text-white">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                title="Back to Dashboard"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-indigo-600 dark:text-indigo-400">LegalDocs</span>
              <span className="text-gray-400 dark:text-slate-600">/</span>
              <span className="truncate max-w-[300px]" title={documentTitle}>{documentTitle}</span>
            </h1>
            <div className="flex items-center gap-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold dark:text-slate-400">Privileged &amp; Confidential</p>
              {collaboratorRole && (
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider
                  ${collaboratorRole === 'OWNER' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                    collaboratorRole === 'EDITOR' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                      collaboratorRole === 'REVIEWER' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                        'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                  {collaboratorRole}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isFinalized && (collaboratorRole === 'OWNER' || user?.role === 'CLIENT') && (
              <button
                onClick={handleFinalize}
                className="px-4 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded transition-colors shadow-sm uppercase tracking-wide"
              >
                Finalize Document
              </button>
            )}
            {isFinalized && (
              <span className="px-3 py-1 text-xs font-bold text-green-700 bg-green-100 rounded border border-green-200 uppercase tracking-widest shadow-inner dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">
                ✓ Finalized
              </span>
            )}
            <div className="w-px h-6 bg-gray-200 mx-1 dark:bg-slate-700"></div>

            {/* Sidebar Toggle */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-1.5 rounded-md transition-colors ${isSidebarOpen
                ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:text-indigo-400 dark:hover:bg-slate-800'
                }`}
              title="Toggle Document Details"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </button>

            <ThemeToggle />
            <span className="text-xs text-gray-500 font-medium dark:text-slate-400">{user?.displayName}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden relative flex min-h-0">
        {/* Editor */}
        <main className="flex-1 overflow-hidden relative flex flex-col min-h-0">
          <OnlyOfficeEditor documentId={id} isFinalized={isFinalized} accessMode={accessMode} />
        </main>

        {/* Sidebar */}
        <DocumentSidebar
          documentId={id}
          currentUserId={user?.id}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>
    </div>
  );
}
