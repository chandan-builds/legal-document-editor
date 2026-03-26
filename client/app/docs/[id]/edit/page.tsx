'use client';

import { useParams, useRouter } from 'next/navigation';
import OnlyOfficeEditor from '@/components/editor/OnlyOfficeEditor';

export default function EditDocumentPage() {
    const params = useParams();
    const router = useRouter();
    const documentId = params.id as string;

    const handleClose = () => {
        router.push('/dashboard');
    };

    return (
        <div className="h-screen w-screen flex flex-col bg-white dark:bg-slate-950">
            {/* Minimal header bar */}
            <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200 dark:bg-slate-900 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleClose}
                        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 font-medium transition dark:text-slate-400 dark:hover:text-indigo-400"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Dashboard
                    </button>
                </div>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                    Document Editor
                </span>
            </div>

            {/* Editor fills remaining space */}
            <div className="flex-1">
                <OnlyOfficeEditor
                    documentId={documentId}
                    isFinalized={false}
                />
            </div>
        </div>
    );
}
