import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FeedbackSection from '../../components/FeedbackSection.tsx';
import { Feedback, Role, User } from '../../types.ts';

describe('FeedbackSection', () => {
  it('allows user to send a solicitation', () => {
    const onSend = vi.fn();
    const onReply = vi.fn();

    const user: User = { username: 'ana', role: Role.USER, name: 'Ana', storeId: 'S1' };
    const feedbacks: Feedback[] = [];

    render(
      <FeedbackSection
        feedbacks={feedbacks}
        user={user}
        teamMembers={['Ana']}
        onSend={onSend}
        onReply={onReply}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Nova Solicitação/i }));
    fireEvent.change(screen.getByPlaceholderText('Assunto...'), { target: { value: 'Ajuda' } });
    fireEvent.change(screen.getByPlaceholderText('Mensagem privada para o gestor...'), { target: { value: 'Preciso de suporte' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar Mensagem/i }));

    expect(onSend).toHaveBeenCalled();
  });

  it('allows admin to send a comunicado and reply', () => {
    const onSend = vi.fn();
    const onReply = vi.fn();

    const user: User = { username: 'adm', role: Role.ADMIN, name: 'Admin', storeId: 'S1' };
    const feedbacks: Feedback[] = [
      {
        id: 'f1',
        type: 'solicitacao',
        subject: 'Pedido',
        message: 'Detalhe',
        sender: 'Ana',
        receiver: 'ADMIN',
        createdAt: Date.now(),
        status: 'pendente'
      }
    ];

    render(
      <FeedbackSection
        feedbacks={feedbacks}
        user={user}
        teamMembers={['Ana']}
        onSend={onSend}
        onReply={onReply}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Novo Comunicado/i }));
    fireEvent.change(screen.getByPlaceholderText('Título do Comunicado...'), { target: { value: 'Aviso' } });
    fireEvent.change(screen.getByPlaceholderText('Conteúdo do aviso...'), { target: { value: 'Mensagem' } });
    fireEvent.click(screen.getByRole('button', { name: /Publicar Aviso/i }));

    expect(onSend).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Responder/i }));
    fireEvent.change(screen.getByPlaceholderText('Sua resposta...'), { target: { value: 'Resposta' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar Resposta/i }));

    expect(onReply).toHaveBeenCalledWith('f1', 'Resposta');
  });
});
