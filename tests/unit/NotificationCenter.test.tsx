import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import NotificationCenter from '../../components/NotificationCenter.tsx';
import { AppNotification } from '../../types.ts';

describe('NotificationCenter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders empty state', () => {
    render(
      <NotificationCenter
        notifications={[]}
        onClose={() => {}}
        onMarkRead={() => {}}
        onClear={() => {}}
      />
    );

    expect(screen.getByText(/Tudo em dia/i)).toBeInTheDocument();
  });

  it('marks notifications as read after timeout', () => {
    const onMarkRead = vi.fn();
    const notifications: AppNotification[] = [
      { id: 'n1', type: 'task', title: 'Nova tarefa', message: 'Teste', createdAt: Date.now(), read: false }
    ];

    render(
      <NotificationCenter
        notifications={notifications}
        onClose={() => {}}
        onMarkRead={onMarkRead}
        onClear={() => {}}
      />
    );

    vi.advanceTimersByTime(1500);
    expect(onMarkRead).toHaveBeenCalled();
  });

  it('closes when clicking outside', () => {
    const onClose = vi.fn();
    const notifications: AppNotification[] = [
      { id: 'n1', type: 'schedule', title: 'Agenda', message: 'Teste', createdAt: Date.now(), read: true }
    ];

    render(
      <NotificationCenter
        notifications={notifications}
        onClose={onClose}
        onMarkRead={() => {}}
        onClear={() => {}}
      />
    );

    document.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders time ago variants', () => {
    const now = Date.now();
    const notifications: AppNotification[] = [
      { id: 'n1', type: 'task', title: 'Agora', message: 'm1', createdAt: now, read: false },
      { id: 'n2', type: 'task', title: 'Minutos', message: 'm2', createdAt: now - 5 * 60 * 1000, read: false },
      { id: 'n3', type: 'task', title: 'Horas', message: 'm3', createdAt: now - 2 * 60 * 60 * 1000, read: false },
      { id: 'n4', type: 'demand', title: 'Dias', message: 'm4', createdAt: now - 3 * 24 * 60 * 60 * 1000, read: false }
    ];

    render(
      <NotificationCenter
        notifications={notifications}
        onClose={() => {}}
        onMarkRead={() => {}}
        onClear={() => {}}
      />
    );

    expect(document.body.textContent).toContain('Agora');
    expect(document.body.textContent).toContain('5m atrás');
    expect(document.body.textContent).toContain('2h atrás');
  });
});
