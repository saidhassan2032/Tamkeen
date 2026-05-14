import { generateTasks, makeTaskPrompt, generateOneTask } from '@/lib/ai';
import { getModel } from '@/lib/ai/models';
import { generateText, Output } from 'ai';

// Mock the AI service
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

describe('Sequential Task Generation', () => {
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

  describe('generateTasks', () => {
    test('should generate tasks sequentially with context propagation', async () => {
      const mockTasks = [
        { title: 'المهمة 1', description: 'الوصف 1', resources: [], deadlineMinutes: 30, workflowType: 'self_contained', waitingAgentId: 'manager', assignedByAgentId: 'manager', difficulty: 1, guidanceTips: [], starterMessage: 'رسالة البداية 1' },
        { title: 'المهمة 2', description: 'الوصف 2', resources: [], deadlineMinutes: 45, workflowType: 'delegated', waitingAgentId: 'colleague_1', assignedByAgentId: 'manager', difficulty: 2, guidanceTips: [], starterMessage: 'رسالة البداية 2' },
        { title: 'المهمة 3', description: 'الوصف 3', resources: [], deadlineMinutes: 60, workflowType: 'handoff', waitingAgentId: 'colleague_2', assignedByAgentId: 'manager', difficulty: 3, guidanceTips: [], starterMessage: 'رسالة البداية 3' },
      ];

      // Mock generateText to return different tasks based on call count
      (generateText as jest.Mock).mockImplementationOnce(() => ({
        output: mockTasks[0],
      })).mockImplementationOnce(() => ({
        output: mockTasks[1],
      })).mockImplementationOnce(() => ({
        output: mockTasks[2],
      }));

      const result = await generateTasks(mockTrackId, mockCompanyContext, 'quick', mockAgents);
      // Verify sequential calls with increasing context
      expect(generateText).toHaveBeenCalledTimes(3);
      
      const calls = (generateText as jest.Mock).mock.calls;

      // First call — no previous tasks
      expect(calls[0][0].prompt).toContain('المهمة رقم 1 من 3');
      expect(calls[0][0].prompt).not.toContain('المهام السابقة');

      // Second call — first task in context
      expect(calls[1][0].prompt).toContain('المهمة رقم 2 من 3');
      expect(calls[1][0].prompt).toContain('المهام السابقة في نفس الجلسة');
      expect(calls[1][0].prompt).toContain('المهمة السابقة 1:');
      expect(calls[1][0].prompt).toContain('المهمة 1');
      expect(calls[1][0].prompt).toContain('الوصف 1');

      // Third call — both previous tasks in context
      expect(calls[2][0].prompt).toContain('المهمة رقم 3 من 3');
      expect(calls[2][0].prompt).toContain('المهام السابقة في نفس الجلسة');
      expect(calls[2][0].prompt).toContain('المهمة السابقة 1:');
      expect(calls[2][0].prompt).toContain('المهمة 1');
      expect(calls[2][0].prompt).toContain('الوصف 1');
      expect(calls[2][0].prompt).toContain('المهمة السابقة 2:');
      expect(calls[2][0].prompt).toContain('المهمة 2');
      expect(calls[2][0].prompt).toContain('الوصف 2');
      
      expect(result).toHaveLength(3);
      expect(result[0].title).toBe('المهمة 1');
      expect(result[1].title).toBe('المهمة 2');
      expect(result[2].title).toBe('المهمة 3');
    });

    test('should handle partial failures and return successful tasks', async () => {
      // Mock generateText to fail on second call, succeed on others
      (generateText as jest.Mock).mockImplementationOnce(() => ({
        output: { title: 'المهمة 1', description: 'الوصف 1', resources: [], deadlineMinutes: 30, workflowType: 'self_contained', waitingAgentId: 'manager', assignedByAgentId: 'manager', difficulty: 1, guidanceTips: [], starterMessage: 'رسالة البداية 1' },
      })).mockImplementationOnce(() => {
        throw new Error('AI service error');
      }).mockImplementationOnce(() => ({
        output: { title: 'المهمة 3', description: 'الوصف 3', resources: [], deadlineMinutes: 60, workflowType: 'delegated', waitingAgentId: 'colleague_2', assignedByAgentId: 'colleague_2', difficulty: 3, guidanceTips: [], starterMessage: 'رسالة البداية 3' },
      }));

      const result = await generateTasks(mockTrackId, mockCompanyContext, 'quick', mockAgents);
      
      // Should return 2 successful tasks despite middle failure
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe('المهمة 1');
      expect(result[1].title).toBe('المهمة 3');
      
      const calls = (generateText as jest.Mock).mock.calls;

      // Third call still received context from the first (successful) task
      expect(calls[2][0].prompt).toContain('المهمة رقم 3 من 3');
      expect(calls[2][0].prompt).toContain('المهام السابقة في نفس الجلسة');
      expect(calls[2][0].prompt).toContain('المهمة السابقة 1:');
      expect(calls[2][0].prompt).toContain('المهمة 1');
      expect(calls[2][0].prompt).toContain('الوصف 1');
    });

    test('should throw error when no tasks are generated', async () => {
      // Mock all generateText calls to fail
      (generateText as jest.Mock).mockImplementation(() => {
        throw new Error('AI service error');
      });

      await expect(generateTasks(mockTrackId, mockCompanyContext, 'quick', mockAgents))
        .rejects
        .toThrow('لم يُرجع أي مهام، حاول مجدداً');
    });
  });
});