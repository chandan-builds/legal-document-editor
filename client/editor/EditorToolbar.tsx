'use client';

import { Editor } from '@tiptap/react';
import {
  Bold, Italic, Strikethrough, Underline as UnderlineIcon, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Undo, Redo,
  Printer, History, Gavel, Eye, Check, X,
  MessageSquare, Shield, ShieldCheck, PlusSquare, Download,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Superscript as SuperscriptIcon, Subscript as SubscriptIcon,
  Paintbrush, Eraser, ChevronDown, ListChecks, Minus,
  IndentIncrease, IndentDecrease, Type, Palette,
  Table2, Rows3, Columns3, TableCellsMerge, TableCellsSplit, Trash2,
  Plus, Minus as MinusIcon,
  Image as ImageIcon, Link2, Unlink, PanelTop
} from 'lucide-react';
import { useAppStore } from '@/hooks/useAppStore';
import { cn } from '@/utils/cn';
import { useState, useEffect, useRef } from 'react';
import { PageSettings } from '../components/HeaderFooterEditor';

interface ToolbarProps {
  editor: Editor | null;
  onAddComment?: (text: string) => void;
  onClauseStatusChange?: (id: string, status: string) => void;
  onExport?: (type: 'DOCX' | 'PDF' | 'AUDIT') => void;
  onWrapInClause?: () => void;
  accessMode?: string;
  onToggleHeaderFooter?: () => void;
  pageSettings?: PageSettings;
  onPageSettingsChange?: (settings: PageSettings) => void;
}

type TabKey = 'home' | 'insert' | 'layout' | 'review' | 'view';

// ── Font families for the dropdown ─────────────────────────────────────────
const FONT_FAMILIES = [
  { label: 'Default', value: '' },
  { label: 'Inter', value: 'Inter' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Courier New', value: 'Courier New' },
  { label: 'Verdana', value: 'Verdana' },
  { label: 'Garamond', value: 'Garamond' },
  { label: 'Calibri', value: 'Calibri' },
];

// ── Font sizes ─────────────────────────────────────────────────────
const FONT_SIZES = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48', '72'];

// ── Heading styles for the Style dropdown ──────────────────────────
const HEADING_STYLES = [
  { label: 'Normal', level: 0 },
  { label: 'Heading 1', level: 1 },
  { label: 'Heading 2', level: 2 },
  { label: 'Heading 3', level: 3 },
  { label: 'Heading 4', level: 4 },
  { label: 'Heading 5', level: 5 },
  { label: 'Heading 6', level: 6 },
];

// ── Colors for color picker ────────────────────────────────────────
const TEXT_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#B7B7B7', '#CCCCCC', '#D9D9D9', '#EFEFEF', '#F3F3F3', '#FFFFFF',
  '#980000', '#FF0000', '#FF9900', '#FFFF00', '#00FF00', '#00FFFF', '#4A86E8', '#0000FF', '#9900FF', '#FF00FF',
  '#E6B8AF', '#F4CCCC', '#FCE5CD', '#FFF2CC', '#D9EAD3', '#D0E0E3', '#C9DAF8', '#CFE2F3', '#D9D2E9', '#EAD1DC',
  '#DD7E6B', '#EA9999', '#F9CB9C', '#FFE599', '#B6D7A8', '#A2C4C9', '#A4C2F4', '#9FC5E8', '#B4A7D6', '#D5A6BD',
  '#CC4125', '#E06666', '#F6B26B', '#FFD966', '#93C47D', '#76A5AF', '#6D9EEB', '#6FA8DC', '#8E7CC3', '#C27BA0',
  '#A61C00', '#CC0000', '#E69138', '#F1C232', '#6AA84F', '#45818E', '#3C78D8', '#3D85C6', '#674EA7', '#A64D79',
];

