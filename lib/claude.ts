import '@/lib/env';
import Anthropic from '@anthropic-ai/sdk';
import type { Attachment } from '@/types';

function makeClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY غير مضبوط — تأكد من ملف .env.local وأن البيئة لا تحجبه');
  }
  return new Anthropic({ apiKey });
}

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = makeClient();
  return _client;
}

// Model selection by purpose — pick the fastest model that's still smart enough.
// Haiku 4.5: ~100 tok/s, plenty for structured JSON / short answers.
// Sonnet 4.5: ~65 tok/s, best for conversational persona + analysis.
const MODEL_TASKS  = 'claude-haiku-4-5';   // task generation (structured, bulk)
const MODEL_CHAT   = 'claude-sonnet-4-5';  // agent replies (persona matters)
const MODEL_GUIDE  = 'claude-haiku-4-5';   // short manager hint
const MODEL_REPORT = 'claude-sonnet-4-5';  // analytical report

interface GeneratedTask {
  title: string;
  description: string;
  resources: Array<{ name: string; type: string; content: string }>;
  deadlineMinutes: number;
  waitingAgentId: string;
  assignedByAgentId: string;
  difficulty: number;
  guidanceTips: string[];
  starterMessage: string;
}

function findToolUse<T = any>(content: any[]): T | null {
  const block = content.find((b) => b?.type === 'tool_use');
  return block ? (block.input as T) : null;
}

const TASK_TOOL = {
  name: 'create_task',
  description: 'إنشاء مهمة تدريبية واحدة لموظف جديد',
  input_schema: {
    type: 'object' as const,
    properties: {
      title:           { type: 'string', description: 'اسم المهمة (5-10 كلمات)' },
      description:     { type: 'string', description: 'وصف مختصر للمهمة (سطر-سطرين)' },
      deadlineMinutes: { type: 'integer', minimum: 10, maximum: 30 },
      difficulty:      { type: 'integer', minimum: 1, maximum: 5 },
      waitingAgentId:    { type: 'string', enum: ['manager', 'colleague_1', 'colleague_2'] },
      assignedByAgentId: { type: 'string', enum: ['manager', 'colleague_1', 'colleague_2'] },
      resources: {
        type: 'array',
        maxItems: 2,
        items: {
          type: 'object',
          properties: {
            name:    { type: 'string' },
            type:    { type: 'string', enum: ['text', 'table', 'requirements'] },
            content: { type: 'string', description: 'مختصر، ≤ 6 أسطر' },
          },
          required: ['name', 'type', 'content'],
        },
      },
      guidanceTips: { type: 'array', maxItems: 3, items: { type: 'string' } },
      starterMessage: {
        type: 'string',
        description:
          'رسالة من الـ assignedByAgentId بعامية سعودية مختصرة (4-7 أسطر بإجمالي ≤ 350 كلمة). تحوي محتوى ابتدائي عملي محدد: snippet كود ناقص داخل ``` للتقنية، CSV ببيانات داخل ``` للمحاسبة، brief فيه ألوان hex للتصميم، أو قائمة متطلبات للإدارة.',
      },
    },
    required: [
      'title', 'description', 'deadlineMinutes', 'difficulty',
      'waitingAgentId', 'assignedByAgentId', 'resources',
      'guidanceTips', 'starterMessage',
    ],
  },
};

async function generateOneTask(
  trackId: string,
  companyContext: string,
  index: number,
  total: number,
  prevTitles: string[],
): Promise<GeneratedTask | null> {
  const response = await client().messages.create({
    model: MODEL_TASKS,
    max_tokens: 2000,
    tools: [TASK_TOOL],
    tool_choice: { type: 'tool', name: TASK_TOOL.name },
    messages: [{
      role: 'user',
      content: `مصمم محتوى تدريبي لمنصة سعودية.

المسار: ${trackId}
البيئة: ${companyContext}
المهمة رقم ${index + 1} من ${total} (الصعوبة المقترحة: ${Math.min(5, index + 1)}).
${prevTitles.length ? `المهام السابقة في نفس الجلسة (لا تكررها): ${prevTitles.join('، ')}` : ''}

اصنع مهمة جديدة مختصرة وواقعية. starterMessage يحوي محتوى ابتدائي عملي.

استخدم أداة create_task فقط.`,
    }],
  });

  const toolBlock = response.content.find((b: any) => b?.type === 'tool_use');
  const input = (toolBlock as any)?.input;
  if (!input || !input.title) {
    console.error('[generateOneTask] empty', {
      idx: index,
      stop_reason: response.stop_reason,
      output_tokens: response.usage?.output_tokens,
    });
    return null;
  }
  return input as GeneratedTask;
}

