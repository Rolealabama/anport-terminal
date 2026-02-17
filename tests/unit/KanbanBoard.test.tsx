import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import KanbanBoard from '../../components/KanbanBoard.tsx';
import { Priority, Status, Task } from '../../types.ts';

describe('KanbanBoard', () => {
  it('renders columns and task counts', () => {
    const tasks: Task[] = [
      { id: '1', storeId: 'S1', title: 'T1', responsible: 'Ana', priority: Priority.BAIXA, deadline: '2099-01-01', status: Status.TODO, createdAt: 1 },
      { id: '2', storeId: 'S1', title: 'T2', responsible: 'Ana', priority: Priority.MEDIA, deadline: '2099-01-01', status: Status.DOING, createdAt: 2 },
      { id: '3', storeId: 'S1', title: 'T3', responsible: 'Ana', priority: Priority.ALTA, deadline: '2099-01-01', status: Status.DONE, createdAt: 3 }
    ];

    render(
      <KanbanBoard
        tasks={tasks}
        onMove={vi.fn()}
        onToggleCheck={vi.fn()}
        onDelete={vi.fn()}
        isAdmin={true}
        teamMembers={['Ana']}
      />
    );

    expect(screen.getByText(Status.TODO)).toBeInTheDocument();
    expect(screen.getByText(Status.DOING)).toBeInTheDocument();
    expect(screen.getByText(Status.DONE)).toBeInTheDocument();
  });
});
