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

async function main() {
  const client = createClient({ url, authToken });
  await client.execute({ sql: 'DELETE FROM tasks;' });
  await client.execute({ sql: 'DELETE FROM messages;' });
  console.log('Deleted all rows from tasks and messages.');
}

main().catch((err) => {
  console.error('Failed to clear tasks/messages:', err);
  process.exit(1);
});
