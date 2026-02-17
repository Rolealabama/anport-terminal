import { describe, it, expect } from 'vitest';
import { HierarchyService } from '../../services/HierarchyService';

describe('HierarchyService', () => {
  describe('Module Structure', () => {
    it('exports calculateHierarchyPath method', () => {
      expect(typeof HierarchyService.calculateHierarchyPath).toBe('function');
    });

    it('exports updateHierarchyPath method', () => {
      expect(typeof HierarchyService.updateHierarchyPath).toBe('function');
    });

    it('exports deactivateUserSafely method', () => {
      expect(typeof HierarchyService.deactivateUserSafely).toBe('function');
    });

    it('exports moveUserToNewSuperior method', () => {
      expect(typeof HierarchyService.moveUserToNewSuperior).toBe('function');
    });

    it('exports validateCompanyHierarchy method', () => {
      expect(typeof HierarchyService.validateCompanyHierarchy).toBe('function');
    });
  });

  describe('Public API', () => {
    it('has correct method signatures', () => {
      // calculateHierarchyPath should return a Promise
      const result = HierarchyService.calculateHierarchyPath('test-user');
      expect(result).toBeInstanceOf(Promise);
    });
  });
});
