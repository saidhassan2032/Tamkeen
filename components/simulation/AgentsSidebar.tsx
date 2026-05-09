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
    <aside className="w-[240px] shrink-0 border-l border-tamkeen-border bg-tamkeen-surface flex flex-col">
      <div className="p-4 border-b border-tamkeen-border">
        <h2 className="text-sm font-semibold text-tamkeen-muted">فريق العمل</h2>
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
                'w-full px-4 py-3 flex items-center gap-3 transition-colors text-right',
                isActive ? 'bg-tamkeen-blue/10 border-r-2 border-tamkeen-blue' : 'hover:bg-tamkeen-surface2',
              )}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0"
                style={{ backgroundColor: agent.avatarBg, color: agent.avatarColor }}
              >
                {agent.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-sm truncate">{agent.name}</div>
                  {hasUnread && !isActive && (
                    <span className="w-2 h-2 rounded-full bg-tamkeen-blue shrink-0" />
                  )}
                </div>
                <div className="text-xs text-tamkeen-muted truncate">{agent.roleTitle}</div>
                {isWaiting && (
                  <div className="text-[10px] text-tamkeen-amber mt-1">⏳ ينتظر منك</div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
