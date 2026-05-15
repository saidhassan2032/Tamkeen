import { NextRequest } from 'next/server';
import { db, messages, tasks, sessions, agents, type Agent } from '@/lib/db';
import { streamAgentReply, evaluateTask } from '@/lib/claude';
import { createSSEStream } from '@/lib/sse';
import { eq, and, or, asc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const maxDuration = 60;
export const runtime = 'nodejs';

function determineAgentRole(
  workflowType: string,
  currentAgentId: string,
  assignedByAgentId: string,
): string {
  if (workflowType === 'self_contained') return 'assigner';
  if (currentAgentId === assignedByAgentId) return 'assigner';
  if (workflowType === 'delegated') return 'collaborator';
  if (workflowType === 'handoff') return 'reviewer';
  return 'assigner';
}

function formatCrossContext(
  otherAgent: Agent,
  otherMessages: { role: string; content: string }[],
): string {
  if (!otherMessages.length) return '';
  const lines = [`--- المحادثة مع ${otherAgent.name} (${otherAgent.roleTitle}) ---`];
  for (const m of otherMessages) {
    const sender = m.role === 'user' ? 'المستخدم' : otherAgent.name;
    lines.push(`${sender}: ${m.content}`);
  }
  lines.push('--- نهاية المحادثة ---');
  return lines.join('\n');
}

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

  const [session, currentTask, allAgents, myMessages] = await Promise.all([
    db.select().from(sessions).where(eq(sessions.id, sessionId)).get(),
    db.select().from(tasks).where(and(eq(tasks.sessionId, sessionId), or(eq(tasks.status, 'started'), eq(tasks.status, 'largely'), eq(tasks.status, 'active')))).get(),
    db.select().from(agents).where(eq(agents.sessionId, sessionId)),
    db
      .select()
      .from(messages)
      .where(and(eq(messages.sessionId, sessionId), eq(messages.agentId, agentId)))
      .orderBy(messages.timestamp),
  ]);

  const agentData = allAgents.find((a) => a.id === agentId);

  if (!session || !currentTask || !agentData) {
    return new Response(JSON.stringify({ error: 'الجلسة غير موجودة' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const workflowType = currentTask.workflowType ?? 'self_contained';
  const agentRole = determineAgentRole(workflowType, agentId, currentTask.assignedByAgentId);

  let crossContext = '';
  if (workflowType !== 'self_contained' && agentId !== currentTask.assignedByAgentId) {
    const otherMessages = await db
      .select()
      .from(messages)
      .where(and(eq(messages.sessionId, sessionId), eq(messages.agentId, currentTask.assignedByAgentId)))
      .orderBy(messages.timestamp);
    const otherAgent = allAgents.find((a) => a.id === currentTask.assignedByAgentId);
    if (otherAgent && otherMessages.length > 0) {
      const recent = otherMessages.slice(-6);
      crossContext = formatCrossContext(otherAgent, recent);
    }
  }

  let otherAgentName = '';
  if (workflowType !== 'self_contained' && agentId === currentTask.assignedByAgentId) {
    const other = allAgents.find((a) => a.id === currentTask.waitingAgentId);
    if (other) otherAgentName = `${other.name} (${other.roleTitle})`;
  }

  const startedAt = currentTask.startedAt ?? Date.now();
  const timeRemaining = Math.max(
    0,
    Math.floor((startedAt + currentTask.deadlineMinutes * 60000 - Date.now()) / 60000),
  );

  const conversationHistory = myMessages.map((m) => {
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
      agentRole,
      crossContext,
      otherAgentName,
      workflowType,
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

        // Trigger post-task evaluation (hidden, backend-only)
        const allTaskMessages = await db
          .select()
          .from(messages)
          .where(eq(messages.sessionId, sessionId))
          .orderBy(asc(messages.timestamp));

        const agentNames = Object.fromEntries(
          allAgents.map((a) => [a.id, a.name]),
        );

        const taskConv = allTaskMessages
          .filter((m) => currentTask.startedAt ? m.timestamp >= currentTask.startedAt : true)
          .map((m) => {
            const speaker = m.role === 'user' ? 'المستخدم' : (agentNames[m.agentId] ?? m.agentId);
            return `[${speaker}]: ${m.content}`;
          })
          .join('\n');

        const taskName = currentTask.title;
        const taskDesc = currentTask.description;
        const diff = currentTask.difficulty;

        const curTask = await db
          .select()
          .from(tasks)
          .where(eq(tasks.id, currentTask.id))
          .get();

        const extensions = curTask?.extensions ?? 0;

        const evalResult = await evaluateTask(
          taskName,
          taskDesc,
          diff,
          extensions,
          session.trackId,
          session.companyContext,
          taskConv || '(بدون محادثة)',
        );

        if (evalResult) {
          await db
            .update(tasks)
            .set({
              qualityScore: evalResult.quality,
              speedScore: evalResult.speed,
              communicationScore: evalResult.communication,
              verdict: evalResult.verdict,
            })
            .where(eq(tasks.id, currentTask.id));
        }
      }
    }

    send({ type: 'done', agentId });
  });
}
