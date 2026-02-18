import React, { useState, useEffect } from 'react';
import { User, Role, Task, Status, TeamMember, WorkSchedule, FixedDemand, Feedback, PhotoAuditLog, CompanyMemberRecord } from './types.ts';
import { User as UserV2, Role as RoleV2, Permission, Task as TaskV2, TaskStatus, TaskFlowType } from './types-v2.ts';
import { db, isFirebaseConfigured } from './firebase.ts';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { AuthorizationService } from './services/AuthorizationService.ts';
import { HierarchyService } from './services/HierarchyService.ts';
import { TaskService } from './services/TaskService.ts';
import { RealtimeService } from './services/RealtimeService.ts';
import Login from './components/Login.tsx';
import KanbanBoard from './components/KanbanBoard.tsx';
import KanbanBoardV2 from './components/KanbanBoardV2.tsx';
import AdminStats from './components/AdminStats.tsx';
import TeamBoard from './components/TeamBoard.tsx';
import NewTaskModal from './components/NewTaskModal.tsx';
import NewTaskModalV2 from './components/NewTaskModalV2.tsx';
import SuperAdminDashboard from './components/SuperAdminDashboard.tsx';
import TeamSettingsModal from './components/TeamSettingsModal.tsx';
import CompleteTaskModal from './components/CompleteTaskModal.tsx';
import FeedbackSection from './components/FeedbackSection.tsx';
import ReportsSection from './components/ReportsSection.tsx';
import SupportDashboard from './components/SupportDashboard.tsx';
import UserTicketCreation from './components/UserTicketCreation.tsx';
import MyTickets from './components/MyTickets.tsx';
import DevSupportManagement from './components/DevSupportManagement.tsx';
import Organograma from './components/Organograma.tsx';
import AdminUserManagement from './components/AdminUserManagement.tsx';
import { initializePushNotifications } from './services/PushNotificationService.ts';
import { buildChildrenMap, getDescendants } from './services/hierarchy.ts';
import HierarchyManagement from './components/HierarchyManagement.tsx';

