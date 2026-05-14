import { NextRequest, NextResponse } from 'next/server';
import { db, sessions, agents, tasks, messages } from '@/lib/db';
import { generateOneTask } from '@/lib/claude';
import type { AgentInfo } from '@/lib/claude';
import { AGENT_TEMPLATES } from '@/types';
import { randomUUID } from 'crypto';
import { getCurrentUser } from '@/lib/auth';

export const maxDuration = 90;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { trackId, majorId, mode } = await req.json();

    if (!trackId || !majorId || !mode) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }

    const template = AGENT_TEMPLATES[trackId];
    if (!template) {
      return NextResponse.json({ error: 'مسار غير موجود' }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (mode === 'extended' && !user) {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول لبدء المحاكاة الموسّعة' },
        { status: 401 },
      );
    }

    const totalTasks = mode === 'quick' ? 3 : 5;
    const sessionId = randomUUID();

    await db.insert(sessions).values({
      id: sessionId,
      userId: user?.id ?? null,
      trackId,
      majorId,
      mode,
      totalTasks,
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

    const agentNames: AgentInfo[] = [
      { id: 'manager',      name: template.manager.name,      roleTitle: template.manager.roleTitle },
      { id: 'colleague_1',  name: template.colleague1.name,   roleTitle: template.colleague1.roleTitle },
      { id: 'colleague_2',  name: template.colleague2.name,   roleTitle: template.colleague2.roleTitle },
    ];

    const generated = await generateOneTask(
      trackId, template.company, 0, totalTasks, [], agentNames,
    );
    if (!generated) {
      return NextResponse.json({ error: 'تعذّر توليد المهمة الأولى، حاول مجدداً' }, { status: 500 });
    }

    const waiting = generated.waitingAgentId.startsWith(`${sessionId}_`)
      ? generated.waitingAgentId
      : `${sessionId}_${generated.waitingAgentId}`;
    const assigner = generated.assignedByAgentId.startsWith(`${sessionId}_`)
      ? generated.assignedByAgentId
      : `${sessionId}_${generated.assignedByAgentId}`;

    const taskId = randomUUID();
    const startedAt = Date.now();

    await db.insert(tasks).values({
      id: taskId,
      sessionId,
      title: generated.title,
      description: generated.description,
      resources: JSON.stringify(generated.resources ?? []),
      guidanceTips: JSON.stringify(generated.guidanceTips ?? []),
      starterMessage: generated.starterMessage ?? null,
      deadlineMinutes: generated.deadlineMinutes ?? 15,
      sortOrder: 1,
      status: 'started',
      difficulty: generated.difficulty ?? 1,
      workflowType: generated.workflowType ?? 'self_contained',
      waitingAgentId: waiting,
      assignedByAgentId: assigner,
      startedAt,
    });

    if (assigner && generated.starterMessage) {
      await db.insert(messages).values({
        id: randomUUID(),
        sessionId,
        agentId: assigner,
        role: 'assistant',
        content: generated.starterMessage,
        timestamp: startedAt,
      });
    }

    return NextResponse.json({ sessionId, totalTasks });
  } catch (err: any) {
    console.error('POST /api/sessions failed', err);
    const message = process.env.NODE_ENV === 'production'
      ? 'حدث خطأ في الاتصال، حاول مجدداً'
      : `حدث خطأ: ${err?.message ?? 'غير محدد'}`;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
