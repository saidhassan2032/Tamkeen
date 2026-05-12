'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { consumeSSE } from '@/lib/sse';
import { useSimulationStore } from '@/store/simulationStore';
import { AgentsSidebar } from '@/components/simulation/AgentsSidebar';
import { ChatWindow } from '@/components/simulation/ChatWindow';
import { TaskPanel } from '@/components/simulation/TaskPanel';
import { ResourcesPanel } from '@/components/simulation/ResourcesPanel';
import { GuidancePanel } from '@/components/simulation/GuidancePanel';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { Attachment } from '@/types';

interface Message {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  attachments?: Attachment[];
}

interface Agent {
  id: string;
  name: string;
  roleTitle: string;
  type: string;
  personality: string;
  roleInTask: string;
  avatarBg: string;
  avatarColor: string;
  icon: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  resources: string;
  guidanceTips: string;
  deadlineMinutes: number;
  status: string;
  difficulty: number;
  startedAt: number | null;
  waitingAgentId: string;
  assignedByAgentId: string;
}

interface Notification {
  message: string;
  type: 'warning' | 'danger';
}

export default function SimulationPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params?.sessionId as string;

  const { activeAgentId, setAgent } = useSimulationStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [conversations, setConversations] = useState<Record<string, Message[]>>({});
  const [unread, setUnread] = useState<Record<string, boolean>>({});
  const [streamingMessage, setStreamingMessage] = useState('');
  const [typingAgentId, setTypingAgentId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [completing, setCompleting] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [blockedDialog, setBlockedDialog] = useState<{
    taskStatus: string;
    feedback: string;
    skipWarning: string;
  } | null>(null);

  const warned5MinRef = useRef(false);
  const warned2MinRef = useRef(false);
  const expiredHandledRef = useRef(false);

  const currentTask = tasks.find((t) => t.status === 'started' || t.status === 'largely');
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const activeAgent = agents.find((a) => a.id === activeAgentId) ?? agents[0];
  const isTyping = typingAgentId === activeAgent?.id;

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${sessionId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'حدث خطأ في الاتصال، حاول مجدداً');
      }
      const data = await res.json();
      setAgents(data.agents);
      setTasks(data.tasks);
      const parsedConversations: Record<string, Message[]> = {};
      for (const [agentId, msgs] of Object.entries(data.conversations as Record<string, any[]>)) {
        parsedConversations[agentId] = msgs.map((m) => {
          let attachments: Attachment[] | undefined;
          if (m.attachments) {
            try {
              attachments = JSON.parse(m.attachments);
            } catch {}
          }
          return {
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
            attachments,
          };
        });
      }
      setConversations(parsedConversations);
      const current = useSimulationStore.getState().activeAgentId;
      if (!current || !data.agents.some((a: Agent) => a.id === current)) {
        const manager = data.agents.find((a: Agent) => a.type === 'manager');
        setAgent(manager?.id ?? data.agents[0].id);
      }
      setLoading(false);
    } catch (err: any) {
      setError(err.message ?? 'حدث خطأ في الاتصال، حاول مجدداً');
      setLoading(false);
    }
  }, [sessionId, setAgent]);

  useEffect(() => {
    if (!sessionId) return;
    loadSession();
  }, [sessionId, loadSession]);

  useEffect(() => {
    if (!currentTask?.startedAt) return;
    warned5MinRef.current = false;
    warned2MinRef.current = false;
    expiredHandledRef.current = false;

    const tick = () => {
      const startedAt = currentTask.startedAt!;
      const remaining = Math.max(0, startedAt + currentTask.deadlineMinutes * 60000 - Date.now());
      setTimeRemaining(remaining);

      if (!warned5MinRef.current && remaining > 0 && remaining <= 5 * 60 * 1000 && remaining > 4.5 * 60 * 1000) {
        warned5MinRef.current = true;
        setNotification({ message: '⏰ تبقّى 5 دقائق لإنجاز المهمة', type: 'warning' });
        setTimeout(() => setNotification(null), 5000);
      }
      if (!warned2MinRef.current && remaining > 0 && remaining <= 2 * 60 * 1000 && remaining > 1.5 * 60 * 1000) {
        warned2MinRef.current = true;
        setNotification({ message: '🚨 تبقّى دقيقتان فقط!', type: 'danger' });
        setTimeout(() => setNotification(null), 5000);
      }
      if (!expiredHandledRef.current && remaining === 0) {
        expiredHandledRef.current = true;
        setNotification({ message: '⌛ انتهى الوقت — يمكنك إنهاء المهمة الآن', type: 'danger' });
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [currentTask?.id, currentTask?.startedAt, currentTask?.deadlineMinutes]);

  const handleSelectAgent = (id: string) => {
    setAgent(id);
    setUnread((u) => ({ ...u, [id]: false }));
  };

  const handleSend = async (content: string, attachments?: Attachment[]) => {
    if (!activeAgent || !currentTask) return;
    const agentId = activeAgent.id;

    setConversations((prev) => ({
      ...prev,
      [agentId]: [...(prev[agentId] ?? []), { role: 'user', content, attachments }],
    }));
    setTypingAgentId(agentId);
    setStreamingMessage('');

    let accumulated = '';
    await consumeSSE(
      '/api/chat',
      { sessionId, agentId, content, attachments },
      (data) => {
        if (data.type === 'chunk') {
          accumulated += data.text;
          setStreamingMessage(accumulated);
        }
        if (data.type === 'done') {
          const visible = accumulated.split('SCORE_JSON:')[0].trim();
          setConversations((prev) => ({
            ...prev,
            [agentId]: [...(prev[agentId] ?? []), { role: 'assistant', content: visible }],
          }));
          setStreamingMessage('');
          setTypingAgentId(null);
          setUnread((u) => {
            if (useSimulationStore.getState().activeAgentId === agentId) return u;
            return { ...u, [agentId]: true };
          });
        }
        if (data.type === 'error') {
          setStreamingMessage('');
          setTypingAgentId(null);
          setNotification({ message: data.message ?? 'حدث خطأ في الاتصال، حاول مجدداً', type: 'danger' });
          setTimeout(() => setNotification(null), 4000);
        }
      },
    );
  };

  const handleComplete = async () => {
    if (!currentTask) return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/tasks/${currentTask.id}/complete`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'حدث خطأ في الاتصال، حاول مجدداً');
      }
      if (data.blocked) {
        setBlockedDialog({
          taskStatus: data.taskStatus,
          feedback: data.feedback,
          skipWarning: data.skipWarning,
        });
        return;
      }
      if (data.done) {
        setShowEndDialog(true);
      } else if (data.nextTask) {
        setTasks((prev) =>
          prev
            .map((t) => (t.id === currentTask.id ? { ...t, status: 'completed' } : t))
            .concat(data.nextTask),
        );
        if (data.nextTask.starterMessage && data.nextTask.assignedByAgentId) {
          setConversations((prev) => ({
            ...prev,
            [data.nextTask.assignedByAgentId]: [
              ...(prev[data.nextTask.assignedByAgentId] ?? []),
              { role: 'assistant', content: data.nextTask.starterMessage, timestamp: data.nextTask.startedAt },
            ],
          }));
        }
        setAgent(data.nextTask.assignedByAgentId);
        setUnread((u) => ({ ...u, [data.nextTask.assignedByAgentId]: false }));
      }
    } catch (err: any) {
      setNotification({ message: err.message ?? 'حدث خطأ في الاتصال، حاول مجدداً', type: 'danger' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setCompleting(false);
    }
  };

  const handleSkip = async () => {
    if (!currentTask || !blockedDialog) return;
    setBlockedDialog(null);
    setCompleting(true);
    try {
      const res = await fetch(`/api/tasks/${currentTask.id}/complete?force=true`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'حدث خطأ');
      }
      if (data.done) {
        setShowEndDialog(true);
      } else if (data.nextTask) {
        setTasks((prev) =>
          prev
            .map((t) => (t.id === currentTask.id ? { ...t, status: 'completed' } : t))
            .concat(data.nextTask),
        );
        if (data.nextTask.starterMessage && data.nextTask.assignedByAgentId) {
          setConversations((prev) => ({
            ...prev,
            [data.nextTask.assignedByAgentId]: [
              ...(prev[data.nextTask.assignedByAgentId] ?? []),
              { role: 'assistant', content: data.nextTask.starterMessage, timestamp: data.nextTask.startedAt },
            ],
          }));
        }
        setAgent(data.nextTask.assignedByAgentId);
        setUnread((u) => ({ ...u, [data.nextTask.assignedByAgentId]: false }));
      }
    } catch (err: any) {
      setNotification({ message: err.message ?? 'حدث خطأ في الاتصال، حاول مجدداً', type: 'danger' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setCompleting(false);
    }
  };

  const handleFinishToReport = () => {
    router.push(`/report/${sessionId}`);
  };

  if (loading) {
    return (
      <main className="h-screen bg-tamkeen-bg flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-tamkeen-blue mx-auto mb-3" />
          <div className="text-tamkeen-muted">جاري تحميل بيئة العمل...</div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="h-screen bg-tamkeen-bg flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-tamkeen-red mb-4">{error}</div>
          <Link href="/">
            <Button variant="outline">العودة للرئيسية</Button>
          </Link>
        </div>
      </main>
    );
  }

  if (!activeAgent || !currentTask) {
    return (
      <main className="h-screen bg-tamkeen-bg flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="text-4xl mb-4">🎉</div>
          <div className="text-lg mb-4">انتهت كل المهام</div>
          <Button onClick={handleFinishToReport}>عرض التقرير</Button>
        </div>
      </main>
    );
  }

  const taskResources = (() => {
    try {
      return JSON.parse(currentTask.resources);
    } catch {
      return [];
    }
  })();

  const taskGuidance = (() => {
    try {
      return JSON.parse(currentTask.guidanceTips);
    } catch {
      return [];
    }
  })();

  const messages = conversations[activeAgent.id] ?? [];

  return (
    <main className="h-screen bg-tamkeen-bg text-tamkeen-text overflow-hidden">
      {notification && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-lg shadow-lg border text-sm font-medium ${
            notification.type === 'danger'
              ? 'bg-tamkeen-red/20 border-tamkeen-red/50 text-tamkeen-red'
              : 'bg-tamkeen-amber/20 border-tamkeen-amber/50 text-tamkeen-amber'
          }`}
        >
          {notification.message}
        </div>
      )}

      <div className="h-full grid grid-cols-[240px_1fr_300px] min-h-0">
        <AgentsSidebar
          agents={agents}
          activeAgentId={activeAgent.id}
          onSelect={handleSelectAgent}
          unread={unread}
          taskWaitingAgentId={currentTask.waitingAgentId}
        />

        <ChatWindow
          agent={activeAgent}
          messages={messages}
          streamingMessage={isTyping ? streamingMessage : ''}
          isTyping={isTyping}
          onSend={handleSend}
        />

        <aside className="border-r border-tamkeen-border bg-tamkeen-surface flex flex-col overflow-y-auto min-h-0 h-full">
          <TaskPanel
            task={currentTask}
            timeRemaining={timeRemaining}
            totalTasks={tasks.length}
            completedTasks={completedCount}
            onComplete={handleComplete}
            isCompleting={completing}
          />
          <ResourcesPanel resources={taskResources} />
          <GuidancePanel sessionId={sessionId} guidanceTips={taskGuidance} />
        </aside>
      </div>

      <Dialog open={!!blockedDialog} onOpenChange={(open) => { if (!open) setBlockedDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {blockedDialog?.taskStatus === 'largely' ? 'المهمة شبه منجزة' : 'المهمة لم تنجز بعد'}
            </DialogTitle>
            <DialogDescription className="text-right">
              <p className="mb-3 text-sm">{blockedDialog?.feedback}</p>
              <p className="text-xs text-tamkeen-amber font-medium">{blockedDialog?.skipWarning}</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setBlockedDialog(null)}
              className="flex-1"
            >
              متابعة العمل
            </Button>
            <Button
              variant="destructive"
              onClick={handleSkip}
              className="flex-1"
            >
              تخطي المهمة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>أنهيت كل المهام 🎉</DialogTitle>
            <DialogDescription>
              المحاكاة انتهت. سننشئ لك تقريراً تحليلياً شاملاً لأدائك الآن.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleFinishToReport} className="w-full">
              عرض التقرير
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
