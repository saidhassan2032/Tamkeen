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
import { LoadingMark } from '@/components/brand/LoadingMark';
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
  sortOrder: number;
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
  const [totalTasks, setTotalTasks] = useState(0);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [redirectingToReport, setRedirectingToReport] = useState(false);
  const [completedByAi, setCompletedByAi] = useState<string | null>(null);
  const [extendDialog, setExtendDialog] = useState(false);
  const [extending, setExtending] = useState(false);

  const warned5MinRef = useRef(false);
  const warned2MinRef = useRef(false);
  const expiredHandledRef = useRef(false);
  const isCompletedRef = useRef(false);

  const currentTask = tasks.find((t) => t.status === 'started' || t.status === 'largely')
    ?? (completedByAi ? tasks.find(t => t.id === completedByAi) : undefined);

  isCompletedRef.current = currentTask?.status === 'completed';
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
      setTotalTasks(data.session?.totalTasks ?? data.tasks.length);
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
      if (!expiredHandledRef.current && remaining === 0 && !isCompletedRef.current) {
        expiredHandledRef.current = true;
        setExtendDialog(true);
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
        if (data.type === 'task_completed') {
          setCompletedByAi(data.taskId);
          setTasks((prev) => prev.map((t) =>
            t.id === data.taskId ? { ...t, status: 'completed' } : t
          ));
        }
        if (data.type === 'done') {
          setConversations((prev) => ({
            ...prev,
            [agentId]: [...(prev[agentId] ?? []), { role: 'assistant', content: accumulated.trim() }],
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
      if (data.notReady) {
        await pollUntilReady(currentTask.id);
        return;
      }
      if (data.done) {
        setCompletedByAi(null);
        setShowEndDialog(true);
      } else if (data.nextTask) {
        setCompletedByAi(null);
        setTasks((prev) => {
          const updated = prev.map((t) => {
            if (t.id === currentTask.id) return { ...t, status: 'completed' };
            if (t.id === data.nextTask.id) return data.nextTask;
            return t;
          });
          if (!prev.some(t => t.id === data.nextTask.id)) {
            updated.push(data.nextTask);
          }
          return updated;
        });
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

  const pollUntilReady = async (taskId: string) => {
    setTasks((prev) => prev.map((t) =>
      t.id === taskId ? { ...t, status: 'completed' } : t
    ));
    setCompletedByAi(null);
    while (true) {
      await new Promise((r) => setTimeout(r, 2000));
      try {
        const res = await fetch(`/api/tasks/${taskId}/poll-next`);
        const data = await res.json();
        if (data.ready && data.task) {
          setTasks((prev) => {
            if (prev.some(t => t.id === data.task.id)) return prev;
            return [...prev, data.task];
          });
          if (data.task.starterMessage && data.task.assignedByAgentId) {
            setConversations((prev) => ({
              ...prev,
              [data.task.assignedByAgentId]: [
                ...(prev[data.task.assignedByAgentId] ?? []),
                { role: 'assistant', content: data.task.starterMessage, timestamp: data.task.startedAt },
              ],
            }));
          }
          setAgent(data.task.assignedByAgentId);
          setUnread((u) => ({ ...u, [data.task.assignedByAgentId]: false }));
          return;
        }
      } catch {}
    }
  };

  const handleExtend = async (minutes: number) => {
    if (!currentTask) return;
    setExtending(true);
    try {
      const res = await fetch(`/api/tasks/${currentTask.id}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes }),
      });
      if (!res.ok) throw new Error('حدث خطأ في تمديد الوقت');
      const data = await res.json();
      setTasks((prev) => prev.map((t) =>
        t.id === currentTask.id
          ? { ...t, deadlineMinutes: data.deadlineMinutes, extensions: data.extensions }
          : t
      ));
      setExtendDialog(false);
      expiredHandledRef.current = false;
    } catch (err: any) {
      setNotification({ message: err.message, type: 'danger' });
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setExtending(false);
    }
  };

  const handleFinishToReport = () => {
    setRedirectingToReport(true);
    router.push(`/report/${sessionId}`);
  };

  if (loading) {
    return (
      <main className="h-screen bg-bg flex items-center justify-center">
        <LoadingMark size={120} label="جاري تحميل بيئة العمل..." />
      </main>
    );
  }

  if (error) {
    return (
      <main className="h-screen bg-bg flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="text-4xl mb-4">⚠️</div>
          <div className="text-danger mb-4">{error}</div>
          <Link href="/">
            <Button variant="outline">العودة للرئيسية</Button>
          </Link>
        </div>
      </main>
    );
  }

  if (redirectingToReport) {
    return (
      <main className="h-screen bg-bg flex items-center justify-center">
        <LoadingMark size={120} label="جاري إعداد تقرير الأداء..." />
      </main>
    );
  }

  if (!activeAgent || !currentTask) {
    return (
      <main className="h-screen bg-bg flex items-center justify-center">
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
    <main className="h-screen bg-bg text-text overflow-hidden">
      {notification && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full shadow-soft border text-sm font-medium ${
            notification.type === 'danger'
              ? 'bg-danger/10 border-danger/40 text-danger'
              : 'bg-warning/10 border-warning/40 text-warning'
          }`}
        >
          {notification.message}
        </div>
      )}

      <div className="h-full grid grid-cols-[260px_1fr_320px] min-h-0">
        <AgentsSidebar
          agents={agents}
          activeAgentId={activeAgent.id}
          onSelect={handleSelectAgent}
          unread={unread}
        />

        <ChatWindow
          agent={activeAgent}
          messages={messages}
          streamingMessage={isTyping ? streamingMessage : ''}
          isTyping={isTyping}
          onSend={handleSend}
        />

        <aside className="border-r border-border bg-surface flex flex-col overflow-y-auto min-h-0 h-full">
          <TaskPanel
            task={currentTask}
            timeRemaining={timeRemaining}
            totalTasks={totalTasks}
            completedTasks={completedCount}
            onComplete={handleComplete}
            isCompleting={completing}
          />
          <ResourcesPanel resources={taskResources} />
          <GuidancePanel sessionId={sessionId} guidanceTips={taskGuidance} />
        </aside>
      </div>

      <Dialog open={extendDialog} onOpenChange={(open) => { if (!open) setExtendDialog(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>انتهى الوقت!</DialogTitle>
            <DialogDescription>
              اختر مدة التمديد لإكمال المهمة
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => handleExtend(15)}
              disabled={extending}
              className="flex-1"
            >
              تمديد 15 دقيقة
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExtend(30)}
              disabled={extending}
              className="flex-1"
            >
              تمديد 30 دقيقة
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExtend(45)}
              disabled={extending}
              className="flex-1"
            >
              تمديد 45 دقيقة
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
