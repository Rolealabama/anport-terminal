import React, { useState } from 'react';
import { Task, TaskStatus, TaskPriority } from '../types-v2';
import { TaskService } from '../services/TaskService';
import { RealtimeService } from '../services/RealtimeService';

interface KanbanBoardV2Props {
  tasks: Task[];
  userId: string;
  userPermissions: string[];
  onTaskMove?: (taskId: string, status: TaskStatus) => void;
  onTaskUpdate?: (task: Task) => void;
  onError?: (error: string) => void;
}

const KanbanBoardV2: React.FC<KanbanBoardV2Props> = ({
  tasks,
  userId,
  userPermissions,
  onTaskMove,
  onTaskUpdate,
  onError
}) => {
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, Task>>({});

  const columns: { status: TaskStatus; label: string; color: string; icon: string }[] = [
    { status: TaskStatus.TODO, label: 'À Fazer', color: 'blue', icon: '📋' },
    { status: TaskStatus.IN_PROGRESS, label: 'Em Progresso', color: 'amber', icon: '⚙️' },
    { status: TaskStatus.REVIEW, label: 'Em Revisão', color: 'purple', icon: '👀' },
    { status: TaskStatus.DONE, label: 'Concluído', color: 'green', icon: '✅' },
    { status: TaskStatus.BLOCKED, label: 'Bloqueado', color: 'red', icon: '🚫' }
  ];

  const getTasksForStatus = (status: TaskStatus) => {
    return tasks.filter(t => t.status === status).sort((a, b) => {
      // Ordena por prioridade (urgente primeiro)
      const priorityOrder = { [TaskPriority.URGENT]: 0, [TaskPriority.HIGH]: 1, [TaskPriority.MEDIUM]: 2, [TaskPriority.LOW]: 3 };
      return (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99);
    });
  };

  const handleMoveTask = async (task: Task, newStatus: TaskStatus) => {
    if (task.status === newStatus) return;

    try {
      setMovingTaskId(task.id);

      // Validações de fluxo
      if (task.status === TaskStatus.DONE) {
        onError?.('Tarefas concluídas não podem ser movidas');
        return;
      }

      // Atualização otimista (UI imediata)
      setOptimisticUpdates(prev => ({
        ...prev,
        [task.id]: { ...task, status: newStatus, metadata: { ...task.metadata, lastMovedAt: Date.now(), lastMovedBy: userId } }
      }));

      // Tenta mover no backend
      const result = await TaskService.moveTask(task.id, newStatus, task.version);

      if (result.success) {
        // Sucesso! Remove da cache otimista
        setOptimisticUpdates(prev => {
          const { [task.id]: _, ...rest } = prev;
          return rest;
        });
        onTaskMove?.(task.id, newStatus);
      } else {
        // Falha - reverte UI
        setOptimisticUpdates(prev => {
          const { [task.id]: _, ...rest } = prev;
          return rest;
        });
        onError?.(result.error || 'Erro ao mover tarefa');
      }
    } catch (error) {
      // Reveerte em caso de erro
      setOptimisticUpdates(prev => {
        const { [task.id]: _, ...rest } = prev;
        return rest;
      });
      onError?.(`Erro: ${error instanceof Error ? error.message : 'Desconhecido'}`);
    } finally {
      setMovingTaskId(null);
    }
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.URGENT:
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case TaskPriority.HIGH:
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case TaskPriority.MEDIUM:
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case TaskPriority.LOW:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getPriorityLabel = (priority: TaskPriority) => {
    const labels = {
      [TaskPriority.URGENT]: '🚨 Urgente',
      [TaskPriority.HIGH]: '🔴 Alta',
      [TaskPriority.MEDIUM]: '🟡 Média',
      [TaskPriority.LOW]: '🟢 Baixa'
    };
    return labels[priority] || priority;
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {columns.map(col => (
          <div key={col.status} className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center">
            <div className="text-2xl mb-1">{col.icon}</div>
            <div className="text-xs font-bold text-slate-300 uppercase">{col.label}</div>
            <div className={`text-lg font-black text-${col.color}-400`}>
              {getTasksForStatus(col.status).length}
            </div>
          </div>
        ))}
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {columns.map(col => (
          <div key={col.status} className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-2 py-1">
              <div className={`w-1.5 h-1.5 rounded-full bg-${col.color}-500`}></div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">{col.label}</h3>
            </div>

            <div className={`bg-slate-900/30 border border-slate-800/50 rounded-2xl p-3 min-h-[500px] flex flex-col gap-2 overflow-y-auto`}>
              {getTasksForStatus(col.status).map(task => {
                // Se tiver atualização otimista, usa ela
                const displayTask = optimisticUpdates[task.id] || task;
                const isMoving = movingTaskId === task.id;

                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('taskId', task.id);
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const droppedTaskId = e.dataTransfer.getData('taskId');
                      if (droppedTaskId === task.id) return;
                      // Encontra a tarefa e move
                      const droppedTask = tasks.find(t => t.id === droppedTaskId);
                      if (droppedTask) {
                        handleMoveTask(droppedTask, displayTask.status);
                      }
                    }}
                    className={`bg-slate-800 border-2 rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-blue-500/50 transition-all ${
                      isMoving ? 'opacity-50' : ''
                    } ${optimisticUpdates[task.id] ? 'border-purple-500/50' : 'border-slate-700'}`}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-white line-clamp-2">{displayTask.title}</h4>
                      </div>
                      {optimisticUpdates[task.id] && (
                        <div className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                          ⏳ Sincronizando...
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {displayTask.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 mb-2">{displayTask.description}</p>
                    )}

                    {/* Priority badge */}
                    <div className={`text-xs font-bold px-2 py-1 rounded-lg border mb-2 inline-block ${getPriorityColor(displayTask.priority)}`}>
                      {getPriorityLabel(displayTask.priority)}
                    </div>

                    {/* Meta info */}
                    <div className="flex justify-between items-center text-xs text-slate-500 bg-slate-900/50 p-2 rounded-lg">
                      <span>
                        {displayTask.dueDate
                          ? new Date(displayTask.dueDate).toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })
                          : 'Sem prazo'}
                      </span>
                      <span className="text-slate-600">v{displayTask.version || 1}</span>
                    </div>

                    {/* Status change buttons */}
                    <div className="grid grid-cols-2 gap-1 mt-3">
                      {columns
                        .filter(c => c.status !== displayTask.status)
                        .slice(0, 2)
                        .map(targetCol => (
                          <button
                            key={targetCol.status}
                            onClick={() => handleMoveTask(task, targetCol.status)}
                            disabled={isMoving}
                            className="text-xs py-1 px-2 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 font-bold transition-colors"
                          >
                            {targetCol.icon}
                          </button>
                        ))}
                    </div>
                  </div>
                );
              })}

              {/* Empty state */}
              {getTasksForStatus(col.status).length === 0 && (
                <div className="flex items-center justify-center h-full text-slate-600 text-center py-8">
                  <div className="text-xs">
                    <div className="text-2xl mb-2">📭</div>
                    <div>Nenhuma tarefa</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-xs text-slate-400">
        <div className="font-bold mb-2 text-slate-300">Legenda:</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>📋 <span className="font-bold">TODO</span> - Não iniciado</div>
          <div>⚙️ <span className="font-bold">IN_PROGRESS</span> - Trabalhando</div>
          <div>👀 <span className="font-bold">REVIEW</span> - Aguardando revisão</div>
          <div>✅ <span className="font-bold">DONE</span> - Finalizado</div>
          <div>🚫 <span className="font-bold">BLOCKED</span> - Impedimento</div>
          <div>⏳ Sincronizando - Atualização pendente</div>
        </div>
      </div>
    </div>
  );
};

export default KanbanBoardV2;
