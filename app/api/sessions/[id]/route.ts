import { NextRequest, NextResponse } from 'next/server';
import { db, sessions, agents, tasks, messages, type Message } from '@/lib/db';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const [session, sessionAgents, sessionTasks] = await Promise.all([
      db.select().from(sessions).where(eq(sessions.id, params.id)).get(),
      db.select().from(agents).where(eq(agents.sessionId, params.id)),
      db.select().from(tasks).where(eq(tasks.sessionId, params.id)).orderBy(tasks.difficulty),
    ]);

    if (!session) {
      return NextResponse.json({ error: 'الجلسة غير موجودة' }, { status: 404 });
    }

    const conversations: Record<string, Message[]> = {};
    for (const agent of sessionAgents) {
      conversations[agent.id] = await db
        .select()
        .from(messages)
        .where(eq(messages.agentId, agent.id))
        .orderBy(messages.timestamp);
    }

    return NextResponse.json({
      session,
      agents: sessionAgents,
      tasks: sessionTasks,
      conversations,
    });
  } catch (err) {
    console.error('GET /api/sessions/[id] failed', err);
    return NextResponse.json({ error: 'حدث خطأ في الاتصال، حاول مجدداً' }, { status: 500 });
  }
}
