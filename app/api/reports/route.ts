import { NextResponse } from 'next/server';
import { eq, desc, inArray } from 'drizzle-orm';
import { db, reports, sessions } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ reports: [], avg: null });
  }

  const userSessionRows = await db
    .select({ id: sessions.id, trackId: sessions.trackId, majorId: sessions.majorId })
    .from(sessions)
    .where(eq(sessions.userId, user.id));

  if (userSessionRows.length === 0) {
    return NextResponse.json({ reports: [], avg: null });
  }

  const sessionMap = new Map(userSessionRows.map((s) => [s.id, s]));
  const sessionIds = userSessionRows.map((s) => s.id);

  const reportRows = await db
    .select({
      id: reports.id,
      sessionId: reports.sessionId,
      overallScore: reports.overallScore,
      qualityScore: reports.qualityScore,
      speedScore: reports.speedScore,
      communicationScore: reports.communicationScore,
      verdict: reports.verdict,
      generatedAt: reports.generatedAt,
    })
    .from(reports)
    .where(inArray(reports.sessionId, sessionIds))
    .orderBy(desc(reports.generatedAt));

  if (reportRows.length === 0) {
    return NextResponse.json({ reports: [], avg: null });
  }

  const avg = {
    quality:       Math.round(reportRows.reduce((s, r) => s + r.qualityScore,       0) / reportRows.length),
    speed:         Math.round(reportRows.reduce((s, r) => s + r.speedScore,         0) / reportRows.length),
    communication: Math.round(reportRows.reduce((s, r) => s + r.communicationScore, 0) / reportRows.length),
    overall:       Math.round(reportRows.reduce((s, r) => s + r.overallScore,       0) / reportRows.length),
    count:         reportRows.length,
  };

  const list = reportRows.map((r) => ({
    ...r,
    trackId: sessionMap.get(r.sessionId)?.trackId ?? null,
    majorId: sessionMap.get(r.sessionId)?.majorId ?? null,
  }));

  return NextResponse.json({ reports: list, avg });
}
