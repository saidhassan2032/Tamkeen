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
  difficulty: number;
  status: string;
  startedAt: number | null;
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

  return (
    <div className="border-b border-tamkeen-border bg-tamkeen-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <Badge variant="secondary" className="text-xs">
          مهمة {completedTasks + 1} من {totalTasks}
        </Badge>
        <Badge variant="outline" className="text-xs">
          صعوبة {task.difficulty}/5
        </Badge>
      </div>

      <h3 className="font-semibold text-base mb-2 leading-tight">{task.title}</h3>
      <p className="text-xs text-tamkeen-muted leading-relaxed mb-4">{task.description}</p>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Clock className={`w-3.5 h-3.5 ${expired ? 'text-tamkeen-red' : isUrgent ? 'text-tamkeen-red' : isWarning ? 'text-tamkeen-amber' : 'text-tamkeen-muted'}`} />
            <span
              className={`font-mono ${
                expired || isUrgent ? 'text-tamkeen-red' : isWarning ? 'text-tamkeen-amber' : 'text-tamkeen-text'
              }`}
            >
              {expired ? 'انتهى الوقت' : formatTime(timeRemaining)}
            </span>
          </div>
          <span className="text-tamkeen-muted">من {task.deadlineMinutes} دقيقة</span>
        </div>
        <Progress value={progress} className={isUrgent ? '[&>div]:bg-tamkeen-red' : isWarning ? '[&>div]:bg-tamkeen-amber' : ''} />
      </div>

      <Button onClick={onComplete} disabled={isCompleting} className="w-full" size="sm">
        <CheckCircle2 className="w-4 h-4 ml-2" />
        {isCompleting ? 'جاري الإنهاء...' : 'إنهاء المهمة'}
      </Button>
    </div>
  );
}
