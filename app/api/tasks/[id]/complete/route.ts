import { NextRequest, NextResponse } from 'next/server';
import { db, tasks, messages } from '@/lib/db';
import { eq, and, asc, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const force = searchParams.get('force') === 'true';

    let result: {
      taskStatus: string;
      transitioned: boolean;
      blocked: boolean;
      feedback: string | null;
      canSkip: boolean;
      skipWarning: string | null;
      nextTask: any;
      done: boolean;
    } = {
      taskStatus: 'pending',
      transitioned: false,
      blocked: false,
      feedback: null,
      canSkip: false,
      skipWarning: null,
      nextTask: null,
      done: false,
    };

    await db.transaction(async (tx) => {
      const completedTask = await tx.select().from(tasks).where(eq(tasks.id, params.id)).get();
      if (!completedTask) {
        throw new Error('مهمة غير موجودة');
      }

      const status = completedTask.status;
      const activeStates = ['started', 'active'];

      // Already completed — set completedAt if missing, then activate next task
      if (status === 'completed') {
        if (!completedTask.completedAt) {
          await tx
            .update(tasks)
            .set({ completedAt: Date.now() })
            .where(eq(tasks.id, params.id));
        }
        const nextTask = await activateNextTask(tx, completedTask.sessionId);
        result = {
          taskStatus: 'completed',
          transitioned: true,
          blocked: false,
          feedback: null,
          canSkip: false,
          skipWarning: null,
          nextTask: nextTask?.task ?? null,
          done: !nextTask,
        };
        return;
      }

      // Not completed and not force — block
      if (!force) {
        if (activeStates.includes(status)) {
          result = {
            taskStatus: status === 'active' ? 'started' : status,
            transitioned: false,
            blocked: true,
            feedback: 'لم تقم بالعمل الكافي بعد. تواصل مع الزملاء لإنجاز المهمة.',
            canSkip: true,
            skipWarning: 'إذا تخطيت الآن، سيتأثر تقييم أدائك بشكل كبير',
            nextTask: null,
            done: false,
          };
          return;
        }
        if (status === 'largely') {
          const lastAgentMsg = await tx
            .select()
            .from(messages)
            .where(and(
              eq(messages.sessionId, completedTask.sessionId),
              eq(messages.agentId, completedTask.assignedByAgentId),
              eq(messages.role, 'assistant'),
            ))
            .orderBy(desc(messages.timestamp))
            .get();

          result = {
            taskStatus: 'largely',
            transitioned: false,
            blocked: true,
            feedback: lastAgentMsg?.content ?? 'المهمة شبه منجزة، يرجى مراجعة ملاحظات الزملاء.',
            canSkip: true,
            skipWarning: 'إذا تخطيت الآن، قد يتأثر تقييم أدائك بشكل بسيط',
            nextTask: null,
            done: false,
          };
          return;
        }
        throw new Error('المهمة غير جاهزة للإنجاز');
      }

      // Force complete — mark with low scores
      const verdict = status === 'largely'
        ? 'تم تخطي المهمة — كانت شبه منجزة'
        : 'تم تخطي المهمة — لم تنجز بالكامل';

      await tx
        .update(tasks)
        .set({
          status: 'completed',
          completedAt: Date.now(),
          qualityScore: 1,
          speedScore: 1,
          communicationScore: 1,
          verdict,
        })
        .where(eq(tasks.id, params.id));

      const nextTask = await activateNextTask(tx, completedTask.sessionId);
      result = {
        taskStatus: 'completed',
        transitioned: true,
        blocked: false,
        feedback: null,
        canSkip: false,
        skipWarning: null,
        nextTask: nextTask?.task ?? null,
        done: !nextTask,
      };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('POST /api/tasks/[id]/complete failed', err);
    const status = err.message === 'مهمة غير موجودة' ? 400 : 500;
    const message = process.env.NODE_ENV === 'production'
      ? 'حدث خطأ في الاتصال، حاول مجدداً'
      : `حدث خطأ: ${err?.message ?? 'غير محدد'}`;
    return NextResponse.json({ error: message }, { status });
  }
}

async function activateNextTask(tx: any, sessionId: string) {
  const nextTask = await tx
    .select()
    .from(tasks)
    .where(and(eq(tasks.sessionId, sessionId), eq(tasks.status, 'pending')))
    .orderBy(asc(tasks.sortOrder))
    .get();

  if (!nextTask) return null;

  const startedAt = Date.now();
  await tx
    .update(tasks)
    .set({ status: 'started', startedAt })
    .where(eq(tasks.id, nextTask.id));

  if (nextTask.starterMessage && nextTask.assignedByAgentId) {
    await tx.insert(messages).values({
      id: randomUUID(),
      sessionId: nextTask.sessionId,
      agentId: nextTask.assignedByAgentId,
      role: 'assistant',
      content: nextTask.starterMessage,
      timestamp: startedAt,
    });
  }

  return { task: { ...nextTask, status: 'started', startedAt } };
}
