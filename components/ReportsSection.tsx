
import React, { useState } from 'react';
import { Task, TeamMember, Status, User, Role, PhotoAuditLog } from '../types.ts';
import { db } from '../firebase.ts';
import { addDoc, collection } from 'firebase/firestore';

interface ReportsSectionProps {
  tasks: Task[];
  teamMembers: TeamMember[];
  currentUser: User;
}

const ReportsSection: React.FC<ReportsSectionProps> = ({ tasks, teamMembers, currentUser }) => {
  const [filter, setFilter] = useState<'geral' | 'auditoria'>('geral');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  
  const getStats = (name: string) => {
    const userTasks = tasks.filter(t => t.responsible === name);
    const total = userTasks.length;
    const completed = userTasks.filter(t => t.status === Status.DONE).length;
    const efficiency = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, efficiency };
  };

  // Registra visualização de foto na auditoria
  const handlePhotoView = async (task: Task, photoName: string) => {
    try {
      await addDoc(collection(db, "photo_audit_logs"), {
        taskId: task.id,
        photoName: photoName,
        viewedBy: currentUser.username,
        viewedByRole: currentUser.role,
        viewedAt: Date.now(),
        action: 'view',
        storeId: currentUser.storeId,
        createdAt: Date.now()
      } as PhotoAuditLog);
    } catch (error) {
      console.error("Erro ao registrar visualização:", error);
    }
  };

  // Filter visible team members based on role
  const visibleTeamMembers = currentUser.role === Role.ADMIN || currentUser.role === Role.COMPANY
    ? teamMembers 
    : teamMembers.filter(m => m.name === currentUser.name);

  // Filter tasks with photos based on role
  const tasksWithPhotos = tasks.filter(t => 
    t.status === Status.DONE && 
    t.completionAttachments && 
    t.completionAttachments.length > 0 &&
    (currentUser.role === Role.ADMIN || currentUser.role === Role.COMPANY || t.responsible === currentUser.name)
  );

  return (
    <div className="animate-in fade-in duration-500 space-y-8">
      <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 p-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-2xl font-black uppercase text-slate-100 tracking-tighter">
            {currentUser.role === Role.ADMIN ? 'Inteligência Operacional' : 'Minha Performance'}
          </h2>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">
            {currentUser.role === Role.ADMIN ? 'Análise de Performance e Auditoria Visual' : 'Seus indicadores de produtividade'}
          </p>
        </div>
        <div className="bg-slate-950 p-1.5 rounded-2xl flex gap-2 border border-slate-800">
          <button 
            onClick={() => setFilter('geral')} 
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filter === 'geral' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}
          >
            Produtividade
          </button>
          <button 
            onClick={() => setFilter('auditoria')} 
            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${filter === 'auditoria' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}
          >
            Auditoria Visual
          </button>
        </div>
      </div>

      {filter === 'geral' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleTeamMembers.length === 0 ? (
             <div className="col-span-full py-20 text-center bg-slate-900/50 rounded-3xl border border-dashed border-slate-800">
                <p className="text-slate-600 font-black uppercase text-xs">Nenhum dado disponível.</p>
             </div>
          ) : (
            visibleTeamMembers.map(member => {
              const stats = getStats(member.name);
              return (
                <div key={member.username} className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] hover:border-blue-900/50 transition-all shadow-xl space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-blue-500 font-black border border-slate-700">
                      {member.name[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-100">{member.name}</h3>
                      <span className="text-[9px] font-black text-slate-600 uppercase">Colaborador</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                     <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                       <p className="text-[8px] font-black text-slate-600 uppercase mb-1">Total</p>
                       <p className="text-xl font-black text-slate-100">{stats.total}</p>
                     </div>
                     <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800">
                       <p className="text-[8px] font-black text-slate-600 uppercase mb-1">Eficácia</p>
                       <p className="text-xl font-black text-green-500">{stats.efficiency}%</p>
                     </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-black uppercase text-slate-600">
                      <span>Progresso Mensal</span>
                      <span>{stats.completed}/{stats.total}</span>
                    </div>
                    <div className="h-2 bg-slate-950 rounded-full border border-slate-800 overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 transition-all duration-1000" 
                        style={{ width: `${stats.efficiency}%` }} 
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {tasksWithPhotos.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-slate-900/50 rounded-3xl border border-dashed border-slate-800">
               <p className="text-slate-600 font-black uppercase text-xs">Nenhum comprovante visual para auditar.</p>
            </div>
          ) : (
            tasksWithPhotos.map(task => (
              <div key={task.id} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden group hover:border-blue-600 transition-all cursor-pointer">
                <div className="aspect-square relative bg-slate-950">
                  <img 
                    src={task.completionAttachments![0].data} 
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" 
                    onClick={() => {
                      handlePhotoView(task, task.completionAttachments![0].name);
                      setExpandedTaskId(expandedTaskId === task.id ? null : task.id);
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent flex flex-col justify-end p-4">
                    <span className="text-[8px] font-black text-blue-500 uppercase mb-1">{task.responsible}</span>
                    <h4 className="text-xs font-bold text-white leading-tight truncate">{task.title}</h4>
                  </div>
                </div>
                <div className="p-4 bg-slate-900 border-t border-slate-800">
                   <p className="text-[9px] text-slate-500 italic line-clamp-2">"{task.completionDescription}"</p>
                   <p className="text-[8px] font-black text-slate-600 uppercase mt-2">{new Date(task.completedAt!).toLocaleDateString()} às {new Date(task.completedAt!).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                   {task.completionAttachments?.[0].uploadedBy && (
                     <p className="text-[8px] text-slate-500 mt-1">📸 Enviado por: <span className="text-blue-400">{task.completionAttachments[0].uploadedBy}</span></p>
                   )}
                   {expandedTaskId === task.id && (
                     <div className="mt-3 pt-3 border-t border-slate-700 space-y-1">
                       <p className="text-[7px] font-black text-slate-600 uppercase">Detalhes da Comprovação:</p>
                       {task.completionAttachments?.map((att, idx) => (
                         <div key={idx} className="text-[7px] text-slate-500">
                           <p>📄 {att.name}</p>
                           {att.uploadedAt && <p className="text-slate-600">⏰ {new Date(att.uploadedAt).toLocaleString()}</p>}
                           {att.uploadedByRole && <p className="text-slate-600">👤 Role: {att.uploadedByRole}</p>}
                         </div>
                       ))}
                     </div>
                   )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ReportsSection;
