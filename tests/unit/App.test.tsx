import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let configured = true;
let authUser: any = null;

vi.mock('../../firebase.ts', () => ({
  db: {},
  auth: {},
  get isFirebaseConfigured() {
    return configured;
  }
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: vi.fn((_auth: any, cb: any) => {
    cb(authUser);
    return () => {};
  }),
  signOut: vi.fn(async () => undefined)
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: any, col: string, id: string) => ({ col, id })),
  getDoc: vi.fn(async (ref: any) => {
    if (ref.col === 'users' && ref.id === 'user_ceo') {
      return {
        exists: () => true,
        id: 'user_ceo',
        data: () => ({ name: 'CEO', companyId: 'TESTCORP' })
      };
    }
    return { exists: () => false };
  })
}));

vi.mock('../../services/AuthorizationService.ts', () => ({
  AuthorizationService: {
    getUserPermissions: vi.fn(async () => [])
  }
}));

vi.mock('../../services/RealtimeService.ts', () => ({
  RealtimeService: {
    subscribeToPersonalTasks: vi.fn(() => 'listener-1'),
    unsubscribe: vi.fn()
  }
}));

vi.mock('../../services/TaskService.ts', () => ({
  TaskService: {
    createTask: vi.fn(async () => ({ success: true }))
  }
}));

vi.mock('../../components/LoginV2.tsx', () => ({
  default: () => <div>LoginV2</div>
}));

vi.mock('../../components/KanbanBoardV2.tsx', () => ({
  default: () => <div>KanbanV2</div>
}));

vi.mock('../../components/Organograma.tsx', () => ({
  default: () => <div>Organograma</div>
}));

vi.mock('../../components/NewTaskModalV2.tsx', () => ({
  default: () => <div>NewTaskModalV2</div>
}));

import App from '../../App.tsx';

describe('App (V2)', () => {
  beforeEach(() => {
    configured = true;
    authUser = null;
  });

  it('shows connection error when firebase is not configured', () => {
    configured = false;
    render(<App />);
    expect(screen.getByText('Erro de Conexão')).toBeInTheDocument();
  });

  it('renders login screen when user is signed out', () => {
    authUser = null;
    render(<App />);
    expect(screen.getByText('LoginV2')).toBeInTheDocument();
  });

  it('renders app shell when user is signed in', async () => {
    authUser = { uid: 'user_ceo' };
    render(<App />);
    expect(await screen.findByText('KanbanV2')).toBeInTheDocument();
    expect(screen.getByText('CEO · TESTCORP')).toBeInTheDocument();
  });

  it('calls signOut when clicking Sair', async () => {
    const { signOut } = await import('firebase/auth');
    authUser = { uid: 'user_ceo' };
    render(<App />);
    await screen.findByText('KanbanV2');
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(vi.mocked(signOut)).toHaveBeenCalled();
  });
});
