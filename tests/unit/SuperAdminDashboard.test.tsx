import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SuperAdminDashboard from '../../components/SuperAdminDashboard.tsx';
import { Role } from '../../types.ts';

let snapshotData = { companies: [] as any[], stores: [] as any[] };

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db: any, name: string) => ({ __type: name })),
  query: vi.fn((coll: any) => coll),
  where: vi.fn(),
  onSnapshot: vi.fn((target: any, cb: any) => {
    if (target.__type === 'companies') {
      cb({ docs: snapshotData.companies.map((c) => ({ id: c.id, data: () => c })) });
    }
    if (target.__type === 'stores') {
      cb({ docs: snapshotData.stores.map((s) => ({ id: s.id, data: () => s })) });
    }
    return () => {};
  }),
  doc: vi.fn((_db: any, name: string, id: string) => ({ __type: name, id })),
  setDoc: vi.fn(),
  deleteDoc: vi.fn(),
  updateDoc: vi.fn(),
  getDocs: vi.fn(async () => ({ docs: [] })),
  writeBatch: vi.fn(() => ({ update: vi.fn(), delete: vi.fn(), commit: vi.fn() }))
}));

vi.mock('../../firebase.ts', () => ({ db: {} }));

vi.mock('../../utils.ts', () => ({
  hashPassword: async () => 'hash',
  generateSalt: () => 'salt'
}));

import { getDocs, setDoc, writeBatch } from 'firebase/firestore';

describe('SuperAdminDashboard', () => {
  beforeEach(() => {
    snapshotData = { companies: [], stores: [] };
    vi.mocked(getDocs).mockReset();
    vi.mocked(setDoc).mockReset();
    vi.mocked(writeBatch).mockReset();
  });

  it('validates form fields before saving', () => {
    render(<SuperAdminDashboard mode={Role.DEV} />);

    fireEvent.click(screen.getByRole('button', { name: /\+ Novo/i }));

    fireEvent.change(screen.getByPlaceholderText('ID DA EMPRESA'), { target: { value: 'AA' } });
    fireEvent.change(screen.getByPlaceholderText('NOME DE EXIBIÇÃO'), { target: { value: 'Empresa' } });
    fireEvent.change(screen.getByPlaceholderText('USUÁRIO'), { target: { value: 'UPPER' } });
    fireEvent.change(screen.getByPlaceholderText('SENHA'), { target: { value: '123' } });

    fireEvent.click(screen.getByRole('button', { name: /Salvar na Nuvem/i }));

    expect(screen.getByText(/ID inválido/i)).toBeInTheDocument();
  });

  it('saves store in company mode', async () => {
    render(<SuperAdminDashboard mode={Role.COMPANY} companyId="C1" />);

    fireEvent.click(screen.getByRole('button', { name: /\+ Novo/i }));
    await screen.findByPlaceholderText('ID DA LOJA (EX: LOJA01)');

    fireEvent.change(screen.getByPlaceholderText('ID DA LOJA (EX: LOJA01)'), { target: { value: 'LOJA01' } });
    fireEvent.change(screen.getByPlaceholderText('NOME DE EXIBIÇÃO'), { target: { value: 'Loja A' } });
    fireEvent.change(screen.getByPlaceholderText('USUÁRIO'), { target: { value: 'admin1' } });
    fireEvent.change(screen.getByPlaceholderText('SENHA'), { target: { value: '123456' } });

    fireEvent.click(screen.getByRole('button', { name: /Salvar na Nuvem/i }));

    await waitFor(() => {
      expect(vi.mocked(setDoc)).toHaveBeenCalled();
    });
  });

  it('toggles company status', async () => {
    const batch = { update: vi.fn(), delete: vi.fn(), commit: vi.fn() };
    vi.mocked(writeBatch).mockReturnValue(batch as any);
    vi.mocked(getDocs).mockResolvedValueOnce({ docs: [{ id: 'S1' }] } as any);

    snapshotData = {
      companies: [{ id: 'C1', name: 'Comp', adminUsername: 'adm', isSuspended: false }],
      stores: []
    };

    render(<SuperAdminDashboard mode={Role.DEV} />);

    fireEvent.click(await screen.findByTitle('Inativar corporativa'));
    fireEvent.click(await screen.findByRole('button', { name: /Confirmar Inativação/i }));

    await waitFor(() => {
      expect(batch.update).toHaveBeenCalled();
      expect(batch.commit).toHaveBeenCalled();
    });
  });

  it('filters items by search term', async () => {
    snapshotData = {
      companies: [
        { id: 'C1', name: 'Empresa Alpha', adminUsername: 'adm1', isSuspended: false },
        { id: 'C2', name: 'Beta', adminUsername: 'adm2', isSuspended: false }
      ],
      stores: []
    };

    render(<SuperAdminDashboard mode={Role.DEV} />);

    fireEvent.change(screen.getByPlaceholderText('BUSCAR...'), { target: { value: 'Alpha' } });
    expect(screen.getByText('Empresa Alpha')).toBeInTheDocument();
    expect(screen.queryByText('Beta')).toBeNull();
  });

  it('edits an existing company', async () => {
    snapshotData = {
      companies: [{ id: 'C01', name: 'Empresa', adminUsername: 'adm1', adminPassword: 'hash', passwordSalt: 'salt', createdAt: Date.now(), isSuspended: false }],
      stores: []
    };

    render(<SuperAdminDashboard mode={Role.DEV} />);

    const card = screen.getByText('Empresa').closest('div');
    if (card) {
      const buttons = within(card).getAllByRole('button');
      fireEvent.click(buttons[1]);
    }

    await screen.findByPlaceholderText('NOME DE EXIBIÇÃO');
    fireEvent.change(screen.getByPlaceholderText('NOME DE EXIBIÇÃO'), { target: { value: 'Empresa Nova' } });
    fireEvent.change(screen.getByPlaceholderText('SENHA'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Salvar na Nuvem/i }));

    await waitFor(() => {
      expect(vi.mocked(setDoc)).toHaveBeenCalled();
    });
  });
});
