import React, { useState } from 'react';
import { Task, Priority, Status, PhotoAuditLog } from '../types.ts';
import { db } from '../firebase.ts';
import { addDoc, collection } from 'firebase/firestore';
import ConfirmationModal from './ConfirmationModal.tsx';

interface TaskCardProps {
  task: Task;
  teamMembers: string[];
  onMove: (id: string) => void;
  onDelete?: (id: string) => void;
  onReassign?: (id: string, person: string) => void;
  onToggleCheck?: (taskId: string, itemId: string) => void;
  currentUser?: any;  // Para rastreamento de auditoria
}

const TaskCard: React.FC<TaskCardProps> = ({ task, teamMembers, onMove, onDelete, onReassign, onToggleCheck, currentUser }) => {
  const [showProof, setShowProof] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [auditedPhotos, setAuditedPhotos] = useState<Set<string>>(new Set());

  const getPriorityStyles = (priority: Priority) => {
    switch (priority) {
      case Priority.ALTA: return 'bg-red-900/20 text-red-400 border-red-900/40';
      case Priority.MEDIA: return 'bg-amber-900/20 text-amber-400 border-amber-900/40';
      case Priority.BAIXA: return 'bg-emerald-900/20 text-emerald-400 border-emerald-900/40';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'S/P';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}`;
  };

  const isOverdue = task.status !== Status.DONE && task.deadline < new Date().toISOString().split('T')[0];

  // Registra visualização de prova na auditoria
  const handlePhotoClick = async (data: string, photoName: string) => {
    try {
      if (!auditedPhotos.has(photoName) && currentUser) {
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
        setAuditedPhotos(prev => new Set(prev).add(photoName));
      }
    } catch (error) {
      console.error("Erro ao registrar visualização:", error);
    }

    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`<img src="${data}" style="max-width:100%; height:auto;">`);
    }
  };

  return (
    <>
      <div className={`bg-slate-900/80 rounded-2xl border ${isOverdue ? 'border-red-900/50 shadow-red-950/20' : 'border-slate-800'} p-4 flex flex-col gap-3 group transition-all hover:border-blue-900/50 shadow-xl`}>
        <div className="flex justify-between items-start">
          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border tracking-widest uppercase ${getPriorityStyles(task.priority)}`}>
            {task.priority}
          </span>
          {onDelete && (
            <button onClick={() => setIsDeleteModalOpen(true)} className="text-slate-700 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-all">×</button>
          )}
        </div>

        <h3 className="text-sm font-bold text-slate-100 leading-snug">{task.title}</h3>

        {/* Checklist UI */}
        {task.checklist && task.checklist.length > 0 && (
          <div className="space-y-1.5 mt-1">
            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Procedimento:</p>
            {task.checklist.map(item => (
              <div 
                key={item.id} 
                className={`flex items-center gap-2 p-1.5 rounded-lg border ${item.completed ? 'bg-green-900/5 border-green-900/20' : 'bg-slate-950 border-slate-800'} ${onToggleCheck ? 'cursor-pointer' : ''} transition-colors`}
                onClick={() => onToggleCheck?.(task.id, item.id)}
              >
                <div className={`w-3 h-3 rounded border ${item.completed ? 'bg-green-500 border-green-500' : 'border-slate-600'} flex items-center justify-center shrink-0`}>
                  {item.completed && <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>}
                </div>
                <span className={`text-[10px] truncate ${item.completed ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2 pt-3 border-t border-slate-800/50">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-600 font-bold uppercase">Membro:</span>
            {onReassign ? (
              <select 
                value={task.responsible}
                onChange={(e) => onReassign(task.id, e.target.value)}
                className="font-black text-blue-500 bg-transparent outline-none cursor-pointer"
              >
                {teamMembers.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            ) : (
              <strong className="text-slate-300">{task.responsible}</strong>
            )}
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-600 font-bold uppercase">Prazo:</span>
            <strong className={`${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>{formatDate(task.deadline)}</strong>
          </div>
        </div>

        {task.status !== Status.DONE && (
          <button
            onClick={() => onMove(task.id)}
            className={`mt-1 w-full border text-[9px] font-black py-2.5 rounded-xl transition-all uppercase tracking-widest ${
              task.status === Status.TODO 
              ? 'bg-slate-950/50 border-slate-800 text-slate-500 hover:text-blue-400 hover:border-blue-900/50' 
              : 'bg-green-600 text-white border-green-500 hover:bg-green-500'
            }`}
          >
            {task.status === Status.TODO ? 'Iniciar Atividade' : 'Concluir Missão'}
          </button>
        )}

        {task.status === Status.DONE && (
          <button onClick={() => setShowProof(!showProof)} className="text-[9px] font-black text-green-500/50 uppercase tracking-widest text-center mt-2">
            {showProof ? 'Recolher Comprovante' : 'Ver Comprovante'}
          </button>
        )}
        
        {showProof && task.status === Status.DONE && (
          <div className="mt-2 p-3 bg-slate-950 rounded-xl border border-slate-800 animate-in fade-in duration-300 space-y-3">
             <div>
               <p className="text-[9px] font-black text-slate-600 uppercase mb-1">Relatório:</p>
               <p className="text-[11px] text-slate-400 italic">"{task.completionDescription}"</p>
             </div>
             
             {task.completionAttachments && task.completionAttachments.length > 0 && (
               <div className="space-y-1.5">
                 <p className="text-[9px] font-black text-slate-600 uppercase">Anexos:</p>
                 <div className="grid grid-cols-3 gap-2">
                   {task.completionAttachments.map((file, idx) => (
                     <div 
                      key={idx} 
                      className="relative group aspect-square rounded-lg overflow-hidden border border-slate-800 bg-slate-900 cursor-pointer hover:border-blue-500 transition-colors"
                      onClick={() => handlePhotoClick(file.data, file.name)}
                     >
                       {file.type.startsWith('image/') ? (
                         <img 
                          src={file.data} 
                          alt={file.name} 
                          className="w-full h-full object-cover" 
                         />
                       ) : (
                         <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1">
                            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span className="text-[7px] text-slate-500 truncate w-full text-center px-0.5">{file.name}</span>
                         </div>
                       )}
                     </div>
                   ))}
                 </div>
               </div>
             )}
          </div>
        )}
      </div>

      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        title="Excluir Tarefa?"
        message={`Deseja realmente excluir a tarefa "${task.title}"? Esta ação não pode ser desfeita.`}
        onConfirm={() => {
          onDelete?.(task.id);
          setIsDeleteModalOpen(false);
        }}
        onCancel={() => setIsDeleteModalOpen(false)}
      />
    </>
  );
};

export default TaskCard;