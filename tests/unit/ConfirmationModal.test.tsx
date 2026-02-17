import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ConfirmationModal from '../../components/ConfirmationModal.tsx';

describe('ConfirmationModal', () => {
  it('calls confirm and cancel actions', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmationModal
        isOpen={true}
        title="Confirmar"
        message="Tem certeza?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Confirmar Exclusão/i }));
    fireEvent.click(screen.getByRole('button', { name: /Cancelar/i }));

    expect(onConfirm).toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <ConfirmationModal
        isOpen={false}
        title="Confirmar"
        message="Tem certeza?"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
