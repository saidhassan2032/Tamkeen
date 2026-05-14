import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { db, users } from '@/lib/db';
import { createSession } from '@/lib/auth';

export const runtime = 'nodejs';

const STATE_COOKIE = 'tamkeen_oauth_state';
const NEXT_COOKIE = 'tamkeen_oauth_next';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

function getBaseUrl(req: NextRequest) {
  return process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ?? new URL(req.url).origin;
}

function errorRedirect(baseUrl: string, message: string) {
  const url = new URL('/login', baseUrl);
  url.searchParams.set('error', message);
  return NextResponse.redirect(url.toString());
}

export async function GET(req: NextRequest) {
  const baseUrl = getBaseUrl(req);
  const cookieStore = cookies();

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const savedState = cookieStore.get(STATE_COOKIE)?.value;
  const savedNext = cookieStore.get(NEXT_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);
  cookieStore.delete(NEXT_COOKIE);

  // Only honor relative same-origin destinations.
  const nextPath =
    savedNext && savedNext.startsWith('/') && !savedNext.startsWith('//')
      ? savedNext
      : '/dashboard';

  if (!code || !state || state !== savedState) {
    return errorRedirect(baseUrl, 'فشل التحقق من Google');
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return errorRedirect(baseUrl, 'إعدادات Google غير مكتملة');
  }

  try {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${baseUrl}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });
    if (!tokenRes.ok) throw new Error(`token exchange failed: ${tokenRes.status}`);
    const tokens = (await tokenRes.json()) as { access_token?: string };
    if (!tokens.access_token) throw new Error('no access_token');

    const infoRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!infoRes.ok) throw new Error(`userinfo failed: ${infoRes.status}`);
    const info = (await infoRes.json()) as {
      id: string;
      email?: string;
      name?: string;
      picture?: string;
      verified_email?: boolean;
    };

    if (!info.email) return errorRedirect(baseUrl, 'لم يتم الحصول على البريد من Google');

    const email = info.email.toLowerCase();
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    let userId = existing[0]?.id;

    if (existing[0]) {
      if (!existing[0].googleId || !existing[0].avatarUrl) {
        await db
          .update(users)
          .set({ googleId: info.id, avatarUrl: info.picture ?? existing[0].avatarUrl ?? null })
          .where(eq(users.id, existing[0].id));
      }
    } else {
      userId = randomUUID();
      await db.insert(users).values({
        id: userId,
        email,
        name: info.name ?? email.split('@')[0],
        passwordHash: null,
        googleId: info.id,
        avatarUrl: info.picture ?? null,
        createdAt: Date.now(),
      });
    }

    await createSession(userId!);
    return NextResponse.redirect(new URL(nextPath, baseUrl).toString());
  } catch (err) {
    console.error('Google OAuth callback failed', err);
    return errorRedirect(baseUrl, 'فشل تسجيل الدخول عبر Google');
  }
}
