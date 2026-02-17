
import React, { useState } from 'react';
import { WorkSchedule, FixedDemand, TeamMember } from '../types.ts';
import ConfirmationModal from './ConfirmationModal.tsx';
import { hashPassword, generateSalt } from '../utils.ts';

const VALID_USER = /^[a-z0-9_]{3,15}$/;
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HOURS = Array.from({ length: 144 }, (_, i) => {
  const hours = Math.floor(i * 10 / 60);
  const minutes = (i * 10) % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
});

interface TeamSettingsModalProps {
  onClose: () => void;
  teamMembers: TeamMember[];
  schedules: WorkSchedule[];
  fixedDemands: FixedDemand[];
  storeId: string;
  onSave: (schedules: WorkSchedule[], fixedDemands: FixedDemand[], teamMembers: TeamMember[]) => void;
}

const TeamSettingsModal: React.FC<TeamSettingsModalProps> = ({ onClose, teamMembers, schedules, fixedDemands, storeId, onSave }) => {
  const [localMembers, setLocalMembers] = useState<TeamMember[]>(teamMembers);
  const [localSchedules, setLocalSchedules] = useState<WorkSchedule[]>(schedules);
  const [localFixedDemands, setLocalFixedDemands] = useState<FixedDemand[]>(fixedDemands);
  
  const [newMember, setNewMember] = useState({ name: '', username: '', password: '', phone: '' });
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [scheduleStartTime, setScheduleStartTime] = useState('08:00');
  const [scheduleEndTime, setScheduleEndTime] = useState('18:00');
  const [newDemand, setNewDemand] = useState({ person: teamMembers[0]?.name || '', title: '', days: [] as number[] });

  const [confirmDeleteMember, setConfirmDeleteMember] = useState<string | null>(null);
  const [confirmDeleteDemand, setConfirmDeleteDemand] = useState<string | null>(null);

  const formatPhone = (val: string) => {
    const numbers = val.replace(/\D/g, '');
    if (numbers.length <= 11) {
      let formatted = numbers;
      if (numbers.length > 2) formatted = `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
      if (numbers.length > 7) formatted = `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
      return formatted;
    }
    return val.slice(0, 15);
  };

  const addMember = async () => {
    const cleanUsername = newMember.username.toLowerCase().trim().replace(/\s/g, '');
    const password = newMember.password;
    const name = newMember.name.trim();

    if (name.length < 3) return alert('Nome deve ter pelo menos 3 caracteres.');
    if (!VALID_USER.test(cleanUsername)) return alert('Usuário deve ter 3-15 caracteres (letras minúsculas, números e underscore).');
    if (password.length < 6) return alert('Senha deve ter no mínimo 6 caracteres.');
    
    // Verificar duplicata (excluindo o membro sendo editado)
    if (localMembers.some(m => m.username === cleanUsername && m.username !== editingMember?.username)) {
      return alert('Usuário já existe! Escolha outro.');
    }
    
    if (editingMember) {
      // Modo EDIÇÃO
      const oldName = editingMember.name;
      const salt = editingMember.passwordSalt || generateSalt();
      const hashedPassword = password.length > 30 
        ? password 
        : await hashPassword(password, salt);
      
      setLocalMembers(prev => prev.map(m => 
        m.username === editingMember.username 
          ? { name, username: cleanUsername, password: hashedPassword, passwordSalt: salt, phone: newMember.phone, storeId: editingMember.storeId || storeId }
          : m
      ));
      
      // Atualizar referências em escalas e rotinas
      if (oldName !== name) {
        setLocalSchedules(prev => prev.map(s => s.responsible === oldName ? { ...s, responsible: name } : s));
        setLocalFixedDemands(prev => prev.map(d => d.responsible === oldName ? { ...d, responsible: name } : d));
      }
      
      setEditingMember(null);
      setNewMember({ name: '', username: '', password: '', phone: '' });
      alert('✅ Membro atualizado com sucesso!');
    } else {
      // Modo ADIÇÃO
      const salt = generateSalt();
      const hashedPassword = await hashPassword(password, salt);
      
      setLocalMembers(prev => [...prev, { name, username: cleanUsername, password: hashedPassword, passwordSalt: salt, phone: newMember.phone, storeId }]);
      setNewMember({ name: '', username: '', password: '', phone: '' });
      alert('✅ Membro adicionado com sucesso!');
    }
  };

  const startEditMember = (member: TeamMember) => {
    setEditingMember(member);
    setNewMember({ name: member.name, username: member.username, password: '', phone: member.phone || '' });
  };

  const cancelEdit = () => {
    setEditingMember(null);
    setNewMember({ name: '', username: '', password: '', phone: '' });
  };

  const handleRemoveMember = () => {
    if (!confirmDeleteMember) return;
    const memberName = localMembers.find(m => m.username === confirmDeleteMember)?.name || confirmDeleteMember;
    setLocalMembers(prev => prev.filter(m => m.username !== confirmDeleteMember));
    setLocalSchedules(prev => prev.filter(s => s.responsible !== memberName));
    setLocalFixedDemands(prev => prev.filter(d => d.responsible !== memberName));
    setConfirmDeleteMember(null);
    alert(`✅ Membro "${memberName}" removido com sucesso!`);
  };

  const toggleDay = (day: number) => {
    setNewDemand(prev => ({
      ...prev,
      days: prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day]
    }));
  };

  const addFixedDemand = () => {
    if (!newDemand.title.trim() || !newDemand.person || newDemand.days.length === 0) return;
    setLocalFixedDemands(prev => [...prev, { id: crypto.randomUUID(), responsible: newDemand.person, title: newDemand.title, daysOfWeek: newDemand.days }]);
    setNewDemand(prev => ({ ...prev, title: '', days: [] }));
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
        <div className="bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 duration-300 flex flex-col max-h-[95dvh] border border-slate-800">
          <div className="bg-slate-800 px-6 py-4 border-b border-slate-700 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-100 uppercase">Configuração da Unidade</h2>
            <button onClick={onClose} className="text-slate-500 hover:text-white p-2 text-xl">×</button>
          </div>

          <div className="p-4 sm:p-8 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-8 custom-scrollbar">
            <section className="space-y-4">
              <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest border-b border-slate-800 pb-2">Equipe Operacional</h3>
              <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">{editingMember ? '✏️ EDITANDO' : 'Nome Completo'} *</label>
                  <input type="text" placeholder="Ex: João Silva" className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-xs text-white outline-none" value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} />
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">Usuário (login) *</label>
                  <input type="text" placeholder="Ex: joao_silva" className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-xs text-white outline-none" value={newMember.username} onChange={e => setNewMember({...newMember, username: e.target.value})} disabled={!!editingMember} />
                  {editingMember && <p className="text-[8px] text-slate-500 mt-1">Usuário não pode ser alterado</p>}
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">Senha {editingMember ? '(deixe em branco para não alterar)' : '*'}</label>
                  <input type="password" placeholder={editingMember ? 'Deixar vazio = não alterar' : 'Mínimo 6 caracteres'} className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-xs text-white outline-none" value={newMember.password} onChange={e => setNewMember({...newMember, password: e.target.value})} />
                </div>
                <div>
                  <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">Celular</label>
                  <input type="text" placeholder="(11) 99999-9999" className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-xs text-white outline-none" value={newMember.phone} onChange={e => setNewMember({...newMember, phone: formatPhone(e.target.value)})} />
                </div>
                <div className="flex gap-2">
                  {editingMember ? (
                    <>
                      <button onClick={cancelEdit} className="flex-1 bg-slate-700 py-3 rounded-xl text-[10px] font-black uppercase text-white hover:bg-slate-600 transition-all">❌ Cancelar Edição</button>
                      <button onClick={addMember} className="flex-1 bg-green-600 py-3 rounded-xl text-[10px] font-black uppercase text-white hover:bg-green-700 transition-all">💾 Salvar Alterações</button>
                    </>
                  ) : (
                    <button onClick={addMember} className="w-full bg-blue-600 py-3 rounded-xl text-[10px] font-black uppercase text-white hover:bg-blue-700 transition-all">➕ Adicionar Membro</button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                {localMembers.map(m => (
                  <div key={m.username} className={`flex justify-between items-center p-3 rounded-xl border transition-all ${
                    editingMember?.username === m.username 
                      ? 'bg-green-900/20 border-green-600' 
                      : 'bg-slate-800/40 border-slate-800 hover:border-blue-600'
                  }`}>
                    <span className="text-xs font-bold text-slate-200">{m.name}</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => startEditMember(m)}
                        className={`text-[10px] font-black px-2 py-1 rounded transition-all ${
                          editingMember?.username === m.username
                            ? 'bg-green-600 text-white'
                            : 'text-blue-400 hover:text-blue-500'
                        }`}
                        title="Editar membro"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={() => setConfirmDeleteMember(m.username)}
                        className="text-red-500 text-[10px] font-black hover:text-red-400 transition-all"
                        title="Deletar membro"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest border-b border-slate-800 pb-2">Escala de Turno</h3>
              <div className="space-y-3">
                {localMembers.map(m => {
                  const memberSchedule = localSchedules.find(s => s.responsible === m.name)?.shift || '';
                  const [startTime, endTime] = memberSchedule.split(' - ') || ['08:00', '18:00'];
                  return (
                    <div key={m.username} className="bg-slate-800/20 p-3 rounded-xl border border-slate-800">
                      <label className="text-[9px] font-black text-slate-500 uppercase block mb-2">{m.name}</label>
                      <div className="flex gap-2 items-center">
                        <select 
                          className="flex-1 bg-slate-950 border border-slate-800 p-2 rounded-lg text-xs text-white"
                          value={startTime || '08:00'}
                          onChange={e => {
                            const updated = [...localSchedules];
                            const idx = updated.findIndex(s => s.responsible === m.name);
                            const newShift = `${e.target.value} - ${endTime || '18:00'}`;
                            if(idx >= 0) updated[idx].shift = newShift;
                            else updated.push({ responsible: m.name, shift: newShift });
                            setLocalSchedules(updated);
                          }}
                        >
                          {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <span className="text-slate-400 text-xs font-bold">até</span>
                        <select 
                          className="flex-1 bg-slate-950 border border-slate-800 p-2 rounded-lg text-xs text-white"
                          value={endTime || '18:00'}
                          onChange={e => {
                            const updated = [...localSchedules];
                            const idx = updated.findIndex(s => s.responsible === m.name);
                            const newShift = `${startTime || '08:00'} - ${e.target.value}`;
                            if(idx >= 0) updated[idx].shift = newShift;
                            else updated.push({ responsible: m.name, shift: newShift });
                            setLocalSchedules(updated);
                          }}
                        >
                          {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                      <p className="text-[8px] text-slate-500 mt-1">Atual: {memberSchedule || 'Não definido'}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest border-b border-slate-800 pb-2">Automação de Rotinas</h3>
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-800 space-y-3">
                <select className="w-full bg-slate-950 p-2 rounded-xl text-xs text-white" value={newDemand.person} onChange={e => setNewDemand({...newDemand, person: e.target.value})}>
                  {localMembers.map(m => <option key={m.username} value={m.name}>{m.name}</option>)}
                </select>
                <input type="text" placeholder="Nome da Rotina" className="w-full bg-slate-950 p-2 rounded-xl text-xs text-white" value={newDemand.title} onChange={e => setNewDemand({...newDemand, title: e.target.value})} />
                
                <div className="flex flex-wrap gap-1">
                  {DAYS.map((day, idx) => (
                    <button key={day} onClick={() => toggleDay(idx)} className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase border transition-all ${newDemand.days.includes(idx) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-600'}`}>
                      {day}
                    </button>
                  ))}
                </div>
                
                <button onClick={addFixedDemand} className="w-full bg-blue-600 py-3 rounded-xl text-[10px] font-black uppercase text-white shadow-lg">Vincular Rotina</button>
              </div>
              <div className="space-y-2">
                {localFixedDemands.map(d => (
                  <div key={d.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                    <div className="flex justify-between items-center mb-1">
                       <span className="text-[9px] font-black text-blue-400 uppercase">{d.responsible}</span>
                       <button onClick={() => setLocalFixedDemands(localFixedDemands.filter(x => x.id !== d.id))} className="text-red-500 font-black">X</button>
                    </div>
                    <p className="text-[11px] text-slate-300 mb-1">{d.title}</p>
                    <div className="flex gap-1">
                      {d.daysOfWeek.sort().map(dayIdx => (
                        <span key={dayIdx} className="text-[8px] font-bold text-slate-600 uppercase">{DAYS[dayIdx]}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="p-6 border-t border-slate-800 bg-slate-900 flex gap-4">
             <button onClick={onClose} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-500">Cancelar</button>
             <button onClick={() => onSave(localSchedules, localFixedDemands, localMembers)} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl">Salvar Unidade</button>
          </div>
        </div>
      </div>
      <ConfirmationModal isOpen={!!confirmDeleteMember} title="Remover Membro?" message={`Isso removerá "${localMembers.find(m => m.username === confirmDeleteMember)?.name}" e suas escalas. Esta ação será efetivada ao clicar em "Salvar Unidade".`} onConfirm={handleRemoveMember} onCancel={() => setConfirmDeleteMember(null)} />
    </>
  );
};

export default TeamSettingsModal;
