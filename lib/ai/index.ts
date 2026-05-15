import '@/lib/env';
import { generateText, streamText, Output, NoObjectGeneratedError } from 'ai';
import { getModel } from './models';
import { z } from 'zod/v4';
import type { Attachment } from '@/types';

export interface AgentInfo {
  id: string;
  name: string;
  roleTitle: string;
}

// ── Task generation ───────────────────────────────────────────────────────

export interface GeneratedTask {
  title: string;
  description: string;
  resources: Array<{ name: string; type: string; content: string }>;
  deadlineMinutes: number;
  workflowType: 'self_contained' | 'delegated' | 'handoff';
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
  difficulty: z.number().int().min(1).max(5),
  workflowType: z.enum(['self_contained', 'delegated', 'handoff']),
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
  agents: AgentInfo[],
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

  const agentsText = agents
    .map((a) => {
      const label = a.id === 'manager' ? 'المدير' : a.id === 'colleague_1' ? 'الزميل الأول' : 'الزميل الثاني';
      return `  • ${label}: ${a.name} (${a.roleTitle})`;
    })
    .join('\n');

  return `مصمم محتوى تدريبي لمنصة سعودية.

  المسار: ${trackId}
  البيئة: ${companyContext}
  المهمة رقم ${index + 1} من ${total} (الصعوبة المقترحة: ${Math.min(5, index + 1)}).
  ${prevTasksText ? `المهام السابقة في نفس الجلسة (لا تكررها):\n${prevTasksText}` : ''}

  أعضاء الفريق (استخدم أسماءهم الحقيقية):
${agentsText}

  اختر workflowType المناسب حسب طبيعة المهمة:
  • self_contained: المستخدم يشتغل مع الشخص اللي أعطاه المهمة (assignedByAgentId) من البداية للنهاية — الأكثر شيوعاً
  • delegated: المدير يعطي المهمة ويقول للمستخدم يشتغل مع زميل آخر، والمستخدم يكمل مع الزميل
  • handoff: المستخدم يشتغل مع المدير، وبعد ما يخلص يسلم الشغل لزميل آخر يراجعه

  مهم: إذا اخترت delegated أو handoff، استخدم الأسماء الحقيقية من أعضاء الفريق أعلاه.
  مثلاً في starterMessage: "روح لسارة العتيبي تكمل معاك الشغل" بدلاً من "روح للزميل".

  اصنع مهمة جديدة مختصرة وواقعية.
  صمم المهمة بحيث يكون تسليمها (deliverable) شيئاً يمكن مشاركته عبر الشات:
  نص، جدول، كود، لقطة شاشة، أو ملف مرفق.
  starterMessage يحوي محتوى ابتدائي عملي.`;
}

