import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SupportTicketModal from '../../components/SupportTicketModal.tsx';
import { Role, Priority } from '../../types';

describe('SupportTicketModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSubmit = vi.fn();

  const defaultProps = {
    companyId: 'comp1',
    storeId: 'store1',
    createdBy: 'user1',
    createdByRole: Role.SUPPORT,
    onClose: mockOnClose,
    onSubmit: mockOnSubmit,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with form fields', () => {
    render(<SupportTicketModal {...defaultProps} />);
    expect(screen.getByPlaceholderText(/Descreva o assunto do ticket/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Descreva o problema com detalhes/i)).toBeInTheDocument();
  });

  it('shows correct title for new ticket', () => {
    render(<SupportTicketModal {...defaultProps} />);
    expect(screen.getByText(/NOVO TICKET/i)).toBeInTheDocument();
  });

  it('shows correct title for editing ticket', () => {
    const ticket = {
      id: 'ticket1',
      title: 'Test Ticket',
      description: 'Test Description',
      companyId: 'comp1',
      status: 'aberto' as const,
      priority: Priority.ALTA,
      category: 'sistema' as const,
      createdBy: 'user1',
      createdByRole: Role.SUPPORT,
      createdAt: Date.now(),
    };

    render(<SupportTicketModal {...defaultProps} ticket={ticket} />);
    expect(screen.getByText(/EDITAR TICKET/i)).toBeInTheDocument();
  });

  it('displays category and priority selects', () => {
    render(<SupportTicketModal {...defaultProps} />);
    expect(screen.getByDisplayValue(/SISTEMA/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue(/MÉDIA/i)).toBeInTheDocument();
  });

  it('calls onClose when cancel button clicked', () => {
    render(<SupportTicketModal {...defaultProps} />);
    const cancelButton = screen.getByRole('button', { name: /CANCELAR/i });
    fireEvent.click(cancelButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('validates required fields', async () => {
    render(<SupportTicketModal {...defaultProps} />);
    const submitButton = screen.getByRole('button', { name: /SALVAR TICKET/i });
    
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  it('submits form with correct data', async () => {
    mockOnSubmit.mockResolvedValue(undefined);
    
    render(<SupportTicketModal {...defaultProps} />);
    
    const titleInput = screen.getByPlaceholderText(/Descreva o assunto do ticket/i);
    const descInput = screen.getByPlaceholderText(/Descreva o problema com detalhes/i);
    
    fireEvent.change(titleInput, { target: { value: 'Test Title' } });
    fireEvent.change(descInput, { target: { value: 'Test Description' } });
    
    const submitButton = screen.getByRole('button', { name: /SALVAR TICKET/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Title',
          description: 'Test Description',
        })
      );
    });
  });

  it('shows observations field only for support/dev roles', () => {
    const { rerender } = render(<SupportTicketModal {...defaultProps} />);

    expect(screen.getByPlaceholderText(/Campo visível apenas para suporte e DEV/i)).toBeInTheDocument();

    rerender(
      <SupportTicketModal
        {...defaultProps}
        createdByRole={Role.COMPANY}
      />
    );

    expect(screen.queryByPlaceholderText(/Campo visível apenas para suporte e DEV/i)).toBeNull();
  });

  it('includes observations in submit payload for support role', async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    render(<SupportTicketModal {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText(/Descreva o assunto do ticket/i), {
      target: { value: 'Com observação' }
    });
    fireEvent.change(screen.getByPlaceholderText(/Descreva o problema com detalhes/i), {
      target: { value: 'Detalhes do ticket' }
    });
    fireEvent.change(screen.getByPlaceholderText(/Campo visível apenas para suporte e DEV/i), {
      target: { value: 'Somente equipe interna' }
    });

    fireEvent.click(screen.getByRole('button', { name: /SALVAR TICKET/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          observations: 'Somente equipe interna'
        })
      );
    });
  });
});
