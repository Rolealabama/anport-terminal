import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TeamBoard from '../../components/TeamBoard.tsx';
import { FixedDemand, TeamMember, WorkSchedule } from '../../types.ts';

describe('TeamBoard', () => {
  it('shows empty state', () => {
    render(
      <TeamBoard
        teamMembers={[]}
        schedules={[]}
        fixedDemands={[]}
        isAdmin={true}
        onEdit={() => {}}
      />
    );

    expect(screen.getByText('Equipe não configurada.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Configurar Agora/i })).toBeInTheDocument();
  });

  it('renders team members', () => {
    const teamMembers: TeamMember[] = [
      { name: 'Ana', username: 'ana', password: 'x' }
    ];
    const schedules: WorkSchedule[] = [{ responsible: 'Ana', shift: '08:00 - 18:00' }];
    const fixedDemands: FixedDemand[] = [{ id: 'd1', responsible: 'Ana', title: 'Rotina', daysOfWeek: [1, 3] }];

    render(
      <TeamBoard
        teamMembers={teamMembers}
        schedules={schedules}
        fixedDemands={fixedDemands}
        isAdmin={false}
        onEdit={() => {}}
      />
    );

    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Rotina')).toBeInTheDocument();
  });
});
