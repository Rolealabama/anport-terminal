import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SupportDashboard from '../../components/SupportDashboard.tsx';
import { Role, Priority } from '../../types';

const {
  collectionMock,
  queryMock,
  whereMock,
  onSnapshotMock,
  updateDocMock,
  addDocMock,
  docMock,
  serverTimestampMock
} = vi.hoisted(() => ({
  collectionMock: vi.fn(),
  queryMock: vi.fn(),
  whereMock: vi.fn(),
  onSnapshotMock: vi.fn(),
  updateDocMock: vi.fn(),
  addDocMock: vi.fn(),
  docMock: vi.fn(),
  serverTimestampMock: vi.fn(() => 123456)
}));

let snapshotTickets: any[] = [];

vi.mock('../../firebase', () => ({
  db: {},
  isFirebaseConfigured: true,
}));

vi.mock('firebase/firestore', () => ({
  collection: collectionMock,
  query: queryMock,
  where: whereMock,
  onSnapshot: onSnapshotMock,
  updateDoc: updateDocMock,
  addDoc: addDocMock,
  doc: docMock,
  serverTimestamp: serverTimestampMock,
}));

vi.mock('../../components/TicketCard.tsx', () => ({
  default: ({ ticket, onEdit, onStatusChange, viewerRole }: any) => (
    <div>
      <p>{ticket.title}</p>
      <p>ROLE:{viewerRole}</p>
      <button onClick={onEdit}>EDITAR_CARD</button>
      <button onClick={() => onStatusChange('resolvido')}>STATUS_RESOLVIDO</button>
    </div>
  )
}));

vi.mock('../../components/SupportTicketModal.tsx', () => ({
  default: ({ onClose, onSubmit, ticket }: any) => (
    <div>
      <p>{ticket ? 'MODO_EDICAO' : 'MODO_CRIACAO'}</p>
      <button
        onClick={() =>
          onSubmit({
            title: 'Novo Ticket',
            description: 'Descricao',
            priority: Priority.ALTA,
            category: 'sistema'
          })
        }
      >
        SUBMIT_MODAL
      </button>
      <button onClick={onClose}>FECHAR_MODAL</button>
    </div>
  )
}));

describe('SupportDashboard', () => {
  const defaultProps = {
    userId: 'user1',
    userRole: Role.SUPPORT,
    companyId: 'comp1',
    storeId: 'store1',
    userName: 'John Support',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    snapshotTickets = [
      {
        id: 'ticket-alpha',
        companyId: 'comp1',
        storeId: 'store1',
        title: 'Erro no sistema',
        description: 'Falha ao salvar',
        createdBy: 'user1',
        createdByRole: Role.ADMIN,
        createdByName: 'John',
        ticketNumber: 12,
        status: 'aberto',
        priority: Priority.URGENTE,
        category: 'sistema',
        createdAt: Date.now()
      },
      {
        id: 'ticket-beta',
        companyId: 'comp1',
        storeId: 'store1',
        title: 'Melhoria dashboard',
        description: 'Adicionar filtro',
        createdBy: 'user2',
        createdByRole: Role.COMPANY,
        createdByName: 'Jane',
        status: 'em_progresso',
        priority: Priority.MEDIA,
        category: 'funcionalidade',
        createdAt: Date.now()
      }
    ];

    collectionMock.mockImplementation((_db, name) => ({ kind: 'collection', name }));
    whereMock.mockImplementation((...args) => ({ kind: 'where', args }));
    queryMock.mockImplementation((...args) => ({ kind: 'query', args }));
    docMock.mockImplementation((_db, name, id) => ({ kind: 'doc', name, id }));
    onSnapshotMock.mockImplementation((_q, callback) => {
      callback({
        docs: snapshotTickets.map((ticket) => ({
          id: ticket.id,
          data: () => {
            const { id, ...rest } = ticket;
            return rest;
          }
        }))
      });
      return vi.fn();
    });

  });

  it('renders grouped tickets and stats', () => {
    render(<SupportDashboard {...defaultProps} />);

    expect(screen.getByText(/TOTAL/i)).toBeInTheDocument();
    expect(screen.getByText('Erro no sistema')).toBeInTheDocument();
    expect(screen.getByText('#00012')).toBeInTheDocument();
    expect(screen.getByText('ROLE:support')).toBeInTheDocument();

    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'todos' } });

    expect(screen.getByText('Melhoria dashboard')).toBeInTheDocument();
    expect(screen.getByText('#TICKET-B')).toBeInTheDocument();
  });

  it('filters by text, status and priority', () => {
    render(<SupportDashboard {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText(/Buscar por título/i), {
      target: { value: '#12' }
    });
    expect(screen.getByText('Erro no sistema')).toBeInTheDocument();
    expect(screen.queryByText('Melhoria dashboard')).toBeNull();

    const selects = screen.getAllByRole('combobox');

    fireEvent.change(selects[0], {
      target: { value: 'em_progresso' }
    });
    fireEvent.change(selects[1], {
      target: { value: 'Média' }
    });
    fireEvent.change(screen.getByPlaceholderText(/Buscar por título/i), {
      target: { value: '' }
    });

    expect(screen.queryByText('Erro no sistema')).toBeNull();
    expect(screen.getByText('Melhoria dashboard')).toBeInTheDocument();
  });

  it('creates a new ticket from modal', async () => {
    addDocMock.mockResolvedValue({ id: 'new-ticket' });

    render(<SupportDashboard {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /NOVO TICKET/i }));
    expect(screen.getByText('MODO_CRIACAO')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'SUBMIT_MODAL' }));

    await waitFor(() => {
      expect(addDocMock).toHaveBeenCalled();
    });

    const payload = addDocMock.mock.calls[0][1];
    expect(payload.createdBy).toBe('user1');
    expect(payload.status).toBe('aberto');
    expect(payload.ticketNumber).toBeTypeOf('number');
  });

  it('edits a ticket and updates status to resolved', async () => {
    updateDocMock.mockResolvedValue(undefined);

    render(<SupportDashboard {...defaultProps} />);

    fireEvent.click(screen.getAllByRole('button', { name: 'EDITAR_CARD' })[0]);
    expect(screen.getByText('MODO_EDICAO')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'SUBMIT_MODAL' }));

    await waitFor(() => {
      expect(updateDocMock).toHaveBeenCalled();
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'STATUS_RESOLVIDO' })[0]);

    await waitFor(() => {
      expect(updateDocMock).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'resolvido',
          resolvedAt: 123456
        })
      );
    });
  });

  it('does not subscribe when company role has no companyId', () => {
    render(
      <SupportDashboard
        {...defaultProps}
        userRole={Role.COMPANY}
        companyId={undefined}
      />
    );

    expect(onSnapshotMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Nenhum ticket encontrado/i)).toBeInTheDocument();
  });
});
