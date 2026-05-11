import { POST } from '@/app/api/tasks/[id]/complete/route';
import { db, tasks, messages } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';

// Mock the database and crypto modules
jest.mock('@/lib/db', () => ({
  db: {
    transaction: jest.fn((callback) => callback({
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      get: jest.fn(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
    })),
  },
  tasks: {},
  messages: {},
}));

jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('test-uuid'),
}));

describe('Task Completion Endpoint', () => {
  const mockParams = { id: 'test-task-id' };
  const mockSessionId = 'test-session-id';
  
  const mockActiveTask = {
    id: 'test-task-id',
    sessionId: mockSessionId,
    status: 'active',
    title: 'Test Task',
    description: 'Test Description',
    difficulty: 2,
    starterMessage: 'Test Starter Message',
    assignedByAgentId: 'manager',
  };

  const mockPendingTask = {
    id: 'test-pending-task-id',
    sessionId: mockSessionId,
    status: 'pending',
    title: 'Pending Task',
    description: 'Pending Description',
    difficulty: 3,
    starterMessage: 'Pending Starter Message',
    assignedByAgentId: 'colleague_1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock database transaction
    (db.transaction as jest.Mock).mockImplementation((callback) => {
      const mockTx = {
        select: jest.fn(() => mockTx),
        from: jest.fn(() => mockTx),
        where: jest.fn((...args) => {
          mockTx.whereArgs = args;
          return mockTx;
        }),
        orderBy: jest.fn(() => mockTx),
        get: jest.fn(),
        update: jest.fn(() => mockTx),
        set: jest.fn(() => mockTx),
        insert: jest.fn(() => mockTx),
        values: jest.fn(() => mockTx),
      };
      
      // Set up the mock to return the active task when queried
      mockTx.get.mockImplementation(() => {
        // For the first call in transaction (checking if task exists and is active)
        if (mockTx.whereArgs?.[0]?.toString().includes('tasks.id') && 
            mockTx.whereArgs?.[1] === 'test-task-id') {
          return mockActiveTask;
        }
        // For the second call (finding next pending task)
        if (mockTx.whereArgs?.[0]?.toString().includes('tasks.sessionId') && 
            mockTx.whereArgs?.[1] === mockSessionId && 
            mockTx.whereArgs?.[2]?.toString().includes('tasks.status') && 
            mockTx.whereArgs?.[3] === 'pending') {
          return mockPendingTask;
        }
        return null;
      });
      
      return callback(mockTx);
    });
  });

  describe('POST /api/tasks/[id]/complete', () => {
    test('should successfully complete task and activate next pending task', async () => {
      const mockRequest = {} as NextRequest;
      
      const response = await POST(mockRequest, { params: mockParams });
      
      expect(response.status).toBe(200);
      
      // Verify transaction was called
      expect(db.transaction).toHaveBeenCalled();
      
      const json = await response.json();
      expect(json.done).toBe(false);
      expect(json.nextTask).toBeDefined();
      expect(json.nextTask?.id).toBe('test-pending-task-id');
      expect(json.nextTask?.status).toBe('active');
      expect(json.nextTask?.startedAt).toBeDefined();
    });

    test('should return done=true when no pending tasks exist', async () => {
      // Mock transaction to return null for pending task query
      (db.transaction as jest.Mock).mockImplementation((callback) => {
        const mockTx = {
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
        
        // Return active task for first query, null for pending task query
        mockTx.get.mockImplementation((query) => {
          if (query.whereArgs?.[0]?.includes('tasks.id') && query.whereArgs?.[1] === 'test-task-id') {
            return mockActiveTask;
          }
          return null; // No pending tasks
        });
        
        return callback(mockTx);
      });
      
      const mockRequest = {} as NextRequest;
      const response = await POST(mockRequest, { params: mockParams });
      
      expect(response.status).toBe(200);
      
      const json = await response.json();
      expect(json.done).toBe(true);
      expect(json.nextTask).toBeNull();
    });

    test('should return 400 error for non-existent task', async () => {
      // Mock transaction to return null for task query
      (db.transaction as jest.Mock).mockImplementation((callback) => {
        const mockTx = {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockReturnValue(null), // Task not found
        };
        
        return callback(mockTx);
      });
      
      const mockRequest = {} as NextRequest;
      const response = await POST(mockRequest, { params: mockParams });
      
      expect(response.status).toBe(400);
      
      const json = await response.json();
      expect(json.error).toContain('حدث خطأ');
    });

    test('should return 400 error for already completed task', async () => {
      // Mock transaction to return completed task
      const completedTask = { ...mockActiveTask, status: 'completed' };
      
      (db.transaction as jest.Mock).mockImplementation((callback) => {
        const mockTx = {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockReturnValue(completedTask),
        };
        
        return callback(mockTx);
      });
      
      const mockRequest = {} as NextRequest;
      const response = await POST(mockRequest, { params: mockParams });
      
      expect(response.status).toBe(400);
      
      const json = await response.json();
      expect(json.error).toContain('حدث خطأ');
    });

    test('should handle race condition - only one completion succeeds', async () => {
      // First call - task is active
      (db.transaction as jest.Mock).mockImplementationOnce((callback) => {
        const mockTx = {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockReturnValue(mockActiveTask), // Task is active
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          values: jest.fn().mockReturnThis(),
        };
        
        return callback(mockTx);
      });
      
      // Second call - task is now completed (simulating race condition)
      (db.transaction as jest.Mock).mockImplementationOnce((callback) => {
        const mockTx = {
          select: jest.fn().mockReturnThis(),
          from: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          get: jest.fn().mockReturnValue({ ...mockActiveTask, status: 'completed' }), // Task already completed
        };
        
        return callback(mockTx);
      });
      
      const mockRequest = {} as NextRequest;
      
      // First request should succeed
      let response1 = await POST(mockRequest, { params: mockParams });
      expect(response1.status).toBe(200);
      
      // Second request should fail with 400
      let response2 = await POST(mockRequest, { params: mockParams });
      expect(response2.status).toBe(400);
      
      const json2 = await response2.json();
      expect(json2.error).toContain('حدث خطأ');
    });

    test('should rollback transaction on error', async () => {
      // Mock transaction to throw an error during execution
      (db.transaction as jest.Mock).mockImplementation((callback) => {
        throw new Error('Database error');
      });
      
      const mockRequest = {} as NextRequest;
      const response = await POST(mockRequest, { params: mockParams });
      
      expect(response.status).toBe(500);
      
      const json = await response.json();
      expect(json.error).toContain('حدث خطأ');
    });
  });
});