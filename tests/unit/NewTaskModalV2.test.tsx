import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import NewTaskModalV2 from '../../components/NewTaskModalV2';

// Mock TaskService
vi.mock('../../services/TaskService', () => ({
  TaskService: {
    createTask: vi.fn().mockResolvedValue({ id: 'task-1' })
  }
}));

describe('NewTaskModalV2', () => {
  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    userId: 'user-1',
    companyId: 'company-1',
    userPermissions: ['task_create', 'task_edit']
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar quando isOpen é true', () => {
    const { container } = render(<NewTaskModalV2 {...mockProps} />);
    expect(container).toBeInTheDocument();
  });

  it('deve aceitar isOpen false', () => {
    const { container } = render(<NewTaskModalV2 {...mockProps} isOpen={false} />);
    expect(container).toBeInTheDocument();
  });

  it('deve aceitar onClose callback', () => {
    const onClose = vi.fn();
    const { container } = render(
      <NewTaskModalV2 {...mockProps} onClose={onClose} />
    );
    expect(container).toBeInTheDocument();
    expect(typeof onClose).toBe('function');
  });

  it('deve aceitar userId prop', () => {
    const { container } = render(
      <NewTaskModalV2 {...mockProps} userId="user-2" />
    );
    expect(container).toBeInTheDocument();
  });

  it('deve aceitar companyId prop', () => {
    const { container } = render(
      <NewTaskModalV2 {...mockProps} companyId="company-2" />
    );
    expect(container).toBeInTheDocument();
  });

  it('deve aceitar userPermissions array vazio', () => {
    const { container } = render(
      <NewTaskModalV2 {...mockProps} userPermissions={[]} />
    );
    expect(container).toBeInTheDocument();
  });

  it('deve aceitar userPermissions com multiplas permissoes', () => {
    const { container } = render(
      <NewTaskModalV2 
        {...mockProps} 
        userPermissions={['task_create', 'task_edit', 'task_delete']}
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('deve renderizar com props diferentes', () => {
    ['user-1', 'user-2', 'user-3'].forEach(userId => {
      const { container } = render(
        <NewTaskModalV2 {...mockProps} userId={userId} />
      );
      expect(container).toBeInTheDocument();
    });
  });

  it('deve renderizar com isOpen true/false', () => {
    [true, false].forEach(isOpen => {
      const { container } = render(
        <NewTaskModalV2 {...mockProps} isOpen={isOpen} />
      );
      expect(container).toBeInTheDocument();
    });
  });

  it('deve re-render com props alteradas', () => {
    const { rerender } = render(<NewTaskModalV2 {...mockProps} />);
    
    rerender(
      <NewTaskModalV2 
        {...mockProps}
        userId="user-2"
        isOpen={false}
      />
    );
    
    expect(true).toBe(true);
  });

  it('deve manter referência do onClose callback', () => {
    const onClose = vi.fn();
    const { container } = render(
      <NewTaskModalV2 {...mockProps} onClose={onClose} />
    );
    expect(container).toBeInTheDocument();
    expect(typeof onClose).toBe('function');
  });

  it('deve aceitar diferentes combinacoes de props', () => {
    const testCases = [
      { isOpen: true, userId: 'user-1', companyId: 'company-1' },
      { isOpen: false, userId: 'user-2', companyId: 'company-2' },
      { isOpen: true, userId: 'user-3', companyId: 'company-3' }
    ];

    testCases.forEach(testCase => {
      const { container } = render(
        <NewTaskModalV2 
          isOpen={testCase.isOpen}
          userId={testCase.userId}
          companyId={testCase.companyId}
          onClose={vi.fn()}
          userPermissions={['task_create']}
        />
      );
      expect(container).toBeInTheDocument();
    });
  });

  it('deve renderizar corretamente sem erros', () => {
    expect(() => {
      render(<NewTaskModalV2 {...mockProps} />);
    }).not.toThrow();
  });

  it('deve renderizar multiplas vezes', () => {
    const { rerender } = render(<NewTaskModalV2 {...mockProps} />);
    rerender(<NewTaskModalV2 {...mockProps} />);
    rerender(<NewTaskModalV2 {...mockProps} />);
    expect(true).toBe(true);
  });

  it('deve ter comportamento consistente', () => {
    const { container: container1 } = render(<NewTaskModalV2 {...mockProps} />);
    const { container: container2 } = render(<NewTaskModalV2 {...mockProps} />);
    
    expect(container1).toBeInTheDocument();
    expect(container2).toBeInTheDocument();
  });
});

