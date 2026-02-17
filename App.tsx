import React, { useState, useEffect } from 'react';
import { User, Role, Task, Status, TeamMember, WorkSchedule, FixedDemand, Feedback, PhotoAuditLog } from './types.ts';
import { db, isFirebaseConfigured } from './firebase.ts';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, deleteDoc, setDoc } from 'firebase/firestore';
import Login from './components/Login.tsx';
import KanbanBoard from './components/KanbanBoard.tsx';
import AdminStats from './components/AdminStats.tsx';
import TeamBoard from './components/TeamBoard.tsx';
import NewTaskModal from './components/NewTaskModal.tsx';
import SuperAdminDashboard from './components/SuperAdminDashboard.tsx';
import TeamSettingsModal from './components/TeamSettingsModal.tsx';
import CompleteTaskModal from './components/CompleteTaskModal.tsx';
import FeedbackSection from './components/FeedbackSection.tsx';
import ReportsSection from './components/ReportsSection.tsx';
import SupportDashboard from './components/SupportDashboard.tsx';
import UserTicketCreation from './components/UserTicketCreation.tsx';
import MyTickets from './components/MyTickets.tsx';
import DevSupportManagement from './components/DevSupportManagement.tsx';
import { initializePushNotifications } from './services/PushNotificationService.ts';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [fixedDemands, setFixedDemands] = useState<FixedDemand[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  
  const [activeTab, setActiveTab] = useState<'tasks' | 'team' | 'feedback' | 'reports' | 'support' | 'mytickets' | 'dev-support'>('tasks');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  // Sincronização em Tempo Real com Firestore
  useEffect(() => {
    if (!isFirebaseConfigured || !user || !user.storeId) return;

    const storeId = user.storeId;

    try {
      // Listener de Tarefas com tratamento de erro
      const qTasks = query(collection(db, "tasks"), where("storeId", "==", storeId));
      const unsubTasks = onSnapshot(qTasks, 
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task));
          setTasks(data.sort((a, b) => b.createdAt - a.createdAt));
        },
        (error) => console.error("Erro listener tarefas:", error)
      );

      // Listener de Feedbacks com tratamento de erro
      const qFeedbacks = query(collection(db, "feedbacks"), where("storeId", "==", storeId));
      const unsubFeedbacks = onSnapshot(qFeedbacks, 
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Feedback));
          setFeedbacks(data.sort((a, b) => b.createdAt - a.createdAt));
        },
        (error) => console.error("Erro listener feedbacks:", error)
      );

      // Listener de Configurações da Loja
      const unsubConfig = onSnapshot(doc(db, "stores_config", storeId), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTeamMembers(data.teamMembers || []);
          setSchedules(data.schedules || []);
          setFixedDemands(data.fixedDemands || []);
        }
      });

      return () => {
        unsubTasks();
        unsubFeedbacks();
        unsubConfig();
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

  const canCreateCompanies = user.role === Role.DEV || (user.role === Role.SUPPORT && user.canCreateCompany === true);

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
              {user.role === Role.DEV ? 'PAINEL MASTER' : user.role === Role.SUPPORT ? 'PAINEL DE SUPORTE' : `UNIDADE ${user.storeId}`}
                <button onClick={handleForceRefresh} title="Limpar Cache/Atualizar" className="text-slate-700 hover:text-blue-400 transition-colors">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
              </h1>
              <p className="text-xs font-bold text-white uppercase">{user.name}</p>
            </div>
          </div>
          
          <nav className="hidden lg:flex items-center gap-4">
            {user.role === Role.DEV && <button onClick={() => setActiveTab('tasks')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'tasks' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>📊 Empresas</button>}
            {user.role === Role.DEV && <button onClick={() => setActiveTab('dev-support')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'dev-support' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>🆘 Suporte</button>}
            {user.role === Role.SUPPORT && canCreateCompanies && <button onClick={() => setActiveTab('tasks')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'tasks' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>📊 Empresas</button>}
            {user.role !== Role.DEV && user.role !== Role.SUPPORT && <button onClick={() => setActiveTab('tasks')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'tasks' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Operação</button>}
            {user.role !== Role.DEV && user.role !== Role.SUPPORT && <button onClick={() => setActiveTab('team')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'team' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Equipe</button>}
            {user.role !== Role.DEV && user.role !== Role.SUPPORT && <button onClick={() => setActiveTab('reports')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'reports' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Relatórios</button>}
            {user.role !== Role.DEV && user.role !== Role.SUPPORT && <button onClick={() => setActiveTab('feedback')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'feedback' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Ouvidoria</button>}
            {user.role === Role.SUPPORT && <button onClick={() => setActiveTab('support')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'support' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Meus Tickets</button>}
            {user.role !== Role.DEV && user.role !== Role.COMPANY && <button onClick={() => setActiveTab('mytickets')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'mytickets' ? 'bg-green-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>📤 Suporte</button>}
          </nav>

          <button onClick={handleLogout} className="px-3 py-1.5 md:px-4 md:py-2 text-[9px] md:text-[10px] font-black text-slate-500 hover:text-red-500 uppercase border border-slate-800 rounded-lg md:rounded-xl transition-all">Sair</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8 fade-in">
        {user.role === Role.DEV ? (
          <>
            <div className="flex md:hidden bg-slate-900 p-1 rounded-2xl border border-slate-800 overflow-x-auto gap-1">
              <button onClick={() => setActiveTab('tasks')} className={`flex-1 py-3 px-4 whitespace-nowrap text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === 'tasks' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>📊 Empresas</button>
              <button onClick={() => setActiveTab('dev-support')} className={`flex-1 py-3 px-4 whitespace-nowrap text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === 'dev-support' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>🆘 Suporte</button>
            </div>
            {activeTab === 'tasks' && <SuperAdminDashboard mode={user.role} companyId={user.companyId} />}
            {activeTab === 'dev-support' && <DevSupportManagement devId={user.username || user.name} />}
          </>
        ) : user.role === Role.COMPANY ? (
          <SuperAdminDashboard 
            mode={Role.COMPANY} 
            companyId={user.companyId} 
          />
        ) : user.role === Role.SUPPORT ? (
          <>
            {canCreateCompanies && (
              <div className="flex md:hidden bg-slate-900 p-1 rounded-2xl border border-slate-800 overflow-x-auto gap-1">
                <button onClick={() => setActiveTab('support')} className={`flex-1 py-3 px-4 whitespace-nowrap text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === 'support' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Meus Tickets</button>
                <button onClick={() => setActiveTab('tasks')} className={`flex-1 py-3 px-4 whitespace-nowrap text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === 'tasks' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>📊 Empresas</button>
              </div>
            )}

            {activeTab === 'tasks' && canCreateCompanies ? (
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
            {activeTab === 'tasks' && <AdminStats tasks={tasks} teamMembers={teamMembers.map(m => m.name)} />}
            
            <div className="flex md:hidden bg-slate-900 p-1 rounded-2xl border border-slate-800 overflow-x-auto gap-1">
               {user.role !== Role.SUPPORT && <button onClick={() => setActiveTab('tasks')} className={`flex-1 py-3 px-4 whitespace-nowrap text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === 'tasks' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Operação</button>}
               {user.role !== Role.SUPPORT && <button onClick={() => setActiveTab('team')} className={`flex-1 py-3 px-4 whitespace-nowrap text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === 'team' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Equipe</button>}
               {user.role !== Role.SUPPORT && <button onClick={() => setActiveTab('reports')} className={`flex-1 py-3 px-4 whitespace-nowrap text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === 'reports' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Dados</button>}
               {user.role !== Role.SUPPORT && <button onClick={() => setActiveTab('feedback')} className={`flex-1 py-3 px-4 whitespace-nowrap text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === 'feedback' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Avisos</button>}
               {user.role === Role.SUPPORT && <button onClick={() => setActiveTab('support')} className={`flex-1 py-3 px-4 whitespace-nowrap text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === 'support' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>Meus Tickets</button>}
               {user.role !== Role.DEV && user.role !== Role.COMPANY && <button onClick={() => setActiveTab('mytickets')} className={`flex-1 py-3 px-4 whitespace-nowrap text-[10px] font-black uppercase rounded-xl transition-all ${activeTab === 'mytickets' ? 'bg-green-600 text-white' : 'text-slate-500'}`}>📤 Suporte</button>}
            </div>

            {activeTab === 'tasks' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-slate-900/50 p-4 md:p-6 rounded-3xl border border-slate-800">
                  <h2 className="text-lg md:text-xl font-black uppercase tracking-tighter">Fluxo de Trabalho</h2>
                  {user.role === Role.ADMIN && <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-5 py-2.5 md:px-6 md:py-3 rounded-xl md:rounded-2xl font-black text-[9px] md:text-[10px] uppercase shadow-xl transition-all active:scale-95">Nova Tarefa</button>}
                </div>
                <KanbanBoard 
                  tasks={tasks} 
                  onMove={moveTask} 
                  onToggleCheck={toggleChecklistItem} 
                  onDelete={async (id) => {
                    await deleteDoc(doc(db, "tasks", id));
                  }} 
                  isAdmin={user.role === Role.ADMIN}
                  teamMembers={teamMembers.map(m => m.name)}
                />
              </div>
            )}

            {activeTab === 'team' && (
              <TeamBoard isAdmin={user.role === Role.ADMIN} onEdit={() => setIsTeamModalOpen(true)} teamMembers={teamMembers} schedules={schedules} fixedDemands={fixedDemands} />
            )}

            {activeTab === 'reports' && (
              <ReportsSection tasks={tasks} teamMembers={teamMembers} currentUser={user} />
            )}

            {activeTab === 'feedback' && (
              <FeedbackSection feedbacks={feedbacks} user={user} teamMembers={teamMembers.map(m => m.name)} onSend={handleSendFeedback} onReply={handleReplyFeedback} />
            )}

            {activeTab === 'mytickets' && (
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

      {isModalOpen && <NewTaskModal teamMembers={teamMembers.map(m => m.name)} onClose={() => setIsModalOpen(false)} onSubmit={async (t) => {
        await addDoc(collection(db, "tasks"), { ...t, status: Status.TODO, createdAt: Date.now(), storeId: user.storeId! });
        setIsModalOpen(false);
      }} />}
      
      {isTeamModalOpen && <TeamSettingsModal teamMembers={teamMembers} schedules={schedules} fixedDemands={fixedDemands} storeId={user.storeId!} onClose={() => setIsTeamModalOpen(false)} onSave={async (s, d, m) => {
        const normalizedMembers = m.map(member => ({ ...member, storeId: member.storeId || user.storeId! }));
        await setDoc(doc(db, "stores_config", user.storeId!), { schedules: s, fixedDemands: d, teamMembers: normalizedMembers });
        setIsTeamModalOpen(false);
      }} />}

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