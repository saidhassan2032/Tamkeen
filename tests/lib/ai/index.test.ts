import { makeTaskPrompt, generateOneTask } from '@/lib/ai';
import { getModel } from '@/lib/ai/models';
import { generateText, Output } from 'ai';

jest.mock('@/lib/ai/models', () => ({
  getModel: jest.fn(),
}));

jest.mock('ai', () => ({
  generateText: jest.fn(),
  streamText: jest.fn(),
  Output: {
    object: jest.fn(),
  },
  NoObjectGeneratedError: {
    isInstance: jest.fn(),
  },
}));

describe('Task Generation', () => {
  const mockTrackId = 'test-track';
  const mockCompanyContext = 'Test Company';
  const mockAgents = [
    { id: 'manager', name: 'أحمد', roleTitle: 'مدير' },
    { id: 'colleague_1', name: 'سارة', roleTitle: 'مطورة' },
    { id: 'colleague_2', name: 'فيصل', roleTitle: 'مختبر' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('makeTaskPrompt', () => {
    test('should create prompt with no previous tasks', () => {
      const prompt = makeTaskPrompt(mockTrackId, mockCompanyContext, 0, 3, [], mockAgents);
      expect(prompt).toContain(`المسار: ${mockTrackId}`);
      expect(prompt).toContain(`البيئة: ${mockCompanyContext}`);
      expect(prompt).toContain('المهمة رقم 1 من 3');
      expect(prompt).not.toContain('المهام السابقة');
    });

    test('should create prompt with previous tasks', () => {
      const prevTasks = [
        { title: 'المهمة الأولى', description: 'وصف المهمة الأولى' },
        { title: 'المهمة الثانية', description: 'وصف المهمة الثانية' },
      ];

      const prompt = makeTaskPrompt(mockTrackId, mockCompanyContext, 1, 3, prevTasks, mockAgents);
      expect(prompt).toContain('المهام السابقة في نفس الجلسة');
      expect(prompt).toContain('المهمة السابقة 1:');
      expect(prompt).toContain('- العنوان: المهمة الأولى');
      expect(prompt).toContain('- الوصف: وصف المهمة الأولى');
      expect(prompt).toContain('المهمة السابقة 2:');
      expect(prompt).toContain('- العنوان: المهمة الثانية');
      expect(prompt).toContain('- الوصف: وصف المهمة الثانية');
    });
  });
});
