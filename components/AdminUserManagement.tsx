import React, { useState, useEffect } from 'react';
import { db } from '../firebase.ts';
import { collection, query, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { User as UserV2, Role as RoleV2, Permission as PermissionV2 } from '../types-v2.ts';
import { AuthorizationService } from '../services/AuthorizationService.ts';

interface AdminUserManagementProps {
  companyId: string;
  onClose: () => void;
}

const AdminUserManagement: React.FC<AdminUserManagementProps> = ({ companyId, onClose }) => {
  const [users, setUsers] = useState<UserV2[]>([]);
  const [roles, setRoles] = useState<RoleV2[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserV2 | null>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ name: '', email: '', roleId: '' });

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  const loadUsers = async () => {
    try {
      const q = query(collection(db, `companies/${companyId}/users`));
      const snapshot = await getDocs(q);
      setUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UserV2)));
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const loadRoles = async () => {
    try {
      const q = query(collection(db, `companies/${companyId}/roles`));
      const snapshot = await getDocs(q);
      setRoles(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as RoleV2)));
    } catch (error) {
      console.error('Erro ao carregar roles:', error);
    }
  };

  const handleCreateUser = async () => {
    if (!newUserForm.name || !newUserForm.email || !newUserForm.roleId) {
      alert('Preencha todos os campos');
      return;
    }

    try {
      const newUser = {
        name: newUserForm.name,
        email: newUserForm.email,
        roleId: newUserForm.roleId,
        companyId,
        status: 'ACTIVE' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await addDoc(collection(db, `companies/${companyId}/users`), newUser);
      setNewUserForm({ name: '', email: '', roleId: '' });
      setIsCreatingUser(false);
      loadUsers();
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      alert('Erro ao criar usuário');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Deletar este usuário?')) {
      try {
        await deleteDoc(doc(db, `companies/${companyId}/users`, userId));
        loadUsers();
      } catch (error) {
        console.error('Erro ao deletar usuário:', error);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 rounded-3xl border border-slate-800 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 sticky top-0 bg-slate-900">
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Gerenciar Usuários</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-6">
          {/* Botão criar usuário */}
          <button
            onClick={() => setIsCreatingUser(!isCreatingUser)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
          >
            {isCreatingUser ? 'Cancelar' : '+ Novo Usuário'}
          </button>

          {/* Formulário criar usuário */}
          {isCreatingUser && (
            <div className="p-4 bg-slate-800 rounded-lg border border-slate-700 space-y-4">
              <input
                type="text"
                placeholder="Nome"
                value={newUserForm.name}
                onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white"
              />
              <input
                type="email"
                placeholder="Email"
                value={newUserForm.email}
                onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white"
              />
              <select
                value={newUserForm.roleId}
                onChange={(e) => setNewUserForm({ ...newUserForm, roleId: e.target.value })}
                className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white"
              >
                <option value="">Selecionar Permissão</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
              <button
                onClick={handleCreateUser}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold"
              >
                Criar Usuário
              </button>
            </div>
          )}

          {/* Lista de usuários */}
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-white">Usuários ({users.length})</h3>
            {users.length === 0 ? (
              <p className="text-slate-400">Nenhum usuário criado</p>
            ) : (
              <div className="space-y-2">
                {users.map(u => (
                  <div key={u.id} className="p-4 bg-slate-800 rounded-lg border border-slate-700 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">{u.name}</p>
                      <p className="text-sm text-slate-400">{u.email}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Status: <span className={u.status === 'ACTIVE' ? 'text-green-400' : 'text-red-400'}>{u.status}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedUser(u)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-bold"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-bold"
                      >
                        Deletar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detalhes do usuário selecionado */}
          {selectedUser && (
            <div className="p-4 bg-slate-800 rounded-lg border border-slate-700">
              <h3 className="text-lg font-bold text-white mb-4">Editar: {selectedUser.name}</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-bold text-slate-300 mb-1">Status</label>
                  <select
                    defaultValue={selectedUser.status}
                    onChange={(e) => {
                      const newStatus = e.target.value as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
                      updateDoc(doc(db, `companies/${companyId}/users`, selectedUser.id), { status: newStatus });
                      loadUsers();
                      setSelectedUser(null);
                    }}
                    className="w-full bg-slate-700 border border-slate-600 rounded p-2 text-white"
                  >
                    <option value="ACTIVE">Ativo</option>
                    <option value="INACTIVE">Inativo</option>
                    <option value="SUSPENDED">Suspenso</option>
                  </select>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUserManagement;
