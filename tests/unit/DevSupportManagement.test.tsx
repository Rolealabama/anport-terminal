import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DevSupportManagement from '../../components/DevSupportManagement.tsx';

const {
  onSnapshotMock,
  collectionMock,
  setDocMock,
  deleteDocMock,
  docMock,
  hashPasswordMock,
  generateSaltMock
} = vi.hoisted(() => ({
  onSnapshotMock: vi.fn(),
  collectionMock: vi.fn(),
  setDocMock: vi.fn(),
  deleteDocMock: vi.fn(),
  docMock: vi.fn(),
  hashPasswordMock: vi.fn(),
  generateSaltMock: vi.fn()
}));

let snapshotUsers: any[] = [];

vi.mock('../../firebase.ts', () => ({
  db: { mockedDb: true }
}));

vi.mock('../../utils.ts', () => ({
  hashPassword: hashPasswordMock,
  generateSalt: generateSaltMock
}));

vi.mock('firebase/firestore', () => ({
  collection: collectionMock,
  onSnapshot: onSnapshotMock,
  doc: docMock,
  setDoc: setDocMock,
  deleteDoc: deleteDocMock
}));

vi.mock('../../components/ConfirmationModal.tsx', () => ({
  default: ({ title, message, onConfirm, onCancel }: any) => (
    <div data-testid="confirm-modal">
      <p>{title}</p>
      <p>{message}</p>
      <button onClick={onConfirm}>CONFIRMAR</button>
      <button onClick={onCancel}>CANCELAR</button>
    </div>
  )
}));

