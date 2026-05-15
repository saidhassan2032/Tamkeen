/**
 * AI provider adapter — delegates to the active provider via Vercel AI SDK.
 *
 * Switch providers by changing AI_PROVIDER in .env.local:
 *   AI_PROVIDER=anthropic   (default)
 *   AI_PROVIDER=gemini
 */

export {
  generateOneTask,
  streamAgentReply,
  getGuidance,
  generateReport,
  evaluateTask,
  computeDeadlineMinutes,
} from './ai';

export type {
  GeneratedTask,
  HistoryItem,
  ReportData,
  StreamReplyResult,
  AgentInfo,
  TaskEvalResult,
  TaskScoreEntry,
} from './ai';
