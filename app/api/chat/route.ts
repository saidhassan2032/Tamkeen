import { NextRequest } from 'next/server';
import { db, messages, tasks, sessions, agents } from '@/lib/db';
import { streamAgentReply } from '@/lib/claude';
import { createSSEStream } from '@/lib/sse';
import { eq, and, or } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const maxDuration = 60;
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { sessionId, agentId, content, attachments } = await req.json();
  if (!sessionId || !agentId || (!content && !attachments?.length)) {
    return new Response(JSON.stringify({ error: 'بيانات ناقصة' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const attachmentsJson = Array.isArray(attachments) && attachments.length
    ? JSON.stringify(attachments)
    : null;

  await db.insert(messages).values({
    id: randomUUID(),
    sessionId,
    agentId,
    role: 'user',
    content: content ?? '',
    attachments: attachmentsJson,
    timestamp: Date.now(),
  });

  const [session, currentTask, agentData, history] = await Promise.all([
    db.select().from(sessions).where(eq(sessions.id, sessionId)).get(),
    db.select().from(tasks).where(and(eq(tasks.sessionId, sessionId), or(eq(tasks.status, 'started'), eq(tasks.status, 'largely'), eq(tasks.status, 'active')))).get(),
    db.select().from(agents).where(eq(agents.id, agentId)).get(),
    db
      .select()
      .from(messages)
      .where(and(eq(messages.sessionId, sessionId), eq(messages.agentId, agentId)))
      .orderBy(messages.timestamp),
  ]);

  if (!session || !currentTask || !agentData) {
    return new Response(JSON.stringify({ error: 'الجلسة غير موجودة' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userTurns = history.filter((m) => m.role === 'user').length;
  const shouldEvaluate = userTurns >= 4;
  const startedAt = currentTask.startedAt ?? Date.now();
  const timeRemaining = Math.max(
    0,
    Math.floor((startedAt + currentTask.deadlineMinutes * 60000 - Date.now()) / 60000),
  );

  const conversationHistory = history.map((m) => {
    let parsed: any = undefined;
    if (m.attachments) {
      try {
        parsed = JSON.parse(m.attachments);
      } catch {}
    }
    return {
      role: m.role as 'user' | 'assistant',
      content: m.content,
      attachments: parsed,
    };
  });

  return createSSEStream(async (send) => {
    send({ type: 'typing', agentId });

    const result = await streamAgentReply(
      agentData.name,
      agentData.roleTitle,
      agentData.personality,
      agentData.roleInTask,
      session.companyContext,
      session.trackId,
      currentTask.title,
      currentTask.description,
      timeRemaining,
      conversationHistory,
      shouldEvaluate,
      (chunk) => {
        send({ type: 'chunk', agentId, text: chunk });
      },
    );

    await db.insert(messages).values({
      id: randomUUID(),
      sessionId,
      agentId,
      role: 'assistant',
      content: result.text,
      timestamp: Date.now(),
    });

    if (result.score) {
      await db
        .update(tasks)
        .set({
          qualityScore: result.score.quality,
          speedScore: result.score.speed,
          communicationScore: result.score.communication,
          verdict: result.score.verdict,
        })
        .where(eq(tasks.id, currentTask.id));
      send({ type: 'evaluated', taskId: currentTask.id, score: result.score });
    }

    if (result.taskState && currentTask.status !== 'completed') {
      const update: Record<string, any> = { status: result.taskState };
      if (result.taskState === 'completed') {
        update.completedAt = Date.now();
      }
      await db
        .update(tasks)
        .set(update)
        .where(eq(tasks.id, currentTask.id));

      if (result.taskState === 'completed') {
        send({ type: 'task_completed', taskId: currentTask.id });
      }
    }

    send({ type: 'done', agentId });
  });
}
