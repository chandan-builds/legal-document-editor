'use client';

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlignLeft, AlignCenter, AlignRight, Maximize2, Minimize2, Trash2 } from 'lucide-react';

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        resizableImage: {
            /**
             * Add an image
             */
            setImage: (options: { src: string; alt?: string; title?: string; width?: number; height?: number }) => ReturnType;
        };
    }
}

// ── Resizable Image Node View Component ────────────────────────────
function ResizableImageComponent({ node, updateAttributes, selected, deleteNode, editor }: any) {
    const imgRef = useRef<HTMLImageElement>(null);
    const [isResizing, setIsResizing] = useState(false);
    const [startX, setStartX] = useState(0);
    const [startWidth, setStartWidth] = useState(0);
    const [showToolbar, setShowToolbar] = useState(false);

    const width = node.attrs.width || null;
    const alignment = node.attrs.alignment || 'center';

    // Show toolbar when selected
    useEffect(() => {
        setShowToolbar(selected);
    }, [selected]);

    // ── Resize via corner drag ─────────────────────────────────────
    const onMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        setStartX(e.clientX);
        setStartWidth(imgRef.current?.offsetWidth || 400);
    }, []);

    useEffect(() => {
        if (!isResizing) return;

        const onMouseMove = (e: MouseEvent) => {
            const diff = e.clientX - startX;
            const newWidth = Math.max(100, startWidth + diff);
            updateAttributes({ width: newWidth });
        };

        const onMouseUp = () => {
            setIsResizing(false);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }, [isResizing, startX, startWidth, updateAttributes]);

    // ── Preset widths ──────────────────────────────────────────────
    const setPresetWidth = (pct: number) => {
        const editorEl = editor?.view?.dom;
        if (editorEl) {
            const containerWidth = editorEl.clientWidth - 40; // minus padding
            updateAttributes({ width: Math.round(containerWidth * pct / 100) });
        }
    };

    const alignmentStyles: Record<string, React.CSSProperties> = {
        left: { display: 'flex', justifyContent: 'flex-start' },
        center: { display: 'flex', justifyContent: 'center' },
        right: { display: 'flex', justifyContent: 'flex-end' },
    };

    const btnClass = "p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors";
    const activeBtnClass = "p-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";

    return (
        <NodeViewWrapper style={alignmentStyles[alignment] || alignmentStyles.center}>
            <div className="relative inline-block group" style={{ width: width ? `${width}px` : 'auto' }}>
                {/* Image */}
                <img
                    ref={imgRef}
                    src={node.attrs.src}
                    alt={node.attrs.alt || ''}
                    title={node.attrs.title || ''}
                    draggable={false}
                    style={{
                        width: width ? `${width}px` : '100%',
                        maxWidth: '100%',
                        height: 'auto',
                        display: 'block',
                        borderRadius: '4px',
                        outline: selected ? '3px solid #3b82f6' : 'none',
                        outlineOffset: '2px',
                        cursor: 'pointer',
                    }}
                />

                {/* Resize handle (bottom-right corner) */}
                <div
                    onMouseDown={onMouseDown}
                    className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                        background: 'linear-gradient(135deg, transparent 50%, #3b82f6 50%)',
                        borderRadius: '0 0 4px 0',
                    }}
                />

                {/* Resize handle (bottom-left corner) */}
                <div
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsResizing(true);
                        setStartX(e.clientX);
                        setStartWidth(-(imgRef.current?.offsetWidth || 400));
                    }}
                    className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                        background: 'linear-gradient(225deg, transparent 50%, #3b82f6 50%)',
                        borderRadius: '0 0 0 4px',
                    }}
                />

                {/* Floating Toolbar */}
                {showToolbar && (
                    <div
                        className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-0.5 px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-xl z-50"
                        contentEditable={false}
                    >
                        {/* Alignment */}
                        <button
                            onClick={() => updateAttributes({ alignment: 'left' })}
                            className={alignment === 'left' ? activeBtnClass : btnClass}
                            title="Align Left"
                        >
                            <AlignLeft size={14} />
                        </button>
                        <button
                            onClick={() => updateAttributes({ alignment: 'center' })}
                            className={alignment === 'center' ? activeBtnClass : btnClass}
                            title="Align Center"
                        >
                            <AlignCenter size={14} />
                        </button>
                        <button
                            onClick={() => updateAttributes({ alignment: 'right' })}
                            className={alignment === 'right' ? activeBtnClass : btnClass}
                            title="Align Right"
                        >
                            <AlignRight size={14} />
                        </button>

                        <div className="w-px h-5 bg-gray-200 dark:bg-slate-600 mx-0.5" />

                        {/* Size presets */}
                        <button
                            onClick={() => setPresetWidth(25)}
                            className={btnClass}
                            title="25% width"
                        >
                            <span className="text-[10px] font-bold">25%</span>
                        </button>
                        <button
                            onClick={() => setPresetWidth(50)}
                            className={btnClass}
                            title="50% width"
                        >
                            <span className="text-[10px] font-bold">50%</span>
                        </button>
                        <button
                            onClick={() => setPresetWidth(75)}
                            className={btnClass}
                            title="75% width"
                        >
                            <span className="text-[10px] font-bold">75%</span>
                        </button>
                        <button
                            onClick={() => setPresetWidth(100)}
                            className={btnClass}
                            title="Full width"
                        >
                            <Maximize2 size={14} />
                        </button>
                        <button
                            onClick={() => updateAttributes({ width: null })}
                            className={btnClass}
                            title="Original size"
                        >
                            <Minimize2 size={14} />
                        </button>

                        <div className="w-px h-5 bg-gray-200 dark:bg-slate-600 mx-0.5" />

                        {/* Delete */}
                        <button
                            onClick={deleteNode}
                            className="p-1 rounded hover:bg-red-100 text-red-500 dark:hover:bg-red-900/30 transition-colors"
                            title="Delete Image"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}

                {/* Width indicator */}
                {isResizing && width && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full">
                        {Math.round(width)}px
                    </div>
                )}
            </div>
        </NodeViewWrapper>
    );
}

// ── Custom Image Extension with Resizable NodeView ─────────────────
export const ResizableImage = Node.create({
    name: 'image',

    addOptions() {
        return {
            inline: false,
            allowBase64: true,
            HTMLAttributes: {},
        };
    },

    inline() {
        return this.options.inline;
    },

    group() {
        return this.options.inline ? 'inline' : 'block';
    },

    draggable: true,

    addAttributes() {
        return {
            src: { default: null },
            alt: { default: null },
            title: { default: null },
            width: { default: null },
            height: { default: null },
            alignment: { default: 'center' },
        };
    },

    parseHTML() {
        return [{ tag: 'img[src]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
    },

    addNodeView() {
        return ReactNodeViewRenderer(ResizableImageComponent);
    },

    addCommands() {
        return {
            setImage: (options: Record<string, any>) => ({ commands }: { commands: any }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: options,
                });
            },
        } as any;
    },
});
