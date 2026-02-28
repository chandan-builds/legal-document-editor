'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/services/api';

interface ApprovalBannerProps {
    clauseId: string | null;
    status?: string;
    isLocked?: boolean;
    lockedBy?: string | null;
    onStatusChange: () => void;
}

export function ApprovalBanner({ clauseId, status, isLocked, lockedBy, onStatusChange }: ApprovalBannerProps) {
    const { user } = useAuth();
    const [isProcessing, setIsProcessing] = useState(false);

    if (!clauseId || !status) return null;

    const isClient = user?.role === 'CLIENT';
    const isVendor = user?.role === 'VENDOR';

    const handleAction = async (action: string) => {
        setIsProcessing(true);
        try {
            await api.post(`/clauses/${clauseId}/action`, { action });
            onStatusChange();
        } catch (error: any) {
            alert(error.response?.data?.message || 'Failed to process action');
        } finally {
            setIsProcessing(false);
        }
    };

    const renderContent = () => {
        if (status === 'MUTUALLY_APPROVED') {
            return (
                <div className="bg-emerald-50 border-emerald-200 text-emerald-800 px-4 py-2 border-b flex items-center justify-between text-sm">
                    <div className="flex items-center font-medium gap-2">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Clause Mutually Approved (Finalized)
                    </div>
                    <span className="text-xs tracking-wider uppercase font-bold text-emerald-600">Locked</span>
                </div>
            );
        }

        if (status === 'OMITTED') {
            return (
                <div className="bg-slate-100 border-slate-300 text-slate-700 px-4 py-2 border-b flex items-center justify-between text-sm">
                    <div className="font-medium">This clause has been marked for omission.</div>
                    <button
                        onClick={() => handleAction('REQUEST_CHANGES')}
                        disabled={isProcessing}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-300 bg-white px-3 py-1 rounded"
                    >
                        RESTORE
                    </button>
                </div>
            );
        }

        // Pending States
        const needsMyApproval =
            (isClient && status === 'PENDING_CLIENT_APPROVAL') ||
            (isVendor && status === 'PENDING_VENDOR_APPROVAL');

        const waitingOnOther =
            (isClient && status === 'PENDING_VENDOR_APPROVAL') ||
            (isVendor && status === 'PENDING_CLIENT_APPROVAL');

        if (needsMyApproval) {
            return (
                <div className="bg-amber-50 border-amber-200 text-amber-900 px-4 py-2 border-b flex items-center justify-between text-sm">
                    <div className="font-medium flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                        </span>
                        Pending your approval
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleAction('APPROVE')}
                            disabled={isProcessing}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded text-xs font-bold shadow-sm disabled:opacity-50"
                        >
                            APPROVE
                        </button>
                        <button
                            onClick={() => handleAction('REJECT')}
                            disabled={isProcessing}
                            className="bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 px-4 py-1.5 rounded text-xs font-bold disabled:opacity-50"
                        >
                            REJECT
                        </button>
                    </div>
                </div>
            );
        }

        if (waitingOnOther) {
            return (
                <div className="bg-blue-50 border-blue-200 text-blue-800 px-4 py-2 border-b flex items-center justify-between text-sm">
                    <div className="font-medium flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        Waiting for {isClient ? 'Vendor' : 'Client'} approval
                    </div>
                </div>
            );
        }

        // Default Draft state
        return (
            <div className="bg-slate-50 border-slate-200 text-slate-700 px-4 py-2 border-b flex items-center justify-between text-sm">
                <div className="font-medium">Draft Clause</div>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleAction('REQUEST_CHANGES')}
                        disabled={isProcessing}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded text-xs font-bold shadow-sm disabled:opacity-50"
                    >
                        SUBMIT FOR APPROVAL
                    </button>
                    <button
                        onClick={() => handleAction('OMIT')}
                        disabled={isProcessing}
                        className="bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 px-4 py-1.5 rounded text-xs font-bold disabled:opacity-50"
                    >
                        OMIT
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full">
            {renderContent()}
            {isLocked && lockedBy !== user?.id && (
                <div className="bg-red-50 text-red-700 px-4 py-1 text-xs font-medium border-b border-red-100 flex items-center justify-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Clause is currently locked by another user
                </div>
            )}
        </div>
    );
}
