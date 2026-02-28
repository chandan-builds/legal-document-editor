'use client';

interface DocumentProgressBarProps {
    total: number;
    approved: number;
    omitted: number;
    pending: number;
}

export function DocumentProgressBar({ total, approved, omitted, pending }: DocumentProgressBarProps) {
    if (total === 0) return null;

    const approvedPct = (approved / total) * 100;
    const omittedPct = (omitted / total) * 100;
    const pendingPct = (pending / total) * 100;

    return (
        <div className="w-full bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm z-10">
            <div className="flex-1 max-w-2xl">
                <div className="flex items-center justify-between mb-1.5 w-full">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Document Progress</span>
                    <span className="text-xs font-medium text-slate-500">
                        {approved} / {total} Clauses Finalized
                    </span>
                </div>

                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                    <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${approvedPct}%` }}
                        title={`${approved} Approved`}
                    />
                    <div
                        className="h-full bg-amber-400 transition-all duration-500"
                        style={{ width: `${pendingPct}%` }}
                        title={`${pending} Pending`}
                    />
                    <div
                        className="h-full bg-slate-300 transition-all duration-500"
                        style={{ width: `${omittedPct}%` }}
                        title={`${omitted} Omitted`}
                    />
                </div>
            </div>

            <div className="ml-6 flex gap-4 text-[11px] font-medium text-slate-500">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" /> Finalized
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-amber-400" /> Pending Review
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-slate-300" /> Omitted
                </div>
            </div>
        </div>
    );
}
