import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Priority, Role, Status, Task, Feedback } from '../../types.ts';

let configured = true;
let tasksSnapshot: Task[] = [];
let feedbacksSnapshot: Feedback[] = [];
let configSnapshot = { teamMembers: [], schedules: [], fixedDemands: [] } as any;

vi.mock('../../firebase.ts', () => ({
  db: {},
  get isFirebaseConfigured() {
    return configured;
  }
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: any, name: string) => ({ __type: name })),
  query: vi.fn((coll: any) => coll),
  where: vi.fn(),
  onSnapshot: vi.fn((target: any, cb: any) => {
    if (target.__type === 'tasks') {
      cb({ docs: tasksSnapshot.map((t) => ({ id: t.id, data: () => t })) });
    } else if (target.__type === 'feedbacks') {
      cb({ docs: feedbacksSnapshot.map((f) => ({ id: f.id, data: () => f })) });
    } else if (target.__type === 'stores_config') {
      cb({ exists: () => true, data: () => configSnapshot });
    }
    return () => {};
  }),
  doc: vi.fn((_db: any, name: string, id: string) => ({ __type: name, id })),
  updateDoc: vi.fn(),
  addDoc: vi.fn(),
  deleteDoc: vi.fn(),
  setDoc: vi.fn()
}));

vi.mock('../../components/KanbanBoard.tsx', () => ({
  default: ({ onMove, onToggleCheck }: any) => (
    <div>
      <button onClick={() => onToggleCheck('t1', 'c1')}>toggle</button>
      <button onClick={() => onMove('t1')}>move</button>
    </div>
  )
}));

vi.mock('../../components/AdminStats.tsx', () => ({
  default: () => <div>AdminStats</div>
}));

vi.mock('../../components/TeamBoard.tsx', () => ({
  default: ({ onEdit }: any) => <button onClick={onEdit}>edit team</button>
}));

vi.mock('../../components/NewTaskModal.tsx', () => ({
  default: ({ onSubmit, onClose }: any) => (
    <div>
      <button onClick={() => onSubmit({ title: 'T', responsible: 'Ana', priority: 'Baixa', deadline: '2099-01-01', checklist: [] })}>submit task</button>
      <button onClick={onClose}>close</button>
    </div>
  )
}));

vi.mock('../../components/CompleteTaskModal.tsx', () => ({
  default: ({ onSubmit, onClose }: any) => (
    <div>
      <button onClick={() => onSubmit('done', [])}>complete</button>
      <button onClick={onClose}>close complete</button>
    </div>
  )
}));

vi.mock('../../components/TeamSettingsModal.tsx', () => ({
  default: ({ onSave, onClose }: any) => (
    <div>
      <button onClick={() => onSave([], [], [])}>save team</button>
      <button onClick={onClose}>close team</button>
    </div>
  )
}));

vi.mock('../../components/FeedbackSection.tsx', () => ({
  default: ({ onSend, onReply }: any) => (
    <div>
      <button onClick={() => onSend('solicitacao', 's', 'm', 'ADMIN')}>send feedback</button>
      <button onClick={() => onReply('f1', 'reply')}>reply feedback</button>
    </div>
  )
}));

vi.mock('../../components/ReportsSection.tsx', () => ({
  default: () => <div>Reports</div>
}));

vi.mock('../../components/SuperAdminDashboard.tsx', () => ({
  default: () => <div>SuperAdmin</div>
}));

vi.mock('../../services/PushNotificationService.ts', () => ({
  initializePushNotifications: vi.fn()
}));

import { addDoc, updateDoc, setDoc } from 'firebase/firestore';

