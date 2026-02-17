import React, { useState, useEffect } from 'react';
import { Permission, Role } from '../types-v2';

interface PermissionsDashboardProps {
  userId: string;
  userRole: Role;
  userPermissions: Permission[];
  companyRoles?: Array<{ id: string; name: string; permissions: Permission[] }>;
  onPermissionChange?: (roleId: string, permissions: Permission[]) => void;
  onError?: (error: string) => void;
}

const permissionGroups = {
  'Usuários': [
    Permission.USER_CREATE,
    Permission.USER_EDIT,
    Permission.USER_DEACTIVATE,
    Permission.USER_VIEW_ALL,
    Permission.USER_VIEW_DOWN
  ],
  'Tarefas': [
    Permission.TASK_CREATE_DOWN,
    Permission.TASK_CREATE_UP,
    Permission.TASK_CREATE_SAME,
    Permission.TASK_CREATE_TO_DEPT,
    Permission.TASK_EDIT_OWN,
    Permission.TASK_EDIT_DOWN,
    Permission.TASK_DELETE_OWN,
    Permission.TASK_DELETE_ANY,
    Permission.TASK_REASSIGN
  ],
  'Kanban': [
    Permission.BOARD_VIEW_OWN,
    Permission.BOARD_VIEW_DOWN,
    Permission.BOARD_VIEW_UP,
    Permission.BOARD_VIEW_SAME,
    Permission.BOARD_VIEW_DEPT,
    Permission.BOARD_MOVE_OWN,
    Permission.BOARD_MOVE_DEPT
  ],
  'Departamento': [
    Permission.DEPARTMENT_CREATE,
    Permission.DEPARTMENT_EDIT,
    Permission.DEPARTMENT_DELETE,
    Permission.DEPARTMENT_LEADER,
    Permission.DEPARTMENT_VIEW_ALL
  ],
  'Cargos': [
    Permission.ROLE_CREATE,
    Permission.ROLE_EDIT,
    Permission.ROLE_DELETE
  ],
  'Empresa': [
    Permission.COMPANY_CONFIG,
    Permission.COMPANY_VIEW_ANALYTICS
  ],
  'Comunicação': [
    Permission.COMMUNICATION_CROSS_DEPT,
    Permission.COMMUNICATION_VIEW_ALL
  ]
};

const permissionDescriptions: Record<Permission, string> = {
  [Permission.USER_CREATE]: 'Criar novos usuários',
  [Permission.USER_EDIT]: 'Editar dados de usuários',
  [Permission.USER_DEACTIVATE]: 'Desativar usuários',
  [Permission.USER_VIEW_ALL]: 'Visualizar todos os usuários',
  [Permission.USER_VIEW_DOWN]: 'Visualizar subordinados',
  [Permission.TASK_CREATE_DOWN]: 'Criar tarefas para subordinados',
  [Permission.TASK_CREATE_UP]: 'Criar tarefas para superiores',
  [Permission.TASK_CREATE_SAME]: 'Criar tarefas para colegas',
  [Permission.TASK_CREATE_TO_DEPT]: 'Criar tarefas para departamentos',
  [Permission.TASK_EDIT_OWN]: 'Editar suas próprias tarefas',
  [Permission.TASK_EDIT_DOWN]: 'Editar tarefas de subordinados',
  [Permission.TASK_DELETE_OWN]: 'Deletar suas próprias tarefas',
  [Permission.TASK_DELETE_ANY]: 'Deletar qualquer tarefa',
  [Permission.TASK_REASSIGN]: 'Reatribuir tarefas',
  [Permission.BOARD_VIEW_OWN]: 'Visualizar suas tarefas no Kanban',
  [Permission.BOARD_VIEW_DOWN]: 'Visualizar tarefas de subordinados',
  [Permission.BOARD_VIEW_UP]: 'Visualizar tarefas de superiores',
  [Permission.BOARD_VIEW_SAME]: 'Visualizar tarefas de colegas',
  [Permission.BOARD_VIEW_DEPT]: 'Visualizar tarefas do departamento',
  [Permission.BOARD_MOVE_OWN]: 'Mover suas tarefas entre colunas',
  [Permission.BOARD_MOVE_DEPT]: 'Mover tarefas do departamento',
  [Permission.DEPARTMENT_CREATE]: 'Criar departamentos',
  [Permission.DEPARTMENT_EDIT]: 'Editar departamentos',
  [Permission.DEPARTMENT_DELETE]: 'Deletar departamentos',
  [Permission.DEPARTMENT_LEADER]: 'Ser líder de departamento',
  [Permission.DEPARTMENT_VIEW_ALL]: 'Visualizar todos os departamentos',
  [Permission.ROLE_CREATE]: 'Criar cargos/roles',
  [Permission.ROLE_EDIT]: 'Editar cargos/roles',
  [Permission.ROLE_DELETE]: 'Deletar cargos/roles',
  [Permission.COMPANY_CONFIG]: 'Configurar a empresa',
  [Permission.COMPANY_VIEW_ANALYTICS]: 'Visualizar análises da empresa',
  [Permission.COMMUNICATION_CROSS_DEPT]: 'Comunicar entre departamentos',
  [Permission.COMMUNICATION_VIEW_ALL]: 'Visualizar toda comunicação'
};

