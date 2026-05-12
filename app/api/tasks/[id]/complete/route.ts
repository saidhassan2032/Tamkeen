import { NextRequest, NextResponse } from 'next/server';
import { db, tasks, messages } from '@/lib/db';
import { eq, and, asc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    let nextTaskResult: { done: boolean; nextTask: any } = { done: true, nextTask: null };

    await db.transaction(async (tx) => {
      // Re-read the task inside the transaction to verify it's still active
      const completedTask = await tx.select().from(tasks).where(eq(tasks.id, params.id)).get();
      if (!completedTask) {
        throw new Error('مهمة غير موجودة');
      }

      if (completedTask.status !== 'active') {
        throw new Error('المهمة ليست نشطة — قد تم إنجازها بالفعل');
      }

      // Mark as completed
      await tx
        .update(tasks)
        .set({ status: 'completed', completedAt: Date.now() })
        .where(eq(tasks.id, params.id));

      // Find and activate the next pending task
      const nextTask = await tx
        .select()
        .from(tasks)
        .where(and(eq(tasks.sessionId, completedTask.sessionId), eq(tasks.status, 'pending')))
        .orderBy(asc(tasks.sortOrder))
        .get();

      if (nextTask) {
        const startedAt = Date.now();
        await tx
          .update(tasks)
          .set({ status: 'active', startedAt })
          .where(eq(tasks.id, nextTask.id));

        // Seed the next task's starter message
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

        nextTaskResult = {
          done: false,
          nextTask: { ...nextTask, status: 'active', startedAt },
        };
      }
    });

    return NextResponse.json(nextTaskResult);
  } catch (err: any) {
    console.error('POST /api/tasks/[id]/complete failed', err);
    const status = err.message === 'مهمة غير موجودة' || err.message.includes('ليست نشطة')
      ? 400
      : 500;
    const message = process.env.NODE_ENV === 'production'
      ? 'حدث خطأ في الاتصال، حاول مجدداً'
      : `حدث خطأ: ${err?.message ?? 'غير محدد'}`;
    return NextResponse.json({ error: message }, { status });
  }
}
