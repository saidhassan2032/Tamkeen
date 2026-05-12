'use client';

import { useState } from 'react';
import { ChevronDown, FileText, Table2, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Resource {
  name: string;
  type: string;
  content: string;
}

interface Props {
  resources: Resource[];
}

const ICON: Record<string, any> = {
  text: FileText,
  table: Table2,
  requirements: ListChecks,
};

export function ResourcesPanel({ resources }: Props) {
  const [openIndices, setOpenIndices] = useState<Set<number>>(new Set([0]));

  if (!resources.length) {
    return (
      <div className="p-5 border-b border-border">
        <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">الموارد</h3>
        <p className="text-xs text-text-muted mt-2">لا توجد موارد لهذه المهمة</p>
      </div>
    );
  }

  return (
    <div className="border-b border-border">
      <div className="px-5 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">الموارد</h3>
        <span className="text-xs text-text-muted">{resources.length}</span>
      </div>
      <div className="max-h-[280px] overflow-y-auto">
        {resources.map((resource, i) => {
          const Icon = ICON[resource.type] ?? FileText;
          const isOpen = openIndices.has(i);
          return (
            <div key={i} className="border-b border-border last:border-b-0">
              <button
                onClick={() => {
                  setOpenIndices(prev => {
                    const next = new Set(prev);
                    if (next.has(i)) next.delete(i);
                    else next.add(i);
                    return next;
                  });
                }}
                className="w-full px-5 py-2.5 flex items-center justify-between gap-2 hover:bg-surface2 transition-colors text-right"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="w-3.5 h-3.5 text-brand shrink-0" />
                  <span className="text-xs font-medium truncate">{resource.name}</span>
                </div>
                <ChevronDown className={cn('w-3.5 h-3.5 text-text-muted transition-transform shrink-0', isOpen && 'rotate-180')} />
              </button>
              {isOpen && (
                <div className="px-5 pb-3">
                  <pre className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap bg-bg p-3 rounded-md border border-border font-sans">
                    {resource.content}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
