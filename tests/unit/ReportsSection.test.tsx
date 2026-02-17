import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ReportsSection from '../../components/ReportsSection.tsx';
import { Priority, Role, Status, Task, TeamMember, User } from '../../types.ts';

describe('ReportsSection', () => {
  it('shows only current user for non-admin roles', () => {
    const tasks: Task[] = [
      {
        id: '1',
        storeId: 'S1',
        title: 'T1',
        responsible: 'Ana',
        priority: Priority.BAIXA,
        deadline: '2099-01-01',
        status: Status.DONE,
        createdAt: 1,
        completedAt: 2
      },
      {
        id: '2',
        storeId: 'S1',
        title: 'T2',
        responsible: 'Bob',
        priority: Priority.BAIXA,
        deadline: '2099-01-01',
        status: Status.TODO,
        createdAt: 2
      }
    ];

    const teamMembers: TeamMember[] = [
      { name: 'Ana', username: 'ana', password: 'x' },
      { name: 'Bob', username: 'bob', password: 'y' }
    ];

    const currentUser: User = {
      username: 'ana',
      role: Role.USER,
      name: 'Ana',
      storeId: 'S1'
    };

    render(<ReportsSection tasks={tasks} teamMembers={teamMembers} currentUser={currentUser} />);

    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).toBeNull();
  });

  it('shows audit cards for admin', () => {
    const tasks: Task[] = [
      {
        id: '1',
        storeId: 'S1',
        title: 'T1',
        responsible: 'Ana',
        priority: Priority.BAIXA,
        deadline: '2099-01-01',
        status: Status.DONE,
        createdAt: 1,
        completedAt: 2,
        completionDescription: 'Ok',
        completionAttachments: [{ name: 'foto.png', type: 'image/png', data: 'data:image/png;base64,AAA' }]
      }
    ];

    const teamMembers: TeamMember[] = [
      { name: 'Ana', username: 'ana', password: 'x' }
    ];

    const currentUser: User = {
      username: 'adm',
      role: Role.ADMIN,
      name: 'Admin',
      storeId: 'S1'
    };

    render(<ReportsSection tasks={tasks} teamMembers={teamMembers} currentUser={currentUser} />);

    expect(screen.getByText('Inteligência Operacional')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Auditoria Visual/i }));
    expect(screen.getByText('T1')).toBeInTheDocument();
  });
});
