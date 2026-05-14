import { NextRequest } from 'next/server';
import { createSSEStream } from '@/lib/sse';
import { db, sessions, tasks } from '@/lib/db';
import { generateOneTask } from '@/lib/claude';
import type { AgentInfo } from '@/lib/claude';
import { AGENT_TEMPLATES } from '@/types';
import { eq, asc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  return createSSEStream(async (send) => {
    const session = await db.select().from(sessions).where(eq(sessions.id, params.id)).get();
    if (!session) return;

    const template = AGENT_TEMPLATES[session.trackId];
    if (!template) return;

    const agentNames: AgentInfo[] = [
      { id: 'manager',      name: template.manager.name,      roleTitle: template.manager.roleTitle },
      { id: 'colleague_1',  name: template.colleague1.name,   roleTitle: template.colleague1.roleTitle },
      { id: 'colleague_2',  name: template.colleague2.name,   roleTitle: template.colleague2.roleTitle },
    ];

    const totalCount = session.totalTasks;

    const dbTasks = await db.select()
      .from(tasks)
      .where(eq(tasks.sessionId, params.id))
      .orderBy(asc(tasks.sortOrder));

    const prevTasks: { title: string; description: string }[] = dbTasks.map(t => ({
      title: t.title,
      description: t.description,
    }));

    for (let i = dbTasks.length; i < totalCount; i++) {
      const generated = await generateOneTask(
        session.trackId,
        session.companyContext,
        i,
        totalCount,
        prevTasks,
        agentNames,
      );

      if (!generated) continue;

      const waiting = generated.waitingAgentId.startsWith(params.id)
        ? generated.waitingAgentId
        : `${params.id}_${generated.waitingAgentId}`;
      const assigner = generated.assignedByAgentId.startsWith(params.id)
        ? generated.assignedByAgentId
        : `${params.id}_${generated.assignedByAgentId}`;

      const taskId = randomUUID();
      await db.insert(tasks).values({
        id: taskId,
        sessionId: params.id,
        title: generated.title,
        description: generated.description,
        resources: JSON.stringify(generated.resources ?? []),
        guidanceTips: JSON.stringify(generated.guidanceTips ?? []),
        starterMessage: generated.starterMessage ?? null,
        deadlineMinutes: generated.deadlineMinutes ?? 15,
        sortOrder: i + 1,
        status: 'pending',
        difficulty: generated.difficulty ?? i + 1,
        workflowType: generated.workflowType ?? 'self_contained',
        waitingAgentId: waiting,
        assignedByAgentId: assigner,
      });

      prevTasks.push({ title: generated.title, description: generated.description });
    }
  });
}
