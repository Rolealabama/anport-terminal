
import React, { useState } from 'react';
import { Priority, Task, ChecklistItem } from '../types.ts';

interface NewTaskModalProps {
  assignees: Array<{ username: string; name: string }>;
  onClose: () => void;
  onSubmit: (task: Omit<Task, 'id' | 'status' | 'createdAt' | 'storeId'>) => void;
}

const NewTaskModal: React.FC<NewTaskModalProps> = ({ assignees = [], onClose, onSubmit }) => {
  const today = new Date().toISOString().split('T')[0];
  
  const [formData, setFormData] = useState({
    title: '',
    responsible: assignees[0]?.username || '',
    priority: Priority.MEDIA,
    deadline: today, // Começa com hoje, não deixa vazio
    checklist: [] as ChecklistItem[]
  });
  
  const [newItem, setNewItem] = useState('');

  const addChecklistItem = () => {
    if (!newItem.trim()) return;
    setFormData(prev => ({
      ...prev,
      checklist: [...prev.checklist, { id: crypto.randomUUID(), text: newItem, completed: false }]
    }));
    setNewItem('');
  };

  const removeChecklistItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      checklist: prev.checklist.filter(i => i.id !== id)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.responsible) return;
    
    // Validar se o deadline é válido (não pode ser no passado)
    const today = new Date().toISOString().split('T')[0];
    if (formData.deadline < today) {
      alert('O prazo não pode ser no passado! Use uma data a partir de hoje.');
      return;
    }
    
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 duration-300 border border-slate-800 flex flex-col max-h-[90dvh]">
        <div className="bg-slate-800/50 px-6 py-4 border-b border-slate-800 flex justify-between items-center shrink-0">
          <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight uppercase">Delegar Missão</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-2">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Descrição Principal</label>
            <input
              autoFocus
              required
              type="text"
              placeholder="O que precisa ser feito?"
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Responsável</label>
              <select
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={formData.responsible}
                onChange={e => setFormData(prev => ({ ...prev, responsible: e.target.value }))}
              >
                <option value="">Membro...</option>
                {assignees.map(a => (
                  <option key={a.username} value={a.username}>{a.name} (@{a.username})</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Prioridade</label>
              <select
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                value={formData.priority}
                onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value as Priority }))}
              >
                {Object.values(Priority).map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Checklist de Passos (Opcional)</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: Conferir data de validade"
                className="flex-1 px-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs"
                value={newItem}
                onChange={e => setNewItem(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
              />
              <button type="button" onClick={addChecklistItem} className="bg-slate-800 text-white px-4 rounded-xl font-bold">+</button>
            </div>
            
            <div className="mt-2 space-y-1">
              {formData.checklist.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-slate-800/30 p-2 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 truncate">{item.text}</span>
                  <button type="button" onClick={() => removeChecklistItem(item.id)} className="text-red-900 font-black px-2">×</button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Data Limite *</label>
            <input
              type="date"
              required
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              value={formData.deadline}
              min={today}
              onChange={e => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
            />
          </div>

          <div className="flex items-center gap-4 mt-4 mb-2 shrink-0">
            <button type="button" onClick={onClose} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-500">Voltar</button>
            <button type="submit" className="flex-[2] py-4 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase shadow-lg shadow-blue-900/30">Lançar Tarefa</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewTaskModal;
