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
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (!resources.length) {
    return (
      <div className="p-4 border-b border-tamkeen-border">
        <h3 className="text-sm font-semibold text-tamkeen-muted">الموارد</h3>
        <p className="text-xs text-tamkeen-muted mt-2">لا توجد موارد لهذه المهمة</p>
      </div>
    );
  }

  return (
    <div className="border-b border-tamkeen-border">
      <div className="px-4 py-3 border-b border-tamkeen-border">
        <h3 className="text-sm font-semibold text-tamkeen-muted">الموارد ({resources.length})</h3>
      </div>
      <div className="max-h-[280px] overflow-y-auto">
        {resources.map((resource, i) => {
          const Icon = ICON[resource.type] ?? FileText;
          const isOpen = openIndex === i;
          return (
            <div key={i} className="border-b border-tamkeen-border last:border-b-0">
              <button
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="w-full px-4 py-2.5 flex items-center justify-between gap-2 hover:bg-tamkeen-surface2 transition-colors text-right"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="w-4 h-4 text-tamkeen-blue shrink-0" />
                  <span className="text-xs font-medium truncate">{resource.name}</span>
                </div>
                <ChevronDown className={cn('w-4 h-4 text-tamkeen-muted transition-transform shrink-0', isOpen && 'rotate-180')} />
              </button>
              {isOpen && (
                <div className="px-4 pb-3 pt-1">
                  <div className="text-xs text-tamkeen-muted leading-relaxed whitespace-pre-wrap bg-tamkeen-bg p-3 rounded-md border border-tamkeen-border">
                    {resource.content}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
