import React, { useState } from 'react';
import { SupportTicket, Priority, Role } from '../types';

interface TicketCardProps {
  ticket: SupportTicket;
  onEdit: () => void;
  onStatusChange: (newStatus: string) => Promise<void>;
  viewerRole?: Role;
}

const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  onEdit,
  onStatusChange,
  viewerRole
}) => {
  const [loading, setLoading] = useState(false);

  const getPriorityIcon = (priority: Priority) => {
    switch (priority) {
      case Priority.URGENTE:
        return '🔴';
      case Priority.ALTA:
        return '🟠';
      case Priority.MEDIA:
        return '🔵';
      default:
        return '🟢';
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.URGENTE:
        return 'border-red-700/50 bg-red-900/10';
      case Priority.ALTA:
        return 'border-orange-700/50 bg-orange-900/10';
      case Priority.MEDIA:
        return 'border-blue-700/50 bg-blue-900/10';
      default:
        return 'border-slate-700/50 bg-slate-800/10';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'aberto':
        return '📭';
      case 'em_progresso':
        return '⏳';
      case 'resolvido':
        return '✅';
      case 'fechado':
        return '🔒';
      default:
        return '📋';
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

  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true);
    try {
      await onStatusChange(newStatus);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`border rounded-2xl p-4 space-y-3 transition-all hover:border-slate-600 ${getPriorityColor(ticket.priority)}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h3 className="font-black text-white text-sm leading-tight mb-1">
            {ticket.title}
          </h3>
          <p className="text-[10px] text-slate-400">
            {ticket.category.toUpperCase()}
          </p>
        </div>
        <span className="text-xl">{getPriorityIcon(ticket.priority)}</span>
      </div>

      {/* Description Preview */}
      <p className="text-xs text-slate-300 line-clamp-2">
        {ticket.description}
      </p>

      {/* Meta Info */}
      <div className="space-y-1.5 py-2 border-t border-slate-800">
        <div className="flex items-center justify-between text-[9px]">
          <span className="text-slate-500">CRIADO:</span>
          <span className="text-slate-300 font-mono">
            {formatDate(ticket.createdAt)}
          </span>
        </div>
        {ticket.assignedTo && (
          <div className="flex items-center justify-between text-[9px]">
            <span className="text-slate-500">ATRIBUÍDO À:</span>
            <span className="text-slate-300 font-bold">{ticket.assignedTo}</span>
          </div>
        )}
        {ticket.resolvedAt && (
          <div className="flex items-center justify-between text-[9px]">
            <span className="text-slate-500">RESOLVIDO:</span>
            <span className="text-green-400 font-mono">
              {formatDate(ticket.resolvedAt)}
            </span>
          </div>
        )}
      </div>

      {/* Status Section */}
      <div className="border-t border-slate-800 pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-slate-500 font-bold uppercase">STATUS</span>
          <span className="text-lg">{getStatusIcon(ticket.status)}</span>
        </div>
        <select
          value={ticket.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={loading}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-[10px] font-bold uppercase focus:outline-none focus:border-blue-500 disabled:opacity-50 cursor-pointer"
        >
          <option value="aberto">ABERTO</option>
          <option value="em_progresso">EM PROGRESSO</option>
          <option value="resolvido">RESOLVIDO</option>
          <option value="fechado">FECHADO</option>
        </select>
      </div>

      {/* Resolution */}
      {ticket.resolution && (
        <div className="border-t border-slate-800 pt-3">
          <p className="text-[9px] text-slate-500 font-bold uppercase mb-2">RESOLUÇÃO</p>
          <p className="text-xs text-slate-300 bg-slate-800/30 rounded-lg p-2 line-clamp-3">
            {ticket.resolution}
          </p>
        </div>
      )}

      {(viewerRole === Role.SUPPORT || viewerRole === Role.DEV) && ticket.observations && (
        <div className="border-t border-slate-800 pt-3">
          <p className="text-[9px] text-slate-500 font-bold uppercase mb-2">OBSERVAÇÕES INTERNAS</p>
          <p className="text-xs text-slate-300 bg-slate-800/30 rounded-lg p-2 line-clamp-3">
            {ticket.observations}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-slate-800">
        <button
          onClick={() => {
            console.log('Clicou em EDITAR');
            onEdit();
          }}
          className="w-full bg-blue-600/30 hover:bg-blue-600/50 border border-blue-600/50 text-blue-400 px-3 py-2 rounded-lg text-[9px] font-bold uppercase transition-colors"
        >
          ✏️ EDITAR
        </button>
      </div>
    </div>
  );
};

export default TicketCard;