describe('DevSupportManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();

    snapshotUsers = [];
    collectionMock.mockImplementation((_db, name) => ({ kind: 'collection', name }));
    docMock.mockImplementation((_db, name, id) => ({ kind: 'doc', name, id }));
    hashPasswordMock.mockResolvedValue('hashed-password');
    generateSaltMock.mockReturnValue('salt-123');

    onSnapshotMock.mockImplementation((_query, callback) => {
      callback({
        docs: snapshotUsers.map((user) => ({
          id: user.username,
          data: () => user
        }))
      });
      return vi.fn();
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders empty state and opens form', () => {
    render(<DevSupportManagement devId="dev-1" />);

    expect(screen.getByText(/Nenhum agente de suporte criado/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /NOVO AGENTE/i }));
    expect(screen.getByPlaceholderText(/NOME COMPLETO/i)).toBeInTheDocument();
  });

  it('filters users by search term', () => {
    snapshotUsers = [
      { username: 'ana_suporte', name: 'Ana', isActive: true },
      { username: 'bruno_help', name: 'Bruno', isActive: true }
    ];

    render(<DevSupportManagement devId="dev-1" />);

    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Bruno')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/BUSCAR/i), {
      target: { value: 'bruno' }
    });

    expect(screen.queryByText('Ana')).toBeNull();
    expect(screen.getByText('Bruno')).toBeInTheDocument();
  });

  it('shows validation errors for invalid form data', async () => {
    render(<DevSupportManagement devId="dev-1" />);

    fireEvent.click(screen.getByRole('button', { name: /NOVO AGENTE/i }));

    fireEvent.change(screen.getByPlaceholderText(/NOME COMPLETO/i), {
      target: { value: 'A' }
    });
    fireEvent.change(screen.getByPlaceholderText(/USUÁRIO/i), {
      target: { value: 'INV@LIDO' }
    });
    fireEvent.change(screen.getByPlaceholderText(/^SENHA$/i), {
      target: { value: '123' }
    });

    fireEvent.click(screen.getByRole('button', { name: /Salvar Agente/i }));

    await waitFor(() => {
      expect(screen.getByText(/Nome mínimo 2 caracteres/i)).toBeInTheDocument();
    });
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it('creates a support agent and hashes password', async () => {
    setDocMock.mockResolvedValue(undefined);

    render(<DevSupportManagement devId="dev-1" />);

    fireEvent.click(screen.getByRole('button', { name: /NOVO AGENTE/i }));

    fireEvent.change(screen.getByPlaceholderText(/NOME COMPLETO/i), {
      target: { value: 'Joao Silva' }
    });
    fireEvent.change(screen.getByPlaceholderText(/USUÁRIO/i), {
      target: { value: 'joao_silva' }
    });
    fireEvent.change(screen.getByPlaceholderText(/^SENHA$/i), {
      target: { value: '123456' }
    });

    fireEvent.click(screen.getByRole('button', { name: /Salvar Agente/i }));

    await waitFor(() => {
      expect(hashPasswordMock).toHaveBeenCalledWith('123456', 'salt-123');
      expect(setDocMock).toHaveBeenCalled();
    });

    const payload = setDocMock.mock.calls[0][1];
    expect(payload.username).toBe('joao_silva');
    expect(payload.password).toBe('hashed-password');
    expect(payload.createdBy).toBe('dev-1');
    expect(payload.role).toBe('support');

    await waitFor(() => {
      expect(screen.getByText(/criado com sucesso/i)).toBeInTheDocument();
    });
  });

  it('edits an existing user and reuses pre-hashed password when long enough', async () => {
    snapshotUsers = [
      {
        username: 'ana_support',
        name: 'Ana Support',
        password: 'abcdefghijklmnopqrstuvwxyz123456',
        passwordSalt: 'salt-existing',
        isActive: true
      }
    ];

    setDocMock.mockResolvedValue(undefined);

    render(<DevSupportManagement devId="dev-1" />);

    fireEvent.click(screen.getByRole('button', { name: /EDITAR/i }));
    fireEvent.change(screen.getByPlaceholderText(/NOME COMPLETO/i), {
      target: { value: 'Ana Atualizada' }
    });

    fireEvent.click(screen.getByRole('button', { name: /Salvar Agente/i }));

    await waitFor(() => {
      expect(setDocMock).toHaveBeenCalled();
    });

    expect(hashPasswordMock).not.toHaveBeenCalled();
    const payload = setDocMock.mock.calls[0][1];
    expect(payload.name).toBe('Ana Atualizada');
    expect(payload.password).toBe('abcdefghijklmnopqrstuvwxyz123456');
  });

  it('handles save and delete errors', async () => {
    snapshotUsers = [{ username: 'ana_support', name: 'Ana Support', isActive: true }];
    setDocMock.mockRejectedValue(new Error('save-failed'));
    deleteDocMock.mockRejectedValue(new Error('delete-failed'));

    render(<DevSupportManagement devId="dev-1" />);

    fireEvent.click(screen.getByRole('button', { name: /NOVO AGENTE/i }));
    fireEvent.change(screen.getByPlaceholderText(/NOME COMPLETO/i), {
      target: { value: 'Joao Silva' }
    });
    fireEvent.change(screen.getByPlaceholderText(/USUÁRIO/i), {
      target: { value: 'joao_silva' }
    });
    fireEvent.change(screen.getByPlaceholderText(/^SENHA$/i), {
      target: { value: '123456' }
    });

    fireEvent.click(screen.getByRole('button', { name: /Salvar Agente/i }));

    await waitFor(() => {
      expect(screen.getByText(/Erro ao salvar no Firestore/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /DELETAR/i }));
    fireEvent.click(screen.getByRole('button', { name: 'CONFIRMAR' }));

    await waitFor(() => {
      expect(screen.getByText(/Erro ao deletar/i)).toBeInTheDocument();
    });
  });

  it('deletes selected user on confirmation', async () => {
    snapshotUsers = [{ username: 'ana_support', name: 'Ana Support', isActive: true }];
    deleteDocMock.mockResolvedValue(undefined);

    render(<DevSupportManagement devId="dev-1" />);

    fireEvent.click(screen.getByRole('button', { name: /DELETAR/i }));

    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'CONFIRMAR' }));

    await waitFor(() => {
      expect(deleteDocMock).toHaveBeenCalled();
    });
  });
});
