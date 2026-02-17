import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Role, Priority } from '../types';

interface UserTicketCreationProps {
  userId: string;
  userName: string;
  userRole: Role;
  companyId: string;
  storeId?: string;
}

const UserTicketCreation: React.FC<UserTicketCreationProps> = ({
  userId,
  userName,
  userRole,
  companyId,
  storeId
}) => {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'sistema' | 'funcionalidade' | 'auditoria' | 'outro'>('sistema');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIA);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      alert('Preencha título e descrição');
      return;
    }

    setLoading(true);
    try {
      const ticketNumber = Math.floor(Date.now() / 1000) % 100000;
      await addDoc(collection(db, 'support_tickets'), {
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        status: 'aberto',
        companyId,
        storeId: storeId || null,
        createdBy: userId,
        createdByName: userName,
        createdByRole: userRole,
        ticketNumber,
        createdAt: serverTimestamp(),
      });

      setTitle('');
      setDescription('');
      setCategory('sistema');
      setPriority(Priority.MEDIA);
      setSubmitted(true);
      
      setTimeout(() => setSubmitted(false), 3000);
    } catch (error) {
      alert('Erro ao enviar ticket: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
        <h2 className="text-lg md:text-xl font-black uppercase tracking-tighter mb-6">
          Enviar Dúvida ou Reportar Bug
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-slate-400 text-[10px] font-black uppercase mb-2">
              ASSUNTO <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Erro ao gerar relatório, Dúvida sobre permissões..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500"
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-400 text-[10px] font-black uppercase mb-2">
              DETALHES <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva sua dúvida ou o bug que encontrou com detalhes"
              rows={5}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
              disabled={loading}
            />
          </div>

          {/* Category and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-[10px] font-black uppercase mb-2">
                TIPO
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
                <option value="Urgente">🔴 URGENTE (Sistema inoperável)</option>
                <option value="Alta">🟠 ALTA (Funcionalidade quebrada)</option>
                <option value="Média">🔵 MÉDIA (Comportamento inesperado)</option>
                <option value="Baixa">🟢 BAIXA (Dúvida ou sugestão)</option>
              </select>
            </div>
          </div>

          {/* Sucesso feedback */}
          {submitted && (
            <div className="bg-green-900/20 border border-green-700/50 rounded-xl p-4 flex items-center gap-3">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-green-400 text-sm font-bold">Ticket enviado com sucesso!</p>
            </div>
          )}

          {/* Stats */}
          <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-3 text-[9px] text-slate-400 space-y-1">
            <p><span className="font-bold text-slate-300">Empresa:</span> {companyId}</p>
            {storeId && <p><span className="font-bold text-slate-300">Unidade:</span> {storeId}</p>}
            <p><span className="font-bold text-slate-300">Reportado por:</span> {userName}</p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-xl transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? 'ENVIANDO...' : '📤 ENVIAR TICKET'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UserTicketCreation;
