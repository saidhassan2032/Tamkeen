import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, users } from '@/lib/db';
import { createSession, verifyPassword, publicUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedEmail || typeof password !== 'string' || password.length === 0) {
      return NextResponse.json({ error: 'الرجاء تعبئة جميع الحقول' }, { status: 400 });
    }

    const rows = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
    const user = rows[0];

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'البريد أو كلمة المرور غير صحيحة' }, { status: 401 });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: 'البريد أو كلمة المرور غير صحيحة' }, { status: 401 });
    }

    await createSession(user.id);

    return NextResponse.json({ user: publicUser(user) });
  } catch (err: any) {
    console.error('POST /api/auth/login failed', err);
    return NextResponse.json({ error: 'تعذّر تسجيل الدخول، حاول مجدداً' }, { status: 500 });
  }
}
