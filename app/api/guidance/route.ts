import { NextRequest, NextResponse } from 'next/server';
import { db, tasks, sessions, agents } from '@/lib/db';
import { getGuidance } from '@/lib/claude';
import { eq, and } from 'drizzle-orm';

export const maxDuration = 30;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }

    const [session, currentTask, manager] = await Promise.all([
      db.select().from(sessions).where(eq(sessions.id, sessionId)).get(),
      db.select().from(tasks).where(and(eq(tasks.sessionId, sessionId), eq(tasks.status, 'active'))).get(),
      db.select().from(agents).where(and(eq(agents.sessionId, sessionId), eq(agents.type, 'manager'))).get(),
    ]);

    if (!session || !currentTask || !manager) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }

    const guidance = await getGuidance(
      manager.name,
      currentTask.title,
      currentTask.description,
      session.trackId,
    );

    return NextResponse.json({ guidance, agentId: manager.id });
  } catch (err) {
    console.error('POST /api/guidance failed', err);
    return NextResponse.json({ error: 'حدث خطأ في الاتصال، حاول مجدداً' }, { status: 500 });
  }
}
