'use client';

import { useEffect } from 'react';
import { History, Plus, RotateCcw, Eye, FileClock, CheckCircle, ArrowRight, AlertTriangle, ShieldCheck, SplitSquareHorizontal } from 'lucide-react';
import { VersionMetadata } from '@/types/audit';
import { cn } from '@/utils/cn';
import { User } from '@/types/index';

interface VersionSidebarProps {
  versions: VersionMetadata[];
  currentVersion: number;
  onCreateSnapshot: (description?: string) => void;
  onRestore: (version: VersionMetadata) => void;
  onPreview: (version: VersionMetadata) => void;
  onCompare: (version: VersionMetadata) => void;
  tamperedIds: Set<string>;
  currentUser: User | null;
}

export default function VersionSidebar({
  versions,
  currentVersion,
  onCreateSnapshot,
  onRestore,
  onPreview,
  onCompare,
  tamperedIds,
  currentUser
}: VersionSidebarProps) {
  useEffect(() => {
    console.debug('[DEBUG] VersionSidebar rendered');
  }, []);

  const sortedVersions = [...versions].sort((a, b) => b.version - a.version);

  return (
    <div className="w-80 border-l bg-gray-50 flex flex-col h-full print:hidden">
      <div className="p-4 border-b bg-white flex items-center justify-between">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <History size={18} />
          <span>Version History</span>
        </h2>
        <div className="text-[10px] font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded uppercase">
          Live
        </div>
      </div>

      <div className="p-4 border-b bg-white">
        {currentUser?.collaboratorRole === 'OWNER' || currentUser?.collaboratorRole === 'EDITOR' ? (
          <button
            onClick={() => {
              const desc = prompt('Enter a description for this version:');
              if (desc !== null) onCreateSnapshot(desc);
            }}
            className="w-full bg-purple-600 text-white text-xs font-bold py-2 rounded flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors shadow-sm uppercase tracking-wide"
          >
            <Plus size={14} />
            <span>Save Snapshot</span>
          </button>
        ) : (
          <div className="w-full bg-gray-100 text-gray-400 text-xs font-bold py-2 rounded flex items-center justify-center gap-2 cursor-not-allowed uppercase tracking-wide">
            <Plus size={14} />
            <span>View Only</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {sortedVersions.length === 0 ? (
          <div className="text-center py-12 text-gray-400 italic text-sm">
            No snapshots yet. Save your first version above.
          </div>
        ) : (
          sortedVersions.map((v) => {
            const isTampered = tamperedIds.has(v.id);
            return (
              <div
                key={v.id}
                className={cn(
                  "p-3 rounded-lg border bg-white shadow-sm transition-all group relative overflow-hidden",
                  v.version === currentVersion ? "ring-2 ring-purple-500 border-transparent" : "hover:border-purple-200",
                  isTampered ? "border-red-500 bg-red-50" : ""
                )}
              >
                {isTampered && (
                  <div className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-bl shadow-sm" title="Integrity Check Failed: Tampered Version">
                    <AlertTriangle size={12} />
                  </div>
                )}

                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-8 h-8 rounded flex items-center justify-center text-xs font-bold",
                      isTampered ? "bg-red-100 text-red-700" : "bg-purple-100 text-purple-700"
                    )}>
                      v{v.version}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 truncate max-w-[120px]">
                        {v.description || `Draft Version ${v.version}`}
                      </p>
                      <p className="text-[9px] text-gray-400 font-medium uppercase tracking-tight">
                        {new Date(v.timestamp).toLocaleDateString()} at {new Date(v.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-3">
                  <FileClock size={12} />
                  <span>By {v.author}</span>
                  {v.changeSummary && !isTampered && (
                    <span className="flex items-center gap-1 ml-auto text-green-600 font-bold">
                      +{v.changeSummary.insertions} / -{v.changeSummary.deletions}
                    </span>
                  )}
                  {isTampered && (
                    <span className="flex items-center gap-1 ml-auto text-red-600 font-bold uppercase tracking-tighter">
                      TAMPERED
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onPreview(v)}
                    className="flex-1 text-[10px] text-gray-600 hover:text-purple-600 flex items-center justify-center gap-1 font-bold bg-gray-50 py-1 rounded"
                  >
                    <Eye size={12} />
                    <span>View</span>
                  </button>
                  <button
                    onClick={() => onCompare(v)}
                    className="flex-1 text-[10px] text-gray-600 hover:text-blue-600 flex items-center justify-center gap-1 font-bold bg-gray-50 py-1 rounded"
                  >
                    <SplitSquareHorizontal size={12} />
                    <span>Compare</span>
                  </button>
                  {currentUser?.collaboratorRole === 'OWNER' || currentUser?.collaboratorRole === 'EDITOR' ? (
                    <button
                      onClick={() => {
                        if (isTampered) {
                          alert('Cannot restore tampered version.');
                          return;
                        }
                        if (confirm(`Are you sure you want to restore Version ${v.version}? Current changes will be archived.`)) {
                          onRestore(v);
                        }
                      }}
                      className={cn(
                        "flex-1 text-[10px] flex items-center justify-center gap-1 font-bold py-1 rounded",
                        isTampered ? "text-gray-400 cursor-not-allowed bg-gray-100" : "text-red-600 hover:bg-red-50"
                      )}
                      disabled={isTampered}
                    >
                      <RotateCcw size={12} />
                      <span>Restore</span>
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
