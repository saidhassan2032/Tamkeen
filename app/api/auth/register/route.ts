import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db, users } from '@/lib/db';
import { createSession, hashPassword, publicUser } from '@/lib/auth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { email, name, password } = await req.json();

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const trimmedName = typeof name === 'string' ? name.trim() : '';

    if (!normalizedEmail || !trimmedName || typeof password !== 'string') {
      return NextResponse.json({ error: 'الرجاء تعبئة جميع الحقول' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'بريد إلكتروني غير صالح' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' }, { status: 400 });
    }

    const existing = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
    if (existing[0]) {
      return NextResponse.json({ error: 'هذا البريد مستخدم مسبقاً' }, { status: 409 });
    }

    const id = randomUUID();
    const passwordHash = await hashPassword(password);
    await db.insert(users).values({
      id,
      email: normalizedEmail,
      name: trimmedName,
      passwordHash,
      createdAt: Date.now(),
    });

    await createSession(id);

    return NextResponse.json({
      user: publicUser({
        id,
        email: normalizedEmail,
        name: trimmedName,
        passwordHash,
        googleId: null,
        avatarUrl: null,
        createdAt: Date.now(),
      }),
    });
  } catch (err: any) {
    console.error('POST /api/auth/register failed', err);
    return NextResponse.json({ error: 'تعذّر إنشاء الحساب، حاول مجدداً' }, { status: 500 });
  }
}
