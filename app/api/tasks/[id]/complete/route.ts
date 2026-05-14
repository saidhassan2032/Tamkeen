import { NextRequest, NextResponse } from 'next/server';
import { db, tasks, messages, sessions } from '@/lib/db';
import { eq, and, asc, desc, count } from 'drizzle-orm';
import { generateOneTask } from '@/lib/claude';
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

    let sessionId: string | null = null;

    await db.transaction(async (tx) => {
      const completedTask = await tx.select().from(tasks).where(eq(tasks.id, params.id)).get();
      if (!completedTask) {
        throw new Error('مهمة غير موجودة');
      }

      sessionId = completedTask.sessionId;
      const status = completedTask.status;
      const activeStates = ['started', 'active'];

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
          done: false,
        };
        return;
      }

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
        done: false,
      };
    });

    if (result.taskStatus === 'completed' && result.transitioned && !result.nextTask && sessionId) {
      const session = await db.select().from(sessions).where(eq(sessions.id, sessionId)).get();
      if (!session) return NextResponse.json(result);

      const completedResult = await db
        .select({ value: count() })
        .from(tasks)
        .where(and(eq(tasks.sessionId, sessionId), eq(tasks.status, 'completed')))
        .get();
      const completedCount = completedResult?.value ?? 0;

      if (completedCount < session.totalTasks) {
        const existingTasks = await db.select()
          .from(tasks)
          .where(eq(tasks.sessionId, sessionId))
          .orderBy(asc(tasks.sortOrder));

        const prevTasks = existingTasks.map(t => ({ title: t.title, description: t.description }));
        const nextIndex = existingTasks.length;

        const generated = await generateOneTask(
          session.trackId,
          session.companyContext,
          nextIndex,
          session.totalTasks,
          prevTasks,
        );

        if (generated) {
          const taskId = randomUUID();
          const startedAt = Date.now();
          const waiting = generated.waitingAgentId.startsWith(sessionId)
            ? generated.waitingAgentId
            : `${sessionId}_${generated.waitingAgentId}`;
          const assigner = generated.assignedByAgentId.startsWith(sessionId)
            ? generated.assignedByAgentId
            : `${sessionId}_${generated.assignedByAgentId}`;

          await db.insert(tasks).values({
            id: taskId,
            sessionId,
            title: generated.title,
            description: generated.description,
            resources: JSON.stringify(generated.resources ?? []),
            guidanceTips: JSON.stringify(generated.guidanceTips ?? []),
            starterMessage: generated.starterMessage ?? null,
            deadlineMinutes: generated.deadlineMinutes ?? 15,
            sortOrder: nextIndex + 1,
            status: 'started',
            difficulty: generated.difficulty ?? nextIndex + 1,
            workflowType: generated.workflowType ?? 'self_contained',
            waitingAgentId: waiting,
            assignedByAgentId: assigner,
            startedAt,
          });

          if (generated.starterMessage && assigner) {
            await db.insert(messages).values({
              id: randomUUID(),
              sessionId,
              agentId: assigner,
              role: 'assistant',
              content: generated.starterMessage,
              timestamp: startedAt,
            });
          }

          result.nextTask = {
            id: taskId,
            sessionId,
            title: generated.title,
            description: generated.description,
            resources: JSON.stringify(generated.resources ?? []),
            guidanceTips: JSON.stringify(generated.guidanceTips ?? []),
            starterMessage: generated.starterMessage ?? null,
            deadlineMinutes: generated.deadlineMinutes ?? 15,
            sortOrder: nextIndex + 1,
            status: 'started',
            difficulty: generated.difficulty ?? nextIndex + 1,
            workflowType: generated.workflowType ?? 'self_contained',
            waitingAgentId: waiting,
            assignedByAgentId: assigner,
            startedAt,
          };
          result.done = false;
        } else {
          result.done = true;
        }
      } else {
        result.done = true;
      }
    }

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
