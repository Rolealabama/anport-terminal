import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TaskCard from '../../components/TaskCard.tsx';
import { Priority, Status, Task } from '../../types.ts';

describe('TaskCard', () => {
  it('toggles checklist and moves task', () => {
    const onMove = vi.fn();
    const onToggleCheck = vi.fn();

    const task: Task = {
      id: 't1',
      storeId: 'S1',
      title: 'Conferir estoque',
      responsible: 'Ana',
      priority: Priority.ALTA,
      deadline: '2099-01-01',
      status: Status.DOING,
      createdAt: 1,
      checklist: [
        { id: 'c1', text: 'Checar estoque', completed: false }
      ]
    };

    render(
      <TaskCard
        task={task}
        teamMembers={['Ana']}
        onMove={onMove}
        onToggleCheck={onToggleCheck}
      />
    );

    fireEvent.click(screen.getByText('Checar estoque'));
    expect(onToggleCheck).toHaveBeenCalledWith('t1', 'c1');

    fireEvent.click(screen.getByRole('button', { name: /Concluir Missão/i }));
    expect(onMove).toHaveBeenCalledWith('t1');
  });

  it('shows proof and deletes task', () => {
    const onDelete = vi.fn();

    const task: Task = {
      id: 't2',
      storeId: 'S1',
      title: 'Finalizada',
      responsible: 'Ana',
      priority: Priority.BAIXA,
      deadline: '2099-01-01',
      status: Status.DONE,
      createdAt: 1,
      completionDescription: 'Tudo certo',
      completionAttachments: [{ name: 'foto.png', type: 'image/png', data: 'data:image/png;base64,AAA' }]
    };

    render(
      <TaskCard
        task={task}
        teamMembers={['Ana']}
        onMove={vi.fn()}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Ver Comprovante/i }));
    expect(screen.getByText(/Relatório/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '×' }));
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Exclusão/i }));

    expect(onDelete).toHaveBeenCalledWith('t2');
  });
});
