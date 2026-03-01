'use client';

import { cn } from '@/utils/cn';
import { ShieldCheck, Clock, AlertTriangle, Lock, FileText } from 'lucide-react';

type ApprovalStatus =
    | 'DRAFT'
    | 'PENDING_CLIENT_APPROVAL'
    | 'PENDING_VENDOR_APPROVAL'
    | 'CLIENT_APPROVED'
    | 'VENDOR_APPROVED'
    | 'PENDING_MUTUAL_APPROVAL'
    | 'MUTUALLY_APPROVED'
    | 'REJECTED'
    | 'OMITTED';

interface ApprovalBannerProps {
    status: ApprovalStatus;
    clauseTitle?: string;
    onAction?: (action: string) => void;
    currentRole?: string;
}

const statusConfig: Record<ApprovalStatus, {
    label: string;
    description: string;
    bg: string;
    text: string;
    border: string;
    icon: React.ReactNode;
}> = {
    DRAFT: {
        label: 'Draft',
        description: 'This clause has not been submitted for approval yet.',
        bg: 'bg-slate-50 dark:bg-slate-800/50',
        text: 'text-slate-600 dark:text-slate-300',
        border: 'border-slate-200 dark:border-slate-700',
        icon: <FileText size={16} />,
    },
    PENDING_CLIENT_APPROVAL: {
        label: 'Pending Client Approval',
        description: 'Waiting for the Client to review and approve this clause.',
        bg: 'bg-amber-50 dark:bg-amber-900/15',
        text: 'text-amber-900 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-800',
        icon: <Clock size={16} />,
    },
    PENDING_VENDOR_APPROVAL: {
        label: 'Pending Vendor Approval',
        description: 'Waiting for the Vendor to review and approve this clause.',
        bg: 'bg-amber-50 dark:bg-amber-900/15',
        text: 'text-amber-900 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-800',
        icon: <Clock size={16} />,
    },
    CLIENT_APPROVED: {
        label: 'Client Approved — Awaiting Vendor',
        description: 'The Client has approved. This clause needs Vendor approval to become final.',
        bg: 'bg-blue-50 dark:bg-blue-900/15',
        text: 'text-blue-800 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-800',
        icon: <Clock size={16} />,
    },
    VENDOR_APPROVED: {
        label: 'Vendor Approved — Awaiting Client',
        description: 'The Vendor has approved. This clause needs Client approval to become final.',
        bg: 'bg-blue-50 dark:bg-blue-900/15',
        text: 'text-blue-800 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-800',
        icon: <Clock size={16} />,
    },
    PENDING_MUTUAL_APPROVAL: {
        label: 'Pending Mutual Approval',
        description: 'Both Client and Vendor must approve this clause before it is locked.',
        bg: 'bg-amber-50 dark:bg-amber-900/15',
        text: 'text-amber-900 dark:text-amber-300',
        border: 'border-amber-200 dark:border-amber-800',
        icon: <Clock size={16} />,
    },
    MUTUALLY_APPROVED: {
        label: 'Mutually Approved & Locked',
        description: 'This clause has been approved by both parties and is now immutable.',
        bg: 'bg-emerald-50 dark:bg-emerald-900/15',
        text: 'text-emerald-800 dark:text-emerald-300',
        border: 'border-emerald-200 dark:border-emerald-800',
        icon: <ShieldCheck size={16} />,
    },
    REJECTED: {
        label: 'Rejected',
        description: 'This clause was rejected and needs revision.',
        bg: 'bg-red-50 dark:bg-red-900/15',
        text: 'text-red-700 dark:text-red-300',
        border: 'border-red-200 dark:border-red-900',
        icon: <AlertTriangle size={16} />,
    },
    OMITTED: {
        label: 'Omitted',
        description: 'This clause has been marked as omitted from the final document.',
        bg: 'bg-gray-50 dark:bg-slate-800/50',
        text: 'text-gray-500 dark:text-slate-400',
        border: 'border-gray-200 dark:border-slate-700',
        icon: <Lock size={16} />,
    },
};

export default function ApprovalBanner({ status, clauseTitle, onAction, currentRole }: ApprovalBannerProps) {
    const config = statusConfig[status] || statusConfig.DRAFT;

    return (
        <div className={cn('rounded-lg border px-4 py-3 flex items-start gap-3', config.bg, config.border)}>
            <div className={cn('mt-0.5', config.text)}>
                {config.icon}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <h4 className={cn('text-sm font-bold', config.text)}>
                        {config.label}
                    </h4>
                    {clauseTitle && (
                        <span className="text-[10px] text-slate-400 truncate dark:text-slate-500">{clauseTitle}</span>
                    )}
                </div>
                <p className={cn('text-xs mt-0.5 opacity-80', config.text)}>
                    {config.description}
                </p>
            </div>
        </div>
    );
}
