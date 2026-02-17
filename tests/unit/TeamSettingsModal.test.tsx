import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../utils.ts', () => ({
  generateSalt: () => 'salt',
  hashPassword: async () => 'hash'
}));

import TeamSettingsModal from '../../components/TeamSettingsModal.tsx';

describe('TeamSettingsModal', () => {
  it('adds a member and saves the unit', async () => {
    const onSave = vi.fn();
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <TeamSettingsModal
        onClose={() => {}}
        teamMembers={[]}
        schedules={[]}
        fixedDemands={[]}
        storeId="S1"
        onSave={onSave}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Ex: João Silva'), {
      target: { value: 'Joao Silva' }
    });
    fireEvent.change(screen.getByPlaceholderText('Ex: joao_silva'), {
      target: { value: 'joao_silva' }
    });
    fireEvent.change(screen.getByPlaceholderText('Mínimo 6 caracteres'), {
      target: { value: '123456' }
    });

    fireEvent.click(screen.getByRole('button', { name: /Adicionar Membro/i }));

    const matches = await screen.findAllByText('Joao Silva');
    expect(matches.length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Salvar Unidade/i }));
    expect(onSave).toHaveBeenCalled();

    alertMock.mockRestore();
  });

  it('edits a member and updates name references', async () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <TeamSettingsModal
        onClose={() => {}}
        teamMembers={[{ name: 'Ana', username: 'ana', password: 'x' }]}
        schedules={[{ responsible: 'Ana', shift: '08:00 - 18:00' }]}
        fixedDemands={[{ id: 'd1', responsible: 'Ana', title: 'Rotina', daysOfWeek: [1] }]}
        storeId="S1"
        onSave={() => {}}
      />
    );

    fireEvent.click(screen.getByTitle('Editar membro'));

    fireEvent.change(screen.getByPlaceholderText('Ex: João Silva'), {
      target: { value: 'Ana Maria' }
    });
    fireEvent.change(screen.getByPlaceholderText('Deixar vazio = não alterar'), {
      target: { value: '123456' }
    });

    fireEvent.click(screen.getByRole('button', { name: /Salvar Alterações/i }));

    const matches = await screen.findAllByText('Ana Maria');
    expect(matches.length).toBeGreaterThan(0);

    alertMock.mockRestore();
  });

  it('removes a member after confirmation', () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <TeamSettingsModal
        onClose={() => {}}
        teamMembers={[{ name: 'Ana', username: 'ana', password: 'x' }]}
        schedules={[]}
        fixedDemands={[]}
        storeId="S1"
        onSave={() => {}}
      />
    );

    fireEvent.click(screen.getByTitle('Deletar membro'));
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Exclusão/i }));

    expect(screen.queryByText('Ana')).toBeNull();

    alertMock.mockRestore();
  });

  it('adds and removes fixed demand', () => {
    render(
      <TeamSettingsModal
        onClose={() => {}}
        teamMembers={[{ name: 'Ana', username: 'ana', password: 'x' }]}
        schedules={[]}
        fixedDemands={[]}
        storeId="S1"
        onSave={() => {}}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Nome da Rotina'), {
      target: { value: 'Rotina A' }
    });

    fireEvent.click(screen.getByText('Seg'));
    fireEvent.click(screen.getByRole('button', { name: /Vincular Rotina/i }));

    expect(screen.getByText('Rotina A')).toBeInTheDocument();

    fireEvent.click(screen.getByText('X'));
    expect(screen.queryByText('Rotina A')).toBeNull();
  });

  it('updates schedule times', () => {
    render(
      <TeamSettingsModal
        onClose={() => {}}
        teamMembers={[{ name: 'Ana', username: 'ana', password: 'x' }]}
        schedules={[]}
        fixedDemands={[]}
        storeId="S1"
        onSave={() => {}}
      />
    );

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '09:00' } });
    fireEvent.change(selects[1], { target: { value: '17:00' } });

    expect(screen.getByText(/Atual:/i)).toBeInTheDocument();
  });
});
