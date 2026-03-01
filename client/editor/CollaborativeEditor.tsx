'use client';

import debounce from 'lodash/debounce';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import { CustomCollaborationCursor } from './extensions/CustomCollaborationCursor';
import { Insertion, Deletion } from './extensions/TrackChangeMarks';
import { TrackChanges } from './extensions/TrackChanges';
import { CommentMark } from './extensions/CommentMark';
import { ClauseNode } from './extensions/ClauseNode';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import EditorToolbar from './EditorToolbar';
import CommentSidebar from '@/components/Comments/CommentSidebar';
import { cn } from '@/utils/cn';
import { useAppStore } from '@/hooks/useAppStore';
import { Comment } from '@/types/comment';
import { AuditLogEntry, VersionMetadata } from '@/types/audit';
import { exportToDocx } from '@/utils/export/docx';
import { exportToPdf } from '@/utils/export/pdf';
import { generateAuditReport } from '@/utils/export/auditReport';
import AuditTrailSidebar from '@/components/AuditTrail/AuditTrailSidebar';
import VersionSidebar from '@/components/Versioning/VersionSidebar';
import CompareOverlay from '@/components/Versioning/CompareOverlay';
import ReviewPane from '@/components/ReviewPane/ReviewPane';
import api, { commentApi, auditApi, versionApi, approvalApi, clauseApi, suggestionApi } from '@/services/api';
import {
  MessageSquare as MessageIcon,
  ListChecks,
  History as HistoryIcon,
  XCircle,
  Check,
} from 'lucide-react';

export default function CollaborativeEditor({ documentId = 'default', isFinalized = false, accessMode = 'EDIT' }: { documentId?: string, isFinalized?: boolean, accessMode?: string }) {
  const { currentUser } = useAppStore();

  useEffect(() => {
    // Phase 0: No mock user fallback — require real authentication.
    // If no user is set, user should be redirected to login.
    if (!currentUser) {
      console.warn('[AUTH] No authenticated user found. Redirect to login required.');
    }
  }, [currentUser]);

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-gray-500 animate-pulse dark:text-slate-400">Initializing user...</div>
      </div>
    );
  }

  return (
    <div className={cn("border rounded-lg bg-white shadow-sm flex flex-col h-[calc(100vh-64px)] overflow-hidden dark:bg-slate-900 dark:border-slate-700")}>
      <TiptapEditorWrapper key={documentId} documentId={documentId} isFinalized={isFinalized} accessMode={accessMode} />
    </div>
  );
}

function TiptapEditorWrapper({ documentId, isFinalized, accessMode = 'EDIT' }: { documentId: string, isFinalized: boolean, accessMode?: string }) {
  const { currentUser } = useAppStore();
  const [status, setStatus] = useState('connecting');
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const [ready, setReady] = useState(false);

  // ── Yjs: ONLY for live text syncing ──────────────────────────────────
  useEffect(() => {
    console.debug(`[DEBUG] Initializing Yjs for document: ${documentId}`);
    const doc = new Y.Doc();
    // Pass JWT token to WebSocket for authentication
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

    const wsProvider = new WebsocketProvider(
      wsUrl,
      documentId,
      doc,
      { params: { token: token || '' } }
    );

    const onStatus = (event: { status: string }) => {
      setStatus(event.status);
    };

    wsProvider.on('status', onStatus);

    // Assign to refs and trigger ready state
    ydocRef.current = doc;
    providerRef.current = wsProvider;
    setReady(true);

    return () => {
      console.debug(`[DEBUG] Destroying Yjs for document: ${documentId}`);
      ydocRef.current = null;
      providerRef.current = null;
      setReady(false);

      wsProvider.off('status', onStatus);
      try {
        wsProvider.destroy();
        doc.destroy();
      } catch (e) {
        console.warn('Error during Yjs cleanup:', e);
      }
    };
  }, [documentId]);

  if (!ready || !ydocRef.current || !providerRef.current) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-gray-400 animate-pulse h-full dark:text-slate-500">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p>Connecting to collaboration server...</p>
        </div>
      </div>
    );
  }

  return (
    <TiptapEditorInner
      documentId={documentId}
      ydoc={ydocRef.current}
      provider={providerRef.current}
      status={status}
      isFinalized={isFinalized}
      accessMode={accessMode}
    />
  );
}