export async function generateTasks(
  trackId: string,
  companyContext: string,
  mode: string,
  duration?: string | null,
): Promise<GeneratedTask[]> {
  const count = mode === 'quick' ? 3 : duration === '1week' ? 5 : 8;

  // Generate tasks in parallel — each call is small (~2000 tokens) and independent.
  // This gives reliable structured output and finishes faster than one big call.
  const titles: string[] = [];
  const promises: Promise<GeneratedTask | null>[] = [];
  for (let i = 0; i < count; i++) {
    promises.push(generateOneTask(trackId, companyContext, i, count, [...titles]));
  }
  const results = await Promise.all(promises);
  const tasks = results.filter((t): t is GeneratedTask => t !== null);

  if (tasks.length === 0) {
    throw new Error('Claude لم يُرجع أي مهام، حاول مجدداً');
  }
  return tasks;
}

interface HistoryItem {
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
}

function buildClaudeMessages(history: HistoryItem[]) {
  return history.map((m) => {
    if (!m.attachments?.length) {
      return { role: m.role, content: m.content || '...' };
    }
    const blocks: any[] = [];
    let textBuffer = m.content?.trim() ? m.content.trim() : '';
    for (const att of m.attachments) {
      if (att.type === 'image') {
        if (textBuffer) {
          blocks.push({ type: 'text', text: textBuffer });
          textBuffer = '';
        }
        blocks.push({
          type: 'image',
          source: { type: 'base64', media_type: att.mediaType, data: att.data },
        });
      } else {
        textBuffer += `\n\n--- ملف مرفق: ${att.name} ---\n${att.data}\n--- نهاية الملف ---`;
      }
    }
    if (textBuffer) blocks.push({ type: 'text', text: textBuffer });
    if (!blocks.length) blocks.push({ type: 'text', text: '...' });
    return { role: m.role, content: blocks };
  });
}

export async function streamAgentReply(
  agentName: string,
  agentRoleTitle: string,
  agentPersonality: string,
  agentRoleInTask: string,
  companyContext: string,
  trackTitle: string,
  taskTitle: string,
  taskDescription: string,
  timeRemainingMinutes: number,
  conversationHistory: HistoryItem[],
  shouldEvaluate: boolean,
  onChunk: (text: string) => void,
  onDone: (fullText: string) => void,
): Promise<string> {
  const system = `أنت ${agentName}، ${agentRoleTitle} في ${companyContext}.

المستخدم هو ${trackTitle} جديد في أول شهر له في العمل.

المهمة الحالية: "${taskTitle}"
وصف المهمة: ${taskDescription}
الوقت المتبقي: ${timeRemainingMinutes} دقيقة

شخصيتك: ${agentPersonality}
دورك في هذه المهمة: ${agentRoleInTask}

تعليمات:
- تحدث بعامية سعودية بسيطة وطبيعية
- رسائلك مختصرة (3-4 جمل max)
- كن إنساناً واقعياً — أحياناً متوتر، أحياناً داعم
- لا تخرج عن سياق بيئة العمل
- إذا أرفق المستخدم ملف أو صورة، علّق عليها بشكل محدد ومفيد (بدون مبالغة)
- إذا أرفق كود/جدول، راجعه باختصار وقل ما الذي صح وما الذي يحتاج تعديل
${shouldEvaluate ? `

بعد ردك قيّم أداء المستخدم واكتب في النهاية على سطر منفصل:
SCORE_JSON:{"quality":XX,"speed":XX,"communication":XX,"verdict":"تقييم 2-3 جمل عربية"}` : ''}`;

  let fullText = '';
  const safeHistory: HistoryItem[] = conversationHistory.length > 0
    ? conversationHistory
    : [{ role: 'user', content: 'السلام عليكم' }];

  const stream = await client().messages.create({
    model: MODEL_CHAT,
    max_tokens: 600,
    stream: true,
    system,
    messages: buildClaudeMessages(safeHistory) as any,
  });

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      fullText += chunk.delta.text;
      onChunk(chunk.delta.text);
    }
  }

  onDone(fullText);
  return fullText;
}

