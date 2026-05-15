export const MAJORS = [
  { id: 'cs',         icon: '💻', title: 'علوم الحاسب وهندسة البرمجيات', description: 'من تطوير المواقع إلى إدارة المشاريع التقنية', color: '#3B82F6' },
  { id: 'accounting', icon: '📊', title: 'المحاسبة',                      description: 'من المحاسب العام إلى المدقق المالي',            color: '#10B981' },
  { id: 'business',   icon: '📈', title: 'إدارة الأعمال',                 description: 'قيادة المشاريع وإدارة الفرق',                   color: '#F59E0B' },
  { id: 'design',     icon: '🎨', title: 'التصميم',                       description: 'من واجهات التطبيقات إلى التصميم الإبداعي',      color: '#EC4899' },
  { id: 'media',      icon: '📢', title: 'الإعلام',                       description: 'من إنتاج المحتوى إلى الصحافة الرقمية',          color: '#8B5CF6' },
] as const;

export type MajorId = typeof MAJORS[number]['id'];

export const TRACKS: Record<string, ReadonlyArray<{ id: string; icon: string; title: string; duration: string }>> = {
  cs: [
    { id: 'web_dev',     icon: '🌐', title: 'مطوّر مواقع',                    duration: '20 دقيقة' },
    { id: 'tech_pm',     icon: '🗂️', title: 'مدير المشاريع التقنية',          duration: '25 دقيقة' },
    { id: 'ux',          icon: '🎯', title: 'مصمم تجربة المستخدم UX',         duration: '20 دقيقة' },
  ],
  accounting: [
    { id: 'accountant',  icon: '📋', title: 'محاسب عام',                       duration: '20 دقيقة' },
    { id: 'auditor',     icon: '🔍', title: 'مدقق مالي',                       duration: '25 دقيقة' },
  ],
  business: [
    { id: 'project_mgr', icon: '📌', title: 'مدير مشاريع',                    duration: '25 دقيقة' },
  ],
  design: [
    { id: 'ui_designer', icon: '📱', title: 'مصمم واجهات التطبيقات والمواقع', duration: '20 دقيقة' },
    { id: 'graphic',     icon: '🖼️', title: 'مصمم قوالب وبوسترات',            duration: '15 دقيقة' },
  ],
  media: [
    { id: 'content_writer', icon: '✍️', title: 'كاتب محتوى',                  duration: '20 دقيقة' },
  ],
};

export interface AgentData {
  name: string;
  roleTitle: string;
  personality: string;
  roleInTask: string;
  avatarBg: string;
  avatarColor: string;
  icon: string;
}

export interface AgentTemplate {
  company: string;
  manager: AgentData;
  colleague1: AgentData;
  colleague2: AgentData;
}

