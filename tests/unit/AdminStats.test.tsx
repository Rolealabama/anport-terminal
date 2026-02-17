import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AdminStats from '../../components/AdminStats.tsx';
import { Priority, Status, Task } from '../../types.ts';

describe('AdminStats', () => {
  it('renders task counters correctly', () => {
    const tasks: Task[] = [
      {
        id: '1',
        storeId: 'S1',
        title: 'T1',
        responsible: 'Ana',
        priority: Priority.BAIXA,
        deadline: '2099-01-01',
        status: Status.TODO,
        createdAt: 1
      },
      {
        id: '2',
        storeId: 'S1',
        title: 'T2',
        responsible: 'Ana',
        priority: Priority.MEDIA,
        deadline: '2099-01-01',
        status: Status.DOING,
        createdAt: 2
      },
      {
        id: '3',
        storeId: 'S1',
        title: 'T3',
        responsible: 'Bob',
        priority: Priority.ALTA,
        deadline: '2000-01-01',
        status: Status.DONE,
        createdAt: 3
      }
    ];

    render(<AdminStats tasks={tasks} teamMembers={['Ana', 'Bob']} />);

    const totalCard = screen.getByText('Geral').closest('div');
    const doingCard = screen.getByText('Fila').closest('div');
    const doneCard = screen.getByText('OK').closest('div');
    const overdueCard = screen.getByText('Alerta').closest('div');

    expect(totalCard).toBeTruthy();
    expect(doingCard).toBeTruthy();
    expect(doneCard).toBeTruthy();
    expect(overdueCard).toBeTruthy();

    expect(within(totalCard as HTMLElement).getByText('3')).toBeInTheDocument();
    expect(within(doingCard as HTMLElement).getByText('1')).toBeInTheDocument();
    expect(within(doneCard as HTMLElement).getByText('1')).toBeInTheDocument();
    expect(within(overdueCard as HTMLElement).getByText('0')).toBeInTheDocument();
  });
});
