import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { SupportTicket } from '../types';
import TicketCard from './TicketCard';

interface MyTicketsProps {
  userId: string;
  companyId: string;
}

const MyTickets: React.FC<MyTicketsProps> = ({ userId, companyId }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('todos');

  useEffect(() => {
    if (!companyId) return;

    // Query tickets criados por este usuário
    const q = query(
      collection(db, 'support_tickets'),
      where('createdBy', '==', userId),
      where('companyId', '==', companyId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as SupportTicket[];
      setTickets(ticketsData.sort((a, b) => b.createdAt - a.createdAt));
    });

    return () => unsubscribe();
  }, [userId, companyId]);

  const filteredTickets = filterStatus === 'todos' 
    ? tickets 
    : tickets.filter(t => t.status === filterStatus);

  const stats = {
    total: tickets.length,
    aberto: tickets.filter(t => t.status === 'aberto').length,
    em_progresso: tickets.filter(t => t.status === 'em_progresso').length,
    resolvido: tickets.filter(t => t.status === 'resolvido').length,
    fechado: tickets.filter(t => t.status === 'fechado').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberto':
        return 'text-yellow-400';
      case 'em_progresso':
        return 'text-blue-400';
      case 'resolvido':
        return 'text-green-400';
      case 'fechado':
        return 'text-slate-500';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4">
          <p className="text-slate-500 text-[9px] font-bold uppercase mb-1">TOTAL</p>
          <p className="text-2xl font-black text-white">{stats.total}</p>
        </div>
        <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-2xl p-4">
          <p className="text-yellow-400/80 text-[9px] font-bold uppercase mb-1">ABERTO</p>
          <p className="text-2xl font-black text-yellow-400">{stats.aberto}</p>
        </div>
        <div className="bg-blue-900/20 border border-blue-700/30 rounded-2xl p-4">
          <p className="text-blue-400/80 text-[9px] font-bold uppercase mb-1">PROGRESSO</p>
          <p className="text-2xl font-black text-blue-400">{stats.em_progresso}</p>
        </div>
        <div className="bg-green-900/20 border border-green-700/30 rounded-2xl p-4">
          <p className="text-green-400/80 text-[9px] font-bold uppercase mb-1">RESOLVIDO</p>
          <p className="text-2xl font-black text-green-400">{stats.resolvido}</p>
        </div>
        <div className="bg-slate-700/20 border border-slate-600/30 rounded-2xl p-4">
          <p className="text-slate-400 text-[9px] font-bold uppercase mb-1">FECHADO</p>
          <p className="text-2xl font-black text-slate-400">{stats.fechado}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full md:w-64 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-slate-100 text-[10px] font-bold uppercase focus:outline-none focus:border-blue-500"
        >
          <option value="todos">TODOS OS STATUS</option>
          <option value="aberto">ABERTO</option>
          <option value="em_progresso">EM PROGRESSO</option>
          <option value="resolvido">RESOLVIDO</option>
          <option value="fechado">FECHADO</option>
        </select>
      </div>

      {/* Tickets */}
      {filteredTickets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTickets.map(ticket => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onEdit={() => {
                // Apenas visualização para usuários que criaram
              }}
              onStatusChange={async () => {
                // Usuários não podem mudar status
              }}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800 border-dashed">
          <svg className="w-16 h-16 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-slate-400 font-bold text-sm">
            {filterStatus === 'todos' 
              ? 'Você ainda não enviou nenhum ticket'
              : `Nenhum ticket ${filterStatus}`}
          </p>
          <p className="text-slate-500 text-xs mt-2">Qualquer dúvida ou bug? Crie um novo ticket acima</p>
        </div>
      )}
    </div>
  );
};

export default MyTickets;
