import { NextRequest, NextResponse } from 'next/server';
import { db, reports, sessions, messages, tasks } from '@/lib/db';
import { generateReport } from '@/lib/claude';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const maxDuration = 60;
export const runtime = 'nodejs';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const existingById = await db.select().from(reports).where(eq(reports.id, params.id)).get();
    if (existingById) {
      return NextResponse.json({
        id: existingById.id,
        sessionId: existingById.sessionId,
        overallScore: existingById.overallScore,
        qualityScore: existingById.qualityScore,
        speedScore: existingById.speedScore,
        communicationScore: existingById.communicationScore,
        verdict: existingById.verdict,
        strengths: JSON.parse(existingById.strengths),
        improvements: JSON.parse(existingById.improvements),
        agentFeedbacks: JSON.parse(existingById.agentFeedbacks),
        taskScores: JSON.parse(existingById.taskScores),
        generatedAt: existingById.generatedAt,
      });
    }

    const sessionId = params.id;
    const existingBySession = await db.select().from(reports).where(eq(reports.sessionId, sessionId)).get();
    if (existingBySession) {
      return NextResponse.json({
        id: existingBySession.id,
        sessionId: existingBySession.sessionId,
        overallScore: existingBySession.overallScore,
        qualityScore: existingBySession.qualityScore,
        speedScore: existingBySession.speedScore,
        communicationScore: existingBySession.communicationScore,
        verdict: existingBySession.verdict,
        strengths: JSON.parse(existingBySession.strengths),
        improvements: JSON.parse(existingBySession.improvements),
        agentFeedbacks: JSON.parse(existingBySession.agentFeedbacks),
        taskScores: JSON.parse(existingBySession.taskScores),
        generatedAt: existingBySession.generatedAt,
      });
    }

    const [session, allMessages, allTasks] = await Promise.all([
      db.select().from(sessions).where(eq(sessions.id, sessionId)).get(),
      db.select().from(messages).where(eq(messages.sessionId, sessionId)).orderBy(messages.timestamp),
      db.select().from(tasks).where(eq(tasks.sessionId, sessionId)),
    ]);

    if (!session) {
      return NextResponse.json({ error: 'الجلسة غير موجودة' }, { status: 404 });
    }

    const summary = allMessages
      .slice(0, 60)
      .map((m) => {
        const speakerKey = m.role === 'user' ? 'المستخدم' : m.agentId.split('_').slice(-2).join('_');
        return `[${speakerKey}]: ${m.content}`;
      })
      .join('\n');

    const endedAt = session.endedAt ?? Date.now();
    const durationMinutes = Math.max(1, Math.floor((endedAt - session.startedAt) / 60000));

    const reportData = await generateReport(
      session.trackId,
      session.companyContext,
      durationMinutes,
      allTasks.filter((t) => t.status === 'completed').length,
      allTasks.length,
      summary,
    );

    const reportId = randomUUID();
    const taskScores = allTasks.map((t) => ({
      title: t.title,
      quality: t.qualityScore,
      speed: t.speedScore,
      communication: t.communicationScore,
      verdict: t.verdict,
    }));

    await db.insert(reports).values({
      id: reportId,
      sessionId,
      overallScore: reportData.overallScore,
      qualityScore: reportData.qualityScore,
      speedScore: reportData.speedScore,
      communicationScore: reportData.communicationScore,
      verdict: reportData.verdict,
      strengths: JSON.stringify(reportData.strengths),
      improvements: JSON.stringify(reportData.improvements),
      agentFeedbacks: JSON.stringify(reportData.agentFeedbacks),
      taskScores: JSON.stringify(taskScores),
      generatedAt: Date.now(),
    });

    if (!session.endedAt) {
      await db.update(sessions).set({ status: 'completed', endedAt: Date.now() }).where(eq(sessions.id, sessionId));
    }

    return NextResponse.json({
      id: reportId,
      sessionId,
      ...reportData,
      taskScores,
      generatedAt: Date.now(),
    });
  } catch (err) {
    console.error('GET /api/reports/[id] failed', err);
    return NextResponse.json({ error: 'حدث خطأ في الاتصال، حاول مجدداً' }, { status: 500 });
  }
}
