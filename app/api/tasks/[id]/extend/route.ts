import { NextRequest, NextResponse } from 'next/server';
import { db, tasks } from '@/lib/db';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const minutes = body.minutes as number;

    if (![15, 30, 45].includes(minutes)) {
      return NextResponse.json({ error: 'مدة التمديد غير صالحة (15, 30, 45)' }, { status: 400 });
    }

    const task = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, params.id))
      .get();

    if (!task) {
      return NextResponse.json({ error: 'المهمة غير موجودة' }, { status: 404 });
    }

    if (task.status === 'completed') {
      return NextResponse.json({ error: 'المهمة منجزة بالفعل' }, { status: 400 });
    }

    const newDeadline = (task.deadlineMinutes ?? 30) + minutes;

    await db
      .update(tasks)
      .set({
        deadlineMinutes: newDeadline,
        extensions: (task.extensions ?? 0) + 1,
      })
      .where(eq(tasks.id, params.id));

    return NextResponse.json({
      extended: true,
      deadlineMinutes: newDeadline,
      extensions: (task.extensions ?? 0) + 1,
    });
  } catch (err) {
    console.error('POST /api/tasks/[id]/extend failed', err);
    return NextResponse.json({ error: 'حدث خطأ في الاتصال، حاول مجدداً' }, { status: 500 });
  }
}