import { NextRequest, NextResponse } from 'next/server';
import { db, tasks, messages } from '@/lib/db';
import { eq, and, asc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const completedTask = await db.select().from(tasks).where(eq(tasks.id, params.id)).get();
    if (!completedTask) {
      return NextResponse.json({ error: 'مهمة غير موجودة' }, { status: 404 });
    }

    await db
      .update(tasks)
      .set({ status: 'completed', completedAt: Date.now() })
      .where(eq(tasks.id, params.id));

    const nextTask = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.sessionId, completedTask.sessionId), eq(tasks.status, 'pending')))
      .orderBy(asc(tasks.difficulty))
      .get();

    if (nextTask) {
      const startedAt = Date.now();
      await db
        .update(tasks)
        .set({ status: 'active', startedAt })
        .where(eq(tasks.id, nextTask.id));

      // Seed the next task's starter message in the assigning agent's chat
      if (nextTask.starterMessage && nextTask.assignedByAgentId) {
        await db.insert(messages).values({
          id: randomUUID(),
          sessionId: nextTask.sessionId,
          agentId: nextTask.assignedByAgentId,
          role: 'assistant',
          content: nextTask.starterMessage,
          timestamp: startedAt,
        });
      }

      return NextResponse.json({
        done: false,
        nextTask: { ...nextTask, status: 'active', startedAt },
      });
    }

    return NextResponse.json({ done: true, nextTask: null });
  } catch (err) {
    console.error('POST /api/tasks/[id]/complete failed', err);
    return NextResponse.json({ error: 'حدث خطأ في الاتصال، حاول مجدداً' }, { status: 500 });
  }
}
