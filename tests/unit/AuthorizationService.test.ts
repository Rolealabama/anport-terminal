import { describe, it, expect } from 'vitest';
import { AuthorizationService } from '../../services/AuthorizationService';
import { Permission, TaskFlowType } from '../../types-v2';

describe('AuthorizationService', () => {
  describe('Module Structure', () => {
    it('exports hasPermission method', () => {
      expect(typeof AuthorizationService.hasPermission).toBe('function');
    });

    it('exports hasAnyPermission method', () => {
      expect(typeof AuthorizationService.hasAnyPermission).toBe('function');
    });

    it('exports hasAllPermissions method', () => {
      expect(typeof AuthorizationService.hasAllPermissions).toBe('function');
    });

    it('exports authorizeTaskCreation method', () => {
      expect(typeof AuthorizationService.authorizeTaskCreation).toBe('function');
    });

    it('exports authorizeBoardMove method', () => {
      expect(typeof AuthorizationService.authorizeBoardMove).toBe('function');
    });
  });

  describe('Types and Enums', () => {
    it('Permission enum is defined', () => {
      expect(Permission.TASK_CREATE_DOWN).toBeDefined();
      expect(Permission.TASK_EDIT_DOWN).toBeDefined();
      expect(Permission.BOARD_VIEW_OWN).toBeDefined();
    });

    it('TaskFlowType enum is defined', () => {
      expect(TaskFlowType.DESCENDANT).toBeDefined();
      expect(TaskFlowType.ASCENDANT).toBeDefined();
      expect(TaskFlowType.SAME_LEVEL).toBeDefined();
      expect(TaskFlowType.TO_DEPARTMENT).toBeDefined();
    });
  });
});