export const AGENT_TEMPLATES: Record<string, AgentTemplate> = {
  web_dev: {
    company: 'شركة تقنية ناشئة متخصصة في حلول SaaS',
    manager:    { name: 'أحمد الغامدي',   roleTitle: 'Engineering Manager', personality: 'محترف يضغط على deadlines، يتوقع الاستقلالية، داعم عند الحاجة', roleInTask: 'يعطي المهمة ويطلب خطة الإصلاح', avatarBg: '#DBEAFE', avatarColor: '#1D4ED8', icon: '👨‍💼' },
    colleague1: { name: 'سارة العتيبي',   roleTitle: 'Senior Frontend Dev',  personality: 'خبيرة وقتها ثمين، تساعد لكن تنتظر منك الـ components',          roleInTask: 'تنتظر PR للمراجعة',           avatarBg: '#D1FAE5', avatarColor: '#065F46', icon: '👩‍💻' },
    colleague2: { name: 'فيصل الدوسري',  roleTitle: 'QA Engineer',           personality: 'دقيق ينتظر staging environment، يكتشف bugs ويخبرك',            roleInTask: 'ينتظر بيئة testing',          avatarBg: '#FEF3C7', avatarColor: '#92400E', icon: '👨‍🔬' },
  },
  tech_pm: {
    company: 'شركة SaaS — نظام B2B للشركات السعودية',
    manager:    { name: 'ريم الحربي',     roleTitle: 'VP of Product',      personality: 'تضغط على القرارات وتريد الصورة الكاملة، لا تقبل التردد',    roleInTask: 'تنتظر قرار الـ sprint plan',     avatarBg: '#DBEAFE', avatarColor: '#1D4ED8', icon: '👩‍💼' },
    colleague1: { name: 'عمر الغامدي',   roleTitle: 'Lead Engineer',      personality: 'ينتظر قرارات واضحة، صريح بشأن القيود التقنية',              roleInTask: 'ينتظر قائمة الـ features',      avatarBg: '#D1FAE5', avatarColor: '#065F46', icon: '👨‍💻' },
    colleague2: { name: 'دانة الزهراني', roleTitle: 'Account Manager',    personality: 'تمثل مصالح العميل الكبير، تضغط على الـ features المطلوبة', roleInTask: 'تضغط على تضمين feature معينة', avatarBg: '#FCE7F3', avatarColor: '#9D174D', icon: '👩‍💼' },
  },
  ux: {
    company: 'شركة تصميم وتجربة مستخدم — عملاء في السوق السعودي',
    manager:    { name: 'محمد الشهري',   roleTitle: 'Design Lead',         personality: 'يريد wireframes احترافية، يعطي feedback دقيق ومباشر',      roleInTask: 'يطلب wireframes ويراجعها',          avatarBg: '#EDE9FE', avatarColor: '#5B21B6', icon: '👨‍🎨' },
    colleague1: { name: 'شروق العمري',  roleTitle: 'Frontend Developer',  personality: 'تنتظر Figma specs بالمقاسات والألوان، عملية ومباشرة',      roleInTask: 'تنتظر design specs',                avatarBg: '#FEF3C7', avatarColor: '#92400E', icon: '👩‍💻' },
    colleague2: { name: 'فارس الدوسري', roleTitle: 'Product Manager',     personality: 'يمثل متطلبات المنتج، يسأل عن user flows والـ edge cases',   roleInTask: 'يراجع التصميم من منظور المستخدم',  avatarBg: '#DBEAFE', avatarColor: '#1D4ED8', icon: '👨‍💼' },
  },
  cashier: {
    company: 'سوبرماركت كبير — فرع الرياض',
    manager:    { name: 'أبو عبدالله',   roleTitle: 'مدير الفرع',          personality: 'عملي يريد الدقة في الأرقام والسرعة في الخدمة',              roleInTask: 'يشرح المهمة ويتابع الأداء',         avatarBg: '#D1FAE5', avatarColor: '#065F46', icon: '👨‍💼' },
    colleague1: { name: 'أم سلمى',      roleTitle: 'أمينة صندوق أولى',   personality: 'خبيرة تساعد بالبداية وتنتظر تسليم الوردية',                roleInTask: 'تعلّمك وتنتظر تسليم الكاشير',      avatarBg: '#FCE7F3', avatarColor: '#9D174D', icon: '👩‍💼' },
    colleague2: { name: 'محمد',          roleTitle: 'مشرف المخزن',         personality: 'ينتظر تسوية فواتير الموردين، دقيق في التوثيق',               roleInTask: 'ينتظر مطابقة إيصالات الاستلام',     avatarBg: '#FEF3C7', avatarColor: '#92400E', icon: '👨‍💼' },
  },
  accountant: {
    company: 'شركة تجارية متوسطة — قطاع المواد الغذائية',
    manager:    { name: 'خالد المطيري',   roleTitle: 'مدير الحسابات',      personality: 'دقيق جداً لا يتسامح مع أخطاء مالية، يريد تقارير صافية',   roleInTask: 'يطلب التقرير المالي ويراجعه',       avatarBg: '#D1FAE5', avatarColor: '#065F46', icon: '👨‍💼' },
    colleague1: { name: 'نورة الشهري',   roleTitle: 'محاسبة أولى',        personality: 'خبيرة تساعد في المصطلحات، تنتظر تسوية الحسابات',          roleInTask: 'تنتظر تسوية الحسابات لإغلاق الشهر', avatarBg: '#FCE7F3', avatarColor: '#9D174D', icon: '👩‍💼' },
    colleague2: { name: 'عبدالله العمري', roleTitle: 'مدقق داخلي',        personality: 'صارم يراجع كل قيد، يسأل عن المستندات المثبتة',            roleInTask: 'يراجع قيودك ويطلب المستندات',       avatarBg: '#EDE9FE', avatarColor: '#5B21B6', icon: '👨‍💼' },
  },
  auditor: {
    company: 'مكتب تدقيق مالي معتمد — الرياض',
    manager:    { name: 'سلطان العنزي',  roleTitle: 'شريك المكتب',         personality: 'صارم جداً يتوقع دقة 100%، يراجع كل ورقة عمل',             roleInTask: 'يكلّفك بملف التدقيق ويراجع نتائجك', avatarBg: '#EDE9FE', avatarColor: '#5B21B6', icon: '👨‍💼' },
    colleague1: { name: 'هدى القرني',   roleTitle: 'مدققة أولى',          personality: 'خبيرة توجّهك في المنهجية، تنتظر تقرير الفجوات',           roleInTask: 'تنتظر نتائج التدقيق لإكمال الملف',  avatarBg: '#FCE7F3', avatarColor: '#9D174D', icon: '👩‍💼' },
    colleague2: { name: 'ياسر الشمري',  roleTitle: 'ممثل العميل',         personality: 'يسأل عن النتائج بقلق، يريد يعرف مدى خطورة الأخطاء',      roleInTask: 'ينتظر التقرير الأولي للتدقيق',       avatarBg: '#D1FAE5', avatarColor: '#065F46', icon: '👨‍💼' },
  },
  project_mgr: {
    company: 'شركة استشارات وإدارة مشاريع — السوق السعودي',
    manager:    { name: 'بدر القحطاني',  roleTitle: 'Program Director',    personality: 'استراتيجي يريد النتائج لا الجهد، يضغط على القرارات',      roleInTask: 'يكلّفك بإدارة المشروع',              avatarBg: '#FEF3C7', avatarColor: '#92400E', icon: '👨‍💼' },
    colleague1: { name: 'منى العسيري',  roleTitle: 'Business Analyst',    personality: 'تجمع المتطلبات، تنتظر project plan نهائي',                 roleInTask: 'تنتظر الـ WBS والجدول الزمني',       avatarBg: '#EDE9FE', avatarColor: '#5B21B6', icon: '👩‍💼' },
    colleague2: { name: 'حمد الشمري',   roleTitle: 'Stakeholder Rep',     personality: 'يمثل العميل كثير المتطلبات، يغيّر رأيه أحياناً مفاجأة',   roleInTask: 'يضيف متطلبات جديدة في منتصف المشروع', avatarBg: '#D1FAE5', avatarColor: '#065F46', icon: '👨‍💼' },
  },
  ui_designer: {
    company: 'استوديو تصميم رقمي — عملاء في السعودية والخليج',
    manager:    { name: 'ليلى الزهراني', roleTitle: 'Creative Director',   personality: 'ذوق رفيع تريد الإبداع مع هوية العميل، feedback صريح',     roleInTask: 'تطلب wireframes وتراجع التصميم',     avatarBg: '#FCE7F3', avatarColor: '#9D174D', icon: '👩‍🎨' },
    colleague1: { name: 'تركي الحربي',  roleTitle: 'UI Developer',        personality: 'يطبّق التصاميم، ينتظر Figma file بالمقاسات والـ tokens',  roleInTask: 'ينتظر design handoff',               avatarBg: '#DBEAFE', avatarColor: '#1D4ED8', icon: '👨‍💻' },
    colleague2: { name: 'هيا السلمي',   roleTitle: 'Account Manager',     personality: 'تمثل العميل، تنقل ملاحظاته، أحياناً تطلب تعديلات مفاجئة', roleInTask: 'تنقل feedback العميل على التصميم',   avatarBg: '#D1FAE5', avatarColor: '#065F46', icon: '👩‍💼' },
  },
  graphic: {
    company: 'وكالة تسويق رقمي — عملاء في مختلف القطاعات',
    manager:    { name: 'نواف الحربي',   roleTitle: 'Art Director',        personality: 'يريد التميز في كل قطعة، لا يقبل المتوسط، ذوق حاد',        roleInTask: 'يطلب التصميم ويراجع الجودة',          avatarBg: '#FEF3C7', avatarColor: '#92400E', icon: '👨‍🎨' },
    colleague1: { name: 'ديما السهلي',  roleTitle: 'Copywriter',          personality: 'تعطيك النصوص الجاهزة، تنتظر منك التصميم مع النص',         roleInTask: 'تنتظر التصميم النهائي لإرساله',      avatarBg: '#FCE7F3', avatarColor: '#9D174D', icon: '👩‍💼' },
    colleague2: { name: 'علي الزيد',    roleTitle: 'Social Media Manager', personality: 'يحتاج assets بمقاسات منصات محددة، دائماً مستعجل',        roleInTask: 'ينتظر الـ assets للنشر',             avatarBg: '#DBEAFE', avatarColor: '#1D4ED8', icon: '👨‍💼' },
  },
  content_writer: {
    company: 'وكالة محتوى رقمي — عملاء في السوق السعودي والخليجي',
    manager:    { name: 'لمياء الغامدي',  roleTitle: 'Content Manager',     personality: 'تريد محتوى يخدم الهدف التسويقي، تعطي feedback سريع ومباشر', roleInTask: 'تعطيك الموضوع والهدف وتراجع المسودة', avatarBg: '#EDE9FE', avatarColor: '#5B21B6', icon: '👩‍💼' },
    colleague1: { name: 'سعود المالكي',   roleTitle: 'SEO Specialist',      personality: 'يفكر بالكلمات المفتاحية والترتيب، ينتظر المحتوى للمراجعة',  roleInTask: 'ينتظر المحتوى لتحسينه لمحركات البحث', avatarBg: '#DBEAFE', avatarColor: '#1D4ED8', icon: '👨‍💻' },
    colleague2: { name: 'رنا الشهري',     roleTitle: 'Social Media Manager', personality: 'تحتاج محتوى جاهزاً للنشر، دائماً تضغط على المواعيد',      roleInTask: 'تنتظر المحتوى لجدولة النشر',          avatarBg: '#FCE7F3', avatarColor: '#9D174D', icon: '👩‍💼' },
  },
};

export const TRACK_TITLES: Record<string, string> = {
  web_dev: 'مطوّر مواقع',
  tech_pm: 'مدير المشاريع التقنية',
  ux: 'مصمم تجربة المستخدم UX',
  accountant: 'محاسب عام',
  auditor: 'مدقق مالي',
  project_mgr: 'مدير مشاريع',
  ui_designer: 'مصمم واجهات التطبيقات والمواقع',
  graphic: 'مصمم قوالب وبوسترات',
  content_writer: 'كاتب محتوى',
};

export interface TaskResource {
  name: string;
  type: 'text' | 'table' | 'requirements';
  content: string;
}

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  attachments?: Attachment[];
}

export interface Attachment {
  name: string;
  type: 'image' | 'text';
  mediaType: string;
  size: number;
  /**
   * For images: base64-encoded data (no data: prefix).
   * For text/CSV files: the raw text content.
   */
  data: string;
}

export const MAX_ATTACHMENT_SIZE = 4 * 1024 * 1024; // 4MB
export const MAX_ATTACHMENTS_PER_MESSAGE = 4;
