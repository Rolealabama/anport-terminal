
import React, { useState, useEffect } from 'react';
import { Company, Store, Role, User } from '../types.ts';
import ConfirmationModal from './ConfirmationModal.tsx';
import { hashPassword, generateSalt } from '../utils.ts';
import { db } from '../firebase.ts';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, updateDoc, getDocs, writeBatch } from 'firebase/firestore';

const VALID_ID = /^[A-Z0-9]{3,10}$/;
const VALID_USER = /^[a-z0-9_]{3,15}$/;

interface SuperAdminDashboardProps {
  mode: Role.DEV | Role.COMPANY | Role.SUPPORT;
  companyId?: string;
  canCreateNew?: boolean;
  canManageExisting?: boolean;
}

const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  mode,
  companyId,
  canCreateNew = true,
  canManageExisting = true
}) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [supportUsers, setSupportUsers] = useState<User[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [itemToToggleStatus, setItemToToggleStatus] = useState<any>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Sincronização em tempo real das Empresas, Lojas e Usuários de Suporte
  useEffect(() => {
    if (mode === Role.DEV) {
      const unsub = onSnapshot(collection(db, "companies"), 
        (snap) => {
          setCompanies(snap.docs.map(d => ({ ...d.data(), id: d.id } as Company)));
        },
        (error) => console.error("Erro ao carregar empresas:", error)
      );
      return unsub;
    } else if (mode === Role.COMPANY && companyId) {
      const q = query(collection(db, "stores"), where("companyId", "==", companyId));
      const unsub = onSnapshot(q, 
        (snap) => {
          setStores(snap.docs.map(d => ({ ...d.data(), id: d.id } as Store)));
        },
        (error) => console.error("Erro ao carregar lojas:", error)
      );
      return unsub;
    } else if (mode === Role.SUPPORT && companyId) {
      const q = query(collection(db, "support_users"), where("companyId", "==", companyId));
      const unsub = onSnapshot(q, 
        (snap) => {
          setSupportUsers(snap.docs.map(d => ({ ...d.data(), username: d.id } as User)));
        },
        (error) => console.error("Erro ao carregar usuários de suporte:", error)
      );
      return unsub;
    }
  }, [mode, companyId]);

  const validate = () => {
    const cleanId = formData.id?.toUpperCase().trim() || '';
    const cleanUser = formData.adminUsername?.toLowerCase().trim() || '';
    const password = formData.adminPassword || '';
    if (!VALID_ID.test(cleanId)) return "ID inválido (3-10 letras/números).";
    if (!VALID_USER.test(cleanUser)) return "Usuário inválido (3-15 letras minúsculas).";
    if (password.length < 6) return "Senha mínima 6 caracteres.";
    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validate();
    if (error) { setValidationError(error); return; }

    const cleanId = formData.id.toUpperCase().trim();
    let finalPassword = formData.adminPassword;
    let finalSalt = formData.passwordSalt || generateSalt();

    // Se é novo ou a senha foi editada, gera novo hash
    if (!editingId || (formData.adminPassword && formData.adminPassword.length < 30)) {
       finalPassword = await hashPassword(formData.adminPassword, finalSalt);
    }

    try {
      if (mode === Role.DEV) {
        await setDoc(doc(db, "companies", cleanId), {
          ...formData,
          id: cleanId,
          adminPassword: finalPassword,
          passwordSalt: finalSalt,
          createdAt: formData.createdAt || Date.now(),
          isSuspended: formData.isSuspended || false
        });
      } else if (mode === Role.COMPANY) {
        await setDoc(doc(db, "stores", cleanId), {
          ...formData,
          id: cleanId,
          companyId: companyId!,
          adminPassword: finalPassword,
          passwordSalt: finalSalt,
          createdAt: formData.createdAt || Date.now()
        });
      } else if (mode === Role.SUPPORT) {
        const cleanUser = formData.adminUsername.toLowerCase().trim();
        await setDoc(doc(db, "support_users", cleanUser), {
          username: cleanUser,
          role: Role.SUPPORT,
          name: formData.adminName || cleanUser,
          companyId: companyId!,
          password: finalPassword,
          passwordSalt: finalSalt,
          createdAt: formData.createdAt || Date.now()
        });
      }
      closeForm();
    } catch (err) {
      setValidationError("Erro ao salvar no Firestore.");
    }
  };

  const toggleCompanyStatus = async () => {
    if (!itemToToggleStatus) return;

    const nextStatus = !itemToToggleStatus.isSuspended;
    const companyRef = doc(db, "companies", itemToToggleStatus.id);

    const storesSnap = await getDocs(query(collection(db, "stores"), where("companyId", "==", itemToToggleStatus.id)));
    const batch = writeBatch(db);

    batch.update(companyRef, { isSuspended: nextStatus });
    storesSnap.docs.forEach(storeDoc => {
      batch.update(doc(db, "stores", storeDoc.id), { isBlocked: nextStatus });
    });

    await batch.commit();
    setItemToToggleStatus(null);
  };

  const deleteInBatches = async (docRefs: Array<{ path: string }>) => {
    const MAX_BATCH = 450;
    for (let i = 0; i < docRefs.length; i += MAX_BATCH) {
      const batch = writeBatch(db);
      const slice = docRefs.slice(i, i + MAX_BATCH);
      slice.forEach(ref => batch.delete(doc(db, ref.path)));
      await batch.commit();
    }
  };

  const deleteCompanyCascade = async (companyIdToDelete: string) => {
    const storesSnap = await getDocs(query(collection(db, "stores"), where("companyId", "==", companyIdToDelete)));
    const storeIds = storesSnap.docs.map(d => d.id);

    const deletions: Array<{ path: string }> = [];

    // Stores and configs
    storeIds.forEach(storeId => {
      deletions.push({ path: `stores/${storeId}` });
      deletions.push({ path: `stores_config/${storeId}` });
    });

    // Tasks and feedbacks per store
    for (const storeId of storeIds) {
      const tasksSnap = await getDocs(query(collection(db, "tasks"), where("storeId", "==", storeId)));
      tasksSnap.docs.forEach(d => deletions.push({ path: `tasks/${d.id}` }));

      const feedbacksSnap = await getDocs(query(collection(db, "feedbacks"), where("storeId", "==", storeId)));
      feedbacksSnap.docs.forEach(d => deletions.push({ path: `feedbacks/${d.id}` }));
    }

    await deleteInBatches(deletions);
    await deleteDoc(doc(db, "companies", companyIdToDelete));
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    if (mode === Role.DEV) {
      await deleteCompanyCascade(itemToDelete);
    } else if (mode === Role.COMPANY) {
      await deleteDoc(doc(db, "stores", itemToDelete));
    } else if (mode === Role.SUPPORT) {
      await deleteDoc(doc(db, "support_users", itemToDelete));
    }
    setItemToDelete(null);
  };

  const closeForm = () => { setIsAdding(false); setEditingId(null); setFormData({}); setValidationError(null); };

  const startEdit = (item: any) => { setFormData(item); setEditingId(item.id || item.username); setIsAdding(true); };

  const baseItems = mode === Role.DEV ? companies : mode === Role.COMPANY ? stores : supportUsers;
  const filteredItems = baseItems.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const name = (item.name || item.adminName || '').toLowerCase();
    const id = (item.id || item.username || '').toLowerCase();
    return name.includes(searchLower) || id.includes(searchLower);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-slate-900 p-6 rounded-3xl border border-slate-800 gap-4">
        <div>
          <h2 className="text-xl font-black uppercase text-white">
            {mode === Role.DEV ? 'Nuvem Corporativa' : mode === Role.COMPANY ? 'Gestão de Unidades' : 'Gerenciamento de Suporte'}
          </h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Dados Sincronizados via Firebase</p>
        </div>
        <div className="flex flex-1 md:max-w-md gap-3">
          <input 
            type="text" 
            placeholder="BUSCAR..." 
            className="flex-1 bg-slate-950 border border-slate-800 px-6 py-3 rounded-2xl text-[10px] font-black uppercase text-blue-400 outline-none"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {canCreateNew && (
            <button onClick={() => setIsAdding(true)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg">+ Novo</button>
          )}
        </div>
      </div>

      {isAdding && (
        <div className="bg-slate-900 border border-blue-900/30 p-8 rounded-3xl shadow-2xl">
          <form onSubmit={handleSave} className="space-y-4">
             {validationError && <div className="p-3 bg-red-900/20 text-red-500 text-[10px] font-black uppercase rounded-xl text-center">{validationError}</div>}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {mode !== Role.SUPPORT && <input required placeholder={mode === Role.DEV ? "ID DA EMPRESA" : "ID DA LOJA (EX: LOJA01)"} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none" value={formData.id || ''} onChange={e => setFormData({...formData, id: e.target.value})} disabled={!!editingId} />}
               <input required placeholder={mode === Role.SUPPORT ? "NOME DO AGENTE" : "NOME DE EXIBIÇÃO"} className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none" value={formData.name || formData.adminName || ''} onChange={e => setFormData({...formData, name: e.target.value, adminName: e.target.value})} />
               <input required placeholder="USUÁRIO" className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none" value={formData.adminUsername || ''} onChange={e => setFormData({...formData, adminUsername: e.target.value})} />
               <input required type="password" placeholder="SENHA" className="w-full bg-slate-950 border border-slate-800 p-4 rounded-xl text-white outline-none" value={formData.adminPassword || ''} onChange={e => setFormData({...formData, adminPassword: e.target.value})} />
             </div>
             <div className="flex gap-4 pt-4">
               <button type="button" onClick={closeForm} className="flex-1 py-4 text-slate-500 font-black uppercase text-[10px]">Cancelar</button>
               <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px]">Salvar na Nuvem</button>
             </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item: any) => (
          <div key={item.id} className="group bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 hover:border-blue-900/50 transition-all shadow-lg relative overflow-hidden">
            <div className="flex justify-between items-center">
              <span className="px-3 py-1 bg-blue-900/20 border border-blue-900/40 text-blue-400 rounded-lg text-[10px] font-black">{item.id || item.username}</span>
              {canManageExisting && (
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {mode === Role.DEV && (
                    <button
                      onClick={() => setItemToToggleStatus(item)}
                      className={`p-2 transition-colors ${item.isSuspended ? 'text-amber-400 hover:text-amber-300' : 'text-emerald-400 hover:text-emerald-300'}`}
                      title={item.isSuspended ? 'Reativar corporativa' : 'Inativar corporativa'}
                    >
                      {item.isSuspended ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 9v6m4-6v6m-9 6h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                      )}
                    </button>
                  )}
                  <button onClick={() => startEdit(item)} className="p-2 text-slate-500 hover:text-blue-400 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg></button>
                  <button onClick={() => setItemToDelete(item.id || item.username)} className="p-2 text-slate-500 hover:text-red-500 transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
              )}
            </div>
            <h3 className="text-lg font-bold text-white uppercase">{item.name || item.adminName}</h3>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between">
              <span className="text-[9px] text-slate-600 font-bold uppercase">Login</span>
              <span className="text-[10px] text-blue-500 font-black">@{item.adminUsername || item.username}</span>
            </div>
          </div>
        ))}
      </div>

      <ConfirmationModal
        isOpen={!!itemToDelete}
        title="Confirmar Exclusão?"
        message="Esta ação removerá permanentemente o acesso deste registro."
        onConfirm={handleDelete}
        onCancel={() => setItemToDelete(null)}
      />

      <ConfirmationModal
        isOpen={!!itemToToggleStatus}
        title={itemToToggleStatus?.isSuspended ? 'Reativar corporativa?' : 'Deseja realmente inativar a corporativa?'}
        message={itemToToggleStatus?.isSuspended
          ? 'Isso reativa a corporativa e todas as unidades ligadas a ela.'
          : 'Todas as unidades ligadas serão bloqueadas até a reativação.'}
        confirmLabel={itemToToggleStatus?.isSuspended ? 'Confirmar Reativação' : 'Confirmar Inativação'}
        confirmColor={itemToToggleStatus?.isSuspended ? 'bg-green-600' : 'bg-yellow-600'}
        onConfirm={toggleCompanyStatus}
        onCancel={() => setItemToToggleStatus(null)}
      />
    </div>
  );
};

export default SuperAdminDashboard;
