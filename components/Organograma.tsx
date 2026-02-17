import React, { useState, useEffect } from 'react';
import { User, UserStatus, Role } from '../types-v2';
import { HierarchyService } from '../services/HierarchyService';

interface OrganolamaProps {
  companyId: string;
  userId: string;
  onSelectUser?: (user: User) => void;
  onError?: (error: string) => void;
}

interface OrgNode extends User {
  subordinates: OrgNode[];
  level: number;
}

const Organograma: React.FC<OrganolamaProps> = ({
  companyId,
  userId,
  onSelectUser,
  onError
}) => {
  const [root, setRoot] = useState<OrgNode | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>(userId);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([userId]));

  useEffect(() => {
    loadHierarchy();
  }, [companyId]);

  const loadHierarchy = async () => {
    try {
      setIsLoading(true);
      // TODO: Implementar carregamento da hierarquia via HierarchyService
      // const hierarchy = await HierarchyService.getCompanyHierarchy(companyId);
      // setRoot(hierarchy);
    } catch (error) {
      onError?.(`Erro ao carregar hierarquia: ${error instanceof Error ? error.message : 'Desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status: UserStatus) => {
    const badges = {
      [UserStatus.ACTIVE]: { bg: 'bg-green-500/20', text: 'text-green-300', label: '🟢 Ativo' },
      [UserStatus.INACTIVE]: { bg: 'bg-gray-500/20', text: 'text-gray-300', label: '⚪ Inativo' },
      [UserStatus.SUSPENDED]: { bg: 'bg-red-500/20', text: 'text-red-300', label: '🔴 Suspenso' }
    };
    const badge = badges[status] || badges[UserStatus.ACTIVE];
    return badge;
  };

  const OrgNode: React.FC<{ node: OrgNode; level: number }> = ({ node, level }) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasSubordinates = node.subordinates && node.subordinates.length > 0;
    const isSelected = selectedUserId === node.id;
    const statusBadge = getStatusBadge(node.status);

    return (
      <div className="space-y-1">
        <div
          className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
            isSelected
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
          }`}
          style={{ marginLeft: `${level * 20}px` }}
          onClick={() => {
            setSelectedUserId(node.id);
            onSelectUser?.(node);
          }}
        >
          {/* Expander */}
          {hasSubordinates && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="text-slate-400 hover:text-slate-200"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          {!hasSubordinates && <div className="w-5" />}

          {/* Avatar */}
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
            {node.name.charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white truncate">{node.name}</div>
            <div className="text-xs text-slate-400 truncate">{node.roleId}</div>
          </div>

          {/* Status Badge */}
          <div className={`text-xs font-bold px-2 py-1 rounded-full ${statusBadge.bg} ${statusBadge.text}`}>
            {statusBadge.label}
          </div>

          {/* Subordinates Count */}
          {hasSubordinates && (
            <div className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-full font-bold">
              {node.subordinates.length}
            </div>
          )}
        </div>

        {/* Subordinates */}
        {isExpanded && hasSubordinates && (
          <div className="border-l-2 border-slate-700 pl-2">
            {node.subordinates.map(subordinate => (
              <OrgNode key={subordinate.id} node={subordinate} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-400 text-center">
          <div className="text-2xl mb-2">⏳</div>
          <div>Carregando organograma...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">
              📊 Organograma
            </h2>
            <p className="text-sm text-slate-400">Hierarquia organizacional da empresa</p>
          </div>
          <button
            onClick={loadHierarchy}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition-colors"
          >
            🔄 Atualizar
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
        <div className="text-sm text-slate-300">
          <p className="font-bold mb-2">📌 Como usar:</p>
          <ul className="space-y-1 text-xs text-slate-400">
            <li>• Clique em ▶/▼ para expandir/colapsar subordinados</li>
            <li>• Clique em um usuário para selecionar e visualizar detalhes</li>
            <li>• Status: 🟢 Ativo • ⚪ Inativo • 🔴 Suspenso</li>
          </ul>
        </div>
      </div>

      {/* Tree */}
      {root ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 max-h-96 overflow-y-auto">
          <OrgNode node={root} level={0} />
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
          <div className="text-2xl mb-2">🌳</div>
          <div>Nenhuma hierarquia disponível</div>
          <p className="text-xs mt-2">Configure a hierarquia da empresa para visualizá-la aqui</p>
        </div>
      )}

      {/* Selected User Details */}
      {selectedUserId && root && (
        <div className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-800/50 rounded-2xl p-6">
          <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-4">
            👤 Detalhes do Usuário
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-slate-400 uppercase font-bold mb-1">Nome</div>
              <div className="text-white font-bold">{root.name}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase font-bold mb-1">Cargo</div>
              <div className="text-white font-bold">{root.roleId}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase font-bold mb-1">Status</div>
              <div className={`font-bold ${getStatusBadge(root.status).text}`}>{getStatusBadge(root.status).label}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase font-bold mb-1">Nível Hierárquico</div>
              <div className="text-white font-bold">{root.hierarchyLevel || 0}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Organograma;
