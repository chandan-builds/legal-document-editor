'use client';

import { useState, useRef, useCallback } from 'react';

interface UploadDocumentWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

type Step = 'details' | 'upload' | 'review';

export default function UploadDocumentWizard({ isOpen, onClose, onSuccess }: UploadDocumentWizardProps) {
    const [step, setStep] = useState<Step>('details');
    const [title, setTitle] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const reset = useCallback(() => {
        setStep('details');
        setTitle('');
        setFile(null);
        setIsSubmitting(false);
        setError(null);
        setIsDragOver(false);
    }, []);

    const handleClose = () => {
        if (!isSubmitting) {
            reset();
            onClose();
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError(null);
        try {
            const api = (await import('@/services/api')).default;
            if (file) {
                const formData = new FormData();
                formData.append('file', file, file.name);
                if (title.trim()) {
                    formData.append('title', title.trim());
                }
                await api.post('/documents', formData);
            } else {
                await api.post('/documents', { title: title.trim() });
            }
            reset();
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error('Failed to create document:', err);
            setError(err.response?.data?.message || 'Failed to create document. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && (droppedFile.name.endsWith('.docx') || droppedFile.name.endsWith('.doc'))) {
            setFile(droppedFile);
            if (!title.trim()) {
                setTitle(droppedFile.name.replace(/\.(docx?|doc)$/i, ''));
            }
        }
    }, [title]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            if (!title.trim()) {
                setTitle(selectedFile.name.replace(/\.(docx?|doc)$/i, ''));
            }
        }
    };

    if (!isOpen) return null;

    const stepNumber = step === 'details' ? 1 : step === 'upload' ? 2 : 3;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg mx-4 overflow-hidden">
                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            New Document
                        </h3>
                        <button onClick={handleClose} disabled={isSubmitting} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Step indicator */}
                    <div className="flex items-center gap-2">
                        {(['details', 'upload', 'review'] as Step[]).map((s, i) => (
                            <div key={s} className="flex items-center gap-2 flex-1">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${stepNumber > i + 1
                                        ? 'bg-indigo-600 text-white'
                                        : stepNumber === i + 1
                                            ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-900/50'
                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                    }`}>
                                    {stepNumber > i + 1 ? '✓' : i + 1}
                                </div>
                                <span className={`text-xs font-semibold hidden sm:block ${stepNumber === i + 1 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                                    }`}>
                                    {s === 'details' ? 'Details' : s === 'upload' ? 'Upload' : 'Review'}
                                </span>
                                {i < 2 && <div className={`flex-1 h-0.5 rounded ${stepNumber > i + 1 ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`} />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="px-6 py-6 min-h-[240px]">
                    {step === 'details' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Document Title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., Master Service Agreement"
                                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                                    autoFocus
                                />
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
                                    Give your document a clear, searchable name.
                                </p>
                            </div>
                        </div>
                    )}

                    {step === 'upload' && (
                        <div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".docx,.doc"
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                            <div
                                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${isDragOver
                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                        : file
                                            ? 'border-green-400 bg-green-50 dark:bg-green-900/10 dark:border-green-600'
                                            : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                                onDragLeave={() => setIsDragOver(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {file ? (
                                    <div className="space-y-2">
                                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                                            <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <p className="font-semibold text-slate-900 dark:text-white text-sm">{file.name}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                            className="text-xs text-red-500 hover:text-red-700 font-medium"
                                        >
                                            Remove file
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto">
                                            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                        </div>
                                        <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm">
                                            Drag & drop your document here
                                        </p>
                                        <p className="text-xs text-slate-400 dark:text-slate-500">
                                            or click to browse • Supports .docx files up to 10MB
                                        </p>
                                    </div>
                                )}
                            </div>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 text-center">
                                You can skip this step to create a blank document.
                            </p>
                        </div>
                    )}

                    {step === 'review' && (
                        <div className="space-y-4">
                            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Title</span>
                                    <span className="text-sm font-semibold text-slate-900 dark:text-white">{title || 'Untitled'}</span>
                                </div>
                                <div className="border-t border-slate-200 dark:border-slate-700" />
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">File</span>
                                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                        {file ? file.name : 'Blank document'}
                                    </span>
                                </div>
                                {file && (
                                    <>
                                        <div className="border-t border-slate-200 dark:border-slate-700" />
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Size</span>
                                            <span className="text-sm text-slate-600 dark:text-slate-300">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                        </div>
                                    </>
                                )}
                            </div>
                            {error && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <button
                        onClick={() => step === 'details' ? handleClose() : setStep(step === 'review' ? 'upload' : 'details')}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition disabled:opacity-50"
                    >
                        {step === 'details' ? 'Cancel' : 'Back'}
                    </button>
                    <button
                        onClick={() => {
                            if (step === 'details') setStep('upload');
                            else if (step === 'upload') setStep('review');
                            else handleSubmit();
                        }}
                        disabled={step === 'details' && !title.trim() || isSubmitting}
                        className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2 shadow-sm"
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Creating...
                            </>
                        ) : step === 'review' ? (
                            'Create Document'
                        ) : (
                            'Next'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
