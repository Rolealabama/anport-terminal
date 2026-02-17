import React from 'react';
import { Task, Status } from '../types.ts';

interface AdminStatsProps {
  tasks: Task[];
  teamMembers: string[];
}

const AdminStats: React.FC<AdminStatsProps> = ({ tasks, teamMembers }) => {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === Status.DONE).length;
  const inProgress = tasks.filter(t => t.status === Status.DOING).length;
  const overdue = tasks.filter(t => t.status !== Status.DONE && t.deadline < new Date().toISOString().split('T')[0]).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
        <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">Geral</p>
        <div className="flex items-end justify-between mt-1">
          <p className="text-xl md:text-2xl font-black text-blue-400">{total}</p>
          <span className="text-[7px] md:text-[9px] font-bold text-slate-600 uppercase">Tarefas</span>
        </div>
      </div>
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
        <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">Fila</p>
        <div className="flex items-end justify-between mt-1">
          <p className="text-xl md:text-2xl font-black text-amber-400">{inProgress}</p>
          <span className="text-[7px] md:text-[9px] font-bold text-slate-600 uppercase">Andamento</span>
        </div>
      </div>
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
        <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">OK</p>
        <div className="flex items-end justify-between mt-1">
          <p className="text-xl md:text-2xl font-black text-green-400">{completed}</p>
          <span className="text-[7px] md:text-[9px] font-bold text-slate-600 uppercase">Concluído</span>
        </div>
      </div>
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
        <p className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">Alerta</p>
        <div className="flex items-end justify-between mt-1">
          <p className="text-xl md:text-2xl font-black text-red-400">{overdue}</p>
          <span className="text-[7px] md:text-[9px] font-bold text-slate-600 uppercase">Vencido</span>
        </div>
      </div>

      <div className="col-span-full bg-slate-900 p-5 md:p-6 rounded-3xl border border-slate-800 shadow-sm overflow-hidden">
        <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase mb-4 md:mb-6 tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
          Distribuição Operacional
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
          {teamMembers.map(person => {
            const count = tasks.filter(t => t.responsible === person && t.status !== Status.DONE).length;
            const percentage = total > 0 ? (count / total) * 100 : 0;
            return (
              <div key={person} className="flex items-center gap-4">
                <span className="text-[10px] md:text-xs font-bold text-slate-300 w-20 md:w-28 truncate shrink-0">{person}</span>
                <div className="flex-1 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-700 shadow-[0_0_8px_rgba(37,99,235,0.4)]" 
                    style={{ width: `${Math.min(count * 20, 100)}%` }}
                  />
                </div>
                <span className="text-[8px] md:text-[10px] font-black text-slate-600 w-10 text-right shrink-0">{count} ATIV.</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminStats;