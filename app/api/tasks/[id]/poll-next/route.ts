import { NextRequest, NextResponse } from 'next/server';
import { db, tasks } from '@/lib/db';
import { eq, asc, and } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const current = await db.select().from(tasks).where(eq(tasks.id, params.id)).get();
    if (!current) {
      return NextResponse.json({ ready: false, task: null });
    }

    const pending = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.sessionId, current.sessionId), eq(tasks.status, 'pending')))
      .orderBy(asc(tasks.sortOrder))
      .get();

    return NextResponse.json({
      ready: !!pending,
      task: pending ?? null,
    });
  } catch (err) {
    console.error('GET /api/tasks/[id]/poll-next failed', err);
    return NextResponse.json({ ready: false, task: null });
  }
}
