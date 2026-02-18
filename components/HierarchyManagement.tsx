import React, { useMemo, useState, useEffect } from 'react';
import { collection, onSnapshot, query, setDoc, doc, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase.ts';
import { CompanyMemberRecord, Role } from '../types.ts';
import { generateSalt, hashPassword } from '../utils.ts';
import { buildChildrenMap, canRepointLeader, getDescendants } from '../services/hierarchy.ts';

const VALID_USER = /^[a-z0-9_]{3,15}$/;

const normalizeRole = (r: Role): Role => (r === Role.ADMIN ? Role.MANAGER : r);

const roleRank = (r: Role) => {
  const rr = normalizeRole(r);
  if (rr === Role.COMPANY) return 4;
  if (rr === Role.MANAGER) return 3;
  if (rr === Role.SUPERVISOR) return 2;
  if (rr === Role.USER) return 1;
  return 0;
};

const canManageTarget = (current: Role, target: Role) => {
  const c = normalizeRole(current);
  const t = normalizeRole(target);
  if (c === Role.COMPANY) return true;
  if (c === Role.MANAGER) return t === Role.SUPERVISOR || t === Role.USER;
  if (c === Role.SUPERVISOR) return t === Role.USER;
  return false;
};

const roleLabel = (r: Role) => {
  const rr = normalizeRole(r);
  if (rr === Role.COMPANY) return 'RESPONSÁVEL';
  if (rr === Role.MANAGER) return 'GESTOR';
  if (rr === Role.SUPERVISOR) return 'SUPERVISOR';
  if (rr === Role.USER) return 'COLABORADOR';
  return String(r).toUpperCase();
};

type StoreOption = { id: string; name?: string };

interface HierarchyManagementProps {
  companyId: string;
  currentUsername: string;
  currentRole: Role;
  members: CompanyMemberRecord[];
}

const HierarchyManagement: React.FC<HierarchyManagementProps> = ({ companyId, currentUsername, currentRole, members }) => {
  const normalizedCurrent = currentUsername.toLowerCase().trim();

  const normalizedMembers = useMemo(() => {
    const pickPreferred = (a: CompanyMemberRecord, b: CompanyMemberRecord) => {
      const aActive = a.isActive !== false;
      const bActive = b.isActive !== false;
      if (aActive !== bActive) return aActive ? a : b;

      const score = (m: CompanyMemberRecord) => {
        let s = 0;
        if ((m.name || '').trim()) s += 3;
        if ((m.role || '').toString()) s += 2;
        if ((m.leaderUsername || '').toString()) s += 1;
        if ((m.storeId || '').toString()) s += 1;
        if ((m.password || '').toString()) s += 1;
        if ((m.passwordSalt || '').toString()) s += 1;
        return s;
      };

      const sa = score(a);
      const sb = score(b);
      if (sa !== sb) return sa > sb ? a : b;

      const ta = Number((a as any).createdAt || 0);
      const tb = Number((b as any).createdAt || 0);
      if (ta !== tb) return ta > tb ? a : b;
      return a;
    };

    const map = new Map<string, CompanyMemberRecord>();
    for (const m of members) {
      const uname = (m.username || '').toLowerCase().trim();
      if (!uname) continue;
      const normalized: CompanyMemberRecord = { ...m, username: uname };
      const existing = map.get(uname);
      map.set(uname, existing ? pickPreferred(existing, normalized) : normalized);
    }

    return Array.from(map.values());
  }, [members]);

  const [stores, setStores] = useState<StoreOption[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
    role: Role.USER as Role,
    leaderUsername: normalizedCurrent,
    storeId: ''
  });

  const childrenMap = useMemo(() => buildChildrenMap(normalizedMembers), [normalizedMembers]);
  const descendantUsernames = useMemo(() => getDescendants(childrenMap, normalizedCurrent), [childrenMap, normalizedCurrent]);
  const memberByUsername = useMemo(() => {
    const map = new Map<string, CompanyMemberRecord>();
    for (const m of normalizedMembers) map.set((m.username || '').toLowerCase().trim(), m);
    return map;
  }, [normalizedMembers]);

  const isCompanyAdmin = currentRole === Role.COMPANY;
  const canManage = [Role.COMPANY, Role.MANAGER, Role.SUPERVISOR, Role.ADMIN].includes(currentRole);

  // Escopo: cada cargo gerencia a própria subárvore (+ ele mesmo)
  const scopeUsernames = useMemo(() => {
    if (isCompanyAdmin) {
      return new Set<string>(normalizedMembers.map(m => (m.username || '').toLowerCase().trim()).filter(Boolean));
    }

    const set = new Set<string>([normalizedCurrent]);
    for (const u of descendantUsernames) set.add(u);
    return set;
  }, [descendantUsernames, normalizedCurrent, isCompanyAdmin, normalizedMembers]);

  const visibleMembers = useMemo(() => {
    if (!canManage) return [];
    return normalizedMembers
      .filter(m => m.isActive !== false)
      .filter(m => scopeUsernames.has((m.username || '').toLowerCase().trim()))
      .sort((a, b) => {
        const ar = roleRank(a.role);
        const br = roleRank(b.role);
        if (ar !== br) return br - ar;
        const an = (a.name || '').localeCompare(b.name || '');
        if (an !== 0) return an;
        return (a.username || '').localeCompare(b.username || '');
      });
  }, [canManage, normalizedMembers, scopeUsernames]);

  const possibleLeaders = useMemo(() => {
    // Líder pode ser qualquer um dentro do meu escopo (incluindo eu)
    return visibleMembers
      .map(m => ({ username: m.username.toLowerCase().trim(), name: m.name, role: m.role }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [visibleMembers]);

  const allowedRoles = useMemo(() => {
    // Regra: cada cargo cria somente cargos abaixo na cadeia.
    // Exception: company pode criar outros company (múltiplos responsáveis).
    if (isCompanyAdmin) return [Role.COMPANY, Role.MANAGER, Role.SUPERVISOR, Role.USER];
    if (currentRole === Role.MANAGER || currentRole === Role.ADMIN) return [Role.SUPERVISOR, Role.USER];
    if (currentRole === Role.SUPERVISOR) return [Role.USER];
    return [];
  }, [currentRole, isCompanyAdmin]);

  useEffect(() => {
    const q = query(collection(db, 'stores'), where('companyId', '==', companyId));
    return onSnapshot(q, (snap) => {
      const next = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any[];
      setStores(next.map(s => ({ id: s.id, name: s.name })));
    });
  }, [companyId]);

  const upsertMember = async (payload: Partial<CompanyMemberRecord> & { username: string }) => {
    const uname = payload.username.toLowerCase().trim();
    await setDoc(doc(db, 'company_members', `${companyId}__${uname}`), {
      companyId,
      username: uname,
      ...payload
    }, { merge: true });
  };

  const handleCreate = async () => {
    if (!canManage) return;

    const cleanUsername = form.username.toLowerCase().trim().replace(/\s/g, '');
    const cleanName = form.name.trim();

    if (cleanName.length < 3) return alert('Nome deve ter pelo menos 3 caracteres.');
    if (!VALID_USER.test(cleanUsername)) return alert('Usuário deve ter 3-15 caracteres (letras minúsculas, números e underscore).');
    if (form.password.length < 6) return alert('Senha deve ter no mínimo 6 caracteres.');
    if (!allowedRoles.includes(form.role)) return alert('Cargo inválido para o seu nível.');

    const leader = (form.leaderUsername || '').toLowerCase().trim();
    if (leader && !scopeUsernames.has(leader)) return alert('Líder fora do seu escopo.');

    // Para company (responsáveis), pode existir sem líder.
    // Para os demais cargos, sempre nasce abaixo do usuário logado (ou de alguém do escopo escolhido).
    const targetLeader = form.role === Role.COMPANY ? (leader || '') : (leader || normalizedCurrent);

    // Valida que o líder tem cargo acima do novo membro
    if (targetLeader) {
      const leaderRec = memberByUsername.get(targetLeader);
      const leaderRole = leaderRec?.role;
      if (!leaderRole) return alert('Líder inválido.');

      const nextRoleRank = roleRank(form.role);
      const leaderRoleRank = roleRank(leaderRole);
      if (leaderRoleRank <= nextRoleRank) {
        return alert('Líder deve ter cargo acima do usuário.');
      }

      // Caso especial: responsável (company) só pode ter leader company (se existir)
      if (form.role === Role.COMPANY && normalizeRole(leaderRole) !== Role.COMPANY) {
        return alert('Responsável (company) só pode ter líder do mesmo nível.');
      }
    }

    setSaving(true);
    try {
      const salt = generateSalt();
      const hashed = await hashPassword(form.password, salt);

      await upsertMember({
        username: cleanUsername,
        name: cleanName,
        role: form.role,
        leaderUsername: targetLeader || null,
        storeId: form.storeId || null,
        password: hashed,
        passwordSalt: salt,
        isActive: true,
        createdAt: Date.now()
      });

      setForm({
        name: '',
        username: '',
        password: '',
        role: Role.USER,
        leaderUsername: normalizedCurrent,
        storeId: ''
      });

      alert('✅ Usuário criado com sucesso!');
    } catch (e) {
      console.error(e);
      alert('Erro ao criar usuário.');
    } finally {
      setSaving(false);
    }
  };

  const handleRepoint = async (targetUsername: string, newLeaderUsername: string | null, nextStoreId: string | null, realocateTasks: boolean) => {
    const target = targetUsername.toLowerCase().trim();
    const nextLeader = (newLeaderUsername || '').toLowerCase().trim();

    if (!scopeUsernames.has(target)) return alert('Sem permissão para alterar este usuário.');
    if (nextLeader && !scopeUsernames.has(nextLeader)) return alert('Novo líder fora do seu escopo.');

    const targetRec = memberByUsername.get(target);
    if (!targetRec) return alert('Usuário alvo não encontrado.');
    if (!canManageTarget(currentRole, targetRec.role)) return alert('Sem permissão para reapontar este cargo.');

    // Mudança de unidade segue a mesma permissão do reapontamento
    const nextStore = (nextStoreId || '').toUpperCase().trim();
    const currentStore = (targetRec.storeId || '').toUpperCase().trim();
    const storeIsChanging = nextStore !== currentStore;

    if (nextLeader) {
      const leaderRec = memberByUsername.get(nextLeader);
      if (!leaderRec) return alert('Novo líder inválido.');

      // líder deve estar acima do alvo
      if (roleRank(leaderRec.role) <= roleRank(targetRec.role)) {
        return alert('Novo líder deve ter cargo acima do usuário alvo.');
      }

      // caso especial: responsável (company) só pode ter líder company
      if (normalizeRole(targetRec.role) === Role.COMPANY && normalizeRole(leaderRec.role) !== Role.COMPANY) {
        return alert('Responsável (company) só pode ter líder do mesmo nível.');
      }
    }

    const validation = canRepointLeader(members, target, nextLeader || null);
    if (!validation.ok) {
      return alert(validation.reason === 'leader_cycle' ? 'Operação inválida: criaria um ciclo na hierarquia.' : 'Operação inválida.');
    }

    setSaving(true);
    try {
      await upsertMember({
        username: target,
        leaderUsername: nextLeader || null,
        storeId: storeIsChanging ? (nextStore || null) : (targetRec.storeId || null)
      });

      if (realocateTasks && storeIsChanging && nextStore) {
        // Atualiza a unidade das tasks do usuário reapontado
        const taskSnap = await getDocs(
          query(
            collection(db, 'tasks'),
            where('companyId', '==', companyId),
            where('responsible', '==', target)
          )
        );
        for (const d of taskSnap.docs) {
          await updateDoc(doc(db, 'tasks', d.id), { storeId: nextStore });
        }
      }

      alert('✅ Líder reapontado!');
    } catch (e) {
      console.error(e);
      alert('Erro ao reapontar líder.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (targetUsername: string) => {
    const target = targetUsername.toLowerCase().trim();
    if (!scopeUsernames.has(target)) return alert('Sem permissão.');
    if (target === normalizedCurrent) return alert('Você não pode desativar seu próprio usuário.');

    const targetRec = memberByUsername.get(target);
    if (!targetRec) return alert('Usuário não encontrado.');
    if (!canManageTarget(currentRole, targetRec.role)) return alert('Sem permissão para desativar este cargo.');

    setSaving(true);
    try {
      await upsertMember({ username: target, isActive: false });
      alert('✅ Usuário desativado.');
    } catch (e) {
      console.error(e);
      alert('Erro ao desativar.');
    } finally {
      setSaving(false);
    }
  };

  if (!canManage) {
    return (
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 text-center">
        <p className="text-slate-500 text-sm font-medium">Sem permissão para gerenciar hierarquia.</p>
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
          <h2 className="text-xs md:text-sm font-black text-slate-100 uppercase tracking-wider">Hierarquia & Logins</h2>
        </div>
        <div className="text-[9px] font-black text-slate-500 uppercase">{saving ? 'Salvando...' : `Empresa ${companyId}`}</div>
      </div>

      <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="space-y-3">
          <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest border-b border-slate-800 pb-2">Criar Usuário</h3>

          <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div>
              <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">Nome *</label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-xs text-white outline-none"
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">Username *</label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-xs text-white outline-none"
                value={form.username}
                onChange={e => setForm(prev => ({ ...prev, username: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">Senha *</label>
              <input
                type="password"
                className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-xs text-white outline-none"
                value={form.password}
                onChange={e => setForm(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">Cargo *</label>
              <select
                className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-xs text-white outline-none"
                value={form.role}
                onChange={e => setForm(prev => ({ ...prev, role: e.target.value as Role }))}
              >
                {allowedRoles.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">Líder Direto</label>
              <select
                className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-xs text-white outline-none"
                value={form.leaderUsername}
                onChange={e => setForm(prev => ({ ...prev, leaderUsername: e.target.value }))}
              >
                <option value={normalizedCurrent}>Eu ({normalizedCurrent})</option>
                {possibleLeaders
                  .filter(l => l.username !== normalizedCurrent)
                  .map(l => (
                    <option key={l.username} value={l.username}>{l.name} (@{l.username})</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="text-[8px] font-black text-slate-500 uppercase mb-1 block">Unidade (opcional)</label>
              <select
                className="w-full bg-slate-950 border border-slate-800 p-2 rounded-xl text-xs text-white outline-none"
                value={form.storeId}
                onChange={e => setForm(prev => ({ ...prev, storeId: e.target.value }))}
              >
                <option value="">(Sem unidade)</option>
                {stores.map(s => (
                  <option key={s.id} value={s.id}>{s.id} {s.name ? `- ${s.name}` : ''}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleCreate}
              disabled={saving}
              className="w-full bg-blue-600 py-3 rounded-xl text-[10px] font-black uppercase text-white hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              Criar Usuário
            </button>
          </div>
        </section>

        <section className="lg:col-span-2 space-y-3">
          <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest border-b border-slate-800 pb-2">Minha Cadeia</h3>

          <div className="space-y-2">
            {visibleMembers.length === 0 ? (
              <div className="p-6 bg-slate-950/40 border border-slate-800 rounded-2xl text-center">
                <p className="text-slate-500 text-sm font-medium">Nenhum membro na sua cadeia ainda.</p>
              </div>
            ) : (
              visibleMembers.map(m => (
                <MemberRow
                  key={m.id || (m.username || '').toLowerCase().trim()}
                  member={m}
                  possibleLeaders={possibleLeaders}
                  stores={stores}
                  onRepoint={handleRepoint}
                  onDeactivate={handleDeactivate}
                  disabled={saving}
                  isSelf={(m.username || '').toLowerCase().trim() === normalizedCurrent}
                  allowLeaderChange={canManageTarget(currentRole, m.role)}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

const MemberRow: React.FC<{
  member: CompanyMemberRecord;
  possibleLeaders: Array<{ username: string; name: string; role: Role }>;
  stores: StoreOption[];
  onRepoint: (targetUsername: string, newLeaderUsername: string | null, nextStoreId: string | null, realocateTasks: boolean) => void;
  onDeactivate: (targetUsername: string) => void;
  disabled: boolean;
  isSelf: boolean;
  allowLeaderChange: boolean;
}> = ({ member, possibleLeaders, stores, onRepoint, onDeactivate, disabled, isSelf, allowLeaderChange }) => {
  const [leader, setLeader] = useState((member.leaderUsername || '').toLowerCase().trim());
  const [realocate, setRealocate] = useState(true);
  const [storeId, setStoreId] = useState((member.storeId || '').toUpperCase().trim());

  useEffect(() => {
    setLeader((member.leaderUsername || '').toLowerCase().trim());
    setStoreId((member.storeId || '').toUpperCase().trim());
  }, [member.leaderUsername, member.storeId]);

  const uname = (member.username || '').toLowerCase().trim();

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-2xl border bg-slate-800/30 border-slate-800">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-blue-400 uppercase">@{uname}</span>
          <span className="text-[9px] font-black text-slate-600 uppercase">{roleLabel(member.role)}</span>
          {member.storeId && <span className="text-[9px] font-black text-slate-600 uppercase">• {member.storeId}</span>}
        </div>
        <p className="text-sm font-bold text-slate-100 truncate">{member.name}</p>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        {allowLeaderChange && (
          <select
            className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-[10px] font-black uppercase text-slate-300 outline-none"
            value={leader}
            onChange={e => setLeader(e.target.value)}
            disabled={disabled || isSelf}
            title={isSelf ? 'Não é possível mudar seu próprio líder aqui' : 'Reapontar líder direto'}
          >
            <option value="">(Sem líder)</option>
            {possibleLeaders
              .filter(l => l.username !== uname)
              .map(l => (
                <option key={l.username} value={l.username}>{l.name} (@{l.username})</option>
              ))}
          </select>
        )}

        <select
          className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-[10px] font-black uppercase text-slate-300 outline-none"
          value={storeId}
          onChange={e => setStoreId(e.target.value)}
          disabled={disabled || !allowLeaderChange}
          title="Definir unidade do usuário"
        >
          <option value="">(Sem unidade)</option>
          {stores.map(s => (
            <option key={s.id} value={s.id}>{s.id} {s.name ? `- ${s.name}` : ''}</option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-[9px] font-black uppercase text-slate-600 select-none">
          <input
            type="checkbox"
            checked={realocate}
            onChange={e => setRealocate(e.target.checked)}
            disabled={disabled}
          />
          Realocar tasks
        </label>

        <button
          onClick={() => onRepoint(uname, leader || null, storeId || null, realocate)}
          disabled={disabled || isSelf || !allowLeaderChange}
          className="bg-blue-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase disabled:opacity-50"
        >
          Reapontar
        </button>

        <button
          onClick={() => onDeactivate(uname)}
          disabled={disabled || isSelf || !allowLeaderChange}
          className="text-red-400 hover:text-red-300 px-3 py-2 rounded-xl text-[10px] font-black uppercase disabled:opacity-50"
        >
          Desativar
        </button>
      </div>
    </div>
  );
};

export default HierarchyManagement;
