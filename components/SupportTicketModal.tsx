import React, { useState, useEffect } from 'react';
import { SupportTicket, Priority, Role } from '../types';

interface SupportTicketModalProps {
  ticket?: SupportTicket | null;
  companyId: string;
  storeId?: string;
  createdBy: string;
  createdByRole: Role;
  onClose: () => void;
  onSubmit: (data: Partial<SupportTicket>) => Promise<void>;
}

const SupportTicketModal: React.FC<SupportTicketModalProps> = ({
  ticket,
  companyId,
  storeId,
  createdBy,
  createdByRole,
  onClose,
  onSubmit
}) => {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'sistema' | 'funcionalidade' | 'auditoria' | 'outro'>('sistema');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIA);
  const [status, setStatus] = useState<'aberto' | 'em_progresso' | 'resolvido' | 'fechado'>('aberto');
  const [assignedTo, setAssignedTo] = useState('');
  const [resolution, setResolution] = useState('');
  const [observations, setObservations] = useState('');

  const canManageObservations = createdByRole === Role.SUPPORT || createdByRole === Role.DEV;

  useEffect(() => {
    if (ticket) {
      setTitle(ticket.title);
      setDescription(ticket.description);
      setCategory(ticket.category);
      setPriority(ticket.priority);
      setStatus(ticket.status);
      setAssignedTo(ticket.assignedTo || '');
      setResolution(ticket.resolution || '');
      setObservations(ticket.observations || '');
    }
  }, [ticket]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const ticketData: Partial<SupportTicket> = {
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        status
      };

      // Only include optional fields if they have values
      if (assignedTo) {
        ticketData.assignedTo = assignedTo;
      }
      if (resolution) {
        ticketData.resolution = resolution;
      }
      if (canManageObservations) {
        ticketData.observations = observations.trim();
      }

      await onSubmit(ticketData);
    } catch (error) {
      alert('Erro ao salvar ticket: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const isEditMode = !!ticket;
  const canChangeStatus = createdByRole === Role.SUPPORT || isEditMode;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-3xl border border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 p-6 flex justify-between items-center z-10">
          <h2 className="text-lg md:text-xl font-black text-white uppercase">
            {isEditMode ? 'EDITAR TICKET' : 'NOVO TICKET'}
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-slate-400 text-[10px] font-black uppercase mb-2">
              TÍTULO <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Descreva o assunto do ticket"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm"
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-400 text-[10px] font-black uppercase mb-2">
              DESCRIÇÃO <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o problema com detalhes"
              rows={5}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm resize-none"
              disabled={loading}
            />
          </div>

          {/* Category and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-[10px] font-black uppercase mb-2">
                CATEGORIA
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500"
                disabled={loading}
              >
                <option value="sistema">SISTEMA</option>
                <option value="funcionalidade">FUNCIONALIDADE</option>
                <option value="auditoria">AUDITORIA</option>
                <option value="outro">OUTRO</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 text-[10px] font-black uppercase mb-2">
                PRIORIDADE
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500"
                disabled={loading}
              >
                <option value="Urgente">URGENTE</option>
                <option value="Alta">ALTA</option>
                <option value="Média">MÉDIA</option>
                <option value="Baixa">BAIXA</option>
              </select>
            </div>
          </div>

          {/* Status and Assigned To */}
          {isEditMode && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 text-[10px] font-black uppercase mb-2">
                  STATUS
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 focus:outline-none focus:border-blue-500"
                  disabled={loading}
                >
                  <option value="aberto">ABERTO</option>
                  <option value="em_progresso">EM PROGRESSO</option>
                  <option value="resolvido">RESOLVIDO</option>
                  <option value="fechado">FECHADO</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] font-black uppercase mb-2">
                  ATRIBUÍDO À
                </label>
                <input
                  type="text"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="Nome do agente"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm"
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {/* Resolution */}
          {status === 'resolvido' && (
            <div>
              <label className="block text-slate-400 text-[10px] font-black uppercase mb-2">
                RESOLUÇÃO <span className="text-red-500">*</span>
              </label>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Descreva como o problema foi resolvido"
                rows={4}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm resize-none"
                disabled={loading}
              />
            </div>
          )}

          {canManageObservations && (
            <div>
              <label className="block text-slate-400 text-[10px] font-black uppercase mb-2">
                OBSERVAÇÕES INTERNAS
              </label>
              <textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Campo visível apenas para suporte e DEV"
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 text-sm resize-none"
                disabled={loading}
              />
            </div>
          )}

          {/* Info */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 text-[9px] text-slate-400 space-y-2">
            <p>
              <span className="font-bold text-slate-300">EMPRESA:</span> {companyId}
            </p>
            {storeId && (
              <p>
                <span className="font-bold text-slate-300">UNIDADE:</span> {storeId}
              </p>
            )}
            <p>
              <span className="font-bold text-slate-300">REPORTADO POR:</span> {createdBy} ({createdByRole})
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 rounded-xl font-black text-[10px] uppercase border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              disabled={loading}
            >
              CANCELAR
            </button>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl font-black text-[10px] uppercase bg-blue-600 text-white hover:bg-blue-700 shadow-xl transition-all active:scale-95 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'SALVANDO...' : 'SALVAR TICKET'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupportTicketModal;
