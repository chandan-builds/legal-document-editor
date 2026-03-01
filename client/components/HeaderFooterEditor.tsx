'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { FileText, Hash, Calendar, User, ChevronDown, X, Settings2 } from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────
interface HeaderFooterEditorProps {
    documentId: string;
    headerContent: HeaderFooterContent;
    footerContent: HeaderFooterContent;
    onUpdate: (type: 'header' | 'footer', content: HeaderFooterContent) => void;
}

export interface HeaderFooterContent {
    left: string;
    center: string;
    right: string;
    showPageNumber: boolean;
    pageNumberPosition: 'left' | 'center' | 'right';
}

export const defaultHeaderContent: HeaderFooterContent = {
    left: '',
    center: '',
    right: '',
    showPageNumber: false,
    pageNumberPosition: 'center',
};

export const defaultFooterContent: HeaderFooterContent = {
    left: '',
    center: '',
    right: '',
    showPageNumber: true,
    pageNumberPosition: 'center',
};

// ── Dynamic field tokens ────────────────────────────────────────────
const FIELD_TOKENS = [
    { label: 'Page Number', value: '{{page}}', icon: Hash },
    { label: 'Date', value: '{{date}}', icon: Calendar },
    { label: 'Author', value: '{{author}}', icon: User },
    { label: 'Title', value: '{{title}}', icon: FileText },
];

function resolveTokens(text: string, meta?: { author?: string; title?: string; page?: number; total?: number }): string {
    return text
        .replace(/\{\{page\}\}/g, String(meta?.page ?? 1))
        .replace(/\{\{total\}\}/g, String(meta?.total ?? 1))
        .replace(/\{\{date\}\}/g, new Date().toLocaleDateString())
        .replace(/\{\{author\}\}/g, meta?.author ?? '')
        .replace(/\{\{title\}\}/g, meta?.title ?? '');
}

// ── Section Editor ──────────────────────────────────────────────────
function SectionEditor({
    type,
    content,
    onUpdate,
    isExpanded,
    onToggle,
}: {
    type: 'header' | 'footer';
    content: HeaderFooterContent;
    onUpdate: (content: HeaderFooterContent) => void;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    const [showFields, setShowFields] = useState(false);
    const [activeInput, setActiveInput] = useState<'left' | 'center' | 'right'>('center');
    const inputRefs = useRef<Record<string, HTMLInputElement | null>>({ left: null, center: null, right: null });

    const insertField = (token: string) => {
        const updated = { ...content, [activeInput]: content[activeInput] + token };
        onUpdate(updated);
        setShowFields(false);
        inputRefs.current[activeInput]?.focus();
    };

    const handleChange = (position: 'left' | 'center' | 'right', value: string) => {
        onUpdate({ ...content, [position]: value });
    };

    const label = type === 'header' ? 'Header' : 'Footer';

    return (
        <div className={`border ${isExpanded ? 'border-blue-300 dark:border-blue-700' : 'border-transparent'} rounded transition-all`}>
            {/* Toggle bar */}
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-medium text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50 rounded transition-colors"
            >
                <span className="uppercase tracking-wider">{label}</span>
                <ChevronDown size={12} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {isExpanded && (
                <div className="px-3 pb-2 space-y-2">
                    {/* Three-column input (Left / Center / Right) */}
                    <div className="grid grid-cols-3 gap-1">
                        {(['left', 'center', 'right'] as const).map((pos) => (
                            <div key={pos} className="relative">
                                <input
                                    ref={(el) => { inputRefs.current[pos] = el; }}
                                    type="text"
                                    value={content[pos]}
                                    onChange={(e) => handleChange(pos, e.target.value)}
                                    onFocus={() => setActiveInput(pos)}
                                    placeholder={pos.charAt(0).toUpperCase() + pos.slice(1)}
                                    className="w-full text-[11px] px-2 py-1 rounded border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder:text-gray-300 dark:placeholder:text-slate-600"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Controls row */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {/* Insert field dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowFields(!showFields)}
                                    className="text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 font-medium transition-colors"
                                >
                                    + Insert Field
                                </button>
                                {showFields && (
                                    <div className="absolute left-0 mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded shadow-xl z-50 min-w-[140px]">
                                        {FIELD_TOKENS.map((f) => (
                                            <button
                                                key={f.value}
                                                onClick={() => insertField(f.value)}
                                                className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                                            >
                                                <f.icon size={12} className="text-gray-400" />
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Page number toggle */}
                            <label className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-slate-400 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={content.showPageNumber}
                                    onChange={(e) => onUpdate({ ...content, showPageNumber: e.target.checked })}
                                    className="w-3 h-3 rounded"
                                />
                                Page #
                            </label>
                        </div>

                        {/* Preview */}
                        <span className="text-[9px] text-gray-400 dark:text-slate-500 italic">
                            Preview: {resolveTokens(content[activeInput] || '(empty)', { page: 1, total: 5, author: 'You', title: 'Document' })}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Page Settings Panel ─────────────────────────────────────────────
export interface PageSettings {
    margins: { top: number; bottom: number; left: number; right: number };
    size: 'letter' | 'a4' | 'legal';
    orientation: 'portrait' | 'landscape';
}

export const defaultPageSettings: PageSettings = {
    margins: { top: 1, bottom: 1, left: 1, right: 1 },
    size: 'a4',
    orientation: 'portrait',
};

// ── Main Component ──────────────────────────────────────────────────
export default function HeaderFooterEditor({
    documentId,
    headerContent,
    footerContent,
    onUpdate,
}: HeaderFooterEditorProps) {
    const [expandedSection, setExpandedSection] = useState<'header' | 'footer' | null>(null);

    return (
        <div className="border-t border-gray-100 dark:border-slate-800">
            <SectionEditor
                type="header"
                content={headerContent}
                onUpdate={(c) => onUpdate('header', c)}
                isExpanded={expandedSection === 'header'}
                onToggle={() => setExpandedSection(expandedSection === 'header' ? null : 'header')}
            />
            <SectionEditor
                type="footer"
                content={footerContent}
                onUpdate={(c) => onUpdate('footer', c)}
                isExpanded={expandedSection === 'footer'}
                onToggle={() => setExpandedSection(expandedSection === 'footer' ? null : 'footer')}
            />
        </div>
    );
}

// ── Export helper for DOCX ──────────────────────────────────────────
export { resolveTokens };
