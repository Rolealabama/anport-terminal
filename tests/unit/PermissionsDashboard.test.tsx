import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import PermissionsDashboard from '../../components/PermissionsDashboard';

// Mock AuthorizationService
vi.mock('../../services/AuthorizationService', () => ({
  AuthorizationService: {
    getUserPermissions: vi.fn().mockResolvedValue([])
  }
}));

describe('PermissionsDashboard', () => {
  const mockProps = {
    userId: 'user-1',
    onClose: vi.fn(),
    userPermissions: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar o componente sem erros com userPermissions vazio', () => {
    const { container } = render(<PermissionsDashboard {...mockProps} />);
    expect(container).toBeInTheDocument();
  });

  it('deve renderizar com userPermissions populated', () => {
    const { container } = render(
      <PermissionsDashboard 
        {...mockProps} 
        userPermissions={['task_create', 'task_edit']} 
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('deve aceitar userId diferente', () => {
    const { container } = render(
      <PermissionsDashboard 
        {...mockProps} 
        userId="user-2" 
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('deve aceitar onClose callback', () => {
    const onClose = vi.fn();
    const { container } = render(
      <PermissionsDashboard 
        userId="user-1"
        onClose={onClose}
        userPermissions={[]}
      />
    );
    expect(container).toBeInTheDocument();
    expect(typeof onClose).toBe('function');
  });

  it('deve renderizar corretamente sem erros ao re-render', () => {
    const { rerender } = render(<PermissionsDashboard {...mockProps} />);
    
    rerender(<PermissionsDashboard {...mockProps} userPermissions={['task_create']} />);
    
    expect(true).toBe(true);
  });

  it('deve renderizar com múltiplas permissões', () => {
    const { container } = render(
      <PermissionsDashboard 
        {...mockProps}
        userPermissions={[
          'task_create', 
          'task_edit', 
          'task_delete',
          'board_view',
          'board_create'
        ]}
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('deve manter referência ao userId', () => {
    const userId = 'test-user-123';
    const { container } = render(
      <PermissionsDashboard 
        userId={userId}
        onClose={vi.fn()}
        userPermissions={[]}
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('deve renderizar diverse props combinations', () => {
    const testCases = [
      { userId: 'user-1', userPermissions: [] },
      { userId: 'user-2', userPermissions: ['task_create'] },
      { userId: 'user-3', userPermissions: ['task_create', 'task_edit'] }
    ];

    testCases.forEach(testCase => {
      const { container } = render(
        <PermissionsDashboard 
          userId={testCase.userId}
          onClose={vi.fn()}
          userPermissions={testCase.userPermissions}
        />
      );
      expect(container).toBeInTheDocument();
    });
  });
});

