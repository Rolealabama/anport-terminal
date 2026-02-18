import React, { useState, useEffect } from 'react';
import { CreateTaskRequest, TaskFlowType, TaskPriority, Permission } from '../types-v2';

interface NewTaskModalV2Props {
  userId: string;
  companyId: string;
  userPermissions: Permission[];
  onClose: () => void;
  onSubmit: (request: CreateTaskRequest) => void;
  onError?: (error: string) => void;
}

type FlowType = 'descendant' | 'ascendant' | 'same_level' | 'department';

const NewTaskModalV2: React.FC<NewTaskModalV2Props> = ({
  userId,
  companyId,
  userPermissions,
  onClose,
  onSubmit,
  onError
}) => {
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    flowType: 'descendant' as FlowType,
    assignedToUserId: '',
    assignedToDepartmentId: '',
    priority: TaskPriority.MEDIUM,
    dueDate: new Date().getTime() + (24 * 60 * 60 * 1000), // Amanhã por padrão
    checklist: [] as unknown[]
  });

  const [newTag, setNewTag] = useState('');
  const [subordinates, setSubordinates] = useState<Array<{ id: string; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Converte timestamp para data num formato legível para input[type=date]
  const getDateString = (timestamp: number) => {
    return new Date(timestamp).toISOString().split('T')[0];
  };

  // Carrega subordinados e departamentos ao montar
  useEffect(() => {
    const loadHierarchy = async () => {
      try {
        // TODO: Implementar carregamento de subordinados e departamentos
        // Por enquanto, deixamos vazios
      } catch (error) {
        console.error('Erro ao carregar hierarquia:', error);
      }
    };

    loadHierarchy();
  }, [userId, companyId]);

  // Determina quais flow types são permitidos baseado em permissões
  const getAvailableFlowTypes = (): Array<{ value: FlowType; label: string; icon: string }> => {
    const available = [];

    if (userPermissions.includes(Permission.TASK_CREATE_DOWN)) {
      available.push({ value: 'descendant', label: '⬇️ Para Subordinado', icon: '👥' });
    }
    if (userPermissions.includes(Permission.TASK_CREATE_UP)) {
      available.push({ value: 'ascendant', label: '⬆️ Para Superior', icon: '🔝' });
    }
    if (userPermissions.includes(Permission.TASK_CREATE_SAME)) {
      available.push({ value: 'same_level', label: '↔️ Mesmo Nível', icon: '🤝' });
    }
    if (userPermissions.includes(Permission.TASK_CREATE_TO_DEPT)) {
      available.push({ value: 'department', label: '📊 Para Departamento', icon: '🏢' });
    }

    return available.length > 0
      ? available
      : [{ value: 'descendant', label: 'Sem Permissões', icon: '🚫' }];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      onError?.('Título da tarefa é obrigatório');
      return;
    }

    if (formData.dueDate <= Date.now()) {
      onError?.('O prazo deve ser no futuro');
      return;
    }

    // Valida campos obrigatórios por tipo de fluxo
    if (formData.flowType === 'department' && !formData.assignedToDepartmentId) {
      onError?.('Selecione um departamento');
      return;
    }

    if (['descendant', 'ascendant', 'same_level'].includes(formData.flowType) && !formData.assignedToUserId) {
      onError?.('Selecione um usuário');
      return;
    }

    try {
      setIsLoading(true);

      const request: CreateTaskRequest = {
        title: formData.title,
        description: formData.description,
        flowType: formData.flowType as TaskFlowType,
        assignedToUserId: formData.assignedToUserId || undefined,
        assignedToDepartmentId: formData.assignedToDepartmentId || undefined,
        priority: formData.priority,
        dueDate: formData.dueDate
      };

      onSubmit(request);
      onClose();
    } catch (error) {
      onError?.(`Erro ao criar tarefa: ${error instanceof Error ? error.message : 'Desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const availableFlows = getAvailableFlowTypes();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 rounded-3xl border border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-slate-800/50 border-b border-slate-800 p-6 flex justify-between items-center sticky top-0">
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
            Nova Tarefa V2
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Título */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Título *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Descreva a tarefa brevemente"
              maxLength={100}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <div className="text-xs text-slate-400">{formData.title.length}/100</div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Adicione detalhes sobre a tarefa..."
              maxLength={500}
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            />
            <div className="text-xs text-slate-400">{formData.description.length}/500</div>
          </div>

          {/* Tipo de Fluxo */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">
              Tipo de Fluxo *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {availableFlows.map(flow => (
                <button
                  key={flow.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, flowType: flow.value }))}
                  className={`p-3 rounded-xl border-2 transition-all text-sm font-bold ${
                    formData.flowType === flow.value
                      ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                      : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {flow.label}
                </button>
              ))}
            </div>
          </div>

          {/* Destinatário */}
          {formData.flowType !== 'department' && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                Usuário Destino *
              </label>
              <select
                value={formData.assignedToUserId}
                onChange={(e) => setFormData(prev => ({ ...prev, assignedToUserId: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Selecione um usuário...</option>
                {subordinates.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Departamento */}
          {formData.flowType === 'department' && (
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                Departamento Destino *
              </label>
              <select
                value={formData.assignedToDepartmentId}
                onChange={(e) => setFormData(prev => ({ ...prev, assignedToDepartmentId: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Selecione um departamento...</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Prioridade e Deadline */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                Prioridade
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as TaskPriority }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              >
                <option value={TaskPriority.LOW}>🟦 Baixa</option>
                <option value={TaskPriority.MEDIUM}>🟨 Média</option>
                <option value={TaskPriority.HIGH}>🟥 Alta</option>
                <option value={TaskPriority.URGENT}>🚨 Urgente</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                Prazo *
              </label>
              <input
                type="date"
                value={getDateString(formData.dueDate)}
                onChange={(e) => {
                  const date = new Date(e.target.value + 'T00:00:00').getTime();
                  setFormData(prev => ({ ...prev, dueDate: date }));
                }}
                min={today}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Tags Removido - Não suportado em CreateTaskRequest */}

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black uppercase transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-black uppercase transition-colors"
            >
              {isLoading ? '⏳ Criando...' : '✓ Criar Tarefa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewTaskModalV2;
