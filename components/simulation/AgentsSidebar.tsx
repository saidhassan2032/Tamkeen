'use client';

import { cn } from '@/lib/utils';

interface Agent {
  id: string;
  name: string;
  roleTitle: string;
  type: string;
  avatarBg: string;
  avatarColor: string;
  icon: string;
}

interface Props {
  agents: Agent[];
  activeAgentId: string;
  onSelect: (id: string) => void;
  unread: Record<string, boolean>;
  taskWaitingAgentId?: string;
}

export function AgentsSidebar({ agents, activeAgentId, onSelect, unread, taskWaitingAgentId }: Props) {
  return (
    <aside className="w-[260px] shrink-0 border-l border-border bg-surface flex flex-col">
      <div className="px-5 h-14 flex items-center border-b border-border">
        <h2 className="text-xs font-medium uppercase tracking-wider text-text-muted">فريق العمل</h2>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {agents.map((agent) => {
          const isActive = agent.id === activeAgentId;
          const hasUnread = unread[agent.id];
          const isWaiting = agent.id === taskWaitingAgentId;
          return (
            <button
              key={agent.id}
              onClick={() => onSelect(agent.id)}
              className={cn(
                'w-full px-4 py-3 flex items-center gap-3 transition-colors text-right relative',
                isActive
                  ? 'bg-brand-soft text-text'
                  : 'hover:bg-surface2 text-text',
              )}
            >
              {isActive && <span className="absolute right-0 top-3 bottom-3 w-0.5 rounded-full bg-brand" />}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
                style={{ backgroundColor: agent.avatarBg, color: agent.avatarColor }}
              >
                {agent.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-sm truncate">{agent.name}</div>
                  {hasUnread && !isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  )}
                </div>
                <div className="text-xs text-text-muted truncate">{agent.roleTitle}</div>
                {isWaiting && (
                  <div className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-accent">
                    <span className="w-1 h-1 rounded-full bg-accent" />
                    ينتظر منك
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