export async function getGuidance(
  managerName: string,
  taskTitle: string,
  taskDescription: string,
  trackTitle: string,
): Promise<string> {
  const response = await client().messages.create({
    model: MODEL_GUIDE,
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `أنت ${managerName} مدير. موظف جديد (${trackTitle}) لا يعرف كيف يبدأ مهمة "${taskTitle}": ${taskDescription}

أعطه 3 خطوات عملية محددة للبداية. عامية سعودية بسيطة. كن مشجعاً لكن مباشراً.`,
    }],
  });
  return response.content[0].type === 'text' ? response.content[0].text : '';
}

export interface ReportData {
  overallScore: number;
  qualityScore: number;
  speedScore: number;
  communicationScore: number;
  verdict: string;
  strengths: string[];
  improvements: string[];
  agentFeedbacks: Record<string, string>;
  recommendation?: string;
}

const REPORT_TOOL = {
  name: 'submit_report',
  description: 'إرسال التقرير التحليلي النهائي لأداء الموظف',
  input_schema: {
    type: 'object' as const,
    properties: {
      overallScore:       { type: 'integer', minimum: 0, maximum: 100 },
      qualityScore:       { type: 'integer', minimum: 0, maximum: 100 },
      speedScore:         { type: 'integer', minimum: 0, maximum: 100 },
      communicationScore: { type: 'integer', minimum: 0, maximum: 100 },
      verdict:            { type: 'string', description: 'تقييم شامل 3-4 جمل' },
      strengths:          { type: 'array', items: { type: 'string' }, minItems: 2 },
      improvements:       { type: 'array', items: { type: 'string' }, minItems: 1 },
      agentFeedbacks: {
        type: 'object',
        properties: {
          manager:     { type: 'string' },
          colleague_1: { type: 'string' },
          colleague_2: { type: 'string' },
        },
        required: ['manager', 'colleague_1', 'colleague_2'],
      },
      recommendation: { type: 'string' },
    },
    required: [
      'overallScore', 'qualityScore', 'speedScore', 'communicationScore',
      'verdict', 'strengths', 'improvements', 'agentFeedbacks', 'recommendation',
    ],
  },
};

export async function generateReport(
  trackTitle: string,
  companyContext: string,
  durationMinutes: number,
  tasksCompleted: number,
  totalTasks: number,
  conversationsSummary: string,
): Promise<ReportData> {
  try {
    const response = await client().messages.create({
      model: MODEL_REPORT,
      max_tokens: 2000,
      tools: [REPORT_TOOL],
      tool_choice: { type: 'tool', name: REPORT_TOOL.name },
      messages: [{
        role: 'user',
        content: `أنت محلل أداء مهني. حلّل هذه المحاكاة وأنشئ تقريراً شاملاً عبر أداة submit_report.

المسار الوظيفي: ${trackTitle}
بيئة العمل: ${companyContext}
المدة: ${durationMinutes} دقيقة
المهام المنجزة: ${tasksCompleted} من ${totalTasks}

ملخص المحادثات:
${conversationsSummary}

أعطِ تقييمات صادقة بناءً على المحادثات. الدرجات بين 0-100. النصوص بالعربية.`,
      }],
    });

    const r = findToolUse<ReportData>(response.content);
    if (!r) throw new Error('no tool_use');
    return {
      overallScore: r.overallScore ?? 0,
      qualityScore: r.qualityScore ?? 0,
      speedScore: r.speedScore ?? 0,
      communicationScore: r.communicationScore ?? 0,
      verdict: r.verdict ?? '',
      strengths: r.strengths ?? [],
      improvements: r.improvements ?? [],
      agentFeedbacks: r.agentFeedbacks ?? {},
      recommendation: r.recommendation ?? '',
    };
  } catch {
    return {
      overallScore: 0,
      qualityScore: 0,
      speedScore: 0,
      communicationScore: 0,
      verdict: 'تعذّر توليد التقرير، حاول مجدداً.',
      strengths: [],
      improvements: [],
      agentFeedbacks: {},
      recommendation: '',
    };
  }
}
