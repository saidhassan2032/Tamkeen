import { NextRequest, NextResponse } from 'next/server';
import { db, tasks, messages, sessions } from '@/lib/db';
import { generateOneTask, computeDeadlineMinutes } from '@/lib/claude';
import type { AgentInfo } from '@/lib/claude';
import { AGENT_TEMPLATES } from '@/types';
import { eq, and, asc, count } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    let result: {
      taskStatus: string;
      transitioned: boolean;
      nextTask: any;
      done: boolean;
    } = {
      taskStatus: 'pending',
      transitioned: false,
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

      if (completedTask.status !== 'completed') {
        throw new Error('المهمة لم تنجز بعد');
      }

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

        const templateName = session.trackId;
        const template = AGENT_TEMPLATES[templateName];
        const agentNames: AgentInfo[] = template
          ? [
              { id: 'manager',      name: template.manager.name,      roleTitle: template.manager.roleTitle },
              { id: 'colleague_1',  name: template.colleague1.name,   roleTitle: template.colleague1.roleTitle },
              { id: 'colleague_2',  name: template.colleague2.name,   roleTitle: template.colleague2.roleTitle },
            ]
          : [];

        const generated = await generateOneTask(
          session.trackId,
          session.companyContext,
          nextIndex,
          session.totalTasks,
          prevTasks,
          agentNames,
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
            deadlineMinutes: generated.deadlineMinutes,
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
            deadlineMinutes: generated.deadlineMinutes,
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
    return NextResponse.json({ error: err?.message || 'المهمة لم تنجز بعد' }, { status: 400 });
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