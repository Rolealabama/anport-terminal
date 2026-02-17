import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserTicketCreation from '../../components/UserTicketCreation.tsx';
import { Role, Priority } from '../../types';

vi.mock('../../firebase', () => ({
  db: {},
  isFirebaseConfigured: true,
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(() => Date.now()),
  getFirestore: vi.fn(() => ({})),
}));

describe('UserTicketCreation', () => {
  const defaultProps = {
    userId: 'user1',
    userName: 'John User',
    userRole: Role.USER,
    companyId: 'comp1',
    storeId: 'store1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form with all fields', () => {
    render(<UserTicketCreation {...defaultProps} />);
    expect(screen.getByPlaceholderText(/Erro ao gerar relatório/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Descreva sua dúvida ou o bug/i)).toBeInTheDocument();
  });

  it('displays submit button', () => {
    render(<UserTicketCreation {...defaultProps} />);
    expect(screen.getByRole('button', { name: /ENVIAR TICKET/i })).toBeInTheDocument();
  });

  it('shows category select', () => {
    render(<UserTicketCreation {...defaultProps} />);
    // Verificar que pelo menos um select está presente
    expect(screen.getByDisplayValue(/SISTEMA/i)).toBeInTheDocument();
  });

  it('displays company and user info', () => {
    render(<UserTicketCreation {...defaultProps} />);
    expect(screen.getByText(/comp1/i)).toBeInTheDocument();
    expect(screen.getByText(/John User/i)).toBeInTheDocument();
  });
});
