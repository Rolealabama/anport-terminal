import React from 'react';
import { WorkSchedule, FixedDemand, TeamMember } from '../types.ts';

interface TeamBoardProps {
  teamMembers: TeamMember[];
  schedules: WorkSchedule[];
  fixedDemands: FixedDemand[];
  isAdmin: boolean;
  onEdit: () => void;
}

const TeamBoard: React.FC<TeamBoardProps> = ({ teamMembers, schedules, fixedDemands, isAdmin, onEdit }) => {
  if (teamMembers.length === 0) {
    return (
      <div className="bg-slate-900 rounded-2xl border border-dashed border-slate-800 p-8 text-center">
        <p className="text-slate-500 text-sm font-medium">Equipe não configurada.</p>
        {isAdmin && (
          <button onClick={onEdit} className="mt-4 text-blue-500 text-[10px] font-black uppercase">Configurar Agora</button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-sm overflow-hidden">
      <div className="bg-slate-900/50 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h2 className="text-xs md:text-sm font-black text-slate-100 uppercase tracking-wider">Unidade Operacional</h2>
        </div>
        {isAdmin && (
          <button 
            onClick={onEdit}
            className="text-[9px] md:text-[10px] font-black text-blue-400 hover:text-blue-300 uppercase bg-blue-900/20 px-3 py-1.5 rounded-xl border border-blue-900/30"
          >
            Editar Equipe
          </button>
        )}
      </div>
      <div className="p-4 md:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {teamMembers.map(member => {
          const schedule = schedules.find(s => s.responsible === member.name)?.shift || 'Sem horário';
          const demands = fixedDemands.filter(d => d.responsible === member.name);
          
          return (
            <div key={member.username} className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-400 text-xs font-black border border-blue-600/30 shrink-0">
                  {member.name[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-slate-100 truncate">{member.name}</h3>
                  <p className="text-[10px] font-black text-slate-500 uppercase truncate">{schedule}</p>
                </div>
                {member.phone && (
                  <a href={`https://wa.me/${member.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-green-500 hover:scale-110 transition-transform">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.025 3.207l-.695 2.54 2.599-.681c.887.486 1.856.741 2.839.741 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.767-5.768-5.767zm3.391 8.205c-.145.405-.837.734-1.17.785-.333.051-.747.062-1.222-.092-.291-.094-.658-.216-1.147-.424-2.092-.887-3.413-2.999-3.517-3.14-.104-.14-.775-.926-.775-1.767 0-.84.442-1.258.6-1.431.158-.173.346-.216.462-.216.115 0 .231.001.332.006.108.005.249-.04.39.298.145.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.115-.087.188-.173.289l-.26.304c-.087.101-.177.211-.077.383.101.173.448.739.961 1.196.66.587 1.216.77 1.389.857.173.087.275.072.376-.043.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.563c.173.087.289.13.332.202.045.072.045.419-.1.824z"/></svg>
                  </a>
                )}
              </div>
              
              <div className="space-y-2">
                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest border-b border-slate-800 pb-1">Rotinas de Plantão</p>
                {demands.length > 0 ? (
                  <ul className="space-y-1.5">
                    {demands.map(d => (
                      <li key={d.id} className="text-[11px] text-slate-400 flex items-start gap-2">
                        <span className="text-blue-500 font-bold shrink-0 mt-0.5">•</span>
                        <span className="leading-tight">{d.title}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[10px] italic text-slate-700">Nenhuma rotina vinculada</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TeamBoard;