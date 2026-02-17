import { describe, it, expect } from 'vitest';
import { TaskService } from '../../services/TaskService';
import { TaskStatus, TaskPriority, TaskFlowType } from '../../types-v2';

describe('TaskService', () => {
  describe('Module Structure', () => {
    it('exports createTask method', () => {
      expect(typeof TaskService.createTask).toBe('function');
    });

    it('exports reassignTask method', () => {
      expect(typeof TaskService.reassignTask).toBe('function');
    });

    it('exports getTask method', () => {
      expect(typeof TaskService.getTask).toBe('function');
    });

    it('exports getTasksCreatedBy method', () => {
      expect(typeof TaskService.getTasksCreatedBy).toBe('function');
    });

    it('exports getTasksAssignedToUser method', () => {
      expect(typeof TaskService.getTasksAssignedToUser).toBe('function');
    });

    it('exports getTasksAssignedToDepartment method', () => {
      expect(typeof TaskService.getTasksAssignedToDepartment).toBe('function');
    });

    it('exports completeTask method', () => {
      expect(typeof TaskService.completeTask).toBe('function');
    });
  });

  describe('Types and Enums', () => {
    it('TaskStatus enum is defined', () => {
      expect(TaskStatus.TODO).toBeDefined();
      expect(TaskStatus.IN_PROGRESS).toBeDefined();
      expect(TaskStatus.REVIEW).toBeDefined();
      expect(TaskStatus.DONE).toBeDefined();
    });

    it('TaskPriority enum is defined', () => {
      expect(TaskPriority.LOW).toBeDefined();
      expect(TaskPriority.MEDIUM).toBeDefined();
      expect(TaskPriority.HIGH).toBeDefined();
      expect(TaskPriority.URGENT).toBeDefined();
    });

    it('TaskFlowType enum is defined', () => {
      expect(TaskFlowType.DESCENDANT).toBeDefined();
      expect(TaskFlowType.ASCENDANT).toBeDefined();
      expect(TaskFlowType.SAME_LEVEL).toBeDefined();
      expect(TaskFlowType.TO_DEPARTMENT).toBeDefined();
    });
  });

  describe('Public API', () => {
    it('createTask returns a Promise', () => {
      const result = TaskService.createTask('user123', {
        title: 'Test Task',
        description: 'Test Description',
        priority: TaskPriority.MEDIUM,
        flowType: TaskFlowType.DESCENDANT,
        assignedToUserId: 'user456',
      });
      expect(result).toBeInstanceOf(Promise);
    });
  });
});