// ── Local Component to Handle Instant BubbleMenu Updates ─────────────────────
const SuggestionBubbleContent = ({ editor, isReadOnly, currentUser }: { editor: any, isReadOnly: boolean, currentUser: any }) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const update = () => setTick(t => t + 1);
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
    };
  }, [editor]);

  let insAttrs: any = null;
  let delAttrs: any = null;

  editor.state.doc.nodesBetween(editor.state.selection.from, editor.state.selection.to, (node: any) => {
    if (!node.isText) return;
    const ins = node.marks.find((m: any) => m.type.name === 'insertion');
    if (ins && !insAttrs) insAttrs = ins.attrs;

    const del = node.marks.find((m: any) => m.type.name === 'deletion');
    if (del && !delAttrs) delAttrs = del.attrs;
  });

  const isInsertion = !!insAttrs;
  const attrs = insAttrs || delAttrs || {};
  const changeId = attrs.changeId;
  const label = isInsertion ? 'Insertion' : 'Deletion';
  const colorClass = isInsertion ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50';

  // Resolve display name — never show "Unknown User"
  const authorName = attrs.userName || currentUser?.name || 'User';
  const authorInitial = authorName.charAt(0).toUpperCase();
  const isOwnChange = attrs.userId && currentUser?.userId && attrs.userId === currentUser.userId;

  return (
    <div className="flex flex-col text-sm w-72">
      <div className={`px-3 py-2 border-b flex justify-between items-center ${colorClass}`}>
        <span className="font-bold uppercase tracking-wider text-[10px]">{label} Suggestion</span>
        <span className="text-[10px] opacity-70">
          {attrs.timestamp ? new Date(attrs.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
        </span>
      </div>
      <div className="px-3 py-2 bg-gray-50 flex items-center gap-2 border-b dark:bg-slate-800 dark:border-slate-700">
        <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold dark:bg-indigo-900/30 dark:text-indigo-300">
          {authorInitial}
        </div>
        <span className="font-medium text-gray-700 text-xs dark:text-slate-300">{authorName}</span>
      </div>
      {!isReadOnly && changeId && !isOwnChange && (
        <div className="flex divide-x divide-gray-100 dark:divide-slate-700">
          <button
            onClick={() => editor.commands.acceptChange(changeId)}
            className="flex-1 py-2 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors dark:text-emerald-400 dark:hover:bg-emerald-900/20"
          >
            Accept
          </button>
          <button
            onClick={() => editor.commands.rejectChange(changeId)}
            className="flex-1 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors dark:text-red-400 dark:hover:bg-red-900/20"
          >
            Reject
          </button>
        </div>
      )}
      {!isReadOnly && changeId && isOwnChange && (
        <div className="px-3 py-2 text-center text-xs italic text-gray-400 border-t dark:text-slate-500 dark:border-slate-700">
          You cannot review your own changes.
        </div>
      )}
    </div>
  );
};

function TiptapEditorInner({
  documentId,
  ydoc,
  provider,
  status,
  isFinalized,
  accessMode = 'EDIT',
}: {
  documentId: string;
  ydoc: Y.Doc;
  provider: WebsocketProvider;
  status: string;
  isFinalized: boolean;
  accessMode?: string;
}) {
  const { currentUser } = useAppStore();
  const trackChangesToggle = useAppStore((state) => state.trackChanges);

  const isSuggesting = accessMode === 'SUGGEST';
  const effectiveTrackChanges = isSuggesting || trackChangesToggle;

  // ── REST-backed state: Comments, Audit Logs, Versions ─────────────────
  const [comments, setComments] = useState<Record<string, Comment>>({});
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [hasMoreAuditLogs, setHasMoreAuditLogs] = useState(false);
  const [versions, setVersions] = useState<VersionMetadata[]>([]);
  const [currentVersion, setCurrentVersion] = useState<number>(1);
  const [activeSidebar, setActiveSidebar] = useState<'comments' | 'audit' | 'versions' | 'review' | null>('comments');
  const [previewVersion, setPreviewVersion] = useState<VersionMetadata | null>(null);
  const [compareData, setCompareData] = useState<{ base: any; target?: any } | null>(null);

  // ── Fetch comments from backend ─────────────────────────────────────
  const fetchComments = useCallback(async () => {
    try {
      const { data } = await commentApi.list(documentId);
      const mapped: Record<string, Comment> = {};
      (data as any[]).forEach((c: any) => {
        mapped[c.id] = {
          id: c.id,
          userId: c.author?.id || c.authorId,
          userName: c.author?.displayName || 'Unknown',
          text: c.text,
          timestamp: c.createdAt,
          replies: (c.replies || []).map((r: any) => ({
            id: r.id,
            userId: r.author?.id || r.authorId,
            userName: r.author?.displayName || 'Unknown',
            text: r.text,
            timestamp: r.createdAt,
          })),
          isResolved: c.isResolved,
          quote: c.quotedText || '',
        };
      });
      setComments(mapped);
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    }
  }, [documentId]);

  // ── Fetch audit logs from backend ──────────────────────────────────
  const fetchAuditLogs = useCallback(async (page: number = 1, append: boolean = false) => {
    try {
      const { data } = await auditApi.list(documentId, page, 50);
      const fetchedLogs = (data as any).logs || [];
      const mapped = fetchedLogs.map((l: any) => ({
        id: l.id,
        userId: l.userId,
        userName: l.user?.displayName || 'System',
        action: l.action,
        content: l.newValue ? JSON.stringify(l.newValue) : undefined,
        timestamp: l.createdAt,
        documentVersion: l.versionRef,
      }));
      setAuditLogs(prev => append ? [...prev, ...mapped] : mapped);
      setHasMoreAuditLogs(fetchedLogs.length === 50);
      setAuditPage(page);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    }
  }, [documentId]);

  const fetchVersions = useCallback(async () => {
    try {
      const { data } = await versionApi.getAll(documentId);
      setVersions((data as any[]).map((v: any) => ({
        id: v.id,
        version: v.versionNumber,
        timestamp: v.createdAt,
        author: v.author?.displayName || 'Unknown',
        description: v.description,
        snapshot: new Uint8Array(), // not loaded until needed
        hash: v.contentHash,
        changeSummary: v.changeSummary,
      })));
      if ((data as any[]).length > 0) {
        const maxVersion = Math.max(...(data as any[]).map((v: any) => v.versionNumber));
        setCurrentVersion(maxVersion + 1);
      }
    } catch (err) {
      console.error('Failed to fetch versions:', err);
    }
  }, [documentId]);

  // ── Fetch Initial Content from Metadata (for DOCX Upload) ────────────
  const [initialContent, setInitialContent] = useState<string | null>(null);
  const [hasInjectedInitialContent, setHasInjectedInitialContent] = useState(false);
  const [sections, setSections] = useState<any[]>([]);

  const fetchDocumentMetadata = useCallback(async () => {
    if (documentId === 'default') return;
    try {
      const { data } = await api.get(`/documents/${documentId}`);
      if (data.metadata?.initialContent) {
        setInitialContent(data.metadata.initialContent);
      }
      setSections(data.sections || []);
    } catch (err) {
      console.error('Failed to fetch document metadata:', err);
    }
  }, [documentId]);

  // ── Initial data load ──────────────────────────────────────────────
  useEffect(() => {
    fetchComments();
    fetchDocumentMetadata();
  }, [fetchComments, fetchDocumentMetadata]);

  // ── Lazy Load Sidebars ──────────────────────────────────────────────
  useEffect(() => {
    if (activeSidebar === 'versions') fetchVersions();
    // Use stored auditPage when re-opening audit sidebar to avoid reset if not intended
    if (activeSidebar === 'audit' && auditLogs.length === 0) fetchAuditLogs(1, false);
  }, [activeSidebar, fetchVersions, fetchAuditLogs, auditLogs.length]);

  // ── Polling for live updates (every 10s) ────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      fetchComments();
      if (activeSidebar === 'audit') fetchAuditLogs(1, false);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchComments, fetchAuditLogs, activeSidebar]);

  // ── TipTap extensions (Yjs ONLY for text sync) ─────────────────────
  const extensions = useMemo(() => {
    return [
      StarterKit.configure({ undoRedo: false }),
      Insertion,
      Deletion,
      TrackChanges,
      CommentMark,
      ClauseNode,
      Collaboration.configure({ document: ydoc }),
      CustomCollaborationCursor.configure({
        provider: provider,
        user: currentUser || { name: 'Anonymous', color: '#555' },
      }),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Do NOT re-create extensions on props change, prevents reconfiguration crash

  const isViewer = accessMode === 'VIEW' || isFinalized;
  const isReadOnly = accessMode === 'VIEW' || accessMode === 'COMMENT' || isFinalized;

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    editable: !isReadOnly,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[500px] px-8 py-8 max-w-none',
      },
    },
  }, [extensions, isReadOnly]);

  // Inject initial content if editor is completely empty
  useEffect(() => {
    if (editor && initialContent && !hasInjectedInitialContent) {
      const isDocumentEmpty = editor.isEmpty && editor.getText().trim() === '';
      if (isDocumentEmpty) {
        // Use a small timeout to let Yjs sync happen first. If it's still empty, inject.
        setTimeout(() => {
          if (editor.isEmpty && editor.getText().trim() === '') {
            editor.commands.setContent(initialContent);
          }
        }, 500);
      }
      setHasInjectedInitialContent(true);
    }
  }, [editor, initialContent, hasInjectedInitialContent]);

  // ── Comment handlers (REST-backed) ─────────────────────────────────
  const handleAddComment = useCallback(async (text: string) => {
    if (!editor || !editor.state || !currentUser) return;

    const { from, to, empty } = editor.state.selection;
    if (empty) {
      alert('Please select some text to comment on.');
      return;
    }

    const quote = editor.state.doc.textBetween(from, to);
    try {
      const { data } = await commentApi.create(documentId, {
        text,
        quotedText: quote,
        positionFrom: from,
        positionTo: to,
      });
      const commentId = data.id;
      editor.chain().focus().setMark('comment', { commentId }).run();
      fetchComments();
    } catch (err) {
      console.error('Failed to create comment:', err);
    }
  }, [editor, currentUser, documentId, fetchComments]);

  const handleResolve = useCallback(async (id: string) => {
    try {
      await commentApi.resolve(documentId, id);
      fetchComments();
    } catch (err) {
      console.error('Failed to resolve comment:', err);
    }
  }, [fetchComments]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await commentApi.delete(documentId, id);
      if (editor) {
        editor.chain().focus().unsetMark('comment', { extendEmptyMarkRange: true }).run();
      }
      fetchComments();
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  }, [editor, fetchComments]);

  const handleReply = useCallback(async (commentId: string, text: string) => {
    try {
      await commentApi.reply(documentId, commentId, { text });
      fetchComments();
    } catch (err) {
      console.error('Failed to reply to comment:', err);
    }
  }, [fetchComments]);

  // ── Version handlers (REST-backed) ─────────────────────────────────
  const handleCreateSnapshot = useCallback(async (description?: string) => {
    if (!currentUser) return;
    if (currentUser.collaboratorRole === 'VIEWER') {
      alert('Unauthorized: Only editors and owners can create document versions.');
      return;
    }

    const snapshot = Y.encodeStateAsUpdate(ydoc);
    try {
      await versionApi.create(documentId, {
        description: description || `Legal Draft V${currentVersion}`,
        snapshot: Array.from(snapshot),
        changeSummary: {},
      });
      fetchVersions();
    } catch (err) {
      console.error('Failed to create version:', err);
    }
  }, [currentUser, currentVersion, documentId, fetchVersions]);

  const handleRestore = useCallback(async (v: VersionMetadata) => {
    if (!currentUser) return;
    if (currentUser.collaboratorRole === 'VIEWER') {
      alert('Unauthorized: Only editors and owners can restore documents.');
      return;
    }

    try {
      // First save current state as a pre-restore snapshot
      await handleCreateSnapshot(`Pre-restore of v${v.version}`);

      // Fetch the binary snapshot from the server
      const { data } = await versionApi.getSnapshot(documentId, v.id);
      const snapshotArray = new Uint8Array(data.snapshot);

      // Apply to Yjs doc
      Y.applyUpdate(ydoc, snapshotArray);

      fetchVersions();
      alert(`Document successfully restored to Version ${v.version}.`);
    } catch (err) {
      console.error('Failed to restore version:', err);
    }
  }, [currentUser, handleCreateSnapshot, fetchVersions]);

  const handlePreview = useCallback((v: VersionMetadata) => {
    setPreviewVersion(v);
  }, []);

  const handleCompare = useCallback(async (v: VersionMetadata) => {
    try {
      const { data } = await api.get(`/documents/${documentId}/versions/${v.id}/diff`);
      setCompareData(data);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to fetch version comparison.');
    }
  }, [documentId]);

  const handleClauseStatusChange = useCallback(async (id: string, action: string) => {
    try {
      await approvalApi.processAction(id, action);
      // Auto-version upon major milestone
      if (action === 'APPROVE') {
        handleCreateSnapshot(`Auto-version: Clause Approved`);
      }
    } catch (err) {
      console.error(`Failed to process action ${action} on clause ${id}:`, err);
    }
  }, [handleCreateSnapshot]);

  const handleWrapInClause = useCallback(async () => {
    if (!editor || !currentUser || isViewer) return;
    try {
      let targetSectionId = sections[0]?.id;
      if (!targetSectionId) {
        // Create a default section if none exist
        const { data: section } = await api.post(`/documents/${documentId}/sections`, {
          title: 'Main Details',
        });
        targetSectionId = section.id;
        setSections([section]);
      }

      const { data: clause } = await clauseApi.create(documentId, {
        sectionId: targetSectionId,
        title: 'New Clause',
        contentJson: {},
      });

      editor.chain().focus().wrapInClause(clause.id).run();
    } catch (err) {
      console.error('Failed to create clause in DB:', err);
      alert('Failed to create clause. Please check your connection.');
    }
  }, [editor, currentUser, documentId, sections, isViewer]);

  const pendingSuggestionsRef = useRef<any[]>([]);

  const flushSuggestions = useMemo(() => debounce(async () => {
    const suggestions = pendingSuggestionsRef.current;
    if (suggestions.length === 0) return;
    pendingSuggestionsRef.current = [];

    try {
      await suggestionApi.createBatch(documentId, { suggestions });
    } catch (error) {
      console.error('Failed to flush suggestions', error);
      pendingSuggestionsRef.current.push(...suggestions);
    }
  }, 2000), [documentId]);

  const getActiveClauseId = (editor: Editor): string | null => {
    if (editor.isActive('clause')) {
      return editor.getAttributes('clause').id;
    }
    return null;
  };

  // ── Track changes keyboard handlers ────────────────────────────────
  useEffect(() => {
    if (!editor) return;
    if (effectiveTrackChanges) {
      editor.setOptions({
        editorProps: {
          handleKeyDown: (view, event) => {
            if (effectiveTrackChanges && (event.key === 'Backspace' || event.key === 'Delete')) {
              const { selection, doc, schema } = view.state;

              const clauseId = getActiveClauseId(editor);

              // ── Author attribution guard ──────────────────────────
              // Never create marks if user identity isn't available yet
              if (!currentUser?.userId) return false;
              const currentUserId = currentUser.userId;
              const currentUserName = currentUser.name || currentUser.email || 'User';

              if (selection.empty) {
                // ── Single character delete ────────────────────────
                const pos = event.key === 'Backspace' ? selection.from - 1 : selection.from;
                if (pos < 0 || pos >= doc.content.size) return false;

                // Check if the character at `pos` has an insertion mark by this user
                const $pos = doc.resolve(pos);
                const nodeAfter = $pos.nodeAfter;
                const insertionMark = nodeAfter?.marks?.find(
                  (m: any) => m.type === schema.marks.insertion
                );

                if (insertionMark && insertionMark.attrs.userId === currentUserId) {
                  // ── SMART DELETE: Cancel own insertion ────────────
                  // Just delete the character — no deletion mark needed
                  editor.chain().focus()
                    .command(({ tr, dispatch }) => {
                      if (dispatch) {
                        tr.delete(pos, pos + 1);
                        tr.setMeta('skipSuggestion', true);
                      }
                      return true;
                    })
                    .run();
                  return true;
                }

                // ── Normal deletion: create deletion mark ──────────
                let changeId = crypto.randomUUID();
                let timestamp = new Date().toISOString();

                // Group with adjacent deletion if authored by the same user
                const $sel = doc.resolve(selection.from);
                const marksBefore = $sel.nodeBefore?.marks || [];
                const marksAfter = $sel.nodeAfter?.marks || [];
                const adjacentDeletion = marksBefore.find(m => m.type.name === 'deletion') || marksAfter.find(m => m.type.name === 'deletion');

                if (adjacentDeletion && adjacentDeletion.attrs.userId === currentUserId) {
                  changeId = adjacentDeletion.attrs.changeId;
                  timestamp = adjacentDeletion.attrs.timestamp || timestamp;
                }

                const deletedText = doc.textBetween(pos, pos + 1);

                editor.chain().focus().setTextSelection({ from: pos, to: pos + 1 }).setMark('deletion', {
                  changeId,
                  userId: currentUserId,
                  userName: currentUserName,
                  timestamp
                }).setTextSelection(selection.from).run();

                if (clauseId) {
                  pendingSuggestionsRef.current.push({
                    clauseId,
                    editType: 'DELETION',
                    originalContent: deletedText,
                    positionFrom: pos,
                    positionTo: pos + 1,
                    versionRef: currentVersion || 1,
                  });
                  flushSuggestions();
                }

                return true;
              } else {
                // ── Range delete ───────────────────────────────────
                // Check if the entire selection is own insertion text
                let allOwnInsertion = true;
                doc.nodesBetween(selection.from, selection.to, (node: any) => {
                  if (!node.isText) return;
                  const ins = node.marks.find((m: any) => m.type === schema.marks.insertion);
                  if (!ins || ins.attrs.userId !== currentUserId) {
                    allOwnInsertion = false;
                  }
                });

                if (allOwnInsertion) {
                  // ── SMART DELETE: Cancel own insertion for entire range
                  editor.chain().focus()
                    .command(({ tr, dispatch }) => {
                      if (dispatch) {
                        tr.delete(selection.from, selection.to);
                        tr.setMeta('skipSuggestion', true);
                      }
                      return true;
                    })
                    .run();
                  return true;
                }

                // ── Normal range deletion: mark the range ──────────
                let changeId = crypto.randomUUID();
                let timestamp = new Date().toISOString();

                const $from = doc.resolve(selection.from);
                const marksBefore = $from.nodeBefore?.marks || [];
                const marksAfter = $from.nodeAfter?.marks || [];
                const adjacentDeletion = marksBefore.find(m => m.type.name === 'deletion') || marksAfter.find(m => m.type.name === 'deletion');

                if (adjacentDeletion && adjacentDeletion.attrs.userId === currentUserId) {
                  changeId = adjacentDeletion.attrs.changeId;
                  timestamp = adjacentDeletion.attrs.timestamp || timestamp;
                }

                const deletedText = doc.textBetween(selection.from, selection.to);
                editor.chain().focus().setMark('deletion', {
                  changeId,
                  userId: currentUserId,
                  userName: currentUserName,
                  timestamp
                }).run();

                if (clauseId) {
                  pendingSuggestionsRef.current.push({
                    clauseId,
                    editType: 'DELETION',
                    originalContent: deletedText,
                    positionFrom: selection.from,
                    positionTo: selection.to,
                    versionRef: currentVersion || 1,
                  });
                  flushSuggestions();
                }

                return true;
              }
            }
            return false;
          },
          handleTextInput: (view, from, to, text) => {
            if (effectiveTrackChanges) {
              if (!currentUser?.userId) return false;
              const clauseId = getActiveClauseId(editor);
              const currentUserId = currentUser.userId;
              const currentUserName = currentUser.name || currentUser.email || 'User';

              let changeId = crypto.randomUUID();
              let timestamp = new Date().toISOString();

              // Group with adjacent insertion if authored by the same user
              const $from = view.state.doc.resolve(from);
              const marksBefore = $from.nodeBefore?.marks || [];
              const marksAfter = $from.nodeAfter?.marks || [];
              const adjacentInsertion = marksBefore.find(m => m.type.name === 'insertion') || marksAfter.find(m => m.type.name === 'insertion');

              if (adjacentInsertion && adjacentInsertion.attrs.userId === currentUserId) {
                changeId = adjacentInsertion.attrs.changeId;
                timestamp = adjacentInsertion.attrs.timestamp || timestamp;
              }

              editor.chain().focus().insertContentAt(from, {
                type: 'text',
                text,
                marks: [{
                  type: 'insertion',
                  attrs: {
                    changeId,
                    userId: currentUserId,
                    userName: currentUserName,
                    timestamp
                  }
                }]
              }).run();

              if (clauseId) {
                pendingSuggestionsRef.current.push({
                  clauseId,
                  editType: 'INSERTION',
                  suggestedContent: text,
                  positionFrom: from,
                  positionTo: to + text.length,
                  versionRef: currentVersion || 1,
                });
                flushSuggestions();
              }

              return true;
            }
            return false;
          },
          handlePaste: (view, event) => {
            if (effectiveTrackChanges) {
              event.preventDefault();

              const text = event.clipboardData?.getData('text/plain');
              if (!text) return true;

              if (!currentUser?.userId) return true;
              const clauseId = getActiveClauseId(editor);
              const currentUserId = currentUser.userId;
              const currentUserName = currentUser.name || currentUser.email || 'User';

              let changeId = crypto.randomUUID();
              let timestamp = new Date().toISOString();

              const { from } = view.state.selection;

              // Group with adjacent insertion if authored by the same user
              const $from = view.state.doc.resolve(from);
              const marksBefore = $from.nodeBefore?.marks || [];
              const marksAfter = $from.nodeAfter?.marks || [];
              const adjacentInsertion = marksBefore.find(m => m.type.name === 'insertion') || marksAfter.find(m => m.type.name === 'insertion');

              if (adjacentInsertion && adjacentInsertion.attrs.userId === currentUserId) {
                changeId = adjacentInsertion.attrs.changeId;
                timestamp = adjacentInsertion.attrs.timestamp || timestamp;
              }

              editor.chain().focus().insertContentAt(from, {
                type: 'text',
                text,
                marks: [{
                  type: 'insertion',
                  attrs: {
                    changeId,
                    userId: currentUserId,
                    userName: currentUserName,
                    timestamp
                  }
                }]
              }).run();

              if (clauseId) {
                pendingSuggestionsRef.current.push({
                  clauseId,
                  editType: 'INSERTION',
                  suggestedContent: text,
                  positionFrom: from,
                  positionTo: from + text.length,
                  versionRef: currentVersion || 1,
                });
                flushSuggestions();
              }

              return true;
            }
            return false;
          },
          handleDrop: (view, event) => {
            if (effectiveTrackChanges) {
              event.preventDefault();
              return true;
            }
            return false;
          }
        }
      });
    } else {
      editor.setOptions({
        editorProps: {
          handleKeyDown: () => false,
          handleTextInput: () => false,
          handlePaste: () => false,
          handleDrop: () => false
        }
      });
    }
  }, [editor, effectiveTrackChanges, currentUser, currentVersion, flushSuggestions]);

  // ── Export handlers ────────────────────────────────────────────────
  const handleExport = useCallback((type: 'DOCX' | 'PDF' | 'AUDIT') => {
    if (!editor || !editor.state) return;
    const date = new Date().toISOString().split('T')[0];
    const fileName = `Legal_Doc_${documentId}_v${currentVersion}_${date}`;

    switch (type) {
      case 'DOCX':
        exportToDocx(editor, fileName);
        break;
      case 'PDF':
        exportToPdf(editor, fileName, isFinalized);
        break;
      case 'AUDIT':
        generateAuditReport(auditLogs, currentVersion);
        break;
    }
  }, [editor, documentId, currentVersion, auditLogs]);

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {/* Sidebar Switcher */}
      <div className="w-12 bg-white border-r flex flex-col items-center py-4 gap-6 shrink-0 z-20 dark:bg-slate-900 dark:border-slate-700">
        <div className="px-4 py-2 flex items-center gap-2 border-b w-full justify-center dark:border-slate-700">
          <div className={cn("w-2 h-2 rounded-full", status === 'connected' ? 'bg-green-500' : 'bg-orange-500')} />
        </div>
        <button
          onClick={() => setActiveSidebar(activeSidebar === 'comments' ? null : 'comments')}
          className={cn("p-2 rounded-lg transition-colors", activeSidebar === 'comments' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300')}
          title="Comments"
        >
          <MessageIcon size={20} />
        </button>
        <button
          onClick={() => setActiveSidebar(activeSidebar === 'audit' ? null : 'audit')}
          className={cn("p-2 rounded-lg transition-colors", activeSidebar === 'audit' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300')}
          title="Audit Trail"
        >
          <ListChecks size={20} />
        </button>
        <button
          onClick={() => setActiveSidebar(activeSidebar === 'versions' ? null : 'versions')}
          className={cn("p-2 rounded-lg transition-colors", activeSidebar === 'versions' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300')}
          title="Version History"
        >
          <HistoryIcon size={20} />
        </button>
        <button
          onClick={() => setActiveSidebar(activeSidebar === 'review' ? null : 'review')}
          className={cn("p-2 rounded-lg transition-colors", activeSidebar === 'review' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300')}
          title="Review Changes"
        >
          <Check size={20} />
        </button>
      </div>

      <div className="flex-1 flex flex-col min-w-0 relative">
        <EditorToolbar
          editor={editor}
          onAddComment={handleAddComment}
          onClauseStatusChange={handleClauseStatusChange}
          onExport={handleExport}
          onWrapInClause={handleWrapInClause}
          accessMode={accessMode}
        />

        {/* Inline Suggestion Bubble Menu */}
        {editor && (
          <BubbleMenu
            editor={editor}
            shouldShow={({ editor }: { editor: Editor }) => editor.isActive('insertion') || editor.isActive('deletion')}
            className="flex flex-col bg-white border border-gray-200 shadow-xl rounded-lg overflow-hidden z-50 animate-in fade-in zoom-in-95 dark:bg-slate-800 dark:border-slate-700"
          >
            <SuggestionBubbleContent editor={editor} isReadOnly={!!isReadOnly} currentUser={currentUser} />
          </BubbleMenu>
        )}

        {/* Preview Overlay */}
        {previewVersion && (
          <div className="absolute inset-0 z-50 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-8">
            <div className="bg-white w-full max-w-5xl h-full rounded-xl shadow-2xl flex flex-col overflow-hidden dark:bg-slate-900">
              <div className="p-4 bg-purple-600 text-white flex items-center justify-between">
                <div>
                  <h3 className="font-bold">Preview: {previewVersion.description}</h3>
                  <p className="text-[10px] uppercase opacity-80">Archived Version {previewVersion.version} • {new Date(previewVersion.timestamp).toLocaleString()}</p>
                </div>
                <button
                  onClick={() => setPreviewVersion(null)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>
              <div className="flex-1 bg-gray-100 overflow-y-auto p-12 flex justify-center dark:bg-slate-950">
                <div className="max-w-[816px] w-full bg-white shadow-lg p-16 prose prose-lg min-h-[1056px] dark:bg-slate-900 dark:shadow-slate-900/50">
                  <p className="text-gray-400 italic mb-8 border-b pb-4 dark:border-slate-700">This is a read-only preview of a historical version.</p>
                  <div dangerouslySetInnerHTML={{ __html: 'Restoring this version will replace the current document state.' }} />
                  <pre className="text-[10px] text-gray-400 whitespace-pre-wrap mt-8 dark:text-slate-500">
                    Binary Snapshot ID: {previewVersion.id}
                  </pre>
                </div>
              </div>
              <div className="p-4 bg-gray-50 border-t flex justify-end gap-3 dark:bg-slate-800 dark:border-slate-700">
                <button
                  onClick={() => setPreviewVersion(null)}
                  className="px-6 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded transition-colors dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  Close Preview
                </button>
                <button
                  onClick={() => {
                    handleRestore(previewVersion);
                    setPreviewVersion(null);
                  }}
                  className="px-6 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded shadow-md transition-colors"
                >
                  Restore This Version
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Compare Overlay */}
        {compareData && (
          <CompareOverlay
            base={compareData.base}
            target={compareData.target}
            onClose={() => setCompareData(null)}
          />
        )}

        <div className="flex-1 overflow-y-auto bg-gray-100 flex items-start justify-center p-8 dark:bg-slate-950">
          <div className="max-w-[816px] w-full bg-white shadow-xl min-h-[1056px] relative border border-gray-200 overflow-hidden dark:bg-slate-900 dark:border-slate-700 dark:shadow-slate-900/50">
            {isFinalized && (
              <div className="absolute inset-0 pointer-events-none z-40 flex items-center justify-center">
                <span className="text-[8rem] font-black text-gray-200 rotate-[-30deg] opacity-50 select-none dark:text-slate-800">
                  FINALIZED
                </span>
              </div>
            )}
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      {activeSidebar === 'comments' && (
        <CommentSidebar
          comments={comments}
          onResolve={handleResolve}
          onDelete={handleDelete}
          onReply={handleReply}
          currentUser={currentUser}
        />
      )}

      {activeSidebar === 'audit' && (
        <AuditTrailSidebar
          logs={auditLogs}
          currentVersion={currentVersion}
          onCreateVersion={() => setActiveSidebar('versions')}
          hasMore={hasMoreAuditLogs}
          onLoadMore={() => fetchAuditLogs(auditPage + 1, true)}
          onNavigateToEntity={(entityType, entityId) => {
            if (!editor) return;
            // Easiest "navigation" method if we don't have perfect DOM tracking:
            // Just open the appropriate sidebar tab (e.g. comments or suggestions)
            if (entityType === 'Comment') {
              setActiveSidebar('comments');
              // Optional: Highlight the comment in the sidebar via CSS class
              // or find its exact node if it exists in the editor text
            } else if (entityType === 'EditSuggestion') {
              setActiveSidebar('review');
            }
          }}
        />
      )}

      {activeSidebar === 'versions' && (
        <VersionSidebar
          versions={versions}
          currentVersion={currentVersion}
          onCreateSnapshot={handleCreateSnapshot}
          onRestore={handleRestore}
          onPreview={handlePreview}
          onCompare={handleCompare}
          tamperedIds={new Set()}
          currentUser={currentUser}
        />
      )}

      {activeSidebar === 'review' && editor && (
        <ReviewPane
          editor={editor}
          accessMode={accessMode}
          onClose={() => setActiveSidebar(null)}
        />
      )}
    </div>
  );
}