export async function generateOneTask(
  trackId: string,
  companyContext: string,
  index: number,
  total: number,
  prevTasks: { title: string; description: string }[],
  agents: AgentInfo[],
): Promise<GeneratedTask | null> {
  try {
    const result = await generateText({
      model: getModel('tasks'),
      maxOutputTokens: 2000,
      output: Output.object({ schema: TaskSchema, name: 'task' }),
      prompt: makeTaskPrompt(trackId, companyContext, index, total, prevTasks, agents),
    });
    const output = result.output as GeneratedTask;
    output.deadlineMinutes = computeDeadlineMinutes(output.difficulty);
    return output;
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

// ── Deadline from difficulty ──────────────────────────────────────────────

const TIME_BY_DIFFICULTY: Record<number, { min: number; max: number }> = {
  1: { min: 30, max: 45 },
  2: { min: 30, max: 60 },
  3: { min: 45, max: 90 },
  4: { min: 60, max: 120 },
  5: { min: 90, max: 180 },
};

export function computeDeadlineMinutes(difficulty: number): number {
  const range = TIME_BY_DIFFICULTY[Math.min(5, Math.max(1, difficulty))];
  return range.min + Math.floor(Math.random() * (range.max - range.min + 1));
}

// ── Chat output schema ────────────────────────────────────────────────────

const ChatReplySchema = z.object({
  reply: z.string().describe('ردك للمستخدم بعامية سعودية، 3-4 جمل'),
  taskState: z.enum(['started', 'largely', 'completed']),
});

export interface StreamReplyResult {
  text: string;
  taskState: 'started' | 'largely' | 'completed';
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
  agentRole: string,
  crossContext: string,
  otherAgentName: string,
  workflowType: string,
) {
  let workflowInstruction = '';
  if (agentRole === 'collaborator') {
    workflowInstruction = `\n- المستخدم جاك بناءً على توجيه المسؤول عن المهمة. تعاون معه لإنجاز الشغل.`;
  } else if (agentRole === 'reviewer') {
    workflowInstruction = `\n- المستخدم اشتغل على المهمة مع شخص ثاني وجاك عشان تراجع شغله. راجع واعطه ملاحظاتك.
- لا تحط completed إلا بعد ما تراجع الشغل كامل وتتأكد إنه تمام.`;
  } else if (agentRole === 'assigner' && otherAgentName && workflowType === 'handoff') {
    workflowInstruction = `\n- المستخدم راح يشتغل معاك وبعدها حيسلم الشغل لـ ${otherAgentName} يراجعه. في النهاية قله يروح لـ ${otherAgentName}.
- مهم: لا تحط taskState=completed لمجرد إنك خلصت دورك. إذا المستخدم خلص معاك حط largely. المهمة تنتهي بالكامل لما ${otherAgentName} يوافق عليها.`;
  } else if (agentRole === 'assigner' && otherAgentName && workflowType === 'delegated') {
    workflowInstruction = `\n- المستخدم راح يشتغل معاك بالبداية. دورك إنك تعطيه المهمة وتوجهه لـ ${otherAgentName}.
- لا تحط taskState أبداً — ${otherAgentName} هو اللي يقيم لما المستخدم يخلص معاه.`;
  } else if (agentRole === 'assigner') {
    workflowInstruction = '\n- أنت المسؤول عن هالمهمة من البداية للنهاية.';
  }

  const crossContextBlock = crossContext
    ? `\n\nهذه محادثات المستخدم مع زملاء آخرين عن نفس المهمة (لعلمك فقط — لا ترد نيابة عنهم):\n${crossContext}`
    : '';

  return `أنت ${agentName}، ${agentRoleTitle} في ${companyContext}.

المستخدم هو ${trackTitle} جديد في أول شهر له في العمل.

المهمة الحالية: "${taskTitle}"
وصف المهمة: ${taskDescription}
الوقت المتبقي: ${timeRemainingMinutes} دقيقة

شخصيتك: ${agentPersonality}
دورك في هذه المهمة: ${agentRoleInTask}${workflowInstruction}

تعليمات:
- تحدث بعامية سعودية بسيطة وطبيعية
- رسائلك مختصرة (3-4 جمل max)
- كن إنساناً واقعياً — أحياناً متوتر، أحياناً داعم
- لا تخرج عن سياق بيئة العمل
- أنت في محادثة نصية فقط — لا تستطيع رؤية أي شيء خارج هذه المحادثة.
  إذا طلبت من المستخدم شغل (تقرير، كود، جدول، تحليل)، اطلب منه يرسله لك هنا
  إما كنص أو ملف مرفق قبل ما تقيّمه.
- لا تحط taskState=completed أو largely إلا بعد ما تشوف الشغل الفعلي من المستخدم وتتأكد من جودته.
- إذا حاول المستخدم ينتقل للمهمة التالية بدون ما يشاركك شغله، ذكّره إنه يحتاج يرسله أولاً عشان تقيّمه.
- إذا أرفق المستخدم ملف أو صورة، علّق عليها بشكل محدد ومفيد (بدون مبالغة)
- إذا أرفق كود/جدول، راجعه باختصار وقل ما الذي صح وما الذي يحتاج تعديل
- لا تقترح الانتقال لمهمة أخرى في ردّك إذا المهمة لسا ما انتهت
- حدّد مرحلة إنجاز المهمة في حقل taskState:
  • started: المستخدم ما زال في البداية أو العمل قليل
  • largely: أغلب العمل تم لكن يحتاج تحسينات
   • completed: المهمة منجزة بالكامل — في هذه الحالة أخبر المستخدم أنه خلص المهمة واطلب منه يضغط على زر "إنهاء المهمة" عشان ينتقل للجاية${crossContextBlock}`;
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
  agentRole: string,
  crossContext: string,
  otherAgentName: string,
  workflowType: string,
  onChunk: (text: string) => void,
): Promise<StreamReplyResult> {
  const safeHistory: HistoryItem[] =
    conversationHistory.length > 0
      ? conversationHistory
      : [{ role: 'user', content: 'السلام عليكم' }];

  const result = streamText({
    model: getModel('chat'),
    maxRetries: 2,
    maxOutputTokens: 2000,
    output: Output.object({ schema: ChatReplySchema, name: 'chat_reply' }),
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
      agentRole,
      crossContext,
      otherAgentName,
      workflowType,
    ),
    messages: buildMessages(safeHistory) as any,
  });

  let latestReply = '';
  let finalOutput: {
    reply: string;
    taskState: 'started' | 'largely' | 'completed';
  };

  try {
    for await (const partial of result.partialOutputStream) {
      const reply = (partial as any)?.reply;
      if (typeof reply === 'string' && reply.length > latestReply.length) {
        const diff = reply.slice(latestReply.length);
        latestReply = reply;
        onChunk(diff);
      }
    }

    finalOutput = (await result.output) as {
      reply: string;
      taskState: 'started' | 'largely' | 'completed';
    };
  } catch (err: any) {
    console.error('[streamAgentReply] Error:', err?.message ?? err);
    if (err?.name === 'AI_NoObjectGeneratedError' || err?.name === 'NoObjectGeneratedError') {
      console.error('[streamAgentReply] Raw model text:', err.text);
      console.error('[streamAgentReply] Finish reason:', err.finishReason);
      console.error('[streamAgentReply] Cause:', err.cause);
      return { text: 'عذراً، حدث خطأ في صياغة الرد. ممكن تعيد صياغة سؤالك؟', taskState: 'started' };
    }
    console.error('[streamAgentReply] Stack:', err?.stack);
    return { text: 'عذراً، حدث خطأ غير متوقع. حاول مرة أخرى.', taskState: 'started' };
  }

  return {
    text: finalOutput.reply,
    taskState: finalOutput.taskState,
  };
}

// ── Post-task evaluator ────────────────────────────────────────────────────

export interface TaskEvalResult {
  quality: number;
  speed: number;
  communication: number;
  verdict: string;
}

const EvaluationSchema = z.object({
  quality: z.number().int().min(1).max(10),
  speed: z.number().int().min(1).max(10),
  communication: z.number().int().min(1).max(10),
  verdict: z.string().describe('تقييم مختصر للمهمة (جملتين)'),
});

export async function evaluateTask(
  taskTitle: string,
  taskDescription: string,
  difficulty: number,
  extensions: number,
  trackTitle: string,
  companyContext: string,
  conversation: string,
): Promise<TaskEvalResult | null> {
  try {
    const result = await generateText({
      model: getModel('report'),
      maxOutputTokens: 1000,
      output: Output.object({ schema: EvaluationSchema, name: 'evaluation' }),
      prompt: `أنت محلل أداء محايد.

المسار الوظيفي: ${trackTitle}
بيئة العمل: ${companyContext}
المهمة: ${taskTitle}
وصف المهمة: ${taskDescription}
صعوبة المهمة: ${difficulty}/5
عدد مرات تمديد الوقت: ${extensions}

محادثة المستخدم مع الزملاء حول هذه المهمة:
${conversation}

قيّم أداء المستخدم بناءً على المحادثة أعلاه فقط.

مقياس التقييم:
- Quality (1-10): 1-3 = مخرجات خاطئة أو بدون مخرجات, 4-5 = غير مكتمل مع أخطاء كبيرة, 6-7 = مقبول مع بعض الملاحظات, 8 = جيد مع تحسينات بسيطة, 9-10 = شامل ومتقن
- Speed (1-10): ضع في اعتبارك عدد مرات تمديد الوقت (${extensions}). 1-3 = مدد الوقت عدة مرات أو بطيء جداً, 4-5 = احتاج تمديد, 6-7 = مناسب, 8 = جيد, 9-10 = سريع ومبادر
- Communication (1-10): 1-3 = لا يتواصل أو غير مهذب, 4-5 = تواصل محدود/غير واضح, 6-7 = مناسب, 8 = واضح, 9-10 = مبادر واحترافي

كن صارماً ومنصفاً في تقييمك.`,
    });
    return result.output as TaskEvalResult;
  } catch (err) {
    console.error('[evaluateTask]', String(err));
    return null;
  }
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

export interface TaskScoreEntry {
  title: string;
  quality: number | null;
  speed: number | null;
  communication: number | null;
  difficulty: number;
  extensions: number;
  verdict: string | null;
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

const ReportNarrativeSchema = z.object({
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

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function computeAggregatedScores(taskScores: TaskScoreEntry[]) {
  const qualities = taskScores.map((t) => t.quality).filter((s): s is number => s !== null);
  const speeds = taskScores.map((t) => t.speed).filter((s): s is number => s !== null);
  const comms = taskScores.map((t) => t.communication).filter((s): s is number => s !== null);

  const qualityScore = Math.round(avg(qualities) * 10);
  const speedScore = Math.round(avg(speeds) * 10);
  const communicationScore = Math.round(avg(comms) * 10);
  const overallScore = Math.round((qualityScore + speedScore + communicationScore) / 3);

  return { overallScore, qualityScore, speedScore, communicationScore };
}

export async function generateReport(
  trackTitle: string,
  companyContext: string,
  durationMinutes: number,
  tasksCompleted: number,
  totalTasks: number,
  conversationsSummary: string,
  taskScores: TaskScoreEntry[],
): Promise<ReportData> {
  const quantitative = computeAggregatedScores(taskScores);

  const taskScoresText = taskScores
    .map(
      (t) =>
        `${t.title}: جودة=${t.quality ?? '-'}/10, سرعة=${t.speed ?? '-'}/10, تواصل=${t.communication ?? '-'}/10, ${t.extensions > 0 ? `تمديد الوقت ${t.extensions} مرة, ` : ''}تقييم="${t.verdict ?? '-'}"`,
    )
    .join('\n');

  try {
    const result = await generateText({
      model: getModel('report'),
      maxOutputTokens: 2000,
      output: Output.object({ schema: ReportNarrativeSchema, name: 'report' }),
      prompt: `أنت محلل أداء مهني. اكتب التقييم النصي لهذه المحاكاة.

المسار الوظيفي: ${trackTitle}
بيئة العمل: ${companyContext}
المدة: ${durationMinutes} دقيقة
المهام المنجزة: ${tasksCompleted} من ${totalTasks}

درجات المهام (لعلمك فقط):
${taskScoresText}

ملخص المحادثات:
${conversationsSummary}

بناءً على المعلومات أعلاه، اكتب:
- verdict: تقييم شامل للمستخدم (3-4 جمل)
- strengths: نقطتا قوة أو أكثر
- improvements: نقطة تطوير أو أكثر
- agentFeedbacks: تقييم كل زميل من وجهة نظره
- recommendation: توصية للجلسة القادمة

النصوص بالعربية.`,
    });

    return {
      ...quantitative,
      ...(result.output as { verdict: string; strengths: string[]; improvements: string[]; agentFeedbacks: Record<string, string>; recommendation: string }),
    };
  } catch (err) {
    if (NoObjectGeneratedError.isInstance(err)) {
      console.error('[generateReport] text:', err.text);
      console.error('[generateReport] finishReason:', err.finishReason);
    } else {
      console.error('[generateReport]', String(err));
    }
    return {
      ...quantitative,
      verdict: 'تعذّر توليد التقرير، حاول مجدداً.',
      strengths: [],
      improvements: [],
      agentFeedbacks: { manager: '', colleague_1: '', colleague_2: '' },
      recommendation: '',
    };
  }
}
