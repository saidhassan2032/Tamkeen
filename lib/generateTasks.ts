import { db, sessions, tasks, messages } from '@/lib/db';
import { generateOneTask } from '@/lib/claude';
import type { AgentInfo } from '@/lib/claude';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export interface GenerateRemainingParams {
  sessionId: string;
  trackId: string;
  companyContext: string;
  totalTasks: number;
  agentNames: AgentInfo[];
  firstTaskTitle: string;
  firstTaskDescription: string;
}

export async function generateRemainingTasks(params: GenerateRemainingParams) {
  const { sessionId, trackId, companyContext, totalTasks, agentNames, firstTaskTitle, firstTaskDescription } = params;

  const prevTasks: { title: string; description: string }[] = [
    { title: firstTaskTitle, description: firstTaskDescription },
  ];

  for (let i = 1; i < totalTasks; i++) {
    try {
      const generated = await generateOneTask(
        trackId, companyContext, i, totalTasks, prevTasks, agentNames,
      );
      if (!generated) {
        console.warn(`[background gen] generateOneTask #${i + 1} returned null, continuing`);
        continue;
      }

      const waiting = generated.waitingAgentId.startsWith(`${sessionId}_`)
        ? generated.waitingAgentId
        : `${sessionId}_${generated.waitingAgentId}`;
      const assigner = generated.assignedByAgentId.startsWith(`${sessionId}_`)
        ? generated.assignedByAgentId
        : `${sessionId}_${generated.assignedByAgentId}`;

      await db.insert(tasks).values({
        id: randomUUID(),
        sessionId,
        title: generated.title,
        description: generated.description,
        resources: JSON.stringify(generated.resources ?? []),
        guidanceTips: JSON.stringify(generated.guidanceTips ?? []),
        starterMessage: generated.starterMessage ?? null,
        deadlineMinutes: generated.deadlineMinutes,
        sortOrder: i + 1,
        status: 'pending',
        difficulty: generated.difficulty ?? i + 1,
        workflowType: generated.workflowType ?? 'self_contained',
        waitingAgentId: waiting,
        assignedByAgentId: assigner,
        startedAt: null,
      });

      prevTasks.push({ title: generated.title, description: generated.description });
    } catch (err) {
      console.error(`[background gen] Error generating task #${i + 1}:`, String(err));
    }
  }

  await db.update(sessions).set({ tasksGenerationDone: 1 }).where(eq(sessions.id, sessionId));
}