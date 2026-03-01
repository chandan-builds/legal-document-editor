import { useEffect, useState } from 'react';
import { XCircle, ArrowRight } from 'lucide-react';
import * as Y from 'yjs';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import { ClauseNode } from '@/editor/extensions/ClauseNode';

interface VersionSnapshot {
    snapshot: number[];
    versionNumber: number;
}

interface CompareOverlayProps {
    base: VersionSnapshot;
    target?: VersionSnapshot | null;
    onClose: () => void;
}

export default function CompareOverlay({ base, target, onClose }: CompareOverlayProps) {
    const [baseDoc, setBaseDoc] = useState<Y.Doc | null>(null);
    const [targetDoc, setTargetDoc] = useState<Y.Doc | null>(null);

    useEffect(() => {
        // Initialize Yjs docs from binary snapshots
        const bDoc = new Y.Doc();
        Y.applyUpdate(bDoc, new Uint8Array(base.snapshot));
        setBaseDoc(bDoc);

        if (target) {
            const tDoc = new Y.Doc();
            Y.applyUpdate(tDoc, new Uint8Array(target.snapshot));
            setTargetDoc(tDoc);
        } else {
            setTargetDoc(null);
        }

        return () => {
            bDoc.destroy();
        };
    }, [base, target]);

    if (!baseDoc) return null;

    return (
        <div className="absolute inset-0 z-[60] bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-7xl h-full rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 dark:bg-slate-900">

                {/* Header */}
                <div className="p-4 bg-gray-900 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <h3 className="font-bold text-lg">Version Comparison</h3>
                        <div className="flex items-center gap-2 text-sm bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-700">
                            <span className="text-gray-400">Comparing:</span>
                            <span className="font-bold text-emerald-400">Version {base.versionNumber}</span>
                            {target && (
                                <>
                                    <ArrowRight size={14} className="text-gray-500 mx-1" />
                                    <span className="font-bold text-blue-400">Version {target.versionNumber}</span>
                                </>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <XCircle size={24} />
                    </button>
                </div>

                {/* Split View */}
                <div className="flex-1 overflow-hidden flex bg-gray-100 dark:bg-slate-950">

                    {/* Base Version Pane */}
                    <div className="flex-1 flex flex-col border-r border-gray-300 dark:border-slate-700">
                        <div className="bg-emerald-50 text-emerald-800 text-center py-2 text-xs font-bold border-b border-emerald-100 uppercase tracking-widest dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-900">
                            Version {base.versionNumber}
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 flex justify-center">
                            <div className="max-w-[816px] w-full bg-white shadow-xl min-h-[800px] border border-gray-200 p-16 dark:bg-slate-900 dark:border-slate-700 dark:shadow-slate-900/50">
                                <ReadOnlyTiptap ydoc={baseDoc} />
                            </div>
                        </div>
                    </div>

                    {/* Target Version Pane */}
                    {targetDoc ? (
                        <div className="flex-1 flex flex-col">
                            <div className="bg-blue-50 text-blue-800 text-center py-2 text-xs font-bold border-b border-blue-100 uppercase tracking-widest dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-900">
                                Version {target!.versionNumber}
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 flex justify-center">
                                <div className="max-w-[816px] w-full bg-white shadow-xl min-h-[800px] border border-gray-200 p-16 dark:bg-slate-900 dark:border-slate-700 dark:shadow-slate-900/50">
                                    <ReadOnlyTiptap ydoc={targetDoc} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-50 italic dark:bg-slate-900 dark:text-slate-500">
                            No previous version to compare against.
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

function ReadOnlyTiptap({ ydoc }: { ydoc: Y.Doc }) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            ClauseNode,
            Collaboration.configure({ document: ydoc }),
        ],
        editable: false,
        content: '', // Collaboration handles content
    });

    if (!editor) return null;

    return (
        <div className="prose prose-sm max-w-none opacity-80 pointer-events-none select-none">
            <EditorContent editor={editor} />
        </div>
    );
}
