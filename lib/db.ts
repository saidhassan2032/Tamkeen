import '@/lib/env';
import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

let _client: Client | null = null;
let _db: LibSQLDatabase | null = null;

function getDb(): LibSQLDatabase {
  if (_db) return _db;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error('TURSO_DATABASE_URL غير مضبوط');
  _client = createClient({ url, authToken });
  _db = drizzle(_client);
  return _db;
}

export const db = new Proxy({} as LibSQLDatabase, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});

export const users = sqliteTable('users', {
  id:           text('id').primaryKey(),
  email:        text('email').notNull().unique(),
  name:         text('name').notNull(),
  passwordHash: text('password_hash'),
  googleId:     text('google_id'),
  avatarUrl:    text('avatar_url'),
  createdAt:    integer('created_at').notNull(),
});

export const userSessions = sqliteTable('user_sessions', {
  id:        text('id').primaryKey(),
  userId:    text('user_id').notNull(),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const sessions = sqliteTable('sessions', {
  id:             text('id').primaryKey(),
  userId:         text('user_id'),
  trackId:        text('track_id').notNull(),
  majorId:        text('major_id').notNull(),
  mode:           text('mode').notNull(),
  duration:       text('duration'),
  totalTasks:     integer('total_tasks').notNull(),
  status:         text('status').notNull().default('active'),
  companyContext: text('company_context').notNull(),
  startedAt:      integer('started_at').notNull(),
  endedAt:        integer('ended_at'),
});

export const agents = sqliteTable('agents', {
  id:          text('id').primaryKey(),
  sessionId:   text('session_id').notNull(),
  name:        text('name').notNull(),
  roleTitle:   text('role_title').notNull(),
  type:        text('type').notNull(),
  personality: text('personality').notNull(),
  roleInTask:  text('role_in_task').notNull(),
  avatarBg:    text('avatar_bg').notNull(),
  avatarColor: text('avatar_color').notNull(),
  icon:        text('icon').notNull(),
});

export const tasks = sqliteTable('tasks', {
  id:                 text('id').primaryKey(),
  sessionId:          text('session_id').notNull(),
  title:              text('title').notNull(),
  description:        text('description').notNull(),
  resources:          text('resources').notNull(),
  guidanceTips:       text('guidance_tips').notNull(),
  starterMessage:     text('starter_message'),
  deadlineMinutes:    integer('deadline_minutes').notNull(),
  sortOrder:          integer('sort_order'),
  status:             text('status').notNull().default('pending'),
  difficulty:         integer('difficulty').notNull(),
  waitingAgentId:     text('waiting_agent_id').notNull(),
  assignedByAgentId:  text('assigned_by_agent_id').notNull(),
  startedAt:          integer('started_at'),
  completedAt:        integer('completed_at'),
  qualityScore:       integer('quality_score'),
  speedScore:         integer('speed_score'),
  communicationScore: integer('communication_score'),
  verdict:            text('verdict'),
});

export const messages = sqliteTable('messages', {
  id:          text('id').primaryKey(),
  sessionId:   text('session_id').notNull(),
  agentId:     text('agent_id').notNull(),
  role:        text('role').notNull(),
  content:     text('content').notNull(),
  attachments: text('attachments'),
  timestamp:   integer('timestamp').notNull(),
});

export const reports = sqliteTable('reports', {
  id:                 text('id').primaryKey(),
  sessionId:          text('session_id').notNull(),
  overallScore:       integer('overall_score').notNull(),
  qualityScore:       integer('quality_score').notNull(),
  speedScore:         integer('speed_score').notNull(),
  communicationScore: integer('communication_score').notNull(),
  verdict:            text('verdict').notNull(),
  strengths:          text('strengths').notNull(),
  improvements:       text('improvements').notNull(),
  agentFeedbacks:     text('agent_feedbacks').notNull(),
  taskScores:         text('task_scores').notNull(),
  generatedAt:        integer('generated_at').notNull(),
});

export type Session = typeof sessions.$inferSelect;
export type Agent = typeof agents.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type User = typeof users.$inferSelect;
export type UserSession = typeof userSessions.$inferSelect;
