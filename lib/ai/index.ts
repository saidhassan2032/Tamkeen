import '@/lib/env';
import { generateText, streamText, Output, NoObjectGeneratedError } from 'ai';
import { getModel } from './models';
import { z } from 'zod/v4';
import type { Attachment } from '@/types';

// ── Task generation ───────────────────────────────────────────────────────

export interface GeneratedTask {
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

const TaskResourceSchema = z.object({
  name: z.string(),
  type: z.enum(['text', 'table', 'requirements']),
  content: z.string().describe('مختصر، ≤ 6 أسطر'),
});

const TaskSchema = z.object({
  title: z.string().describe('اسم المهمة (5-10 كلمات)'),
  description: z.string().describe('وصف مختصر للمهمة (سطر-سطرين)'),
  deadlineMinutes: z.number().int().min(10).max(180),
  difficulty: z.number().int().min(1).max(5),
  waitingAgentId: z.enum(['manager', 'colleague_1', 'colleague_2']),
  assignedByAgentId: z.enum(['manager', 'colleague_1', 'colleague_2']),
  resources: z.array(TaskResourceSchema).max(2),
  guidanceTips: z.array(z.string()).max(3),
  starterMessage: z.string().describe(
    'رسالة من الـ assignedByAgentId بعامية سعودية مختصرة (4-7 أسطر بإجمالي ≤ 350 كلمة)',
  ),
});

export function makeTaskPrompt(
  trackId: string,
  companyContext: string,
  index: number,
  total: number,
  prevTasks: { title: string; description: string }[],
) {
  const prevTasksText =
    prevTasks.length > 0
      ? prevTasks
          .map(
            (t, i) =>
              `المهمة السابقة ${i + 1}:\n- العنوان: ${t.title}\n- الوصف: ${t.description}`,
          )
          .join('\n\n')
      : '';

  return `مصمم محتوى تدريبي لمنصة سعودية.

  المسار: ${trackId}
  البيئة: ${companyContext}
  المهمة رقم ${index + 1} من ${total} (الصعوبة المقترحة: ${Math.min(5, index + 1)}).
  ${prevTasksText ? `المهام السابقة في نفس الجلسة (لا تكررها):\n${prevTasksText}` : ''}

  اصنع مهمة جديدة مختصرة وواقعية. starterMessage يحوي محتوى ابتدائي عملي.`;
}

async function generateOneTask(
  trackId: string,
  companyContext: string,
  index: number,
  total: number,
  prevTasks: { title: string; description: string }[],
): Promise<GeneratedTask | null> {
  try {
    const result = await generateText({
      model: getModel('tasks'),
      maxOutputTokens: 2000,
      output: Output.object({ schema: TaskSchema, name: 'task' }),
      prompt: makeTaskPrompt(trackId, companyContext, index, total, prevTasks),
    });
    return result.output as GeneratedTask;
  } catch (err) {
    if (NoObjectGeneratedError.isInstance(err)) {
      console.error(`[generateOneTask #${index}] text:`, err.text);
      console.error(`[generateOneTask #${index}] finishReason:`, err.finishReason);
    } else {
      console.error(`[generateOneTask #${index}]`, String(err));
    }
    return null;
  }
}

export async function generateTasks(
  trackId: string,
  companyContext: string,
  mode: string,
  duration?: string | null,
): Promise<GeneratedTask[]> {
  const count = mode === 'quick' ? 3 : duration === '1week' ? 5 : 8;

  const tasks: GeneratedTask[] = [];
  const prevTasks: { title: string; description: string }[] = [];

  for (let i = 0; i < count; i++) {
    const task = await generateOneTask(trackId, companyContext, i, count, prevTasks);
    if (task) {
      tasks.push(task);
      prevTasks.push({ title: task.title, description: task.description });
    }
  }

  if (tasks.length === 0) {
    throw new Error('لم يُرجع أي مهام، حاول مجدداً');
  }
  return tasks;
}

// ── Streaming agent chat reply ────────────────────────────────────────────

export interface HistoryItem {
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
}

function buildMessages(history: HistoryItem[]) {
  return history.map((m) => {
    if (!m.attachments?.length) {
      return { role: m.role, content: m.content || '...' };
    }
    const parts: any[] = [];
    let textBuffer = m.content?.trim() ? m.content.trim() : '';
    for (const att of m.attachments) {
      if (att.type === 'image') {
        if (textBuffer) {
          parts.push({ type: 'text', text: textBuffer });
          textBuffer = '';
        }
        parts.push({ type: 'image', image: att.data, mimeType: att.mediaType });
      } else {
        textBuffer += `\n\n--- ملف مرفق: ${att.name} ---\n${att.data}\n--- نهاية الملف ---`;
      }
    }
    if (textBuffer) parts.push({ type: 'text', text: textBuffer });
    if (!parts.length) parts.push({ type: 'text', text: '...' });
    return { role: m.role, content: parts };
  });
}

function makeSystemPrompt(
  agentName: string,
  agentRoleTitle: string,
  agentPersonality: string,
  agentRoleInTask: string,
  companyContext: string,
  trackTitle: string,
  taskTitle: string,
  taskDescription: string,
  timeRemainingMinutes: number,
  shouldEvaluate: boolean,
) {
  return `أنت ${agentName}، ${agentRoleTitle} في ${companyContext}.

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
  let fullText = '';

  const safeHistory: HistoryItem[] =
    conversationHistory.length > 0
      ? conversationHistory
      : [{ role: 'user', content: 'السلام عليكم' }];

  const result = streamText({
    model: getModel('chat'),
    maxOutputTokens: 600,
    system: makeSystemPrompt(
      agentName,
      agentRoleTitle,
      agentPersonality,
      agentRoleInTask,
      companyContext,
      trackTitle,
      taskTitle,
      taskDescription,
      timeRemainingMinutes,
      shouldEvaluate,
    ),
    messages: buildMessages(safeHistory) as any,
  });

  for await (const chunk of result.textStream) {
    fullText += chunk;
    onChunk(chunk);
  }

  onDone(fullText);
  return fullText;
}

// ── Manager guidance hint ─────────────────────────────────────────────────

export async function getGuidance(
  managerName: string,
  taskTitle: string,
  taskDescription: string,
  trackTitle: string,
): Promise<string> {
  const { text } = await generateText({
    model: getModel('guide'),
    maxOutputTokens: 300,
    messages: [
      {
        role: 'user',
        content: `أنت ${managerName} مدير. موظف جديد (${trackTitle}) لا يعرف كيف يبدأ مهمة "${taskTitle}": ${taskDescription}

أعطه 3 خطوات عملية محددة للبداية. عامية سعودية بسيطة. كن مشجعاً لكن مباشراً.`,
      },
    ],
  });
  return text;
}

// ── Report generation ─────────────────────────────────────────────────────

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

const ReportSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  qualityScore: z.number().int().min(0).max(100),
  speedScore: z.number().int().min(0).max(100),
  communicationScore: z.number().int().min(0).max(100),
  verdict: z.string().describe('تقييم شامل 3-4 جمل'),
  strengths: z.array(z.string()).min(2),
  improvements: z.array(z.string()).min(1),
  agentFeedbacks: z.object({
    manager: z.string(),
    colleague_1: z.string(),
    colleague_2: z.string(),
  }),
  recommendation: z.string(),
});

export async function generateReport(
  trackTitle: string,
  companyContext: string,
  durationMinutes: number,
  tasksCompleted: number,
  totalTasks: number,
  conversationsSummary: string,
): Promise<ReportData> {
  try {
    const result = await generateText({
      model: getModel('report'),
      maxOutputTokens: 2000,
      output: Output.object({ schema: ReportSchema, name: 'report' }),
      prompt: `أنت محلل أداء مهني. حلّل هذه المحاكاة وأنشئ تقريراً شاملاً.

المسار الوظيفي: ${trackTitle}
بيئة العمل: ${companyContext}
المدة: ${durationMinutes} دقيقة
المهام المنجزة: ${tasksCompleted} من ${totalTasks}

ملخص المحادثات:
${conversationsSummary}

أعطِ تقييمات صادقة بناءً على المحادثات. الدرجات بين 0-100. النصوص بالعربية.`,
    });

    return result.output as ReportData;
  } catch (err) {
    if (NoObjectGeneratedError.isInstance(err)) {
      console.error('[generateReport] text:', err.text);
      console.error('[generateReport] finishReason:', err.finishReason);
    } else {
      console.error('[generateReport]', String(err));
    }
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
