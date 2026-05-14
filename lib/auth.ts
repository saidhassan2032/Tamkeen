import '@/lib/env';
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import { db, users, userSessions, type User } from '@/lib/db';

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
) => Promise<Buffer>;

export const SESSION_COOKIE = 'tamkeen_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(':');
  if (!salt || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(password, salt, 64);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export async function createSession(userId: string): Promise<string> {
  const id = randomBytes(32).toString('hex');
  const now = Date.now();
  await db.insert(userSessions).values({
    id,
    userId,
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  });
  cookies().set(SESSION_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return id;
}

export async function destroySession(): Promise<void> {
  const store = cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (id) {
    await db.delete(userSessions).where(eq(userSessions.id, id));
  }
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const id = cookies().get(SESSION_COOKIE)?.value;
  if (!id) return null;

  const sessionRows = await db
    .select()
    .from(userSessions)
    .where(eq(userSessions.id, id))
    .limit(1);
  const session = sessionRows[0];
  if (!session) return null;

  if (session.expiresAt < Date.now()) {
    await db.delete(userSessions).where(eq(userSessions.id, id));
    return null;
  }

  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  return userRows[0] ?? null;
}

export function publicUser(u: User) {
  return { id: u.id, email: u.email, name: u.name, avatarUrl: u.avatarUrl };
}
