'use client';

import { cn } from '@/utils/cn';

interface DocumentProgressBarProps {
    progress: number;
    clauseCount: number;
    approvedCount: number;
    pendingCount: number;
}

export default function DocumentProgressBar({
    progress,
    clauseCount,
    approvedCount,
    pendingCount,
}: DocumentProgressBarProps) {
    const getProgressColor = () => {
        if (progress >= 100) return 'bg-emerald-500';
        if (progress >= 60) return 'bg-amber-400';
        return 'bg-slate-300 dark:bg-slate-600';
    };

    return (
        <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm dark:bg-slate-900 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Document Progress</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden dark:bg-slate-700">
                <div
                    className={cn('h-full rounded-full transition-all duration-700 ease-in-out', getProgressColor())}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                />
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
                <span>{clauseCount} Total Clauses</span>
                <span className="text-emerald-600 font-semibold dark:text-emerald-400">{approvedCount} Approved</span>
                <span className="text-amber-600 font-semibold dark:text-amber-400">{pendingCount} Pending</span>
            </div>
        </div>
    );
}