import App from '../../App.tsx';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    configured = true;
    tasksSnapshot = [];
    feedbacksSnapshot = [];
    configSnapshot = { teamMembers: [], schedules: [], fixedDemands: [] };
    vi.mocked(addDoc).mockClear();
    vi.mocked(updateDoc).mockClear();
    vi.mocked(setDoc).mockClear();
  });

  it('shows connection error when firebase is not configured', () => {
    configured = false;
    render(<App />);
    expect(screen.getByText('Erro de Conexão')).toBeInTheDocument();
  });

  it('renders login screen when no session exists', () => {
    configured = true;
    render(<App />);
    expect(screen.getByText('AnPort')).toBeInTheDocument();
  });

  it('renders superadmin dashboard for dev role', () => {
    localStorage.setItem('ecomm_session', JSON.stringify({
      username: 'superadmin',
      role: Role.DEV,
      name: 'DEV',
      storeId: 'GLOBAL'
    }));

    render(<App />);

    expect(screen.getByText('SuperAdmin')).toBeInTheDocument();
  });

  it('logs out and returns to login', () => {
    localStorage.setItem('ecomm_session', JSON.stringify({
      username: 'admin',
      role: Role.ADMIN,
      name: 'Admin',
      storeId: 'S1'
    }));

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(screen.getByText('AnPort')).toBeInTheDocument();
  });

  it('clears cache on force refresh', () => {
    localStorage.setItem('ecomm_session', JSON.stringify({
      username: 'admin',
      role: Role.ADMIN,
      name: 'Admin',
      storeId: 'S1'
    }));

    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, reload: vi.fn() },
      configurable: true
    });
    Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true });
    (globalThis as any).caches = {
      keys: vi.fn(async () => ['a']),
      delete: vi.fn(async () => true)
    };

    render(<App />);

    fireEvent.click(screen.getByTitle('Limpar Cache/Atualizar'));

    expect((globalThis as any).caches.keys).toHaveBeenCalled();
    expect(window.location.reload).toHaveBeenCalled();

    Object.defineProperty(window, 'location', { value: originalLocation, configurable: true });
  });

  it('handles admin actions and modals', () => {
    localStorage.setItem('ecomm_session', JSON.stringify({
      username: 'admin',
      role: Role.ADMIN,
      name: 'Admin',
      storeId: 'S1'
    }));

    tasksSnapshot = [
      {
        id: 't1',
        storeId: 'S1',
        title: 'T1',
        responsible: 'Ana',
        priority: Priority.BAIXA,
        deadline: '2099-01-01',
        status: Status.TODO,
        createdAt: 1,
        checklist: [{ id: 'c1', text: 'Checar', completed: false }]
      }
    ];

    feedbacksSnapshot = [
      {
        id: 'f1',
        type: 'solicitacao',
        subject: 's',
        message: 'm',
        sender: 'Ana',
        receiver: 'ADMIN',
        createdAt: Date.now(),
        status: 'pendente'
      }
    ];

    configSnapshot = {
      teamMembers: [{ name: 'Ana', username: 'ana', password: 'x' }],
      schedules: [],
      fixedDemands: []
    };

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /Nova Tarefa/i }));
    fireEvent.click(screen.getByText('submit task'));
    expect(vi.mocked(addDoc)).toHaveBeenCalled();

    fireEvent.click(screen.getByText('toggle'));
    expect(vi.mocked(updateDoc)).toHaveBeenCalled();

    fireEvent.click(screen.getByText('move'));
    expect(vi.mocked(updateDoc)).toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole('button', { name: 'Equipe' })[0]);
    fireEvent.click(screen.getByText('edit team'));
    fireEvent.click(screen.getByText('save team'));
    expect(vi.mocked(setDoc)).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Ouvidoria' }));
    fireEvent.click(screen.getByText('send feedback'));
    fireEvent.click(screen.getByText('reply feedback'));
    expect(vi.mocked(addDoc)).toHaveBeenCalled();
    expect(vi.mocked(updateDoc)).toHaveBeenCalled();
  });

  it('blocks completion when checklist is incomplete', () => {
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});

    localStorage.setItem('ecomm_session', JSON.stringify({
      username: 'admin',
      role: Role.ADMIN,
      name: 'Admin',
      storeId: 'S1'
    }));

    tasksSnapshot = [
      {
        id: 't1',
        storeId: 'S1',
        title: 'T1',
        responsible: 'Ana',
        priority: Priority.BAIXA,
        deadline: '2099-01-01',
        status: Status.DOING,
        createdAt: 1,
        checklist: [{ id: 'c1', text: 'Checar', completed: false }]
      }
    ];

    render(<App />);

    fireEvent.click(screen.getByText('move'));
    expect(alertMock).toHaveBeenCalled();

    alertMock.mockRestore();
  });

  it('completes task when checklist is done', () => {
    localStorage.setItem('ecomm_session', JSON.stringify({
      username: 'admin',
      role: Role.ADMIN,
      name: 'Admin',
      storeId: 'S1'
    }));

    tasksSnapshot = [
      {
        id: 't1',
        storeId: 'S1',
        title: 'T1',
        responsible: 'Ana',
        priority: Priority.BAIXA,
        deadline: '2099-01-01',
        status: Status.DOING,
        createdAt: 1,
        checklist: [{ id: 'c1', text: 'Checar', completed: true }]
      }
    ];

    render(<App />);

    fireEvent.click(screen.getByText('move'));
    fireEvent.click(screen.getByText('complete'));

    expect(vi.mocked(updateDoc)).toHaveBeenCalled();
  });
});