const App: React.FC = () => {
  // V1 State (mantém compatibilidade)
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [fixedDemands, setFixedDemands] = useState<FixedDemand[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [companyMembers, setCompanyMembers] = useState<CompanyMemberRecord[]>([]);
  
  // V2 State (novo)
  const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
  const [userHierarchy, setUserHierarchy] = useState<string[]>([]);
  const [tasksV2, setTasksV2] = useState<TaskV2[]>([]);
  const [isAuthorizationLoading, setIsAuthorizationLoading] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'tasks' | 'team' | 'feedback' | 'reports' | 'support' | 'mytickets' | 'dev-support' | 'kanban-v2' | 'organization'>('tasks');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalV2Open, setIsModalV2Open] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isAdminUserModalOpen, setIsAdminUserModalOpen] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  // Sincronização em Tempo Real com Firestore
  useEffect(() => {
    if (!isFirebaseConfigured || !user) return;

    const storeId = user.storeId;
    const companyId = user.companyId;

    try {
      // Listener de Tarefas: por empresa (novo) ou por unidade (legado)
      const qTasks = companyId
        ? query(collection(db, "tasks"), where("companyId", "==", companyId))
        : (storeId ? query(collection(db, "tasks"), where("storeId", "==", storeId)) : null);

      const unsubTasks = qTasks
        ? onSnapshot(
            qTasks,
            (snapshot) => {
              const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task));
              setTasks(data.sort((a, b) => b.createdAt - a.createdAt));
            },
            (error) => console.error("Erro listener tarefas:", error)
          )
        : () => {};

      // Listener de Feedbacks (mantido por unidade)
      const unsubFeedbacks = storeId
        ? onSnapshot(
            query(collection(db, "feedbacks"), where("storeId", "==", storeId)),
            (snapshot) => {
              const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Feedback));
              setFeedbacks(data.sort((a, b) => b.createdAt - a.createdAt));
            },
            (error) => console.error("Erro listener feedbacks:", error)
          )
        : () => {};

      // Listener de Configurações da Loja (agora não carrega logins)
      const unsubConfig = storeId
        ? onSnapshot(doc(db, "stores_config", storeId), (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setSchedules(data.schedules || []);
              setFixedDemands(data.fixedDemands || []);
            }
          })
        : () => {};

      // Listener de membros da empresa (hierarquia + logins)
      const unsubMembers = companyId
        ? onSnapshot(
            query(collection(db, "company_members"), where("companyId", "==", companyId)),
            (snapshot) => {
              const members = snapshot.docs.map(d => ({ ...(d.data() as any), id: d.id } as CompanyMemberRecord));
              const activeMembers = members.filter(m => m.isActive !== false);
              setCompanyMembers(members);

              if (storeId) {
                const local = activeMembers.filter(m => (m.storeId || '') === storeId);
                setTeamMembers(local.map(m => ({ name: m.name, username: m.username, storeId: m.storeId })));
              }
            },
            (error) => console.error('Erro listener company_members:', error)
          )
        : () => {};

      return () => {
        unsubTasks();
        unsubFeedbacks();
        unsubConfig();
        unsubMembers();
      };
    } catch (error) {
      console.error("Erro crítico de sincronização Firestore:", error);
    }
  }, [user]);

  // Recupera apenas a sessão de login
  useEffect(() => {
    const savedAuth = localStorage.getItem('ecomm_session');
    if (savedAuth) {
      const parsed = JSON.parse(savedAuth) as User;
      setUser(parsed);
      if (parsed.role === Role.SUPPORT) setActiveTab('support');
      else if (parsed.role === Role.DEV) setActiveTab('tasks');
      else setActiveTab('tasks');
    }
  }, []);

  // Carrega permissões V2 quando usuário faz login
  useEffect(() => {
    if (!user) return;
    
    const loadPermissions = async () => {
      try {
        setIsAuthorizationLoading(true);
        // Busca todas as permissões do usuário
        const perms = await AuthorizationService.getUserPermissions(user.username || user.name);
        setUserPermissions(perms);
        
        // Busca hierarquia do usuário
        const hierarchy = await HierarchyService.calculateHierarchyPath(user.username || user.name);
        setUserHierarchy(hierarchy);
      } catch (error) {
        console.error('Erro ao carregar permissões:', error);
      } finally {
        setIsAuthorizationLoading(false);
      }
    };

    loadPermissions();
  }, [user]);

  // Subscribe a tarefas V2 via RealtimeService
  useEffect(() => {
    if (!user || !user.companyId) return;
    
    const unsubscribe = RealtimeService.subscribeToCompanyTasks(
      user.companyId,
      (newTasks) => {
        setTasksV2(newTasks);
      }
    );

    return () => unsubscribe?.();
  }, [user?.companyId]);

  // Inicializa Push Notifications (Web + PWA em smartphones)
  useEffect(() => {
    if (!user) return;

    initializePushNotifications({
      userId: user.username || user.name,
      userName: user.name,
      role: user.role,
      companyId: user.companyId,
      storeId: user.storeId
    });
  }, [user]);

  const handleForceRefresh = () => {
    if ('serviceWorker' in navigator) {
      caches.keys().then(names => {
        for (let name of names) caches.delete(name);
      });
    }
    window.location.reload();
  };

  // Helper: Verifica se usuário tem uma permissão específica
  const hasPermission = (permission: Permission): boolean => {
    return userPermissions.includes(permission);
  };

  // Helper: Autoriza criação de tarefa com fluxo específico
  const authorizeTaskCreation = async (flowType: TaskFlowType, targetUserId?: string, targetDepartmentId?: string) => {
    if (!user) return { allowed: false, reason: 'Usuário não autenticado' };
    
    try {
      const result = await AuthorizationService.authorizeTaskCreation(
        user.username || user.name,
        flowType,
        targetUserId,
        targetDepartmentId
      );
      return result;
    } catch (error) {
      console.error('Erro ao autorizar criação de tarefa:', error);
      return { allowed: false, reason: 'Erro ao verificar autorização' };
    }
  };

  if (!isFirebaseConfigured) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6 bg-slate-900 p-10 rounded-[2.5rem] border border-blue-900/30 shadow-2xl">
          <div className="w-20 h-20 bg-blue-600/20 rounded-3xl flex items-center justify-center mx-auto text-blue-500 animate-pulse">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Erro de Conexão</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            As chaves do Firebase não foram detectadas ou o serviço está indisponível. Verifique o console.
          </p>
        </div>
      </div>
    );
  }

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem('ecomm_session', JSON.stringify(u));

    if (u.role === Role.SUPPORT) setActiveTab('support');
    else if (u.role === Role.DEV) setActiveTab('tasks');
    else setActiveTab('tasks');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('ecomm_session');
  };

  const toggleChecklistItem = async (taskId: string, itemId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.checklist) return;

    const newChecklist = task.checklist.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );

    await updateDoc(doc(db, "tasks", taskId), { checklist: newChecklist });
  };

  const moveTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    if (task.status === Status.TODO) {
      await updateDoc(doc(db, "tasks", id), { status: Status.DOING });
    } else if (task.status === Status.DOING) {
      const allDone = task.checklist ? task.checklist.every(i => i.completed) : true;
      if (!allDone) {
        alert("Conclua o checklist antes de finalizar!");
        return;
      }
      setCompletingTaskId(id);
    }
  };

  const handleSendFeedback = async (type: any, subject: string, message: string, receiver: string = 'ADMIN') => {
    await addDoc(collection(db, "feedbacks"), {
      type, subject, message, sender: user?.name, receiver, 
      createdAt: Date.now(), status: 'pendente', storeId: user?.storeId
    });
  };

  const handleReplyFeedback = async (id: string, reply: string) => {
    await updateDoc(doc(db, "feedbacks", id), { adminReply: reply, status: 'respondido' });
  };

  if (!user) return <Login onLogin={handleLogin} />;

  const normalizedUsername = (user.username || '').toLowerCase().trim();
  const childrenMap = buildChildrenMap(companyMembers);
  const descendantUsernames = user.companyId ? getDescendants(childrenMap, normalizedUsername) : new Set<string>();
  const memberByUsername = new Map<string, CompanyMemberRecord>(
    companyMembers.map(m => [m.username.toLowerCase().trim(), m])
  );
  const memberDirectory: Record<string, string> = Object.fromEntries(
    companyMembers.map(m => [m.username.toLowerCase().trim(), m.name] as const)
  );
  const teamMemberUsernames = teamMembers.map(m => (m.username || '').toLowerCase().trim()).filter(Boolean);

  const canDelegate = [Role.COMPANY, Role.MANAGER, Role.SUPERVISOR, Role.ADMIN].includes(user.role);
  const canManageTeam = [Role.MANAGER, Role.SUPERVISOR, Role.ADMIN].includes(user.role);

  const visibleTasks = tasks.filter(t => {
    const responsible = (t.responsible || '').toLowerCase().trim();
    const createdBy = (t.createdBy || '').toLowerCase().trim();
    if (responsible === normalizedUsername) return true;
    if (createdBy === normalizedUsername) return true;
    if (responsible && descendantUsernames.has(responsible)) return true;
    return false;
  });

  const assignees = Array.from(descendantUsernames)
    .filter(u => u && u !== normalizedUsername)
    .map(u => ({ username: u, name: memberByUsername.get(u)?.name || u }));

  const statsUsernames = Array.from(
    new Set(
      visibleTasks
        .map(t => (t.responsible || '').toLowerCase().trim())
        .filter(Boolean)
    )
  ).sort();

  const canCreateCompanies = user.role === Role.DEV || (user.role === Role.SUPPORT && user.canCreateCompany === true);

  // -------------------- Navegação por Cargo --------------------
  const primaryTabLabel =
    user.role === Role.COMPANY
      ? 'Empresa'
      : user.role === Role.MANAGER || user.role === Role.ADMIN
        ? 'Gestão'
        : user.role === Role.SUPERVISOR
          ? 'Supervisão'
          : 'Execução';

  const teamTabLabel = user.role === Role.COMPANY ? 'Hierarquia' : 'Equipe';
  const canSeeV2 = userPermissions.length > 0;
  const canSeeTeamTab = user.role !== Role.USER; // colaborador não gerencia equipe
  const canSeeOrgTab = canDelegate; // só líderes
  const canSeeReportsTab = canDelegate; // só líderes
  const canSeeFeedbackTab = user.role !== Role.DEV && user.role !== Role.SUPPORT;
  const canSeeSupportTab = user.role !== Role.DEV && user.role !== Role.SUPPORT;

  const allowedTabs: Array<typeof activeTab> = (() => {
    if (user.role === Role.DEV) return ['tasks', 'dev-support'];
    if (user.role === Role.SUPPORT) return canCreateCompanies ? ['support', 'tasks'] : ['support'];

    const tabs: Array<typeof activeTab> = ['tasks'];
    if (canSeeV2) tabs.push('kanban-v2');
    if (canSeeTeamTab) tabs.push('team');
    if (canSeeOrgTab) tabs.push('organization');
    if (canSeeReportsTab) tabs.push('reports');
    if (canSeeFeedbackTab) tabs.push('feedback');
    if (canSeeSupportTab) tabs.push('mytickets');
    return tabs;
  })();

  const effectiveTab: typeof activeTab = allowedTabs.includes(activeTab) ? activeTab : allowedTabs[0];

  return (
    <div className="min-h-screen bg-slate-950 pb-24 md:pb-6">
      <header className="bg-slate-900/80 border-b border-slate-800 p-4 sticky top-0 z-40 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-2 md:px-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 md:w-10 md:h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg">
              {user.role[0].toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <h1 className="text-[9px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1 flex items-center gap-2">
              {user.role === Role.DEV
                ? 'PAINEL MASTER'
                : user.role === Role.SUPPORT
                  ? 'PAINEL DE SUPORTE'
                  : user.role === Role.COMPANY
                    ? `PAINEL EMPRESA ${user.companyId}`
                    : user.role === Role.MANAGER || user.role === Role.ADMIN
                      ? 'PAINEL GESTÃO'
                      : user.role === Role.SUPERVISOR
                        ? 'PAINEL SUPERVISÃO'
                        : 'PAINEL EXECUÇÃO'}
                <button onClick={handleForceRefresh} title="Limpar Cache/Atualizar" className="text-slate-700 hover:text-blue-400 transition-colors">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
              </h1>
              <p className="text-xs font-bold text-white uppercase">{user.name}</p>
            </div>
          </div>
          
          <nav className="hidden lg:flex items-center gap-4">
            {user.role === Role.DEV && <button onClick={() => setActiveTab('tasks')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${effectiveTab === 'tasks' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>📊 Empresas</button>}
            {user.role === Role.DEV && <button onClick={() => setActiveTab('dev-support')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${effectiveTab === 'dev-support' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>🆘 Suporte</button>}
            {user.role === Role.SUPPORT && canCreateCompanies && <button onClick={() => setActiveTab('tasks')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${effectiveTab === 'tasks' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>📊 Empresas</button>}
            {user.role === Role.SUPPORT && <button onClick={() => setActiveTab('support')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${effectiveTab === 'support' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Meus Tickets</button>}

            {user.role !== Role.DEV && user.role !== Role.SUPPORT && (
              <>
                <button onClick={() => setActiveTab('tasks')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${effectiveTab === 'tasks' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>{primaryTabLabel}</button>
                {canSeeV2 && <button onClick={() => setActiveTab('kanban-v2')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${effectiveTab === 'kanban-v2' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>✨ V2.0</button>}
                {canSeeTeamTab && <button onClick={() => setActiveTab('team')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${effectiveTab === 'team' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>{teamTabLabel}</button>}
                {canSeeOrgTab && <button onClick={() => setActiveTab('organization')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${effectiveTab === 'organization' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>🏢 Org.</button>}
                {canSeeReportsTab && <button onClick={() => setActiveTab('reports')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${effectiveTab === 'reports' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Relatórios</button>}
                {canSeeFeedbackTab && <button onClick={() => setActiveTab('feedback')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${effectiveTab === 'feedback' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Avisos</button>}
                {canSeeSupportTab && <button onClick={() => setActiveTab('mytickets')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${effectiveTab === 'mytickets' ? 'bg-green-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>📤 Suporte</button>}
              </>
            )}
          </nav>

          <button onClick={handleLogout} className="px-3 py-1.5 md:px-4 md:py-2 text-[9px] md:text-[10px] font-black text-slate-500 hover:text-red-500 uppercase border border-slate-800 rounded-lg md:rounded-xl transition-all">Sair</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8 fade-in">
        {user.role === Role.DEV ? (
          <>
            <div className="flex md:hidden bg-slate-900 p-1 rounded-2xl border border-slate-800 overflow-x-auto gap-1">
              <button onClick={() => setActiveTab('tasks')} className={`flex-1 py-3 px-4 whitespace-nowrap text-[10px] font-black uppercase rounded-xl transition-all ${effectiveTab === 'tasks' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>📊 Empresas</button>
              <button onClick={() => setActiveTab('dev-support')} className={`flex-1 py-3 px-4 whitespace-nowrap text-[10px] font-black uppercase rounded-xl transition-all ${effectiveTab === 'dev-support' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>🆘 Suporte</button>
            </div>
            {effectiveTab === 'tasks' && <SuperAdminDashboard mode={user.role} companyId={user.companyId} />}
            {effectiveTab === 'dev-support' && <DevSupportManagement devId={user.username || user.name} />}
          </>
        ) : user.role === Role.SUPPORT ? (
          <>
            {canCreateCompanies && (
              <div className="flex md:hidden bg-slate-900 p-1 rounded-2xl border border-slate-800 overflow-x-auto gap-1">
                <button onClick={() => setActiveTab('support')} className={`flex-1 py-3 px-4 whitespace-nowrap text-[10px] font-black uppercase rounded-xl transition-all ${effectiveTab === 'support' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Meus Tickets</button>
                <button onClick={() => setActiveTab('tasks')} className={`flex-1 py-3 px-4 whitespace-nowrap text-[10px] font-black uppercase rounded-xl transition-all ${effectiveTab === 'tasks' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>📊 Empresas</button>
              </div>
            )}

            {effectiveTab === 'tasks' && canCreateCompanies ? (
              <SuperAdminDashboard mode={Role.DEV} canCreateNew={true} canManageExisting={user.role === Role.DEV} />
            ) : (
              <SupportDashboard 
                userId={user.username || user.name}
                userRole={user.role}
                companyId={user.companyId}
                storeId={user.storeId}
                userName={user.name}
              />
            )}
          </>
        ) : (
          <>
            {effectiveTab === 'tasks' && (
              <>
                {user.role === Role.COMPANY && (
                  <div className="space-y-6">
                    <SuperAdminDashboard mode={Role.COMPANY} companyId={user.companyId} currentUsername={user.username} />
                  </div>
                )}
                <AdminStats tasks={visibleTasks} teamMembers={statsUsernames} memberDirectory={memberDirectory} />
              </>
            )}
            
            <div className="flex md:hidden bg-slate-900 p-1 rounded-2xl border border-slate-800 overflow-x-auto gap-1">
              <button onClick={() => setActiveTab('tasks')} className={`flex-1 py-3 px-4 whitespace-nowrap text-[10px] font-black uppercase rounded-xl transition-all ${effectiveTab === 'tasks' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>{primaryTabLabel}</button>
              {canSeeV2 && <button onClick={() => setActiveTab('kanban-v2')} className={`flex-1 py-3 px-4 whitespace-nowrap text-[10px] font-black uppercase rounded-xl transition-all ${effectiveTab === 'kanban-v2' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>✨ V2</button>}
              {canSeeTeamTab && <button onClick={() => setActiveTab('team')} className={`flex-1 py-3 px-4 whitespace-nowrap text-[10px] font-black uppercase rounded-xl transition-all ${effectiveTab === 'team' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>{teamTabLabel}</button>}
              {canSeeOrgTab && <button onClick={() => setActiveTab('organization')} className={`flex-1 py-3 px-4 whitespace-nowrap text-[10px] font-black uppercase rounded-xl transition-all ${effectiveTab === 'organization' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Org.</button>}
              {canSeeReportsTab && <button onClick={() => setActiveTab('reports')} className={`flex-1 py-3 px-4 whitespace-nowrap text-[10px] font-black uppercase rounded-xl transition-all ${effectiveTab === 'reports' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Dados</button>}
              {canSeeFeedbackTab && <button onClick={() => setActiveTab('feedback')} className={`flex-1 py-3 px-4 whitespace-nowrap text-[10px] font-black uppercase rounded-xl transition-all ${effectiveTab === 'feedback' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Avisos</button>}
              {canSeeSupportTab && <button onClick={() => setActiveTab('mytickets')} className={`flex-1 py-3 px-4 whitespace-nowrap text-[10px] font-black uppercase rounded-xl transition-all ${effectiveTab === 'mytickets' ? 'bg-green-600 text-white' : 'text-slate-500'}`}>📤 Suporte</button>}
            </div>

            {effectiveTab === 'tasks' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-slate-900/50 p-4 md:p-6 rounded-3xl border border-slate-800">
                  <h2 className="text-lg md:text-xl font-black uppercase tracking-tighter">Fluxo de Trabalho</h2>
                  <div className="flex gap-3">
                    {/* V2 Modal (se tem permissões) */}
                    {userPermissions.length > 0 && (
                      <button 
                        onClick={() => setIsModalV2Open(true)} 
                        className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 md:px-6 md:py-3 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase shadow-xl transition-all active:scale-95"
                      >
                        ✨ Nova Tarefa V2
                      </button>
                    )}
                    {/* V1 Modal (hierarquia) */}
                    {canDelegate && (
                      <button 
                        onClick={() => setIsModalOpen(true)} 
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 md:px-6 md:py-3 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase shadow-xl transition-all active:scale-95"
                      >
                        Nova Tarefa
                      </button>
                    )}
                  </div>
                </div>
                <KanbanBoard 
                  tasks={visibleTasks} 
                  onMove={moveTask} 
                  onToggleCheck={toggleChecklistItem} 
                  onDelete={async (id) => {
                    await deleteDoc(doc(db, "tasks", id));
                  }} 
                  isAdmin={canDelegate}
                  teamMembers={teamMemberUsernames}
                  memberDirectory={memberDirectory}
                />
              </div>
            )}

            {effectiveTab === 'kanban-v2' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-slate-900/50 p-4 md:p-6 rounded-3xl border border-slate-800">
                  <h2 className="text-lg md:text-xl font-black uppercase tracking-tighter">Fluxo V2.0</h2>
                  <button 
                    onClick={() => setIsModalV2Open(true)} 
                    className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 md:px-6 md:py-3 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase shadow-xl transition-all active:scale-95"
                  >
                    + Nova Tarefa
                  </button>
                </div>
                <KanbanBoardV2
                  tasks={tasksV2}
                  userId={user.username || user.name}
                  userPermissions={userPermissions}
                  onTaskUpdate={async (taskId, updates) => {
                    try {
                      await TaskService.updateTask(taskId, updates);
                    } catch (error) {
                      console.error('Erro ao atualizar tarefa:', error);
                    }
                  }}
                />
              </div>
            )}

            {effectiveTab === 'organization' && (
              <Organograma
                companyId={user.companyId || ''}
                userId={user.username || user.name}
              />
            )}

            {effectiveTab === 'team' && (
              <div className="space-y-6">
                {user.companyId && canDelegate && (
                  <HierarchyManagement
                    companyId={user.companyId}
                    currentUsername={user.username}
                    currentRole={user.role}
                    members={companyMembers}
                  />
                )}

                {user.storeId && (
                  <TeamBoard
                    isAdmin={canManageTeam}
                    onEdit={() => setIsTeamModalOpen(true)}
                    teamMembers={teamMembers}
                    schedules={schedules}
                    fixedDemands={fixedDemands}
                  />
                )}
              </div>
            )}

            {effectiveTab === 'reports' && (
              <ReportsSection tasks={visibleTasks} teamMembers={teamMembers} currentUser={user} />
            )}

            {effectiveTab === 'feedback' && (
              <FeedbackSection feedbacks={feedbacks} user={user} teamMembers={teamMembers.map(m => m.name)} onSend={handleSendFeedback} onReply={handleReplyFeedback} />
            )}

            {effectiveTab === 'mytickets' && (
              <div className="space-y-6">
                <div className="bg-slate-900/50 p-4 md:p-6 rounded-3xl border border-slate-800">
                  <h2 className="text-lg md:text-xl font-black uppercase tracking-tighter mb-4">Enviar Ticket para Suporte</h2>
                  <UserTicketCreation 
                    userId={user.username || user.name}
                    userName={user.name}
                    userRole={user.role}
                    companyId={user.companyId}
                    storeId={user.storeId}
                  />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-black uppercase tracking-tighter mb-4">Meus Tickets</h2>
                  <MyTickets userId={user.username || user.name} companyId={user.companyId} />
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {isModalOpen && <NewTaskModal assignees={assignees} onClose={() => setIsModalOpen(false)} onSubmit={async (t) => {
        const responsibleUsername = (t.responsible || '').toLowerCase().trim();
        const responsibleMember = memberByUsername.get(responsibleUsername);
        const resolvedStoreId = responsibleMember?.storeId || user.storeId;

        if (!responsibleUsername) {
          alert('Selecione um responsável.');
          return;
        }

        if (!resolvedStoreId) {
          alert('Responsável sem unidade definida. Defina a unidade do usuário.');
          return;
        }

        await addDoc(collection(db, "tasks"), {
          ...t,
          responsible: responsibleUsername,
          status: Status.TODO,
          createdAt: Date.now(),
          storeId: resolvedStoreId,
          companyId: user.companyId,
          createdBy: normalizedUsername,
          assignedBy: normalizedUsername
        });
        setIsModalOpen(false);
      }} />}

      {isModalV2Open && (
        <NewTaskModalV2
          userId={user.username || user.name}
          companyId={user.companyId || ''}
          userPermissions={userPermissions}
          onClose={() => setIsModalV2Open(false)}
          onSubmit={async (task) => {
            try {
              // TaskService.createTask espera (creatorId, request)
              await TaskService.createTask(user.username || user.name, {
                flowType: task.flowType,
                assignedToUserId: task.assignedToUserId,
                assignedToDepartmentId: task.assignedToDepartmentId,
                title: task.title,
                description: task.description,
                priority: task.priority,
                dueDate: task.dueDate
              });
              setIsModalV2Open(false);
            } catch (error) {
              console.error('Erro ao criar tarefa V2:', error);
            }
          }}
          onError={(error) => console.error('Erro no modal V2:', error)}
        />
      )}
      
      {isTeamModalOpen && <TeamSettingsModal teamMembers={teamMembers} schedules={schedules} fixedDemands={fixedDemands} storeId={user.storeId!} onClose={() => setIsTeamModalOpen(false)} onSave={async (s, d, m) => {
        const storeId = user.storeId!;
        const companyId = user.companyId;
        const normalizedMembers = m.map(member => ({ ...member, storeId: member.storeId || storeId }));

        await setDoc(doc(db, "stores_config", storeId), { schedules: s, fixedDemands: d, teamMembers: normalizedMembers }, { merge: true });

        if (companyId) {
          const nextUsernames = new Set(normalizedMembers.map(x => (x.username || '').toLowerCase().trim()));
          const prevUsernames = new Set(teamMembers.map(x => (x.username || '').toLowerCase().trim()));

          // Upsert membros atuais como colaboradores ativos
          for (const member of normalizedMembers) {
            const uname = (member.username || '').toLowerCase().trim();
            if (!uname) continue;

            await setDoc(doc(db, "company_members", `${companyId}__${uname}`), {
              companyId,
              username: uname,
              name: member.name,
              role: Role.USER,
              leaderUsername: normalizedUsername,
              storeId,
              isActive: true,
              password: member.password || '',
              passwordSalt: member.passwordSalt || '',
              createdAt: Date.now()
            }, { merge: true });
          }

          // Desativar removidos
          for (const prev of prevUsernames) {
            if (!prev) continue;
            if (nextUsernames.has(prev)) continue;
            await setDoc(doc(db, "company_members", `${companyId}__${prev}`), {
              companyId,
              username: prev,
              isActive: false
            }, { merge: true });
          }
        }

        setIsTeamModalOpen(false);
      }} />}

      {isAdminUserModalOpen && (
        <AdminUserManagement
          companyId={user.companyId || ''}
          onClose={() => setIsAdminUserModalOpen(false)}
        />
      )}

      {completingTaskId && <CompleteTaskModal onClose={() => setCompletingTaskId(null)} onSubmit={async (desc, files) => {
        // Adiciona metadados de auditoria aos anexos
        const filesWithAudit = files.map(f => ({
          ...f,
          uploadedBy: user?.username,
          uploadedAt: Date.now(),
          uploadedByRole: user?.role
        }));
        
        // Salva a tarefa com os anexos auditados
        await updateDoc(doc(db, "tasks", completingTaskId), { 
          status: Status.DONE, 
          completionDescription: desc, 
          completionAttachments: filesWithAudit, 
          completedAt: Date.now() 
        });
        
        // Registra a ação de conclusão na auditoria
        filesWithAudit.forEach(async (file) => {
          await addDoc(collection(db, "photo_audit_logs"), {
            taskId: completingTaskId,
            photoName: file.name,
            viewedBy: user?.username,
            viewedByRole: user?.role,
            viewedAt: Date.now(),
            action: 'upload',
            storeId: user?.storeId,
            createdAt: Date.now()
          });
        });
        
        setCompletingTaskId(null);
      }} />}
    </div>
  );
};

export default App;