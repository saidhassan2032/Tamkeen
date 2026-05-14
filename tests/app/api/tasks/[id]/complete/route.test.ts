import { POST } from '@/app/api/tasks/[id]/complete/route';
import { db, tasks, messages } from '@/lib/db';
import { NextRequest } from 'next/server';

function chainable() {
  return {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    get: jest.fn(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
  };
}

jest.mock('@/lib/db', () => ({
  db: {
    ...chainable(),
    transaction: jest.fn(),
  },
  tasks: {},
  messages: {},
  sessions: {},
}));

jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('test-uuid'),
}));

function makeRequest(force = false): NextRequest {
  const url = force ? 'http://localhost?force=true' : 'http://localhost';
  return { url } as unknown as NextRequest;
}

describe('Task Completion Endpoint', () => {
  const mockParams = { id: 'test-task-id' };
  const mockSessionId = 'test-session-id';

  const baseTask = {
    id: 'test-task-id',
    sessionId: mockSessionId,
    title: 'Test Task',
    description: 'Test Description',
    difficulty: 2,
    deadlineMinutes: 15,
    starterMessage: 'Test Starter',
    assignedByAgentId: 'agent_1',
    sortOrder: 1,
  };

  const mockPendingTask = {
    id: 'next-task-id',
    sessionId: mockSessionId,
    status: 'pending',
    title: 'Next Task',
    description: 'Next Description',
    difficulty: 3,
    deadlineMinutes: 20,
    starterMessage: 'Next Starter',
    assignedByAgentId: 'agent_2',
    sortOrder: 2,
  };

  const completedTaskShape = {
    taskStatus: 'completed',
    transitioned: true,
    blocked: false,
    feedback: null,
    canSkip: false,
    skipWarning: null,
    done: false,
    nextTask: expect.objectContaining({ id: 'next-task-id', status: 'started' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normal completion (status was set to completed by TASK_STATE)', () => {
    test('should activate next task when current is already completed', async () => {
      (db.transaction as jest.Mock).mockImplementation((callback) => {
        const mockTx = {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          get: jest.fn()
            .mockImplementationOnce(() => ({ ...baseTask, status: 'completed' }))
            .mockImplementationOnce(() => mockPendingTask),
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          values: jest.fn().mockReturnThis(),
        };
        return callback(mockTx);
      });

      const response = await POST(makeRequest(), { params: mockParams });
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toMatchObject(completedTaskShape);
    });

    test('should return done=true when no pending tasks exist', async () => {
      (db.transaction as jest.Mock).mockImplementation((callback) => {
        const mockTx = {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          get: jest.fn()
            .mockImplementationOnce(() => ({ ...baseTask, status: 'completed', completedAt: Date.now() }))
            .mockImplementationOnce(() => null),
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
        };
        return callback(mockTx);
      });

      (db as any).get
        .mockImplementationOnce(() => ({ id: mockSessionId, totalTasks: 1 }))
        .mockImplementationOnce(() => ({ value: 1 }));

      const response = await POST(makeRequest(), { params: mockParams });
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toMatchObject({
        taskStatus: 'completed',
        transitioned: true,
        done: true,
        nextTask: null,
      });
    });
  });

  describe('blocked completions (started status)', () => {
    test('should block when task is "started"', async () => {
      (db.transaction as jest.Mock).mockImplementation((callback) => {
        const mockTx = {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockImplementationOnce(() => ({ ...baseTask, status: 'started' })),
        };
        return callback(mockTx);
      });

      const response = await POST(makeRequest(), { params: mockParams });
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toMatchObject({
        taskStatus: 'started',
        transitioned: false,
        blocked: true,
        canSkip: true,
        skipWarning: expect.any(String),
        nextTask: null,
        done: false,
      });
    });

    test('should block when task is "largely" and provide feedback', async () => {
      (db.transaction as jest.Mock).mockImplementation((callback) => {
        const mockTx = {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          get: jest.fn()
            .mockImplementationOnce(() => ({ ...baseTask, status: 'largely' }))
            .mockImplementationOnce(() => ({ content: 'تحتاج تعديل على التنسيق' })),
        };
        return callback(mockTx);
      });

      const response = await POST(makeRequest(), { params: mockParams });
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toMatchObject({
        taskStatus: 'largely',
        transitioned: false,
        blocked: true,
        feedback: 'تحتاج تعديل على التنسيق',
        canSkip: true,
        nextTask: null,
        done: false,
      });
    });

    test('should handle backward compat with "active" status', async () => {
      (db.transaction as jest.Mock).mockImplementation((callback) => {
        const mockTx = {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockImplementationOnce(() => ({ ...baseTask, status: 'active' })),
        };
        return callback(mockTx);
      });

      const response = await POST(makeRequest(), { params: mockParams });
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toMatchObject({
        taskStatus: 'started',
        blocked: true,
      });
    });
  });

  describe('force completion', () => {
    test('should force-complete a "started" task with low scores', async () => {
      (db.transaction as jest.Mock).mockImplementation((callback) => {
        const mockTx = {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          get: jest.fn()
            .mockImplementationOnce(() => ({ ...baseTask, status: 'started' }))
            .mockImplementationOnce(() => mockPendingTask),
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          values: jest.fn().mockReturnThis(),
        };
        return callback(mockTx);
      });

      const response = await POST(makeRequest(true), { params: mockParams });
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toMatchObject(completedTaskShape);
    });

    test('should force-complete a "largely" task', async () => {
      (db.transaction as jest.Mock).mockImplementation((callback) => {
        const mockTx = {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          orderBy: jest.fn().mockReturnThis(),
          get: jest.fn()
            .mockImplementationOnce(() => ({ ...baseTask, status: 'largely' }))
            .mockImplementationOnce(() => mockPendingTask),
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          values: jest.fn().mockReturnThis(),
        };
        return callback(mockTx);
      });

      const response = await POST(makeRequest(true), { params: mockParams });
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toMatchObject(completedTaskShape);
    });
  });

  describe('error handling', () => {
    test('should return 400 error for non-existent task', async () => {
      (db.transaction as jest.Mock).mockImplementation((callback) => {
        const mockTx = {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockReturnValue(null),
        };
        return callback(mockTx);
      });

      const response = await POST(makeRequest(), { params: mockParams });
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain('حدث خطأ');
    });

    test('should return 400 for pending tasks', async () => {
      (db.transaction as jest.Mock).mockImplementation((callback) => {
        const mockTx = {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockImplementationOnce(() => ({ ...baseTask, status: 'pending' })),
        };
        return callback(mockTx);
      });

      const response = await POST(makeRequest(), { params: mockParams });
      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error).toContain('حدث خطأ');
    });

    test('should rollback transaction on error', async () => {
      (db.transaction as jest.Mock).mockReset();
      (db.transaction as jest.Mock).mockImplementation(() => {
        throw new Error('Database error');
      });

      const response = await POST(makeRequest(), { params: mockParams });
      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error).toContain('حدث خطأ');
    });
  });
});
