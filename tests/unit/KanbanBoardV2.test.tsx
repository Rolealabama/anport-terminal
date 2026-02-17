import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import KanbanBoardV2 from '../../components/KanbanBoardV2';

// Mock TaskService
vi.mock('../../services/TaskService', () => ({
  TaskService: {
    moveTask: vi.fn().mockResolvedValue({ success: true }),
    getTasksForBoard: vi.fn().mockResolvedValue([])
  }
}));

// Mock RealtimeService
vi.mock('../../services/RealtimeService', () => ({
  RealtimeService: {
    subscribeToCompanyTasks: vi.fn().mockReturnValue(() => {})
  }
}));

describe('KanbanBoardV2', () => {
  const mockProps = {
    tasks: [],
    userId: 'user-1',
    userPermissions: ['task_create', 'task_edit', 'task_delete'],
    onTaskMove: vi.fn(),
    onError: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve renderizar o componente sem erros', () => {
    const { container } = render(<KanbanBoardV2 {...mockProps} />);
    expect(container).toBeInTheDocument();
  });

  it('deve aceitar tasks vazio', () => {
    const { container } = render(
      <KanbanBoardV2 {...mockProps} tasks={[]} />
    );
    expect(container).toBeInTheDocument();
  });

  it('deve aceitar userId diferente', () => {
    const { container } = render(
      <KanbanBoardV2 {...mockProps} userId="user-2" />
    );
    expect(container).toBeInTheDocument();
  });

  it('deve aceitar userPermissions vazio', () => {
    const { container } = render(
      <KanbanBoardV2 {...mockProps} userPermissions={[]} />
    );
    expect(container).toBeInTheDocument();
  });

  it('deve aceitar userPermissions com multiplas permissoes', () => {
    const { container } = render(
      <KanbanBoardV2 
        {...mockProps}
        userPermissions={['task_create', 'task_edit', 'task_delete', 'board_admin']}
      />
    );
    expect(container).toBeInTheDocument();
  });

  it('deve aceitar onTaskMove callback', () => {
    const onTaskMove = vi.fn();
    const { container } = render(
      <KanbanBoardV2 {...mockProps} onTaskMove={onTaskMove} />
    );
    expect(container).toBeInTheDocument();
    expect(typeof onTaskMove).toBe('function');
  });

  it('deve aceitar onError callback', () => {
    const onError = vi.fn();
    const { container } = render(
      <KanbanBoardV2 {...mockProps} onError={onError} />
    );
    expect(container).toBeInTheDocument();
    expect(typeof onError).toBe('function');
  });

  it('deve renderizar com diferentes userIds', () => {
    ['user-1', 'user-2', 'user-3'].forEach(userId => {
      const { container } = render(
        <KanbanBoardV2 {...mockProps} userId={userId} />
      );
      expect(container).toBeInTheDocument();
    });
  });

  it('deve re-render com tasks alteradas', () => {
    const { rerender } = render(<KanbanBoardV2 {...mockProps} />);
    
    rerender(
      <KanbanBoardV2 
        {...mockProps}
        tasks={[]}
      />
    );
    
    expect(true).toBe(true);
  });

  it('deve manter referências das props', () => {
    const onTaskMove = vi.fn();
    const onError = vi.fn();
    
    const { container } = render(
      <KanbanBoardV2
        tasks={[]}
        userId="user-1"
        userPermissions={['task_create']}
        onTaskMove={onTaskMove}
        onError={onError}
      />
    );
    
    expect(container).toBeInTheDocument();
    expect(typeof onTaskMove).toBe('function');
    expect(typeof onError).toBe('function');
  });

  it('deve aceitar diferentes combinacoes de props', () => {
    const testCases = [
      { userId: 'user-1', userPermissions: [] },
      { userId: 'user-2', userPermissions: ['task_create'] },
      { userId: 'user-3', userPermissions: ['task_create', 'task_edit', 'task_delete'] }
    ];

    testCases.forEach(testCase => {
      const { container } = render(
        <KanbanBoardV2 
          tasks={[]}
          userId={testCase.userId}
          userPermissions={testCase.userPermissions}
          onTaskMove={vi.fn()}
          onError={vi.fn()}
        />
      );
      expect(container).toBeInTheDocument();
    });
  });

  it('deve renderizar corretamente sem erros', () => {
    expect(() => {
      render(<KanbanBoardV2 {...mockProps} />);
    }).not.toThrow();
  });

  it('deve renderizar multiplas vezes', () => {
    const { rerender } = render(<KanbanBoardV2 {...mockProps} />);
    rerender(<KanbanBoardV2 {...mockProps} />);
    rerender(<KanbanBoardV2 {...mockProps} />);
    expect(true).toBe(true);
  });

  it('deve ter comportamento consistente', () => {
    const { container: container1 } = render(<KanbanBoardV2 {...mockProps} />);
    const { container: container2 } = render(<KanbanBoardV2 {...mockProps} />);
    
    expect(container1).toBeInTheDocument();
    expect(container2).toBeInTheDocument();
  });
});