// ── ColorPicker component ──────────────────────────────────────────
function ColorPicker({ colors, activeColor, onSelect, label }: {
  colors: string[];
  activeColor?: string;
  onSelect: (color: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded hover:bg-gray-200 transition-colors text-gray-700 dark:text-slate-300 dark:hover:bg-slate-700 flex items-center gap-0.5"
        title={label}
      >
        <div className="w-4 h-4 rounded border border-gray-300 dark:border-slate-600" style={{ backgroundColor: activeColor || '#000' }} />
        <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-50 p-2 w-[220px]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 px-0.5">{label}</p>
          <div className="grid grid-cols-10 gap-0.5">
            {colors.map(c => (
              <button
                key={c}
                onClick={() => { onSelect(c); setOpen(false); }}
                className={cn(
                  "w-5 h-5 rounded-sm border transition-all hover:scale-125",
                  activeColor === c ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200 dark:border-slate-600'
                )}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
          <button
            onClick={() => { onSelect(''); setOpen(false); }}
            className="mt-2 w-full text-xs text-center py-1 rounded hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500"
          >
            Remove Color
          </button>
        </div>
      )}
    </div>
  );
}

// ── Dropdown component ─────────────────────────────────────────────
function ToolbarDropdown({ items, activeValue, onSelect, width, label }: {
  items: { label: string; value: string }[];
  activeValue?: string;
  onSelect: (value: string) => void;
  width?: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeLabel = items.find(i => i.value === activeValue)?.label || items[0]?.label;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium hover:bg-gray-200 transition-colors text-gray-700 dark:text-slate-300 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-600",
        )}
        style={{ width: width || 'auto', minWidth: width || 'auto' }}
        title={label}
      >
        <span className="truncate">{activeLabel}</span>
        <ChevronDown size={10} className="shrink-0" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-50 py-1 max-h-64 overflow-y-auto" style={{ minWidth: width || '120px' }}>
          {items.map(item => (
            <button
              key={item.value}
              onClick={() => { onSelect(item.value); setOpen(false); }}
              className={cn(
                "w-full px-3 py-1.5 text-left text-xs hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors",
                activeValue === item.value ? 'bg-blue-50 text-blue-700 font-bold dark:bg-slate-700 dark:text-blue-400' : 'text-gray-700 dark:text-slate-300'
              )}
              style={label === 'Font Family' ? { fontFamily: item.value || 'inherit' } : {}}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Ribbon Group label ────────────────────────────────────────────
function RibbonGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-0.5">{children}</div>
      <span className="text-[8px] uppercase tracking-widest text-gray-400 dark:text-slate-500 font-bold select-none">{label}</span>
    </div>
  );
}

// ─── Table Grid Selector ───────────────────────────────────────────
function TableGridSelector({ onInsert }: { onInsert: (rows: number, cols: number) => void }) {
  const [open, setOpen] = useState(false);
  const [hoverRow, setHoverRow] = useState(0);
  const [hoverCol, setHoverCol] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const GRID = 6;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-1.5 rounded hover:bg-gray-200 transition-colors text-gray-700 dark:text-slate-300 dark:hover:bg-slate-700 flex items-center gap-1"
        title="Insert Table"
      >
        <Table2 size={16} />
        <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-50 p-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5 px-0.5">
            {hoverRow > 0 ? `${hoverRow} × ${hoverCol}` : 'Insert Table'}
          </p>
          <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)` }}>
            {Array.from({ length: GRID * GRID }, (_, i) => {
              const r = Math.floor(i / GRID) + 1;
              const c = (i % GRID) + 1;
              return (
                <button
                  key={i}
                  onMouseEnter={() => { setHoverRow(r); setHoverCol(c); }}
                  onMouseLeave={() => { setHoverRow(0); setHoverCol(0); }}
                  onClick={() => { onInsert(r, c); setOpen(false); setHoverRow(0); setHoverCol(0); }}
                  className={cn(
                    "w-5 h-5 rounded-sm border transition-all",
                    r <= hoverRow && c <= hoverCol
                      ? 'bg-blue-500 border-blue-600'
                      : 'bg-gray-100 border-gray-300 dark:bg-slate-700 dark:border-slate-600'
                  )}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function EditorToolbar({ editor, onAddComment, onClauseStatusChange, onExport, onWrapInClause, accessMode = 'EDIT', onToggleHeaderFooter, pageSettings, onPageSettingsChange }: ToolbarProps) {
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

  // ── Track Changes Review State ─────────────────────────────────────
  const activeChangeAttrs = editor.isActive('insertion')
    ? editor.getAttributes('insertion')
    : editor.isActive('deletion')
      ? editor.getAttributes('deletion')
      : null;
  const hasActiveChange = !!activeChangeAttrs?.changeId;
  const isOwnChange = hasActiveChange && activeChangeAttrs?.userId === currentUser?.userId;
  const canReview = accessMode === 'EDIT';
  const disableReviewButtons = !hasActiveChange || isOwnChange || !canReview;

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

  // ── Active state helpers ───────────────────────────────────────────
  const currentFontFamily = editor.getAttributes('textStyle')?.fontFamily || '';
  const currentColor = editor.getAttributes('textStyle')?.color || '';
  const currentHighlight = editor.getAttributes('highlight')?.color || '';

  // ── Get current heading style ──────────────────────────────────────
  const getCurrentStyle = () => {
    for (let i = 1; i <= 6; i++) {
      if (editor.isActive('heading', { level: i })) return String(i);
    }
    return '0';
  };

  return (
    <div className="bg-gray-50 flex flex-col sticky top-0 z-10 print:hidden border-b shadow-sm dark:bg-slate-900 dark:border-slate-700">
      {/* ── Toolbar Tabs ──────────────────────────────────────────────── */}
      <div className="flex px-2 border-b bg-gray-100 pt-2 gap-1 items-end dark:bg-slate-800 dark:border-slate-700">
        {(['home', 'insert', 'layout', 'review', 'view'] as TabKey[]).map(tab => (
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
      <div className="p-2 flex gap-3 min-h-[52px] items-start flex-wrap">

        {/* ═══════════ HOME TAB ═══════════ */}
        {activeTab === 'home' && !isViewer && (
          <>
            {/* ── Clipboard ─────────────────── */}
            <RibbonGroup label="Undo">
              <button
                onClick={() => editor.commands.undo && editor.commands.undo()}
                disabled={!editor.can().undo()}
                className={cn(btnBase, "disabled:opacity-30")}
                title="Undo (Ctrl+Z)"
              >
                <Undo size={16} />
              </button>
              <button
                onClick={() => editor.commands.redo && editor.commands.redo()}
                disabled={!editor.can().redo()}
                className={cn(btnBase, "disabled:opacity-30")}
                title="Redo (Ctrl+Y)"
              >
                <Redo size={16} />
              </button>
            </RibbonGroup>

            <div className="w-px h-10 bg-gray-200 dark:bg-slate-700 self-center" />

            {/* ── Font Family & Size ─────────── */}
            <RibbonGroup label="Font">
              <ToolbarDropdown
                label="Font Family"
                items={FONT_FAMILIES.map(f => ({ label: f.label, value: f.value }))}
                activeValue={currentFontFamily}
                onSelect={(v) => {
                  if (v) {
                    editor.chain().focus().setFontFamily(v).run();
                  } else {
                    editor.chain().focus().unsetFontFamily().run();
                  }
                }}
                width="120px"
              />
              <ToolbarDropdown
                label="Font Size"
                items={FONT_SIZES.map(s => ({ label: s, value: s }))}
                activeValue={''}
                onSelect={(v) => {
                  editor.chain().focus().setMark('textStyle', { fontSize: `${v}px` }).run();
                }}
                width="52px"
              />
            </RibbonGroup>

            <div className="w-px h-10 bg-gray-200 dark:bg-slate-700 self-center" />

            {/* ── Text Formatting ────────────── */}
            <RibbonGroup label="Format">
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={cn(btnBase, editor.isActive('bold') && btnActive)}
                title="Bold (Ctrl+B)"
              >
                <Bold size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={cn(btnBase, editor.isActive('italic') && btnActive)}
                title="Italic (Ctrl+I)"
              >
                <Italic size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={cn(btnBase, editor.isActive('underline') && btnActive)}
                title="Underline (Ctrl+U)"
              >
                <UnderlineIcon size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={cn(btnBase, editor.isActive('strike') && btnActive)}
                title="Strikethrough"
              >
                <Strikethrough size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleSuperscript().run()}
                className={cn(btnBase, editor.isActive('superscript') && btnActive)}
                title="Superscript"
              >
                <SuperscriptIcon size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleSubscript().run()}
                className={cn(btnBase, editor.isActive('subscript') && btnActive)}
                title="Subscript"
              >
                <SubscriptIcon size={16} />
              </button>
            </RibbonGroup>

            <div className="w-px h-10 bg-gray-200 dark:bg-slate-700 self-center" />

            {/* ── Color ──────────────────────── */}
            <RibbonGroup label="Color">
              <ColorPicker
                colors={TEXT_COLORS}
                activeColor={currentColor}
                onSelect={(c) => {
                  if (c) {
                    editor.chain().focus().setColor(c).run();
                  } else {
                    editor.chain().focus().unsetColor().run();
                  }
                }}
                label="Font Color"
              />
              <ColorPicker
                colors={TEXT_COLORS}
                activeColor={currentHighlight}
                onSelect={(c) => {
                  if (c) {
                    editor.chain().focus().setHighlight({ color: c }).run();
                  } else {
                    editor.chain().focus().unsetHighlight().run();
                  }
                }}
                label="Highlight"
              />
              <button
                onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
                className={cn(btnBase)}
                title="Clear Formatting"
              >
                <Eraser size={16} />
              </button>
            </RibbonGroup>

            <div className="w-px h-10 bg-gray-200 dark:bg-slate-700 self-center" />

            {/* ── Paragraph ──────────────────── */}
            <RibbonGroup label="Paragraph">
              <button
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className={cn(btnBase, editor.isActive({ textAlign: 'left' }) && btnActive)}
                title="Align Left"
              >
                <AlignLeft size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className={cn(btnBase, editor.isActive({ textAlign: 'center' }) && btnActive)}
                title="Align Center"
              >
                <AlignCenter size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                className={cn(btnBase, editor.isActive({ textAlign: 'right' }) && btnActive)}
                title="Align Right"
              >
                <AlignRight size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                className={cn(btnBase, editor.isActive({ textAlign: 'justify' }) && btnActive)}
                title="Justify"
              >
                <AlignJustify size={16} />
              </button>
            </RibbonGroup>

            <div className="w-px h-10 bg-gray-200 dark:bg-slate-700 self-center" />

            {/* ── Lists ──────────────────────── */}
            <RibbonGroup label="Lists">
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
                title="Numbered List"
              >
                <ListOrdered size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleTaskList().run()}
                className={cn(btnBase, editor.isActive('taskList') && btnActive)}
                title="Task List"
              >
                <ListChecks size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={cn(btnBase, editor.isActive('blockquote') && btnActive)}
                title="Blockquote"
              >
                <Quote size={16} />
              </button>
            </RibbonGroup>

            <div className="w-px h-10 bg-gray-200 dark:bg-slate-700 self-center" />

            {/* ── Styles ─────────────────────── */}
            <RibbonGroup label="Styles">
              <ToolbarDropdown
                label="Heading Style"
                items={HEADING_STYLES.map(s => ({ label: s.label, value: String(s.level) }))}
                activeValue={getCurrentStyle()}
                onSelect={(v) => {
                  const level = parseInt(v);
                  if (level === 0) {
                    editor.chain().focus().setParagraph().run();
                  } else {
                    editor.chain().focus().toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 }).run();
                  }
                }}
                width="120px"
              />
            </RibbonGroup>
          </>
        )}

        {/* ═══════════ INSERT TAB ═══════════ */}
        {activeTab === 'insert' && !isViewer && !isSuggesting && (
          <>
            <RibbonGroup label="Table">
              <TableGridSelector
                onInsert={(rows, cols) => {
                  editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
                }}
              />
              {editor.isActive('table') && (
                <>
                  <button
                    onClick={() => editor.chain().focus().addRowAfter().run()}
                    className={cn(btnBase, 'flex items-center gap-0.5')}
                    title="Add Row Below"
                  >
                    <Rows3 size={14} /><Plus size={10} />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().deleteRow().run()}
                    className={cn(btnBase, 'flex items-center gap-0.5')}
                    title="Delete Row"
                  >
                    <Rows3 size={14} /><X size={10} />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().addColumnAfter().run()}
                    className={cn(btnBase, 'flex items-center gap-0.5')}
                    title="Add Column Right"
                  >
                    <Columns3 size={14} /><Plus size={10} />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().deleteColumn().run()}
                    className={cn(btnBase, 'flex items-center gap-0.5')}
                    title="Delete Column"
                  >
                    <Columns3 size={14} /><X size={10} />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().mergeCells().run()}
                    className={cn(btnBase)}
                    title="Merge Cells"
                  >
                    <TableCellsMerge size={16} />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().splitCell().run()}
                    className={cn(btnBase)}
                    title="Split Cell"
                  >
                    <TableCellsSplit size={16} />
                  </button>
                  <button
                    onClick={() => editor.chain().focus().deleteTable().run()}
                    className={cn(btnBase, 'text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30')}
                    title="Delete Table"
                  >
                    <Trash2 size={16} />
                  </button>
                </>
              )}
            </RibbonGroup>

            <div className="w-px h-10 bg-gray-200 dark:bg-slate-700 self-center" />

            <RibbonGroup label="Blocks">
              <button
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                className={cn(btnBase, 'flex items-center gap-1.5')}
                title="Horizontal Rule"
              >
                <Minus size={16} />
                <span className="text-xs">Rule</span>
              </button>
            </RibbonGroup>

            <div className="w-px h-10 bg-gray-200 dark:bg-slate-700 self-center" />

            <RibbonGroup label="Media">
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        const src = reader.result as string;
                        editor.chain().focus().setImage({ src }).run();
                      };
                      reader.readAsDataURL(file);
                    }
                  };
                  input.click();
                }}
                className={cn(btnBase, 'flex items-center gap-1')}
                title="Upload Image"
              >
                <ImageIcon size={16} />
                <span className="text-xs">Image</span>
              </button>
              <button
                onClick={() => {
                  const url = prompt('Enter image URL:');
                  if (url) editor.chain().focus().setImage({ src: url }).run();
                }}
                className={cn(btnBase, 'flex items-center gap-1')}
                title="Insert Image from URL"
              >
                <ImageIcon size={14} />
                <span className="text-[10px]">URL</span>
              </button>
            </RibbonGroup>

            <div className="w-px h-10 bg-gray-200 dark:bg-slate-700 self-center" />

            <RibbonGroup label="Links">
              <button
                onClick={() => {
                  const previousUrl = editor.getAttributes('link').href;
                  const url = prompt('Enter URL:', previousUrl || 'https://');
                  if (url === null) return;
                  if (url === '') {
                    editor.chain().focus().extendMarkRange('link').unsetLink().run();
                    return;
                  }
                  editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
                }}
                className={cn(btnBase, editor.isActive('link') && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300')}
                title="Insert/Edit Link"
              >
                <Link2 size={16} />
              </button>
              {editor.isActive('link') && (
                <button
                  onClick={() => editor.chain().focus().unsetLink().run()}
                  className={cn(btnBase, 'text-red-500')}
                  title="Remove Link"
                >
                  <Unlink size={16} />
                </button>
              )}
            </RibbonGroup>

            <div className="w-px h-10 bg-gray-200 dark:bg-slate-700 self-center" />

            <RibbonGroup label="Legal">
              <button
                onClick={insertClause}
                className="px-3 py-1.5 rounded hover:bg-purple-100 text-purple-700 font-semibold flex items-center gap-2 text-xs uppercase tracking-wide transition-colors dark:text-purple-300 dark:hover:bg-purple-900/30"
                title="Insert Standard Clause"
              >
                <Gavel size={16} />
                <span>Add Snippet</span>
              </button>
              <button
                onClick={handleWrapInClause}
                className={cn("px-3 py-1.5 rounded hover:bg-blue-100 font-semibold flex items-center gap-2 text-xs uppercase tracking-wide transition-colors dark:hover:bg-blue-900/30", isInsideClause ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'text-gray-600 hover:text-blue-700 dark:text-slate-400 dark:hover:text-blue-300')}
                title="Identify Selection as Clause"
              >
                <PlusSquare size={16} />
                <span>Wrap in Clause</span>
              </button>
            </RibbonGroup>
          </>
        )}

        {/* ═══════════ LAYOUT TAB ═══════════ */}
        {activeTab === 'layout' && !isViewer && (
          <>
            <RibbonGroup label="Indent">
              <button
                onClick={() => {
                  if (editor.isActive('bulletList') || editor.isActive('orderedList') || editor.isActive('taskList')) {
                    editor.chain().focus().sinkListItem('listItem').run();
                  }
                }}
                className={cn(btnBase)}
                title="Increase Indent"
              >
                <IndentIncrease size={16} />
              </button>
              <button
                onClick={() => {
                  if (editor.isActive('bulletList') || editor.isActive('orderedList') || editor.isActive('taskList')) {
                    editor.chain().focus().liftListItem('listItem').run();
                  }
                }}
                className={cn(btnBase)}
                title="Decrease Indent"
              >
                <IndentDecrease size={16} />
              </button>
            </RibbonGroup>

            <div className="w-px h-10 bg-gray-200 dark:bg-slate-700 self-center" />

            <RibbonGroup label="Alignment">
              <button
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className={cn(btnBase, editor.isActive({ textAlign: 'left' }) && btnActive)}
                title="Align Left"
              >
                <AlignLeft size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className={cn(btnBase, editor.isActive({ textAlign: 'center' }) && btnActive)}
                title="Align Center"
              >
                <AlignCenter size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                className={cn(btnBase, editor.isActive({ textAlign: 'right' }) && btnActive)}
                title="Align Right"
              >
                <AlignRight size={16} />
              </button>
              <button
                onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                className={cn(btnBase, editor.isActive({ textAlign: 'justify' }) && btnActive)}
                title="Justify"
              >
                <AlignJustify size={16} />
              </button>
            </RibbonGroup>

            <div className="w-px h-10 bg-gray-200 dark:bg-slate-700 self-center" />

            <RibbonGroup label="Page Setup">
              <div className="flex flex-col gap-1.5 px-1 py-0.5">
                <label className="text-[10px] flex items-center gap-2 text-gray-600 dark:text-slate-300">
                  Size:
                  <select
                    value={pageSettings?.size || 'a4'}
                    onChange={(e) => onPageSettingsChange?.({ ...(pageSettings || { margins: { top: 1, bottom: 1, left: 1, right: 1 }, orientation: 'portrait' } as any), size: e.target.value as any })}
                    className="text-[10px] border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded p-0.5 outline-none"
                  >
                    <option value="a4">A4</option>
                    <option value="letter">Letter</option>
                    <option value="legal">Legal</option>
                  </select>
                </label>
                <label className="text-[10px] flex items-center gap-2 text-gray-600 dark:text-slate-300">
                  Orient:
                  <select
                    value={pageSettings?.orientation || 'portrait'}
                    onChange={(e) => onPageSettingsChange?.({ ...(pageSettings || { margins: { top: 1, bottom: 1, left: 1, right: 1 }, size: 'a4' } as any), orientation: e.target.value as any })}
                    className="text-[10px] border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded p-0.5 outline-none"
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </label>
              </div>
            </RibbonGroup>

            <div className="w-px h-10 bg-gray-200 dark:bg-slate-700 self-center" />

            <RibbonGroup label="Header & Footer">
              <button
                onClick={onToggleHeaderFooter}
                className={cn(btnBase, "flex flex-col items-center justify-center p-2")}
                title="Edit Header & Footer"
              >
                <PanelTop size={16} />
                <span className="text-[9px] mt-0.5">Edit H/F</span>
              </button>
            </RibbonGroup>
          </>
        )}

        {/* ═══════════ REVIEW TAB ═══════════ */}
        {activeTab === 'review' && !isViewer && (
          <>
            <RibbonGroup label="Tracking">
              <button
                onClick={toggleTrackChanges}
                disabled={isSuggesting}
                className={cn("px-3 py-1.5 rounded flex items-center gap-2 text-xs font-bold uppercase tracking-wide transition-colors", trackChanges ? 'bg-amber-100 text-amber-700 shadow-inner dark:bg-amber-900/30 dark:text-amber-300' : 'text-gray-600 hover:bg-gray-200 dark:text-slate-400 dark:hover:bg-slate-700', isSuggesting && 'opacity-50 cursor-not-allowed')}
                title={isSuggesting ? "Always enabled in Suggestion Mode" : "Toggle Track Changes"}
              >
                <Eye size={16} />
                <span>Track Changes</span>
              </button>
            </RibbonGroup>

            <div className="w-px h-10 bg-gray-200 dark:bg-slate-700 self-center" />

            <RibbonGroup label="Changes">
              <button
                onClick={() => {
                  if (activeChangeAttrs?.changeId) editor.commands.acceptChange(activeChangeAttrs.changeId);
                }}
                disabled={disableReviewButtons}
                className={cn(
                  "p-1.5 flex items-center gap-1 rounded text-xs font-bold uppercase transition-colors",
                  disableReviewButtons
                    ? "text-gray-400 opacity-50 cursor-not-allowed dark:text-slate-500"
                    : "hover:bg-green-100 text-green-700 dark:text-green-400 dark:hover:bg-green-900/30"
                )}
                title={!hasActiveChange ? "No change selected" : isOwnChange ? "Cannot review your own change" : !canReview ? "Only Editors can review" : "Accept Change at Cursor"}
              >
                <Check size={16} /> Accept
              </button>
              <button
                onClick={() => {
                  if (activeChangeAttrs?.changeId) editor.commands.rejectChange(activeChangeAttrs.changeId);
                }}
                disabled={disableReviewButtons}
                className={cn(
                  "p-1.5 flex items-center gap-1 rounded text-xs font-bold uppercase transition-colors",
                  disableReviewButtons
                    ? "text-gray-400 opacity-50 cursor-not-allowed dark:text-slate-500"
                    : "hover:bg-red-100 text-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
                )}
                title={!hasActiveChange ? "No change selected" : isOwnChange ? "Cannot review your own change" : !canReview ? "Only Editors can review" : "Reject Change at Cursor"}
              >
                <X size={16} /> Reject
              </button>
            </RibbonGroup>

            <div className="w-px h-10 bg-gray-200 dark:bg-slate-700 self-center" />

            <RibbonGroup label="Comments">
              <button
                onClick={handleAddComment}
                className="px-3 py-1.5 rounded hover:bg-blue-100 text-blue-700 flex items-center gap-2 text-xs font-bold uppercase transition-colors dark:text-blue-400 dark:hover:bg-blue-900/30"
                title="Add Comment"
              >
                <MessageSquare size={16} />
                <span>Comment</span>
              </button>
            </RibbonGroup>
          </>
        )}

        {/* ═══════════ VIEW TAB ═══════════ */}
        {activeTab === 'view' && (
          <>
            <RibbonGroup label="Print">
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 rounded hover:bg-gray-200 text-gray-700 font-semibold flex items-center gap-2 text-xs uppercase tracking-wide transition-colors dark:text-slate-300 dark:hover:bg-slate-700"
                title="Print Document"
              >
                <Printer size={16} />
                <span>Print</span>
              </button>
            </RibbonGroup>

            <div className="w-px h-10 bg-gray-200 dark:bg-slate-700 self-center" />

            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-3 py-1.5 rounded hover:bg-gray-200 text-gray-700 font-semibold flex items-center gap-2 text-xs uppercase tracking-wide transition-colors dark:text-slate-300 dark:hover:bg-slate-700"
                title="Export Options"
              >
                <Download size={16} />
                <span>Export</span>
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

            <div className="w-px h-10 bg-gray-200 dark:bg-slate-700 self-center" />

            <RibbonGroup label="History">
              <button
                onClick={() => alert('Version History - Coming Soon')}
                className="px-3 py-1.5 rounded hover:bg-purple-100 text-purple-700 font-semibold flex items-center gap-2 text-xs uppercase tracking-wide transition-colors dark:text-purple-300 dark:hover:bg-purple-900/30"
                title="Version History"
              >
                <History size={16} />
                <span>History</span>
              </button>
            </RibbonGroup>
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
