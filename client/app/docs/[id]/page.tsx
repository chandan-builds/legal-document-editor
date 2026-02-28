'use client';

import { use, useEffect, useState } from 'react';
import CollaborativeEditor from '@/editor/CollaborativeEditor';
import { useAppStore } from '@/hooks/useAppStore';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';
import { useRouter } from 'next/navigation';

export default function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, isLoading: authLoading } = useAuth();
  const setCurrentUser = useAppStore((state) => state.setCurrentUser);
  const router = useRouter();
  const [collaboratorRole, setCollaboratorRole] = useState<string | null>(null);
  const [accessMode, setAccessMode] = useState<string>('VIEW');
  const [isFinalized, setIsFinalized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
        // Find this user's collaborator entry
        const collab = data.collaborators?.find((c: any) => c.userId === user.id);
        const role = collab?.role || (data.ownerId === user.id ? 'OWNER' : null);

        if (!role) {
          alert('You do not have access to this document.');
          router.push('/dashboard');
          return;
        }

        setCollaboratorRole(role);
        setAccessMode(collab?.accessMode || (role === 'OWNER' ? 'EDIT' : 'VIEW'));

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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500 animate-pulse">Loading document...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col overflow-hidden">
      <header className="bg-white border-b sticky top-0 z-20 shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <span className="text-blue-600">LegalDocs</span>
              <span className="text-gray-400">/</span>
              <span>Draft_{id.substring(0, 8)}</span>
            </h1>
            <div className="flex items-center gap-3">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Privileged & Confidential</p>
              {collaboratorRole && (
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider
                  ${collaboratorRole === 'OWNER' ? 'bg-purple-100 text-purple-700' :
                    collaboratorRole === 'EDITOR' ? 'bg-blue-100 text-blue-700' :
                      collaboratorRole === 'REVIEWER' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'}`}>
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
              <span className="px-3 py-1 text-xs font-bold text-green-700 bg-green-100 rounded border border-green-200 uppercase tracking-widest shadow-inner">
                ✓ Finalized
              </span>
            )}
            <div className="w-px h-6 bg-gray-200 mx-2"></div>
            <span className="text-xs text-gray-500 font-medium">{user?.displayName}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <CollaborativeEditor documentId={id} isFinalized={isFinalized} accessMode={accessMode} />
      </main>
    </div>
  );
}
