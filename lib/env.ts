/**
 * Defensive env loader for development.
 *
 * Next.js loads .env.local automatically, but it does NOT override variables
 * that are already present in process.env — even if their value is an empty
 * string. Some shells (and parent processes like Claude Code) leak empty
 * envs that block our real values from loading. This module forces the
 * .env.local values to take effect in development.
 *
 * In production we rely entirely on platform-set env vars (Vercel) and
 * do nothing here.
 */

let initialized = false;

export function ensureEnv() {
  if (initialized) return;
  initialized = true;

  if (process.env.NODE_ENV === 'production') return;
  if (typeof window !== 'undefined') return; // server only

  const keys = ['ANTHROPIC_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY', 'TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'NEXT_PUBLIC_BASE_URL'];
  const allSet = keys.every((k) => (process.env[k] ?? '').trim().length > 0);
  if (allSet) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { config } = require('dotenv');
    config({ path: '.env.local', override: true });
  } catch {
    // dotenv missing or read failure — silent in dev
  }
}

ensureEnv();
