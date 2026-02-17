import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import NewTaskModal from '../../components/NewTaskModal.tsx';

describe('NewTaskModal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('submits valid task and adds checklist item', () => {
    const onSubmit = vi.fn();

    render(
      <NewTaskModal
        teamMembers={['Ana']}
        onClose={() => {}}
        onSubmit={onSubmit}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('O que precisa ser feito?'), {
      target: { value: 'Contar estoque' }
    });

    fireEvent.change(screen.getByPlaceholderText('Ex: Conferir data de validade'), {
      target: { value: 'Checar estoque' }
    });
    fireEvent.click(screen.getByRole('button', { name: '+' }));

    expect(screen.getByText('Checar estoque')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Lançar Tarefa/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('blocks submission with past deadline', () => {
    const onSubmit = vi.fn();
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <NewTaskModal
        teamMembers={['Ana']}
        onClose={() => {}}
        onSubmit={onSubmit}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('O que precisa ser feito?'), {
      target: { value: 'Auditar prateleiras' }
    });

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'Ana' } });

    const dateInput = screen.getByDisplayValue('2026-02-15');
    fireEvent.change(dateInput, { target: { value: '2020-01-01' } });

    const form = screen.getByPlaceholderText('O que precisa ser feito?').closest('form');
    if (form) {
      fireEvent.submit(form);
    }

    expect(alertMock).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();

    alertMock.mockRestore();
  });
});
