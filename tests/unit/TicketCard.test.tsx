import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TicketCard from '../../components/TicketCard.tsx';
import { Role, Priority, SupportTicket } from '../../types';

describe('TicketCard', () => {
  const mockOnEdit = vi.fn();
  const mockOnStatusChange = vi.fn();

  const mockTicket: SupportTicket = {
    id: 'ticket1',
    title: 'Test Ticket',
    description: 'This is a test ticket description',
    companyId: 'comp1',
    status: 'aberto',
    priority: Priority.ALTA,
    category: 'sistema',
    createdBy: 'user1',
    createdByRole: Role.SUPPORT,
    createdAt: Date.now(),
  };

  const defaultProps = {
    ticket: mockTicket,
    onEdit: mockOnEdit,
    onStatusChange: mockOnStatusChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders ticket title', () => {
    render(<TicketCard {...defaultProps} />);
    expect(screen.getByText('Test Ticket')).toBeInTheDocument();
  });

  it('renders ticket description preview', () => {
    render(<TicketCard {...defaultProps} />);
    expect(screen.getByText(/This is a test ticket description/i)).toBeInTheDocument();
  });

  it('displays category in uppercase', () => {
    render(<TicketCard {...defaultProps} />);
    expect(screen.getByText(/SISTEMA/i)).toBeInTheDocument();
  });

  it('shows edit button', () => {
    render(<TicketCard {...defaultProps} />);
    const editButton = screen.getByRole('button', { name: /EDITAR/i });
    expect(editButton).toBeInTheDocument();
  });

  it('calls onEdit when edit button clicked', () => {
    render(<TicketCard {...defaultProps} />);
    const editButton = screen.getByRole('button', { name: /EDITAR/i });
    fireEvent.click(editButton);
    expect(mockOnEdit).toHaveBeenCalled();
  });

  it('displays status select', () => {
    render(<TicketCard {...defaultProps} />);
    const statusSelect = screen.getByDisplayValue(/ABERTO/i) as HTMLSelectElement;
    expect(statusSelect).toBeInTheDocument();
    expect(statusSelect.value).toBe('aberto');
  });

  it('calls onStatusChange when status changes', async () => {
    mockOnStatusChange.mockResolvedValue(undefined);
    
    render(<TicketCard {...defaultProps} />);
    const statusSelect = screen.getByDisplayValue(/ABERTO/i) as HTMLSelectElement;
    
    fireEvent.change(statusSelect, { target: { value: 'em_progresso' } });
    
    await waitFor(() => {
      expect(mockOnStatusChange).toHaveBeenCalledWith('em_progresso');
    });
  });

  it('displays resolution when available', () => {
    const ticketWithResolution = {
      ...mockTicket,
      status: 'resolvido' as const,
      resolution: 'Issue was resolved by updating the configuration',
    };
    
    render(
      <TicketCard 
        {...defaultProps} 
        ticket={ticketWithResolution}
      />
    );
    
    expect(screen.getByText(/RESOLUÇÃO/i)).toBeInTheDocument();
    expect(screen.getByText(/Issue was resolved by updating the configuration/i)).toBeInTheDocument();
  });

  it('shows assigned agent when available', () => {
    const ticketWithAssignment = {
      ...mockTicket,
      assignedTo: 'John Doe',
    };
    
    render(
      <TicketCard 
        {...defaultProps} 
        ticket={ticketWithAssignment}
      />
    );
    
    expect(screen.getByText(/ATRIBUÍDO À:/i)).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('shows internal observations only for support/dev', () => {
    const ticketWithObservations = {
      ...mockTicket,
      observations: 'Detalhe interno do atendimento'
    };

    const { rerender } = render(
      <TicketCard
        {...defaultProps}
        ticket={ticketWithObservations}
        viewerRole={Role.SUPPORT}
      />
    );

    expect(screen.getByText(/OBSERVAÇÕES INTERNAS/i)).toBeInTheDocument();
    expect(screen.getByText(/Detalhe interno do atendimento/i)).toBeInTheDocument();

    rerender(
      <TicketCard
        {...defaultProps}
        ticket={ticketWithObservations}
        viewerRole={Role.COMPANY}
      />
    );

    expect(screen.queryByText(/OBSERVAÇÕES INTERNAS/i)).toBeNull();
  });

  it('displays different priority icons', () => {
    const { rerender } = render(<TicketCard {...defaultProps} />);
    expect(screen.getByText('🟠')).toBeInTheDocument(); // ALTA = 🟠

    const urgentTicket = { ...mockTicket, priority: Priority.URGENTE };
    rerender(<TicketCard {...defaultProps} ticket={urgentTicket} />);
    expect(screen.getByText('🔴')).toBeInTheDocument(); // URGENTE = 🔴
  });
});
