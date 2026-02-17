import React from 'react';
import { Task, Status } from '../types.ts';
import TaskCard from './TaskCard.tsx';

interface KanbanBoardProps {
  tasks: Task[];
  onMove: (id: string) => void;
  onToggleCheck: (taskId: string, itemId: string) => void;
  onDelete: (id: string) => void;
  isAdmin: boolean;
  teamMembers?: string[];
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, onMove, onToggleCheck, onDelete, isAdmin, teamMembers = [] }) => {
  const columns = [Status.TODO, Status.DOING, Status.DONE];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {columns.map(status => (
        <div key={status} className="flex flex-col gap-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${status === Status.TODO ? 'bg-blue-500' : status === Status.DOING ? 'bg-amber-500' : 'bg-green-500'}`}></div>
              {status}
            </h3>
            <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 rounded-lg text-slate-500 font-black">
              {tasks.filter(t => t.status === status).length}
            </span>
          </div>
          
          <div className="bg-slate-900/40 border border-slate-800/30 rounded-[2.5rem] p-4 min-h-[400px] flex flex-col gap-4">
            {tasks.filter(t => t.status === status).map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                teamMembers={teamMembers}
                onMove={onMove}
                onDelete={isAdmin ? onDelete : undefined}
                // Permitimos toggle de checklist se estiver em andamento
                onToggleCheck={status === Status.DOING ? onToggleCheck : undefined}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default KanbanBoard;