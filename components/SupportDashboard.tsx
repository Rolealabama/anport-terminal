import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { SupportTicket, Priority, Role } from '../types';
import TicketCard from './TicketCard.tsx';
import SupportTicketModal from './SupportTicketModal.tsx';

interface SupportDashboardProps {
  userId: string;
  userRole: Role;
  companyId?: string;
  storeId?: string;
  userName: string;
}

export const SupportDashboard: React.FC<SupportDashboardProps> = ({
  userId,
  userRole,
  companyId,
  storeId,
  userName
}) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('aberto');
  const [filterPriority, setFilterPriority] = useState<Priority | 'todos' | 'não_iniciado'>('todos');
  const [searchText, setSearchText] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // Loads tickets based on user role
  useEffect(() => {
    let q;
    
    if (userRole === Role.SUPPORT) {
      // Support agents (global) see ALL tickets from the system
      q = query(collection(db, 'support_tickets'));
    } else {
      // Company admins see only their company's tickets
      if (!companyId) return;
      q = query(
        collection(db, 'support_tickets'),
        where('companyId', '==', companyId)
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as SupportTicket[];
      setTickets(ticketsData);
    });

    return () => unsubscribe();
  }, [companyId, userRole]);

  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    const statusMatch = filterStatus === 'todos' || ticket.status === filterStatus;
    const priorityMatch = filterPriority === 'todos' || ticket.priority === filterPriority;
    
    const searchLower = searchText.toLowerCase().trim().replace('#', '');
    const ticketNum = ticket.ticketNumber?.toString() || '';
    const ticketId = ticket.id?.substring(0, 8).toUpperCase() || '';
    
    const searchMatch = searchText === '' || 
      ticket.title.toLowerCase().includes(searchText.toLowerCase()) ||
      ticket.description.toLowerCase().includes(searchText.toLowerCase()) ||
      (ticket.companyId && ticket.companyId.toLowerCase().includes(searchText.toLowerCase())) ||
      ticketNum.includes(searchLower) ||
      ticketId.includes(searchLower);
    
    return statusMatch && priorityMatch && searchMatch;
  });

  // Group tickets by status
  const groupedTickets = {
    aberto: filteredTickets.filter(t => t.status === 'aberto'),
    em_progresso: filteredTickets.filter(t => t.status === 'em_progresso'),
    resolvido: filteredTickets.filter(t => t.status === 'resolvido'),
    fechado: filteredTickets.filter(t => t.status === 'fechado')
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

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      aberto: 'Aberto',
      em_progresso: 'Em Progresso',
      resolvido: 'Resolvido',
      fechado: 'Fechado'
    };
    return labels[status] || status;
  };

  const openTicketStats = {
    total: filteredTickets.length,
    aberto: groupedTickets.aberto.length,
    em_progresso: groupedTickets.em_progresso.length,
    resolvido: groupedTickets.resolvido.length,
    fechado: groupedTickets.fechado.length,
    urgentes: filteredTickets.filter(t => t.priority === Priority.URGENTE).length
  };

  const getTicketNumber = (ticket: SupportTicket): string => {
    if (ticket.ticketNumber) {
      return `#${ticket.ticketNumber.toString().padStart(5, '0')}`;
    }
    return `#${ticket.id?.substring(0, 8).toUpperCase()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4">
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 md:p-6">
          <p className="text-slate-500 text-[9px] md:text-[10px] font-bold uppercase mb-2">TOTAL</p>
          <p className="text-2xl md:text-3xl font-black text-white">{openTicketStats.total}</p>
        </div>
        <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-2xl p-4 md:p-6">
          <p className="text-yellow-400/80 text-[9px] md:text-[10px] font-bold uppercase mb-2">ABERTO</p>
          <p className="text-2xl md:text-3xl font-black text-yellow-400">{openTicketStats.aberto}</p>
        </div>
        <div className="bg-blue-900/20 border border-blue-700/30 rounded-2xl p-4 md:p-6">
          <p className="text-blue-400/80 text-[9px] md:text-[10px] font-bold uppercase mb-2">EM PROGRESSO</p>
          <p className="text-2xl md:text-3xl font-black text-blue-400">{openTicketStats.em_progresso}</p>
        </div>
        <div className="bg-green-900/20 border border-green-700/30 rounded-2xl p-4 md:p-6">
          <p className="text-green-400/80 text-[9px] md:text-[10px] font-bold uppercase mb-2">RESOLVIDO</p>
          <p className="text-2xl md:text-3xl font-black text-green-400">{openTicketStats.resolvido}</p>
        </div>
        <div className="bg-slate-700/20 border border-slate-600/30 rounded-2xl p-4 md:p-6">
          <p className="text-slate-400 text-[9px] md:text-[10px] font-bold uppercase mb-2">FECHADO</p>
          <p className="text-2xl md:text-3xl font-black text-slate-400">{openTicketStats.fechado}</p>
        </div>
        <div className="bg-red-900/20 border border-red-700/30 rounded-2xl p-4 md:p-6">
          <p className="text-red-400/80 text-[9px] md:text-[10px] font-bold uppercase mb-2">URGENTES</p>
          <p className="text-2xl md:text-3xl font-black text-red-400">{openTicketStats.urgentes}</p>
        </div>
      </div>

      {/* Filters, Search and Create Button */}
      <div className="space-y-4 bg-slate-900/50 p-4 md:p-6 rounded-3xl border border-slate-800">
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="🔍 Buscar por título, descrição ou empresa..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 pl-10 text-slate-100 placeholder-slate-500 text-[10px] font-bold uppercase focus:outline-none focus:border-blue-500 transition-all"
          />
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-slate-100 text-[10px] font-bold uppercase focus:outline-none focus:border-blue-500"
            >
              <option value="todos">TODOS OS STATUS</option>
              <option value="aberto">ABERTO</option>
              <option value="em_progresso">EM PROGRESSO</option>
              <option value="resolvido">RESOLVIDO</option>
              <option value="fechado">FECHADO</option>
            </select>
            <select 
              value={filterPriority} 
              onChange={(e) => setFilterPriority(e.target.value as Priority | 'todos' | 'não_iniciado')}
              className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-slate-100 text-[10px] font-bold uppercase focus:outline-none focus:border-blue-500"
            >
              <option value="todos">TODAS PRIORIDADES</option>
              <option value="Urgente">URGENTE</option>
              <option value="Alta">ALTA</option>
              <option value="Média">MÉDIA</option>
              <option value="Baixa">BAIXA</option>
            </select>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button 
              onClick={() => {
                setSelectedTicket(null);
                setIsModalOpen(true);
              }}
              className="flex-1 md:flex-none bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-xl hover:bg-blue-700 transition-all active:scale-95"
            >
              + NOVO TICKET
            </button>
          </div>
        </div>
      </div>

      {/* Tickets Grid */}
      <div className="space-y-6">
        {Object.entries(groupedTickets).map(([status, statusTickets]) => (
          statusTickets.length > 0 && (
            <div key={status} className="space-y-3">
              <h3 className={`text-[10px] font-black uppercase tracking-widest ${getStatusColor(status)}`}>
                {getStatusLabel(status)} ({statusTickets.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {statusTickets.map(ticket => {
                  const ticketNum = getTicketNumber(ticket);
                  return (
                    <div key={ticket.id} className="relative">
                      <div className="absolute -top-2 -left-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full px-3 py-1 flex items-center justify-center text-white text-[9px] font-black shadow-lg border-2 border-slate-900 z-10 whitespace-nowrap">
                        {ticketNum}
                      </div>
                      <TicketCard 
                        ticket={ticket}
                        viewerRole={userRole}
                        onEdit={() => {
                          setSelectedTicket(ticket);
                          setIsModalOpen(true);
                        }}
                        onStatusChange={async (newStatus) => {
                          await updateDoc(doc(db, 'support_tickets', ticket.id), {
                            status: newStatus,
                            resolvedAt: newStatus === 'resolvido' ? serverTimestamp() : undefined
                          });
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ))}

        {filteredTickets.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 bg-slate-900/30 rounded-2xl border border-slate-800 border-dashed">
            <svg className="w-16 h-16 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-slate-500 font-bold text-sm">Nenhum ticket encontrado</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <SupportTicketModal
          ticket={selectedTicket}
          companyId={companyId || ''}
          storeId={storeId}
          createdBy={userId}
          createdByRole={userRole}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTicket(null);
          }}
          onSubmit={async (ticketData) => {
            if (selectedTicket) {
              await updateDoc(doc(db, 'support_tickets', selectedTicket.id), ticketData);
            } else {
              const ticketNumber = Math.floor(Date.now() / 1000) % 100000;
              await addDoc(collection(db, 'support_tickets'), {
                ...ticketData,
                ticketNumber,
                createdAt: serverTimestamp(),
                createdBy: userId,
                createdByRole: userRole,
                companyId: companyId || 'ANPORT',
                status: 'aberto'
              });
            }
            setIsModalOpen(false);
            setSelectedTicket(null);
          }}
        />
      )}
    </div>
  );
};

export default SupportDashboard;
