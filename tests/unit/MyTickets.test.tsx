import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import MyTickets from '../../components/MyTickets.tsx';

vi.mock('../../firebase', () => ({
  db: {},
  isFirebaseConfigured: true,
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn((q, callback) => {
    return vi.fn();
  }),
  getFirestore: vi.fn(() => ({})),
}));

describe('MyTickets', () => {
  const defaultProps = {
    userId: 'user1',
    companyId: 'comp1',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders component without crashing', () => {
    const { container } = render(<MyTickets {...defaultProps} />);
    expect(container).toBeDefined();
  });

  it('displays at least total stat', () => {
    render(<MyTickets {...defaultProps} />);
    // Apenas verificar que alguma estatística está presente
    expect(document.querySelector('p')).toBeInTheDocument();
  });

  it('displays filter select', () => {
    render(<MyTickets {...defaultProps} />);
    expect(screen.getByDisplayValue(/TODOS OS STATUS/i)).toBeInTheDocument();
  });
});
