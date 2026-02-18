import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from '../../components/Login.tsx';
import { Role } from '../../types.ts';

let configured = true;

vi.mock('../../firebase.ts', () => ({
  db: {},
  get isFirebaseConfigured() {
    return configured;
  }
}));

vi.mock('../../utils.ts', () => ({
  hashPassword: vi.fn(async () => 'hashed')
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  doc: vi.fn(),
  getDoc: vi.fn()
}));

import { getDocs, getDoc } from 'firebase/firestore';

describe('Login', () => {
  beforeEach(() => {
    configured = true;
    vi.mocked(getDocs).mockReset();
    vi.mocked(getDoc).mockReset();
  });

  it('logs in as superadmin', async () => {
    const onLogin = vi.fn();

    render(<Login onLogin={onLogin} />);

    fireEvent.change(screen.getByPlaceholderText('USUÁRIO'), { target: { value: 'superadmin' } });
    fireEvent.change(screen.getByPlaceholderText('SENHA'), { target: { value: 'master123' } });
    fireEvent.click(screen.getByRole('button', { name: /Acessar Terminal/i }));

    await waitFor(() => expect(onLogin).toHaveBeenCalled());
  });

  it('logs in as company admin', async () => {
    const onLogin = vi.fn();

    vi.mocked(getDoc)
      // companies/C1
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ id: 'C1', name: 'Comp', isSuspended: false }) } as any)
      // company_members/C1__adm
      .mockResolvedValueOnce({ exists: () => true, id: 'C1__adm', data: () => ({ companyId: 'C1', username: 'adm', name: 'Comp', role: Role.COMPANY, password: 'hashed', passwordSalt: 'salt', isActive: true }) } as any);

    render(<Login onLogin={onLogin} />);

    fireEvent.change(screen.getByPlaceholderText('EMPRESA (EX: ACME01)'), { target: { value: 'C1' } });
    fireEvent.change(screen.getByPlaceholderText('USUÁRIO'), { target: { value: 'adm' } });
    fireEvent.change(screen.getByPlaceholderText('SENHA'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /Acessar Terminal/i }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(expect.objectContaining({ role: Role.COMPANY })));
  });

  it('blocks store admin when store is blocked', async () => {
    const onLogin = vi.fn();

    vi.mocked(getDoc)
      // companies/C1
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ id: 'C1', name: 'Comp', isSuspended: false }) } as any)
      // company_members/C1__store
      .mockResolvedValueOnce({ exists: () => true, id: 'C1__store', data: () => ({ companyId: 'C1', username: 'store', name: 'Gerente', role: Role.MANAGER, storeId: 'S1', password: 'hashed', passwordSalt: 'salt', isActive: true }) } as any)
      // stores/S1
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ companyId: 'C1', isBlocked: true }) } as any);

    render(<Login onLogin={onLogin} />);

    fireEvent.change(screen.getByPlaceholderText('EMPRESA (EX: ACME01)'), { target: { value: 'C1' } });
    fireEvent.change(screen.getByPlaceholderText('USUÁRIO'), { target: { value: 'store' } });
    fireEvent.change(screen.getByPlaceholderText('SENHA'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /Acessar Terminal/i }));

    expect(await screen.findByText('Unidade bloqueada.')).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('logs in collaborator by username', async () => {
    const onLogin = vi.fn();

    vi.mocked(getDoc)
      // companies/C1
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ id: 'C1', name: 'Comp', isSuspended: false }) } as any)
      // company_members/C1__col
      .mockResolvedValueOnce({ exists: () => true, id: 'C1__col', data: () => ({ companyId: 'C1', username: 'col', name: 'Colab', role: Role.USER, storeId: 'S1', password: 'hashed', passwordSalt: 'salt', isActive: true }) } as any)
      // stores/S1
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ companyId: 'C1', isBlocked: false }) } as any);

    render(<Login onLogin={onLogin} />);

    fireEvent.change(screen.getByPlaceholderText('EMPRESA (EX: ACME01)'), { target: { value: 'C1' } });
    fireEvent.change(screen.getByPlaceholderText('USUÁRIO'), { target: { value: 'col' } });
    fireEvent.change(screen.getByPlaceholderText('SENHA'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /Acessar Terminal/i }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(expect.objectContaining({ role: Role.USER })));
  });

  it('blocks company admin when suspended', async () => {
    const onLogin = vi.fn();

    vi.mocked(getDoc)
      // companies/C1
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ id: 'C1', name: 'Comp', isSuspended: true }) } as any);

    render(<Login onLogin={onLogin} />);

    fireEvent.change(screen.getByPlaceholderText('EMPRESA (EX: ACME01)'), { target: { value: 'C1' } });
    fireEvent.change(screen.getByPlaceholderText('USUÁRIO'), { target: { value: 'adm' } });
    fireEvent.change(screen.getByPlaceholderText('SENHA'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /Acessar Terminal/i }));

    expect(await screen.findByText('Acesso suspenso por pendências financeiras.')).toBeInTheDocument();
    expect(onLogin).not.toHaveBeenCalled();
  });

  it('logs in store admin', async () => {
    const onLogin = vi.fn();

    vi.mocked(getDoc)
      // companies/C1
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ id: 'C1', name: 'Comp', isSuspended: false }) } as any)
      // company_members/C1__store
      .mockResolvedValueOnce({ exists: () => true, id: 'C1__store', data: () => ({ companyId: 'C1', username: 'store', name: 'Gerente', role: Role.MANAGER, storeId: 'S1', password: 'hashed', passwordSalt: 'salt', isActive: true }) } as any)
      // stores/S1
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ companyId: 'C1', isBlocked: false }) } as any);

    render(<Login onLogin={onLogin} />);

    fireEvent.change(screen.getByPlaceholderText('EMPRESA (EX: ACME01)'), { target: { value: 'C1' } });
    fireEvent.change(screen.getByPlaceholderText('USUÁRIO'), { target: { value: 'store' } });
    fireEvent.change(screen.getByPlaceholderText('SENHA'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /Acessar Terminal/i }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(expect.objectContaining({ role: Role.MANAGER })));
  });

  it('shows error when store is not found for collaborator', async () => {
    const onLogin = vi.fn();

    vi.mocked(getDoc)
      // companies/C1
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ id: 'C1', name: 'Comp', isSuspended: false }) } as any)
      // company_members/C1__col
      .mockResolvedValueOnce({ exists: () => true, id: 'C1__col', data: () => ({ companyId: 'C1', username: 'col', name: 'Colab', role: Role.USER, storeId: 'S1', password: 'hashed', passwordSalt: 'salt', isActive: true }) } as any)
      // stores/S1
      .mockResolvedValueOnce({ exists: () => false } as any);

    render(<Login onLogin={onLogin} />);

    fireEvent.change(screen.getByPlaceholderText('EMPRESA (EX: ACME01)'), { target: { value: 'C1' } });
    fireEvent.change(screen.getByPlaceholderText('USUÁRIO'), { target: { value: 'col' } });
    fireEvent.change(screen.getByPlaceholderText('SENHA'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /Acessar Terminal/i }));

    expect(await screen.findByText('Unidade não encontrada.')).toBeInTheDocument();
  });

  it('shows connection error when firestore fails', async () => {
    const onLogin = vi.fn();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      vi.mocked(getDoc).mockRejectedValueOnce(new Error('fail'));

      render(<Login onLogin={onLogin} />);

      fireEvent.change(screen.getByPlaceholderText('EMPRESA (EX: ACME01)'), { target: { value: 'C1' } });
      fireEvent.change(screen.getByPlaceholderText('USUÁRIO'), { target: { value: 'x' } });
      fireEvent.change(screen.getByPlaceholderText('SENHA'), { target: { value: 'y' } });
      fireEvent.click(screen.getByRole('button', { name: /Acessar Terminal/i }));

      expect(await screen.findByText('Erro de conexão com o banco de dados.')).toBeInTheDocument();
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });

  it('shows invalid credentials message', async () => {
    const onLogin = vi.fn();

    vi.mocked(getDoc)
      // companies/C1
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ id: 'C1', name: 'Comp', isSuspended: false }) } as any)
      // company_members/C1__x (não encontrado)
      .mockResolvedValueOnce({ exists: () => false } as any)
      // legacy companies/C1 fallback
      .mockResolvedValueOnce({ exists: () => true, data: () => ({ id: 'C1', name: 'Comp', adminUsername: 'adm', adminPassword: 'hashed', passwordSalt: 'salt', isSuspended: false }) } as any);

    vi.mocked(getDocs).mockResolvedValue({ empty: true, docs: [] } as any);

    render(<Login onLogin={onLogin} />);

    fireEvent.change(screen.getByPlaceholderText('EMPRESA (EX: ACME01)'), { target: { value: 'C1' } });
    fireEvent.change(screen.getByPlaceholderText('USUÁRIO'), { target: { value: 'x' } });
    fireEvent.change(screen.getByPlaceholderText('SENHA'), { target: { value: 'y' } });
    fireEvent.click(screen.getByRole('button', { name: /Acessar Terminal/i }));

    expect(await screen.findByText('Credenciais inválidas.')).toBeInTheDocument();
  });

  it('does nothing when firebase is not configured', () => {
    configured = false;
    const onLogin = vi.fn();

    render(<Login onLogin={onLogin} />);

    fireEvent.change(screen.getByPlaceholderText('USUÁRIO'), { target: { value: 'superadmin' } });
    fireEvent.change(screen.getByPlaceholderText('SENHA'), { target: { value: 'master123' } });
    fireEvent.click(screen.getByRole('button', { name: /Acessar Terminal/i }));

    expect(onLogin).not.toHaveBeenCalled();
  });
});
