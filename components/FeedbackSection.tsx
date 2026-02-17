import React, { useState } from 'react';
import { Feedback, User, Role } from '../types.ts';

interface FeedbackSectionProps {
  feedbacks: Feedback[];
  user: User;
  teamMembers: string[];
  onSend: (type: Feedback['type'], subject: string, message: string, receiver?: string) => void;
  onReply: (id: string, reply: string) => void;
}

const FeedbackSection: React.FC<FeedbackSectionProps> = ({ feedbacks, user, teamMembers, onSend, onReply }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAdminAnnounceOpen, setIsAdminAnnounceOpen] = useState(false);
  const [formData, setFormData] = useState({ type: 'solicitacao' as Feedback['type'], subject: '', message: '', receiver: 'ADMIN' });
  const [announceData, setAnnounceData] = useState({ subject: '', message: '', receiver: 'TODOS' });
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const filteredFeedbacks = user.role === Role.ADMIN 
    ? feedbacks 
    : feedbacks.filter(f => 
        (f.sender === user.name) || 
        (f.receiver === 'TODOS') || 
        (f.receiver === user.name)
      );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.message.trim()) return;
    onSend(formData.type, formData.subject, formData.message, 'ADMIN');
    setFormData({ type: 'solicitacao', subject: '', message: '', receiver: 'ADMIN' });
    setIsFormOpen(false);
  };

  const handleAdminAnnounce = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announceData.subject.trim() || !announceData.message.trim()) return;
    onSend('comunicado' as Feedback['type'], announceData.subject, announceData.message, announceData.receiver);
    setAnnounceData({ subject: '', message: '', receiver: 'TODOS' });
    setIsAdminAnnounceOpen(false);
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-slate-800 bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tighter">Comunicados & Ouvidoria</h2>
            <p className="text-slate-500 text-xs font-medium mt-1">Gestão de mensagens internas da unidade.</p>
          </div>

          <div className="flex gap-3">
            {user.role === Role.USER ? (
              <button onClick={() => setIsFormOpen(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">Nova Solicitação</button>
            ) : (
              <button onClick={() => setIsAdminAnnounceOpen(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">Novo Comunicado</button>
            )}
          </div>
        </div>

        <div className="p-8">
          {isFormOpen && (
            <div className="mb-12 bg-slate-800/40 p-8 rounded-3xl border border-slate-800 animate-in zoom-in duration-300">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <select className="bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl text-xs outline-none" value={formData.type} onChange={e => setFormData(p => ({ ...p, type: e.target.value as any }))}>
                    <option value="solicitacao">Solicitação</option>
                    <option value="reclamacao">Reclamação</option>
                  </select>
                  <input className="bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl text-xs outline-none" placeholder="Assunto..." value={formData.subject} onChange={e => setFormData(p => ({ ...p, subject: e.target.value }))} />
                </div>
                <textarea className="w-full bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl text-xs outline-none resize-none" rows={4} placeholder="Mensagem privada para o gestor..." value={formData.message} onChange={e => setFormData(p => ({ ...p, message: e.target.value }))} />
                <div className="flex gap-4">
                  <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500">Cancelar</button>
                  <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase">Enviar Mensagem</button>
                </div>
              </form>
            </div>
          )}

          {isAdminAnnounceOpen && (
            <div className="mb-12 bg-blue-900/10 p-8 rounded-3xl border border-blue-900/30 animate-in zoom-in duration-300">
              <form onSubmit={handleAdminAnnounce} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <select className="bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl text-xs outline-none" value={announceData.receiver} onChange={e => setAnnounceData(p => ({ ...p, receiver: e.target.value }))}>
                    <option value="TODOS">Para Toda Equipe</option>
                    {teamMembers.map(m => <option key={m} value={m}>Apenas para: {m}</option>)}
                  </select>
                  <input className="bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl text-xs outline-none" placeholder="Título do Comunicado..." value={announceData.subject} onChange={e => setAnnounceData(p => ({ ...p, subject: e.target.value }))} />
                </div>
                <textarea className="w-full bg-slate-950 border border-slate-800 px-4 py-3 rounded-xl text-xs outline-none resize-none" rows={4} placeholder="Conteúdo do aviso..." value={announceData.message} onChange={e => setAnnounceData(p => ({ ...p, message: e.target.value }))} />
                <div className="flex gap-4">
                  <button type="button" onClick={() => setIsAdminAnnounceOpen(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-500">Descartar</button>
                  <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase">Publicar Aviso</button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {filteredFeedbacks.map((fb) => (
              <div key={fb.id} className={`p-6 rounded-3xl border ${fb.type === 'comunicado' ? 'bg-blue-900/10 border-blue-900/30' : 'bg-slate-800/20 border-slate-800'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-500 mb-1 block">
                      {fb.type} {fb.receiver === 'TODOS' ? '• Geral' : ''}
                    </span>
                    <h3 className="font-bold text-slate-100">{fb.subject}</h3>
                    <p className="text-[10px] text-slate-600 font-bold uppercase mt-1">DE: {fb.sender} • {new Date(fb.createdAt).toLocaleDateString()}</p>
                  </div>
                  {user.role === 'admin' && fb.status === 'pendente' && (
                    <button onClick={() => setReplyingTo(fb.id)} className="text-[10px] font-black text-blue-400 uppercase">Responder</button>
                  )}
                </div>
                <p className="text-xs text-slate-400 bg-slate-950/30 p-4 rounded-2xl italic leading-relaxed">"{fb.message}"</p>
                {fb.adminReply && (
                  <div className="mt-4 pl-4 border-l-2 border-blue-600">
                    <p className="text-[10px] font-black text-blue-400 uppercase mb-1">Feedback do Gestor:</p>
                    <p className="text-xs text-slate-300 italic">"{fb.adminReply}"</p>
                  </div>
                )}
                {replyingTo === fb.id && (
                  <div className="mt-4 space-y-2">
                    <textarea className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-xs outline-none" rows={2} placeholder="Sua resposta..." value={replyText} onChange={e => setReplyText(e.target.value)} />
                    <button onClick={() => { onReply(fb.id, replyText); setReplyText(''); setReplyingTo(null); }} className="w-full py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase">Enviar Resposta</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackSection;