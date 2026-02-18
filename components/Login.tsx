
import React, { useState, useEffect } from 'react';
import { User, Role, Company, Store, CompanyMemberRecord } from '../types.ts';
import { hashPassword } from '../utils.ts';
import { db, isFirebaseConfigured } from '../firebase.ts';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

interface LoginProps {
  onLogin: (u: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [companyId, setCompanyId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFirebaseConfigured) return;
    
    setError('');
    setLoading(true);
    let hashUnavailableDetected = false;

    const safeHashPassword = async (rawPassword: string, salt: string) => {
      if (!salt) return '';
      try {
        return await hashPassword(rawPassword, salt);
      } catch {
        hashUnavailableDetected = true;
        return '';
      }
    };

    try {
      const normalizedCompanyId = companyId.toUpperCase().trim();
      const normalizedUser = username.toLowerCase().trim();

      const findCollaboratorByUsernameInCompany = async (companyIdToSearch: string) => {
        const storesSnap = await getDocs(query(collection(db, "stores"), where("companyId", "==", companyIdToSearch)));
        const storeIds = storesSnap.docs.map(d => d.id);

        for (const storeId of storeIds) {
          const cfg = await getDoc(doc(db, "stores_config", storeId));
          if (!cfg.exists()) continue;
          const data = cfg.data();
          const member = data.teamMembers?.find((m: any) => (m.username || '').toLowerCase().trim() === normalizedUser);
          if (member) return { storeId, member };
        }
        return null;
      };

      // 1. MASTER DEV BYPASS (Via Environment Variables)
      const SUPERADMIN_USER = import.meta.env.VITE_SUPERADMIN_USERNAME || 'superadmin';
      const SUPERADMIN_PASS = import.meta.env.VITE_SUPERADMIN_PASSWORD || 'master123';
      
      if (normalizedUser === SUPERADMIN_USER && password === SUPERADMIN_PASS) {
        onLogin({ username: SUPERADMIN_USER, role: Role.DEV, name: 'SISTEMA / DEV', storeId: 'GLOBAL' });
        return;
      }

      // 2. LOGIN MODERNO (EMPRESA + USERNAME) VIA company_members
      if (normalizedCompanyId) {
        const companySnap = await getDoc(doc(db, "companies", normalizedCompanyId));
        if (!companySnap.exists()) {
          setError('Empresa não encontrada.');
          return;
        }
        const companyData = companySnap.data() as Company;
        if (companyData.isSuspended) {
          setError('Acesso suspenso por pendências financeiras.');
          return;
        }

        const memberId = `${normalizedCompanyId}__${normalizedUser}`;
        const memberSnap = await getDoc(doc(db, "company_members", memberId));
        if (memberSnap.exists()) {
          const member = { ...(memberSnap.data() as any), id: memberSnap.id } as CompanyMemberRecord;

          if (member.isActive === false) {
            setError('Usuário desativado.');
            return;
          }

          const salt = member.passwordSalt || '';
          const inputHash = await safeHashPassword(password, salt);
          if (member.password === password || member.password === inputHash) {
            if (member.storeId) {
              const storeSnap = await getDoc(doc(db, "stores", member.storeId));
              if (!storeSnap.exists()) {
                setError('Unidade não encontrada.');
                return;
              }
              const storeData = storeSnap.data() as Store;
              if (storeData.isBlocked) {
                setError('Unidade bloqueada.');
                return;
              }
            }

            onLogin({
              username: normalizedUser,
              role: member.role,
              name: member.name,
              companyId: normalizedCompanyId,
              storeId: member.storeId
            });
            return;
          }
        }
      }

      // 3. FALLBACK LEGACY: COMPANY ADMIN (companies.adminUsername)
      if (normalizedCompanyId) {
        const legacyCompanySnap = await getDoc(doc(db, "companies", normalizedCompanyId));
        if (legacyCompanySnap.exists()) {
          const companyData = legacyCompanySnap.data() as Company;
          const salt = companyData.passwordSalt || '';
          const inputHash = await safeHashPassword(password, salt);

          if ((companyData.adminUsername || '').toLowerCase().trim() === normalizedUser && (companyData.adminPassword === password || companyData.adminPassword === inputHash)) {
            if (companyData.isSuspended) {
              setError('Acesso suspenso por pendências financeiras.');
              return;
            }
            onLogin({ username: normalizedUser, role: Role.COMPANY, name: companyData.name, companyId: normalizedCompanyId });
            return;
          }
        }
      }

      // 4. FALLBACK LEGACY: STORE ADMIN (stores.adminUsername) - AGORA REQUER EMPRESA
      if (normalizedCompanyId) {
        const qStoreAdmin = query(
          collection(db, "stores"),
          where("companyId", "==", normalizedCompanyId),
          where("adminUsername", "==", normalizedUser)
        );
        const storeAdminSnap = await getDocs(qStoreAdmin);
        if (!storeAdminSnap.empty) {
          const storeDoc = storeAdminSnap.docs[0];
          const storeData = storeDoc.data() as Store;
          if (storeData.isBlocked) {
            setError('Unidade bloqueada.');
            return;
          }
          const salt = storeData.passwordSalt || '';
          const inputHash = await safeHashPassword(password, salt);
          if (storeData.adminPassword === password || storeData.adminPassword === inputHash) {
            onLogin({
              username: normalizedUser,
              role: Role.ADMIN,
              name: storeData.adminName,
              storeId: storeDoc.id,
              companyId: normalizedCompanyId
            });
            return;
          }
        }
      }

      // 5. FALLBACK LEGACY: COLABORADOR EM stores_config.teamMembers - AGORA REQUER EMPRESA
      if (normalizedCompanyId) {
        const match = await findCollaboratorByUsernameInCompany(normalizedCompanyId);
        if (match) {
          const storeId = match.member.storeId || match.storeId;
          const storeRef = doc(db, "stores", storeId);
          const storeSnap = await getDoc(storeRef);
          if (!storeSnap.exists()) {
            setError('Unidade não encontrada.');
            return;
          }
          const storeData = storeSnap.data() as Store;
          if (storeData.isBlocked) {
            setError('Unidade bloqueada.');
            return;
          }

          const salt = match.member.passwordSalt || '';
          const inputHash = await safeHashPassword(password, salt);
          if (match.member.password === password || match.member.password === inputHash) {
            onLogin({
              username: normalizedUser,
              role: Role.USER,
              name: match.member.name,
              storeId,
              companyId: normalizedCompanyId
            });
            return;
          }
        }
      }

      // 6. BUSCA AGENTE DE SUPORTE GLOBAL (NÃO DEPENDE DE EMPRESA)
      const qSupport = query(collection(db, "support_users"), where("username", "==", normalizedUser));
      const supportSnap = await getDocs(qSupport);
      if (supportSnap && !supportSnap.empty) {
        const supportData = supportSnap.docs[0].data() as any;
        
        if (!supportData.isActive) {
          setError('Agente de suporte desativado.');
          setLoading(false);
          return;
        }

        const salt = supportData.passwordSalt || '';
        const inputHash = await safeHashPassword(password, salt);
        
        if (supportData.password === password || supportData.password === inputHash) {
          onLogin({
            username: normalizedUser,
            role: Role.SUPPORT,
            name: supportData.name,
            companyId: supportData.companyId || 'ANPORT',
            canCreateCompany: supportData.canCreateCompany === true
          });
          return;
        }
      }

      // 7. SUPERADMIN DINÂMICO (REGRESSÃO / OPERAÇÃO)
      const qDynamicSuperAdmin = query(collection(db, "super_admin_users"), where("username", "==", normalizedUser));
      const dynamicSuperAdminSnap = await getDocs(qDynamicSuperAdmin);
      if (dynamicSuperAdminSnap && !dynamicSuperAdminSnap.empty) {
        const adminData = dynamicSuperAdminSnap.docs[0].data() as any;

        if (adminData.isActive === false) {
          setError('Super admin desativado.');
          setLoading(false);
          return;
        }

        const salt = adminData.passwordSalt || '';
        const inputHash = await safeHashPassword(password, salt);
        if (adminData.password === password || adminData.password === inputHash) {
          onLogin({
            username: normalizedUser,
            role: Role.DEV,
            name: adminData.name || 'SISTEMA / DEV',
            storeId: 'GLOBAL'
          });
          return;
        }
      }

      if (hashUnavailableDetected) {
        setError('Conexão via IP HTTP pode bloquear login com senha criptografada. Use localhost no PC ou HTTPS para celular.');
      } else if (!normalizedCompanyId) {
        setError('Informe a empresa para acessar.');
      } else {
        setError('Credenciais inválidas.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro de conexão com o banco de dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-6 bg-slate-950">
      <div className="w-full max-w-sm md:max-w-md bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl space-y-8 fade-in">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/30">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tighter uppercase">AnPort</h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">SISTEMA EM NUVEM (FIREBASE)</p>
          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-2">Setor detectado automaticamente</p>
        </div>

        {error && (
          <div className="p-4 bg-red-900/20 border border-red-900/40 text-red-500 text-[10px] font-black uppercase rounded-2xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-600 uppercase ml-1 tracking-widest">Acesso por Empresa</label>
            <input 
              placeholder="EMPRESA (EX: ACME01)"
              className="w-full bg-slate-800 border border-slate-700 px-5 py-4 rounded-2xl outline-none text-white focus:ring-2 focus:ring-blue-600 transition-all mb-2"
              value={companyId}
              onChange={e => setCompanyId(e.target.value)}
            />
            <label className="text-[9px] font-black text-slate-600 uppercase ml-1 tracking-widest">Identidade Pessoal</label>
            <input 
              required 
              placeholder="USUÁRIO" 
              className="w-full bg-slate-800 border border-slate-700 px-5 py-4 rounded-2xl outline-none text-white focus:ring-2 focus:ring-blue-600 transition-all mb-2" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
            />
            <input 
              required 
              type="password" 
              placeholder="SENHA" 
              className="w-full bg-slate-800 border border-slate-700 px-5 py-4 rounded-2xl outline-none text-white focus:ring-2 focus:ring-blue-600 transition-all" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl uppercase tracking-widest text-[11px] shadow-xl active:scale-95 disabled:opacity-50 mt-4"
          >
            {loading ? 'Conectando à Nuvem...' : 'Acessar Terminal'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
