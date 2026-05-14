import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const STATE_COOKIE = 'tamkeen_oauth_state';
const NEXT_COOKIE = 'tamkeen_oauth_next';

function getBaseUrl(req: NextRequest) {
  return process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') ?? new URL(req.url).origin;
}

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: 'GOOGLE_CLIENT_ID غير مضبوط' }, { status: 500 });
  }

  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/google/callback`;
  const state = randomBytes(16).toString('hex');
  const cookieStore = cookies();

  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10,
  });

  // Carry the post-login destination across the OAuth round-trip via cookie.
  // Only same-origin relative paths starting with '/' are accepted.
  const rawNext = new URL(req.url).searchParams.get('next');
  if (rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//')) {
    cookieStore.set(NEXT_COOKIE, rawNext, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10,
    });
  } else {
    // Stale cookie from an earlier attempt would otherwise hijack this flow.
    cookieStore.delete(NEXT_COOKIE);
  }

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('access_type', 'online');
  url.searchParams.set('prompt', 'select_account');
  url.searchParams.set('state', state);

  return NextResponse.redirect(url.toString());
}
