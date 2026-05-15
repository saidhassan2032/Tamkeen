import { NextRequest, NextResponse } from 'next/server';
import { db, tasks, messages } from '@/lib/db';
import { eq, and, asc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    let done = false;
    let nextTask: any = null;

    await db.transaction(async (tx) => {
      const completedTask = await tx.select().from(tasks).where(eq(tasks.id, params.id)).get();
      if (!completedTask) {
        throw new Error('مهمة غير موجودة');
      }

      if (completedTask.status !== 'completed') {
        throw new Error('المهمة لم تنجز بعد');
      }

      if (!completedTask.completedAt) {
        await tx
          .update(tasks)
          .set({ completedAt: Date.now() })
          .where(eq(tasks.id, params.id));
      }

      const pending = await tx
        .select()
        .from(tasks)
        .where(and(eq(tasks.sessionId, completedTask.sessionId), eq(tasks.status, 'pending')))
        .orderBy(asc(tasks.sortOrder))
        .get();

      if (!pending) {
        done = true;
        return;
      }

      const startedAt = Date.now();
      await tx
        .update(tasks)
        .set({ status: 'started', startedAt })
        .where(eq(tasks.id, pending.id));

      if (pending.starterMessage && pending.assignedByAgentId) {
        await tx.insert(messages).values({
          id: randomUUID(),
          sessionId: pending.sessionId,
          agentId: pending.assignedByAgentId,
          role: 'assistant',
          content: pending.starterMessage,
          timestamp: startedAt,
        });
      }

      nextTask = { ...pending, status: 'started', startedAt };
    });

    return NextResponse.json({
      taskStatus: 'completed',
      transitioned: !!nextTask,
      nextTask,
      done,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'المهمة لم تنجز بعد' }, { status: 400 });
  }
}