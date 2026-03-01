'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { Scroll, Filter, ExternalLink, ChevronDown, Calendar } from 'lucide-react';
import { AuditLogEntry } from '@/types/audit';
import { cn } from '@/utils/cn';
import { Virtuoso } from 'react-virtuoso';

interface AuditTrailSidebarProps {
  logs: AuditLogEntry[];
  currentVersion: number;
  onCreateVersion: () => void;
  hasMore: boolean;
  onLoadMore: () => void;
  onNavigateToEntity?: (entityType: string, entityId: string) => void;
}

const actionColors: Record<string, string> = {
  DOCUMENT_CREATED: 'text-blue-600 dark:text-blue-400',
  DOCUMENT_UPDATED: 'text-green-600 dark:text-green-400',
  COMMENT_ADDED: 'text-orange-600 dark:text-orange-400',
  COMMENT_RESOLVED: 'text-gray-600 dark:text-slate-400',
  VERSION_CREATED: 'text-purple-600 dark:text-purple-400',
  VERSION_RESTORED: 'text-red-600 dark:text-red-400',
  COLLABORATOR_ADDED: 'text-indigo-600 dark:text-indigo-400',
  COLLABORATOR_REMOVED: 'text-pink-600 dark:text-pink-400',
  CLAUSE_APPROVED: 'text-emerald-600 dark:text-emerald-400',
  CLAUSE_REJECTED: 'text-red-600 dark:text-red-400',
  SUGGESTION_CREATED: 'text-amber-600 dark:text-amber-400',
  SUGGESTION_ACCEPTED: 'text-green-600 dark:text-green-400',
  SUGGESTION_REJECTED: 'text-red-600 dark:text-red-400',
  DOCUMENT_FINALIZED: 'text-teal-700 dark:text-teal-400',
};

const actionLabels: Record<string, string> = {
  DOCUMENT_CREATED: 'Created Document',
  DOCUMENT_UPDATED: 'Updated Content',
  COMMENT_ADDED: 'Added Comment',
  COMMENT_RESOLVED: 'Resolved Comment',
  VERSION_CREATED: 'Saved Version',
  VERSION_RESTORED: 'Restored Version',
  COLLABORATOR_ADDED: 'Added Collaborator',
  COLLABORATOR_REMOVED: 'Removed Collaborator',
  CLAUSE_APPROVED: 'Approved Clause',
  CLAUSE_REJECTED: 'Rejected Clause',
  SUGGESTION_CREATED: 'Created Suggestion',
  SUGGESTION_ACCEPTED: 'Accepted Suggestion',
  SUGGESTION_REJECTED: 'Rejected Suggestion',
  DOCUMENT_FINALIZED: 'Finalized Document',
};

export default function AuditTrailSidebar({ logs, currentVersion, onCreateVersion, hasMore, onLoadMore, onNavigateToEntity }: AuditTrailSidebarProps) {
  useEffect(() => {
    console.debug('[DEBUG] AuditTrailSidebar rendered');
  }, []);

  const [filter, setFilter] = useState<string>('all');

  const filteredLogs = filter === 'all'
    ? logs
    : logs.filter(l => l.action === filter);

  const formatDate = (ts: string) => {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Group logs by date
  const groupedLogs: { date: string; items: AuditLogEntry[] }[] = [];
  let currentDate = '';
  for (const log of filteredLogs) {
    const date = formatDate(log.timestamp);
    if (date !== currentDate) {
      currentDate = date;
      groupedLogs.push({ date, items: [] });
    }
    groupedLogs[groupedLogs.length - 1].items.push(log);
  }

  return (
    <div className="w-80 border-l bg-gray-50 flex flex-col h-full print:hidden dark:bg-slate-900 dark:border-slate-700">
      {/* Header */}
      <div className="p-4 border-b bg-white flex items-center justify-between dark:bg-slate-800 dark:border-slate-700">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2 dark:text-white">
          <Scroll size={18} />
          <span>Audit Trail</span>
        </h2>
        <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase dark:bg-slate-700 dark:text-slate-400">
          v{currentVersion}
        </span>
      </div>

      {/* Filters */}
      <div className="px-4 py-2 border-b bg-white flex items-center gap-2 dark:bg-slate-800 dark:border-slate-700">
        <Filter size={12} className="text-gray-400 dark:text-slate-500" />
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="flex-1 text-[10px] bg-gray-50 border border-gray-200 rounded px-2 py-1 text-gray-600 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-300"
        >
          <option value="all">All Activity</option>
          <option value="DOCUMENT_CREATED">Document Created</option>
          <option value="DOCUMENT_UPDATED">Content Updates</option>
          <option value="COMMENT_ADDED">Comments</option>
          <option value="VERSION_CREATED">Versions</option>
          <option value="COLLABORATOR_ADDED">Collaborators</option>
          <option value="CLAUSE_APPROVED">Approvals</option>
          <option value="SUGGESTION_CREATED">Suggestions</option>
          <option value="DOCUMENT_FINALIZED">Finalization</option>
        </select>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <Scroll size={48} className="mx-auto text-gray-300 mb-4 dark:text-slate-600" />
            <p className="text-gray-500 text-sm italic dark:text-slate-400">No audit activity recorded yet.</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {groupedLogs.map((group, gi) => (
              <div key={gi}>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={10} className="text-gray-400 dark:text-slate-500" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest dark:text-slate-500">{group.date}</span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
                </div>
                <div className="space-y-2 ml-1">
                  {group.items.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-2 rounded-lg hover:bg-white transition-colors group cursor-default dark:hover:bg-slate-800"
                    >
                      <div className="mt-1 w-2 h-2 rounded-full bg-gray-300 border-2 border-gray-100 shrink-0 dark:bg-slate-600 dark:border-slate-800" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className={cn("text-xs font-bold", actionColors[log.action] || 'text-gray-600 dark:text-slate-300')}>
                            {actionLabels[log.action] || log.action}
                          </span>
                          <span className="text-[9px] text-gray-400 shrink-0 dark:text-slate-500">{formatTime(log.timestamp)}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-slate-400">
                          by <span className="font-semibold text-gray-700 dark:text-slate-300">{log.userName}</span>
                        </p>
                        {log.content && (
                          <p className="text-[10px] text-gray-400 mt-1 truncate dark:text-slate-500">{log.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {hasMore && (
              <button
                onClick={onLoadMore}
                className="w-full text-center text-xs text-blue-600 hover:text-blue-800 font-medium py-2 hover:bg-blue-50 rounded transition-colors flex items-center justify-center gap-1 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20"
              >
                <ChevronDown size={14} />
                Load More
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
