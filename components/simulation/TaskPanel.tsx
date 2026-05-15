'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle2 } from 'lucide-react';
import { formatTime } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  description: string;
  deadlineMinutes: number;
  sortOrder: number;
  difficulty: number;
  status: string;
  startedAt: number | null;
  extensions?: number;
}

interface Props {
  task: Task;
  timeRemaining: number;
  totalTasks: number;
  completedTasks: number;
  onComplete: () => void;
  isCompleting?: boolean;
}

export function TaskPanel({ task, timeRemaining, totalTasks, completedTasks, onComplete, isCompleting }: Props) {
  const totalMs = task.deadlineMinutes * 60000;
  const progress = totalMs > 0 ? Math.max(0, Math.min(100, (timeRemaining / totalMs) * 100)) : 0;
  const isUrgent = timeRemaining > 0 && timeRemaining < 2 * 60 * 1000;
  const isWarning = timeRemaining > 2 * 60 * 1000 && timeRemaining < 5 * 60 * 1000;
  const expired = timeRemaining === 0;
  const extensions = task.extensions ?? 0;

  const timeTone = expired || isUrgent ? 'text-danger' : isWarning ? 'text-warning' : 'text-text-muted';
  const timeValueTone = expired || isUrgent ? 'text-danger' : isWarning ? 'text-warning' : 'text-text';
  const barTone = isUrgent || expired ? '[&>div]:bg-danger' : isWarning ? '[&>div]:bg-warning' : '';

  const isCompleted = task.status === 'completed';
  const canComplete = isCompleted;

  return (
    <div className="border-b border-border bg-surface p-5">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[10px] uppercase tracking-wider text-text-muted">
          مهمة {task.sortOrder} من {totalTasks}
        </span>
        <Badge variant="outline" className="text-[10px]">صعوبة {task.difficulty}/5</Badge>
      </div>

      <h3 className="font-semibold text-base mb-2 leading-snug">{task.title}</h3>
      <p className="text-xs text-text-secondary leading-relaxed mb-4">{task.description}</p>

      {extensions > 0 && (
        <p className="text-[11px] text-warning mb-2">تم تمديد الوقت {extensions} مرة</p>
      )}

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Clock className={`w-3.5 h-3.5 ${timeTone}`} />
            <span className={`font-mono tabular-nums ${timeValueTone}`}>
              {expired ? 'انتهى الوقت' : formatTime(timeRemaining)}
            </span>
          </div>
          <span className="text-text-muted">من {task.deadlineMinutes} دقيقة</span>
        </div>
        <Progress value={progress} className={barTone} />
      </div>

      <Button
        onClick={onComplete}
        disabled={!canComplete || isCompleting}
        className={`w-full ${canComplete ? 'animate-pulse ring-2 ring-green-500 shadow-lg shadow-green-500/30' : ''}`}
        size="sm"
      >
        <CheckCircle2 className="w-4 h-4 ml-2" />
        {isCompleting
          ? 'جاري الإنهاء...'
          : canComplete
            ? 'تم الإنجاز — اضغط للمتابعة'
            : expired
              ? 'انتهى الوقت — انتظر التقييم'
              : 'أنهي المهمة مع الزملاء أولاً'}
      </Button>
    </div>
  );
}