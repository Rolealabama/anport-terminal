import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CompleteTaskModal from '../../components/CompleteTaskModal.tsx';

class MockFileReader {
  public onload: ((ev: ProgressEvent<FileReader>) => void) | null = null;
  public onerror: (() => void) | null = null;
  public result: string | null = null;

  readAsDataURL() {
    this.result = 'data:image/png;base64,AAA';
    if (this.onload) {
      this.onload({ target: this } as unknown as ProgressEvent<FileReader>);
    }
  }
}

describe('CompleteTaskModal', () => {
  it('uploads attachment and submits', async () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();

    (globalThis as any).FileReader = MockFileReader;

    render(<CompleteTaskModal onClose={onClose} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByPlaceholderText('Descreva brevemente...'), {
      target: { value: 'Concluido' }
    });

    const file = new File(['ok'], 'foto.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]');
    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
    }

    await waitFor(() => {
      expect(screen.getByText('foto.png')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Finalizar Missão/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