const PermissionsDashboard: React.FC<PermissionsDashboardProps> = ({
  userId,
  userRole,
  userPermissions,
  companyRoles = [],
  onPermissionChange,
  onError
}) => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [filteredPermissions, setFilteredPermissions] = useState<Permission[]>(userPermissions);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const filtered = userPermissions.filter(
        perm =>
          perm.toLowerCase().includes(term) ||
          (permissionDescriptions[perm] && permissionDescriptions[perm].toLowerCase().includes(term))
      );
      setFilteredPermissions(filtered);
    } else {
      setFilteredPermissions(userPermissions);
    }
  }, [searchTerm, userPermissions]);

  const getPermissionColor = (perm: Permission): string => {
    const group = Object.entries(permissionGroups).find(([_, perms]) => perms.includes(perm))?.[0];
    const colors: Record<string, string> = {
      'Usuários': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'Tarefas': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      'Kanban': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      'Departamento': 'bg-green-500/20 text-green-300 border-green-500/30',
      'Cargos': 'bg-pink-500/20 text-pink-300 border-pink-500/30',
      'Empresa': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      'Comunicação': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
    };
    return colors[group || 'Usuários'] || colors['Usuários'];
  };

  const getGroupIcon = (group: string): string => {
    const icons: Record<string, string> = {
      'Usuários': '👥',
      'Tarefas': '📋',
      'Kanban': '📊',
      'Departamento': '🏢',
      'Cargos': '🎯',
      'Empresa': '🏛️',
      'Comunicação': '💬'
    };
    return icons[group] || '📌';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">
              🔐 Painel de Permissões
            </h2>
            <p className="text-sm text-slate-400">Gerenciar permissões granulares por cargo</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-400 mb-1">Suas permissões:</div>
            <div className="text-2xl font-black text-blue-400">{userPermissions.length}</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <input
          type="text"
          placeholder="🔍 Buscar permissões..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar - Grupos */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 h-fit">
          <h3 className="text-sm font-black text-slate-300 uppercase mb-3">Categorias</h3>
          <div className="space-y-2">
            <button
              onClick={() => setSelectedRole(null)}
              className={`w-full text-left px-4 py-2 rounded-lg transition-all text-sm font-bold ${
                selectedRole === null
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              📌 Todas ({userPermissions.length})
            </button>

            {Object.entries(permissionGroups).map(([group, perms]) => {
              const count = userPermissions.filter(p => perms.includes(p)).length;
              return (
                <button
                  key={group}
                  onClick={() => setSelectedRole(group)}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-all text-sm font-bold flex justify-between items-center ${
                    selectedRole === group
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>{getGroupIcon(group)} {group}</span>
                  <span className="text-xs bg-slate-900 px-2 py-1 rounded">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main - Permissões */}
        <div className="lg:col-span-2 space-y-4">
          {/* Permissões por Grupo */}
          {Object.entries(permissionGroups).map(([group, perms]) => {
            if (selectedRole && selectedRole !== group) return null;

            const groupPermissions = userPermissions.filter(p => perms.includes(p));
            if (groupPermissions.length === 0 && selectedRole) return null;

            return (
              <div key={group} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="text-2xl">{getGroupIcon(group)}</div>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tighter">{group}</h3>
                    <div className="text-xs text-slate-400">{groupPermissions.length}/{perms.length} permissões</div>
                  </div>
                </div>

                <div className="space-y-2">
                  {perms.map(perm => {
                    const hasPermission = userPermissions.includes(perm);
                    return (
                      <div
                        key={perm}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          hasPermission
                            ? `${getPermissionColor(perm)} border-current`
                            : 'bg-slate-800 border-slate-700 text-slate-500 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`text-lg mt-0.5 ${hasPermission ? '' : 'opacity-50'}`}>
                            {hasPermission ? '✅' : '❌'}
                          </div>
                          <div className="flex-1">
                            <div className="text-xs font-mono uppercase tracking-wider">{perm}</div>
                            <div className="text-sm font-semibold mt-1">{permissionDescriptions[perm]}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Empty State */}
          {filteredPermissions.length === 0 && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
              <div className="text-2xl mb-2">🔒</div>
              <div>Nenhuma permissão encontrada</div>
              <p className="text-xs mt-2">Você não tem as permissões buscadas</p>
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-900/20 border border-blue-800/50 rounded-2xl p-4">
        <div className="text-sm text-blue-300">
          <p className="font-bold mb-2">ℹ️ Informações:</p>
          <ul className="space-y-1 text-xs">
            <li>• ✅ Permissões que você possui e pode usar</li>
            <li>• ❌ Permissões que você não possui (restritas)</li>
            <li>• Algumas permissões podem ser escalonadas automaticamente para superiores hierárquicos</li>
            <li>• Permissões podem variar por departamento ou empresa</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PermissionsDashboard;
