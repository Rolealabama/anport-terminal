import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import ConfirmationModal from './ConfirmationModal.tsx';
import { hashPassword, generateSalt } from '../utils.ts';
import { db } from '../firebase.ts';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

const VALID_USER = /^[a-z0-9_]{3,15}$/;

interface DevSupportManagementProps {
  devId: string;
}

const DevSupportManagement: React.FC<DevSupportManagementProps> = ({ devId }) => {
  const [supportUsers, setSupportUsers] = useState<User[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Sincronização de usuários de suporte global
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "support_users"), (snap) => {
      setSupportUsers(snap.docs.map(d => ({ ...d.data(), username: d.id } as User)));
    });
    return unsub;
  }, []);

  const validate = () => {
    const cleanUser = formData.username?.toLowerCase().trim() || '';
    const password = formData.password || '';
    const name = formData.name?.trim() || '';

    if (!name || name.length < 2) return "Nome mínimo 2 caracteres.";
    if (!VALID_USER.test(cleanUser)) return "Usuário inválido (3-15 letras/números minúsculos).";
    if (password.length < 6) return "Senha mínima 6 caracteres.";
    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validate();
    if (error) { 
      setValidationError(error); 
      return; 
    }

    const cleanUser = formData.username.toLowerCase().trim();
    let finalPassword = formData.password;
    let finalSalt = formData.passwordSalt || generateSalt();

    if (!editingId || formData.password.length < 30) {
      finalPassword = await hashPassword(formData.password, finalSalt);
    }

    try {
      await setDoc(doc(db, "support_users", cleanUser), {
        username: cleanUser,
        name: formData.name.trim(),
        role: Role.SUPPORT,
        password: finalPassword,
        passwordSalt: finalSalt,
        email: formData.email || '',
        phone: formData.phone || '',
        createdBy: devId,
        createdAt: formData.createdAt || Date.now(),
        isActive: formData.isActive !== false,
        canCreateCompany: formData.canCreateCompany === true
      });

      setSuccessMessage(editingId ? 'Agente atualizado com sucesso!' : 'Agente de suporte criado com sucesso!');
      setTimeout(() => setSuccessMessage(null), 3000);
      closeForm();
    } catch (err) {
      setValidationError('Erro ao salvar no Firestore.');
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    try {
      await deleteDoc(doc(db, "support_users", itemToDelete));
      setItemToDelete(null);
    } catch (err) {
      setValidationError('Erro ao deletar.');
    }
  };

  const closeForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({});
    setValidationError(null);
  };

  const startEdit = (user: User) => {
    setFormData(user);
    setEditingId(user.username);
    setIsAdding(true);
  };

  const filteredUsers = supportUsers.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const name = (user.name || '').toLowerCase();
    const username = (user.username || '').toLowerCase();
    return name.includes(searchLower) || username.includes(searchLower);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-slate-900 p-6 rounded-3xl border border-slate-800 gap-4">
        <div>
          <h2 className="text-xl font-black uppercase text-white">🆘 Agentes de Suporte</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Gerenciar equipe de suporte global</p>
        </div>
        <div className="flex flex-1 md:max-w-md gap-3">
          <input 
            type="text" 
            placeholder="BUSCAR..." 
            className="flex-1 bg-slate-950 border border-slate-800 px-6 py-3 rounded-2xl text-[10px] font-black uppercase text-blue-400 outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <button 
            onClick={() => setIsAdding(true)} 
            className="bg-green-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-green-700"
          >
            + NOVO AGENTE
          </button>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-900/20 border border-green-700/50 rounded-2xl p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="text-green-400 font-bold">{successMessage}</p>
        </div>
      )}

      {/* Form */}
      {isAdding && (
        <div className="bg-slate-900 border border-green-900/30 p-8 rounded-3xl shadow-2xl">
          <form onSubmit={handleSave} className="space-y-4">
            {validationError && (
              <div className="p-3 bg-red-900/20 text-red-500 text-[10px] font-black uppercase rounded-xl text-center">
                {validationError}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                required 
                placeholder="NOME COMPLETO"
                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-green-500"
                value={formData.name || ''}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
              <input 
                required 
                placeholder="USUÁRIO (ex: joao_silva)"
                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-green-500"
                value={formData.username || ''}
                onChange={e => setFormData({...formData, username: e.target.value})}
                disabled={!!editingId}
              />
              <input 
                required 
                type="password" 
                placeholder="SENHA"
                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-green-500"
                value={formData.password || ''}
                onChange={e => setFormData({...formData, password: e.target.value})}
              />
              <input 
                type="email" 
                placeholder="EMAIL (opcional)"
                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-green-500"
                value={formData.email || ''}
                onChange={e => setFormData({...formData, email: e.target.value})}
              />
              <input 
                type="tel" 
                placeholder="TELEFONE (opcional)"
                className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none focus:border-green-500"
                value={formData.phone || ''}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
              <label className="flex items-center gap-3 p-4 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:border-green-500">
                <input 
                  type="checkbox" 
                  checked={formData.isActive !== false}
                  onChange={e => setFormData({...formData, isActive: e.target.checked})}
                  className="w-4 h-4"
                />
                <span className="text-white font-bold text-sm">Ativo</span>
              </label>
              <label className="flex items-center gap-3 p-4 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:border-purple-500">
                <input 
                  type="checkbox" 
                  checked={formData.canCreateCompany === true}
                  onChange={e => setFormData({...formData, canCreateCompany: e.target.checked})}
                  className="w-4 h-4"
                />
                <span className="text-white font-bold text-sm">Pode Criar Empresas</span>
              </label>
            </div>
            <div className="flex gap-4 pt-4">
              <button type="button" onClick={closeForm} className="flex-1 py-4 text-slate-500 font-black uppercase text-[10px]">
                Cancelar
              </button>
              <button type="submit" className="flex-1 py-4 bg-green-600 text-white rounded-xl font-black uppercase text-[10px] hover:bg-green-700">
                Salvar Agente
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((user) => (
          <div 
            key={user.username} 
            className={`group bg-slate-900 border rounded-3xl p-6 space-y-4 transition-all shadow-lg relative overflow-hidden ${
              user.isActive !== false 
                ? 'border-green-800 hover:border-green-700' 
                : 'border-slate-700 opacity-60'
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-white font-black text-sm">{user.name}</h3>
                <p className="text-slate-400 text-[10px] font-bold">@{user.username}</p>
              </div>
              <span className={`px-2 py-1 rounded text-[9px] font-black ${
                user.isActive !== false 
                  ? 'bg-green-900/20 text-green-400 border border-green-700/50' 
                  : 'bg-gray-900/20 text-gray-400 border border-gray-700/50'
              }`}>
                {user.isActive !== false ? '✓ ATIVO' : '✗ INATIVO'}
              </span>
            </div>

            {user.email && <p className="text-slate-400 text-[10px]">📧 {user.email}</p>}
            {user.phone && <p className="text-slate-400 text-[10px]">📱 {user.phone}</p>}
            {user.canCreateCompany && <p className="text-purple-400 text-[10px] font-bold">🏢 Pode criar empresas</p>}
            
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity pt-2 border-t border-slate-800">
              <button
                onClick={() => startEdit(user)}
                className="flex-1 p-2 text-blue-400 hover:text-blue-300 font-bold text-[10px] uppercase transition-colors"
                title="Editar"
              >
                ✏️ EDITAR
              </button>
              <button
                onClick={() => setItemToDelete(user.username)}
                className="flex-1 p-2 text-red-400 hover:text-red-300 font-bold text-[10px] uppercase transition-colors"
                title="Deletar"
              >
                🗑️ DELETAR
              </button>
            </div>
          </div>
        ))}

        {filteredUsers.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 bg-slate-900/30 rounded-2xl border border-slate-800 border-dashed">
            <svg className="w-16 h-16 text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM6 20h12a6 6 0 00-6-6 6 6 0 00-6 6z" />
            </svg>
            <p className="text-slate-400 font-bold">Nenhum agente de suporte criado</p>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {itemToDelete && (
        <ConfirmationModal
          title="Remover Agente"
          message={`Tem certeza que deseja remover o agente ${itemToDelete}? Esta ação é irreversível.`}
          onConfirm={handleDelete}
          onCancel={() => setItemToDelete(null)}
        />
      )}
    </div>
  );
};

export default DevSupportManagement;
