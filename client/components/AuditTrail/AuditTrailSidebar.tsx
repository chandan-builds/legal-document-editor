'use client';

import { useState, useEffect, useMemo } from 'react';
import { ListChecks, Plus, FileClock, User, Clock, CheckCircle, Filter } from 'lucide-react';
import { AuditLogEntry, AuditAction } from '@/types/audit';
import { cn } from '@/utils/cn';
import { Virtuoso } from 'react-virtuoso';

interface AuditTrailSidebarProps {
  logs: AuditLogEntry[];
  currentVersion: number;
  onCreateVersion: () => void;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onNavigateToEntity?: (entityType: string, entityId: string) => void;
}

type FilterType = 'ALL' | 'EDITS' | 'REVIEWS' | 'SYSTEM';

export default function AuditTrailSidebar({ logs, currentVersion, onCreateVersion, hasMore, onLoadMore, onNavigateToEntity }: AuditTrailSidebarProps) {
  useEffect(() => {
    console.debug('[DEBUG] AuditTrailSidebar rendered');
  }, []);

  const [filter, setFilter] = useState<FilterType>('ALL');

  const timelineItems = useMemo(() => {
    const sortedLogs = logs.filter(log => {
      if (filter === 'ALL') return true;
      if (filter === 'EDITS') return ['TEXT_INSERTED', 'TEXT_DELETED', 'FORMATTING_CHANGED', 'CLAUSE_EDITED', 'EDIT_ACCEPTED', 'EDIT_REJECTED', 'SUGGESTION_CREATED', 'SUGGESTION_VIEWED', 'SUGGESTION_APPROVED', 'SUGGESTION_REJECTED'].includes(log.action);
      if (filter === 'REVIEWS') return ['COMMENT_ADDED', 'COMMENT_RESOLVED', 'COMMENT_DELETED', 'CLAUSE_APPROVED', 'CLAUSE_REJECTED', 'CLAUSE_SUBMITTED_FOR_APPROVAL', 'CLAUSE_OMITTED', 'CLAUSE_COUNTER_PROPOSED'].includes(log.action);
      if (filter === 'SYSTEM') return ['VERSION_CREATED', 'VERSION_RESTORED', 'INTEGRITY_CHECK_PASSED', 'INTEGRITY_CHECK_FAILED', 'DOCUMENT_CREATED', 'DOCUMENT_UPLOADED', 'DOCUMENT_FINALIZED', 'DOCUMENT_EXPORTED', 'CLAUSE_CREATED', 'CLAUSE_LOCKED', 'CLAUSE_UNLOCKED', 'USER_JOINED', 'USER_LEFT'].includes(log.action);
      return true;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const items: (AuditLogEntry | { type: 'header', label: string, id: string })[] = [];
    let currentHeader = '';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    sortedLogs.forEach(log => {
      const logDate = new Date(log.timestamp);
      let header = 'Older';
      if (logDate >= today) header = 'Today';
      else if (logDate >= yesterday) header = 'Yesterday';
      else if (logDate >= lastWeek) header = 'Last Week';

      if (header !== currentHeader) {
        items.push({ type: 'header', label: header, id: `header-${header}-${log.id}` });
        currentHeader = header;
      }
      items.push(log);
    });

    return items;
  }, [logs, filter]);

  const Row = ({ index, data }: { index: number, data: AuditLogEntry }) => {
    const log = data;
    const clickable = !!log.entityId && !!onNavigateToEntity;
    return (
      <div
        key={log.id}
        className={cn("relative pl-6 pb-2 border-l-2 border-gray-200 last:border-0 group", clickable && "cursor-pointer hover:bg-gray-50 transition-colors")}
        onClick={() => clickable && onNavigateToEntity!(log.entityType!, log.entityId!)}
      >
        {/* Timeline Indicator */}
        <div className={cn(
          "absolute -left-[7px] top-1 w-3 h-3 rounded-full border-2 border-white shadow-sm ring-1 ring-gray-200 z-10",
          getIndicatorColor(log.action)
        )} />

        <div className="flex items-center justify-between mb-1">
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-wider",
            getTextColor(log.action)
          )}>
            {formatAction(log.action)}
          </span>
          <span className="text-[9px] text-gray-400 flex items-center gap-1 bg-white px-1">
            <Clock size={10} />
            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div className="text-xs text-gray-600 mb-1 bg-white/50">
          <span className="font-semibold text-gray-900 mr-1">{log.userName}</span>
          <span>{getActionDescription(log)}</span>
        </div>

        {log.content && log.action !== 'COMMENT_ADDED' && (
          <div className="text-[10px] text-gray-500 italic line-clamp-2 bg-gray-100 p-1.5 rounded border border-gray-200/50 mt-1">
            "{log.content}"
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-80 border-l bg-gray-50 flex flex-col h-full print:hidden">
      {/* ... (header and filter buttons remain same) ... */}
      <div className="p-4 border-b bg-white flex items-center justify-between shadow-sm z-10">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <ListChecks size={18} />
          <span>Activity Timeline</span>
        </h2>
        <div className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase">
          V{currentVersion}
        </div>
      </div>

      <div className="flex border-b bg-white">
        <FilterButton label="All" active={filter === 'ALL'} onClick={() => setFilter('ALL')} />
        <FilterButton label="Edits" active={filter === 'EDITS'} onClick={() => setFilter('EDITS')} />
        <FilterButton label="Reviews" active={filter === 'REVIEWS'} onClick={() => setFilter('REVIEWS')} />
        <FilterButton label="System" active={filter === 'SYSTEM'} onClick={() => setFilter('SYSTEM')} />
      </div>

      <div className="p-4 border-b bg-white">
        <button
          onClick={onCreateVersion}
          className="w-full bg-blue-600 text-white text-xs font-bold py-2 rounded flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-sm uppercase tracking-wide"
        >
          <Plus size={14} />
          <span>Create New Version</span>
        </button>
      </div>

      <div className="flex-1 p-4 overflow-hidden flex flex-col">
        {timelineItems.length === 0 ? (
          <div className="text-center py-12 text-gray-400 italic text-sm flex flex-col items-center">
            <Filter size={24} className="mb-2 opacity-20" />
            <span>No activity found for this filter.</span>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 min-h-0">
              <Virtuoso
                style={{ height: '100%' }}
                data={timelineItems}
                itemContent={(index, item) => {
                  if ('type' in item) {
                    return <div key={item.id} className="text-[10px] font-bold uppercase text-gray-500 bg-gray-100 px-2 py-1 mb-2 mt-4 sticky top-0 z-10 rounded shadow-sm">{item.label}</div>;
                  }
                  return <Row index={index} data={item} />;
                }}
              />
            </div>
            {hasMore && onLoadMore && (
              <div className="pt-4 shrink-0 mt-auto">
                <button
                  onClick={onLoadMore}
                  className="w-full bg-gray-100 text-gray-600 font-bold py-2 rounded hover:bg-gray-200 text-xs uppercase transition-colors"
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterButton({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 py-2 text-[10px] font-bold uppercase tracking-wide border-b-2 transition-colors",
        active ? "border-blue-600 text-blue-600 bg-blue-50/50" : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
      )}
    >
      {label}
    </button>
  );
}

function getIndicatorColor(action: AuditAction): string {
  switch (action) {
    case 'VERSION_CREATED':
    case 'VERSION_RESTORED': return 'bg-purple-500';
    case 'CLAUSE_APPROVED':
    case 'EDIT_ACCEPTED':
    case 'SUGGESTION_APPROVED': return 'bg-green-500';
    case 'COMMENT_ADDED': return 'bg-blue-500';
    case 'COMMENT_RESOLVED':
    case 'SUGGESTION_VIEWED': return 'bg-blue-300';
    case 'TEXT_INSERTED':
    case 'CLAUSE_CREATED':
    case 'SUGGESTION_CREATED': return 'bg-emerald-400';
    case 'TEXT_DELETED':
    case 'CLAUSE_REJECTED':
    case 'EDIT_REJECTED':
    case 'SUGGESTION_REJECTED': return 'bg-rose-400';
    case 'INTEGRITY_CHECK_FAILED': return 'bg-red-600';
    case 'DOCUMENT_CREATED':
    case 'DOCUMENT_UPLOADED': return 'bg-indigo-500';
    case 'DOCUMENT_FINALIZED': return 'bg-green-600';
    case 'CLAUSE_LOCKED': return 'bg-amber-500';
    case 'CLAUSE_UNLOCKED': return 'bg-amber-300';
    case 'USER_JOINED': return 'bg-teal-400';
    case 'USER_LEFT': return 'bg-gray-500';
    default: return 'bg-gray-400';
  }
}

function getTextColor(action: AuditAction): string {
  switch (action) {
    case 'VERSION_CREATED':
    case 'VERSION_RESTORED': return 'text-purple-700';
    case 'CLAUSE_APPROVED':
    case 'EDIT_ACCEPTED':
    case 'SUGGESTION_APPROVED': return 'text-green-700';
    case 'INTEGRITY_CHECK_FAILED': return 'text-red-700';
    case 'CLAUSE_REJECTED':
    case 'EDIT_REJECTED':
    case 'SUGGESTION_REJECTED': return 'text-red-600';
    case 'SUGGESTION_CREATED': return 'text-emerald-700';
    case 'DOCUMENT_FINALIZED': return 'text-green-800';
    default: return 'text-gray-600';
  }
}

function formatAction(action: string) {
  return action.replace(/_/g, ' ');
}

function getActionDescription(log: AuditLogEntry) {
  switch (log.action) {
    case 'TEXT_INSERTED': return `inserted text`;
    case 'TEXT_DELETED': return `deleted text`;
    case 'FORMATTING_CHANGED': return `changed formatting`;
    case 'COMMENT_ADDED': return `commented: "${log.content}"`;
    case 'COMMENT_RESOLVED': return `resolved a comment`;
    case 'COMMENT_DELETED': return `deleted a comment`;
    case 'CLAUSE_APPROVED': return `approved a clause`;
    case 'CLAUSE_REJECTED': return `rejected a clause`;
    case 'CLAUSE_CREATED': return `created a clause`;
    case 'CLAUSE_EDITED': return `edited a clause`;
    case 'CLAUSE_LOCKED': return `locked a clause`;
    case 'CLAUSE_UNLOCKED': return `unlocked a clause`;
    case 'CLAUSE_SUBMITTED_FOR_APPROVAL': return `submitted a clause for approval`;
    case 'CLAUSE_OMITTED': return `omitted a clause`;
    case 'CLAUSE_COUNTER_PROPOSED': return `counter-proposed a clause`;
    case 'VERSION_CREATED': return `created Version ${log.documentVersion}`;
    case 'VERSION_RESTORED': return `restored a version`;
    case 'INTEGRITY_CHECK_FAILED': return `triggered a security alert`;
    case 'INTEGRITY_CHECK_PASSED': return `passed integrity check`;
    case 'DOCUMENT_CREATED': return `created the document`;
    case 'DOCUMENT_UPLOADED': return `uploaded a document`;
    case 'DOCUMENT_FINALIZED': return `finalized the document`;
    case 'DOCUMENT_EXPORTED': return `exported the document`;
    case 'EDIT_ACCEPTED':
    case 'SUGGESTION_APPROVED': return `approved an edit suggestion`;
    case 'EDIT_REJECTED':
    case 'SUGGESTION_REJECTED': return `rejected an edit suggestion`;
    case 'SUGGESTION_CREATED': return `suggested an edit`;
    case 'SUGGESTION_VIEWED': return `viewed a suggestion`;
    case 'USER_JOINED': return `joined the session`;
    case 'USER_LEFT': return `left the session`;
    default: return 'performed an action';
  }
}
