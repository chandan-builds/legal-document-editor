'use client';

import { Editor } from '@tiptap/react';
import {
  Bold, Italic, Strikethrough, Heading1, Heading2,
  List, ListOrdered, Quote, Undo, Redo,
  Printer, History, Gavel, Eye, Check, X,
  MessageSquare, Shield, ShieldCheck, PlusSquare, Download
} from 'lucide-react';
import { useAppStore } from '@/hooks/useAppStore';
import { cn } from '@/utils/cn';
import { useState, useEffect } from 'react';

interface ToolbarProps {
  editor: Editor | null;
  onAddComment?: (text: string) => void;
  onClauseStatusChange?: (id: string, status: string) => void;
  onExport?: (type: 'DOCX' | 'PDF' | 'AUDIT') => void;
  onWrapInClause?: () => void;
  accessMode?: string;
}

type TabKey = 'home' | 'insert' | 'review' | 'view';

export default function EditorToolbar({ editor, onAddComment, onClauseStatusChange, onExport, onWrapInClause, accessMode = 'EDIT' }: ToolbarProps) {
  useEffect(() => {
    console.debug('[DEBUG] EditorToolbar rendered');
  }, []);

  const currentUser = useAppStore((state) => state.currentUser);
  const trackChangesToggle = useAppStore((state) => state.trackChanges);
  const toggleTrackChanges = useAppStore((state) => state.toggleTrackChanges);
  const isSuggesting = accessMode === 'SUGGEST';
  const trackChanges = isSuggesting || trackChangesToggle;
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('home');

  if (!editor || !editor.state || editor.isDestroyed) {
    return null;
  }

  // Mode badge config
  const modeBadge: Record<string, { label: string; color: string; icon: string }> = {
    EDIT: { label: 'EDITING', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300', icon: '🟢' },
    SUGGEST: { label: 'SUGGESTING', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300', icon: '🟡' },
    COMMENT: { label: 'COMMENTING', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: '🔵' },
    VIEW: { label: 'VIEWING', color: 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300', icon: '⚪' },
  };
  const currentModeBadge = modeBadge[accessMode] || modeBadge.VIEW;

  const isInsideClause = editor.isActive('clause');
  const clauseAttrs = editor.getAttributes('clause');

  const handleAddComment = () => {
    const text = prompt('Enter your comment:');
    if (text && onAddComment) {
      onAddComment(text);
    }
  };

  const handleWrapInClause = () => {
    if (onWrapInClause) {
      onWrapInClause();
    } else {
      editor.chain().focus().wrapInClause().run();
    }
  };

  const setStatus = (action: string) => {
    if (!clauseAttrs.id) return;
    if (onClauseStatusChange) {
      onClauseStatusChange(clauseAttrs.id, action);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const insertClause = () => {
    editor.chain().focus().insertContent('<blockquote><p><strong>CONFIDENTIALITY CLAUSE:</strong> The parties agree to keep all information shared during this agreement confidential and shall not disclose it to any third party without prior written consent.</p></blockquote>').run();
  };

  const isViewer = currentUser?.collaboratorRole === 'VIEWER';

  const btnBase = "p-1.5 rounded hover:bg-gray-200 transition-colors text-gray-700 dark:text-slate-300 dark:hover:bg-slate-700";
  const btnActive = "bg-gray-200 text-blue-600 dark:bg-slate-700 dark:text-blue-400";

  return (
    <div className="bg-gray-50 flex flex-col sticky top-0 z-10 print:hidden border-b shadow-sm dark:bg-slate-900 dark:border-slate-700">
      {/* ── Toolbar Tabs ──────────────────────────────────────────────── */}
      <div className="flex px-2 border-b bg-gray-100 pt-2 gap-1 items-end dark:bg-slate-800 dark:border-slate-700">
        {(['home', 'insert', 'review', 'view'] as TabKey[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-t-md transition-colors",
              activeTab === tab
                ? 'text-blue-700 bg-white border border-b-0 shadow-[0_-2px_4px_rgba(0,0,0,0.02)] dark:text-blue-400 dark:bg-slate-900 dark:border-slate-700'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50 border border-transparent border-b-0 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/50'
            )}
          >
            {tab}
          </button>
        ))}
        {/* Mode Indicator Badge */}
        <div className="ml-auto flex items-center gap-1.5 pb-1">
          <span className={cn("text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full", currentModeBadge.color)}>
            {currentModeBadge.icon} {currentModeBadge.label}
          </span>
        </div>
      </div>

      {/* ── Toolbar Content ────────────────────────────────────────────── */}
      <div className="p-2 flex gap-4 min-h-[48px] items-center">

        {/* HOME TAB */}
        {activeTab === 'home' && !isViewer && (
          <>
            <div className="flex items-center gap-1 border-r pr-4 dark:border-slate-700">
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={cn(btnBase, editor.isActive('bold') && btnActive)}
                title="Bold"
              >
                <Bold size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={cn(btnBase, editor.isActive('italic') && btnActive)}
                title="Italic"
              >
                <Italic size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={cn(btnBase, editor.isActive('strike') && btnActive)}
                title="Strike"
              >
                <Strikethrough size={16} />
              </button>
            </div>

            <div className="flex items-center gap-1 border-r pr-4 dark:border-slate-700">
              <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={cn(btnBase, editor.isActive('heading', { level: 1 }) && btnActive)}
                title="Heading 1"
              >
                <Heading1 size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={cn(btnBase, editor.isActive('heading', { level: 2 }) && btnActive)}
                title="Heading 2"
              >
                <Heading2 size={16} />
              </button>
            </div>

            <div className="flex items-center gap-1 border-r pr-4 dark:border-slate-700">
              <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={cn(btnBase, editor.isActive('bulletList') && btnActive)}
                title="Bullet List"
              >
                <List size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={cn(btnBase, editor.isActive('orderedList') && btnActive)}
                title="Ordered List"
              >
                <ListOrdered size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={cn(btnBase, editor.isActive('blockquote') && btnActive)}
                title="Blockquote"
              >
                <Quote size={16} />
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => editor.commands.undo && editor.commands.undo()}
                disabled={!editor.can().undo()}
                className={cn(btnBase, "disabled:opacity-50")}
                title="Undo"
              >
                <Undo size={16} />
              </button>
              <button
                onClick={() => editor.commands.redo && editor.commands.redo()}
                disabled={!editor.can().redo()}
                className={cn(btnBase, "disabled:opacity-50")}
                title="Redo"
              >
                <Redo size={16} />
              </button>
            </div>
          </>
        )}

        {/* INSERT TAB */}
        {activeTab === 'insert' && !isViewer && !isSuggesting && (
          <>
            <div className="flex items-center gap-2 border-r pr-4 dark:border-slate-700">
              <button
                onClick={insertClause}
                className="px-3 py-1.5 rounded hover:bg-purple-100 text-purple-700 font-semibold flex items-center gap-2 text-xs uppercase tracking-wide transition-colors dark:text-purple-300 dark:hover:bg-purple-900/30"
                title="Insert Standard Clause"
              >
                <Gavel size={16} />
                <span>Add Snippet</span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleWrapInClause}
                className={cn("px-3 py-1.5 rounded hover:bg-blue-100 font-semibold flex items-center gap-2 text-xs uppercase tracking-wide transition-colors dark:hover:bg-blue-900/30", isInsideClause ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-600 hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-300')}
                title="Identify Selection as Clause"
              >
                <PlusSquare size={16} />
                <span>Wrap in Clause</span>
              </button>
            </div>
          </>
        )}

        {/* REVIEW TAB */}
        {activeTab === 'review' && !isViewer && (
          <>
            <div className="flex items-center gap-2 border-r pr-4 dark:border-slate-700">
              <button
                onClick={toggleTrackChanges}
                disabled={isSuggesting}
                className={cn("px-3 py-1.5 rounded flex items-center gap-2 text-xs font-bold uppercase tracking-wide transition-colors", trackChanges ? 'bg-amber-100 text-amber-700 shadow-inner dark:bg-amber-900/30 dark:text-amber-300' : 'text-gray-600 hover:bg-gray-200 dark:text-slate-400 dark:hover:bg-slate-700', isSuggesting && 'opacity-50 cursor-not-allowed')}
                title={isSuggesting ? "Always enabled in Suggestion Mode" : "Toggle Track Changes"}
              >
                <Eye size={16} />
                <span>Track Changes</span>
              </button>
            </div>

            <div className="flex items-center gap-1 border-r pr-4 dark:border-slate-700">
              <button
                onClick={() => {
                  const attrs = editor.isActive('insertion')
                    ? editor.getAttributes('insertion')
                    : editor.getAttributes('deletion');
                  if (attrs?.changeId) editor.commands.acceptChange(attrs.changeId);
                }}
                className="p-1.5 flex items-center gap-1 rounded hover:bg-green-100 text-green-700 text-xs font-bold uppercase transition-colors dark:text-green-400 dark:hover:bg-green-900/30"
                title="Accept Change at Cursor"
              >
                <Check size={16} /> Accept
              </button>
              <button
                onClick={() => {
                  const attrs = editor.isActive('insertion')
                    ? editor.getAttributes('insertion')
                    : editor.getAttributes('deletion');
                  if (attrs?.changeId) editor.commands.rejectChange(attrs.changeId);
                }}
                className="p-1.5 flex items-center gap-1 rounded hover:bg-red-100 text-red-700 text-xs font-bold uppercase transition-colors dark:text-red-400 dark:hover:bg-red-900/30"
                title="Reject Change at Cursor"
              >
                <X size={16} /> Reject
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleAddComment}
                className="px-3 py-1.5 rounded hover:bg-blue-100 text-blue-700 flex items-center gap-2 text-xs font-bold uppercase transition-colors dark:text-blue-400 dark:hover:bg-blue-900/30"
                title="Add Comment"
              >
                <MessageSquare size={16} />
                <span>Comment</span>
              </button>
            </div>
          </>
        )}

        {/* VIEW TAB */}
        {activeTab === 'view' && (
          <>
            <div className="flex items-center gap-2 border-r pr-4 dark:border-slate-700">
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 rounded hover:bg-gray-200 text-gray-700 font-semibold flex items-center gap-2 text-xs uppercase tracking-wide transition-colors dark:text-slate-300 dark:hover:bg-slate-700"
                title="Print Document"
              >
                <Printer size={16} />
                <span>Print</span>
              </button>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-3 py-1.5 rounded hover:bg-gray-200 text-gray-700 font-semibold flex items-center gap-2 text-xs uppercase tracking-wide transition-colors dark:text-slate-300 dark:hover:bg-slate-700"
                title="Export Options"
              >
                <Download size={16} />
                <span>Export Content</span>
              </button>

              {showExportMenu && onExport && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50 flex flex-col p-1 dark:bg-slate-800 dark:border-slate-700">
                  <button
                    onClick={() => { onExport('DOCX'); setShowExportMenu(false); }}
                    className="px-4 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2 rounded transition-colors text-gray-700 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <span className="font-bold text-blue-600 w-8 dark:text-blue-400">DOCX</span> Word
                  </button>
                  <button
                    onClick={() => { onExport('PDF'); setShowExportMenu(false); }}
                    className="px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2 rounded transition-colors text-gray-700 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <span className="font-bold text-red-600 w-8 dark:text-red-400">PDF</span> Document
                  </button>
                  <div className="border-t my-1 mx-2 border-gray-100 dark:border-slate-700"></div>
                  <button
                    onClick={() => { onExport('AUDIT'); setShowExportMenu(false); }}
                    className="px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 rounded transition-colors text-gray-700 dark:text-slate-300 dark:hover:bg-slate-700"
                  >
                    <span className="font-bold text-gray-400 w-8 dark:text-slate-500">LOG</span> Audit Report
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pl-4">
              <button
                onClick={() => alert('Version History - Coming Soon')}
                className="px-3 py-1.5 rounded hover:bg-purple-100 text-purple-700 font-semibold flex items-center gap-2 text-xs uppercase tracking-wide transition-colors dark:text-purple-300 dark:hover:bg-purple-900/30"
                title="Version History"
              >
                <History size={16} />
                <span>History</span>
              </button>
            </div>
          </>
        )}

        {/* ── Read Only Indicator for Viewers ── */}
        {isViewer && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs font-semibold shadow-inner ml-auto dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300">
            <Eye size={14} />
            <span>Read-Only Mode</span>
          </div>
        )}

        {/* ── Clause Context Panel (Always visible if inside a clause) ── */}
        {isInsideClause && !isViewer && (
          <div className="ml-auto flex items-center gap-3 px-3 py-1.5 bg-slate-100 rounded-md border border-slate-200 shadow-inner shrink-0 dark:bg-slate-800 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500">Clause Status:</span>
              {/* Badge rendering */}
              {(() => {
                const status = (clauseAttrs.status || 'DRAFT').toUpperCase();
                switch (status) {
                  case 'DRAFT': return <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-300 text-slate-700 px-2 py-0.5 rounded dark:bg-slate-600 dark:text-slate-200">Draft</span>;
                  case 'PENDING_CLIENT_APPROVAL': return <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-800 px-2 py-0.5 rounded dark:bg-amber-900/40 dark:text-amber-300">Pending Client</span>;
                  case 'PENDING_VENDOR_APPROVAL': return <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-800 px-2 py-0.5 rounded dark:bg-amber-900/40 dark:text-amber-300">Pending Vendor</span>;
                  case 'CLIENT_APPROVED': return <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-800 px-2 py-0.5 rounded dark:bg-amber-900/40 dark:text-amber-300">Pending Vendor</span>;
                  case 'VENDOR_APPROVED': return <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-800 px-2 py-0.5 rounded dark:bg-amber-900/40 dark:text-amber-300">Pending Client</span>;
                  case 'PENDING_MUTUAL_APPROVAL': return <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-800 px-2 py-0.5 rounded dark:bg-amber-900/40 dark:text-amber-300">Pending Mutual</span>;
                  case 'MUTUALLY_APPROVED': return <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded flex items-center gap-1 dark:bg-emerald-900/30 dark:text-emerald-300"><ShieldCheck size={12} /> Locked</span>;
                  case 'OMITTED': return <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 px-2 py-0.5 rounded dark:bg-red-900/30 dark:text-red-300">Omitted</span>;
                  default: return <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-300 text-slate-700 px-2 py-0.5 rounded dark:bg-slate-600 dark:text-slate-200">{status}</span>;
                }
              })()}
            </div>

            {/* Actions */}
            {clauseAttrs.status !== 'MUTUALLY_APPROVED' && (
              <div className="flex gap-1 border-l border-slate-300 pl-3 dark:border-slate-600">
                <button
                  onClick={() => setStatus('REQUEST_CHANGES')}
                  className="p-1 rounded hover:bg-blue-200 text-blue-700 transition-colors dark:text-blue-400 dark:hover:bg-blue-900/30"
                  title="Submit for Approval"
                >
                  <Shield size={16} />
                </button>
                <button
                  onClick={() => setStatus('APPROVE')}
                  className="px-2 py-1 flex items-center gap-1 rounded bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs uppercase shadow-sm transition-colors dark:bg-slate-700 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
                  title="Approve Clause"
                >
                  <Check size={14} /> Approve
                </button>
                <button
                  onClick={() => setStatus('REJECT')}
                  className="p-1 rounded hover:bg-red-200 text-red-700 transition-colors dark:text-red-400 dark:hover:bg-red-900/30"
                  title="Reject Clause"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
