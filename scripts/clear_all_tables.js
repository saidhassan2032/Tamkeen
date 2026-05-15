#!/usr/bin/env node
const path = require('path');
const { config } = require('dotenv');
const { createClient } = require('@libsql/client');

config({ path: path.resolve(__dirname, '../.env.local'), override: true });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('TURSO_DATABASE_URL or TURSO_AUTH_TOKEN is not set in .env.local or environment.');
  process.exit(1);
}

const tables = [
  'tasks',
  'messages',
  'reports',
  'user_sessions',
  'sessions',
  'users',
  'agents',
];

async function main() {
  const client = createClient({ url, authToken });

  for (const table of tables) {
    await client.execute({ sql: `DELETE FROM ${table};` });
    console.log(`Deleted all rows from ${table}.`);
  }

  console.log('Done! All tables cleared.');
}

main().catch((err) => {
  console.error('Failed to clear tables:', err);
  process.exit(1);
});