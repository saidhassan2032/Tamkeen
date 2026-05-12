import { NextRequest, NextResponse } from 'next/server';
import { db, sessions, agents, tasks, messages } from '@/lib/db';
import { generateTasks } from '@/lib/claude';
import { AGENT_TEMPLATES } from '@/types';
import { randomUUID } from 'crypto';

export const maxDuration = 90;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { trackId, majorId, mode, duration } = await req.json();

    if (!trackId || !majorId || !mode) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }

    const template = AGENT_TEMPLATES[trackId];
    if (!template) {
      return NextResponse.json({ error: 'مسار غير موجود' }, { status: 400 });
    }

    const sessionId = randomUUID();

    await db.insert(sessions).values({
      id: sessionId,
      trackId,
      majorId,
      mode,
      duration: duration ?? null,
      status: 'active',
      companyContext: template.company,
      startedAt: Date.now(),
    });

    const agentsToInsert = [
      { id: `${sessionId}_manager`,     sessionId, type: 'manager',   ...template.manager    },
      { id: `${sessionId}_colleague_1`, sessionId, type: 'colleague', ...template.colleague1 },
      { id: `${sessionId}_colleague_2`, sessionId, type: 'colleague', ...template.colleague2 },
    ];
    for (const agent of agentsToInsert) {
      await db.insert(agents).values(agent);
    }

    const generatedTasks = await generateTasks(trackId, template.company, mode, duration);
    if (!generatedTasks.length) {
      return NextResponse.json({ error: 'تعذّر توليد المهام، حاول مجدداً' }, { status: 500 });
    }

    let firstTaskId: string | null = null;
    let firstAssigner: string | null = null;
    let firstStarter: string | null = null;

    for (let i = 0; i < generatedTasks.length; i++) {
      const task = generatedTasks[i];
      const waiting = task.waitingAgentId?.startsWith(`${sessionId}_`) ? task.waitingAgentId : `${sessionId}_${task.waitingAgentId}`;
      const assigner = task.assignedByAgentId?.startsWith(`${sessionId}_`) ? task.assignedByAgentId : `${sessionId}_${task.assignedByAgentId}`;
      const taskId = randomUUID();

      await db.insert(tasks).values({
        id: taskId,
        sessionId,
        title: task.title,
        description: task.description,
        resources: JSON.stringify(task.resources ?? []),
        guidanceTips: JSON.stringify(task.guidanceTips ?? []),
        starterMessage: task.starterMessage ?? null,
        deadlineMinutes: task.deadlineMinutes ?? 15,
        sortOrder: i + 1,
        status: i === 0 ? 'active' : 'pending',
        difficulty: task.difficulty ?? i + 1,
        waitingAgentId: waiting,
        assignedByAgentId: assigner,
        startedAt: i === 0 ? Date.now() : null,
      });

      if (i === 0) {
        firstTaskId = taskId;
        firstAssigner = assigner;
        firstStarter = task.starterMessage ?? null;
      }
    }

    // Seed the first task's starter message into the chat with the assigning agent
    if (firstAssigner && firstStarter) {
      await db.insert(messages).values({
        id: randomUUID(),
        sessionId,
        agentId: firstAssigner,
        role: 'assistant',
        content: firstStarter,
        timestamp: Date.now(),
      });
    }

    return NextResponse.json({ sessionId });
  } catch (err: any) {
    console.error('POST /api/sessions failed', err);
    const message = process.env.NODE_ENV === 'production'
      ? 'حدث خطأ في الاتصال، حاول مجدداً'
      : `حدث خطأ: ${err?.message ?? 'غير محدد'}`;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
