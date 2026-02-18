import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { auth, db, isFirebaseConfigured } from './firebase.ts';
import { CreateTaskRequest, Permission, Task, User } from './types-v2.ts';
import { AuthorizationService } from './services/AuthorizationService.ts';
import { RealtimeService } from './services/RealtimeService.ts';
import { TaskService } from './services/TaskService.ts';

import LoginV2 from './components/LoginV2.tsx';
import KanbanBoardV2 from './components/KanbanBoardV2.tsx';
import NewTaskModalV2 from './components/NewTaskModalV2.tsx';
import Organograma from './components/Organograma.tsx';

const App: React.FC = () => {
  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<'kanban' | 'organization'>('kanban');
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (authUser) => {
      setAuthReady(true);
      setUserId(authUser?.uid ?? null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!userId) {
      setUser(null);
      setPermissions([]);
      setTasks([]);
      return;
    }

    let cancelled = false;

    const loadUser = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', userId));
        if (!snap.exists()) {
          if (!cancelled) setError('Usuário não encontrado em users/.');
          return;
        }

        const userData = { id: snap.id, ...snap.data() } as User;
        const perms = await AuthorizationService.getUserPermissions(userId);

        if (!cancelled) {
          setUser(userData);
          setPermissions(perms);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erro ao carregar usuário');
      }
    };

    void loadUser();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !user) return;

    const listenerId = RealtimeService.subscribeToPersonalTasks(userId, (newTasks) => {
      setTasks(newTasks);
    });

    return () => {
      RealtimeService.unsubscribe(listenerId);
    };
  }, [userId, user?.id]);

  const handleCreateTask = async (request: CreateTaskRequest) => {
    if (!userId) return;
    setError('');

    const result = await TaskService.createTask(userId, request);
    if (!result.success) {
      setError(result.error || 'Erro ao criar tarefa');
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  if (!isFirebaseConfigured) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Erro de Conexão</h1>
          <p className="text-slate-400 mt-2">Variáveis do Firebase não configuradas.</p>
        </div>
      </div>
    );
  }

  if (!authReady) {
    return <div className="min-h-screen bg-slate-950" />;
  }

  if (!userId) {
    return <LoginV2 />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-slate-300">Carregando perfil…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-xl font-black uppercase tracking-tighter">AnPort</div>
            <div className="text-xs text-slate-400">{user.name} · {user.companyId}</div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('kanban')}
              className={`px-3 py-2 rounded-xl text-sm font-bold ${activeTab === 'kanban' ? 'bg-slate-800' : 'bg-slate-900 border border-slate-800'}`}
            >
              Kanban
            </button>
            <button
              onClick={() => setActiveTab('organization')}
              className={`px-3 py-2 rounded-xl text-sm font-bold ${activeTab === 'organization' ? 'bg-slate-800' : 'bg-slate-900 border border-slate-800'}`}
            >
              Organização
            </button>
            <button
              onClick={() => setIsNewTaskOpen(true)}
              className="px-3 py-2 rounded-xl text-sm font-extrabold bg-blue-600 hover:bg-blue-500"
            >
              Nova tarefa
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-xl text-sm font-bold bg-slate-900 border border-slate-800"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-2xl px-4 py-3 text-sm">
            {error}
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6">
        {activeTab === 'kanban' ? (
          <KanbanBoardV2
            tasks={tasks}
            userId={userId}
            userPermissions={permissions}
            onError={(msg) => setError(msg)}
          />
        ) : (
          <Organograma
            companyId={user.companyId}
            userId={userId}
            onError={(msg) => setError(msg)}
          />
        )}
      </main>

      {isNewTaskOpen && (
        <NewTaskModalV2
          userId={userId}
          companyId={user.companyId}
          userPermissions={permissions}
          onClose={() => setIsNewTaskOpen(false)}
          onSubmit={handleCreateTask}
          onError={(msg) => setError(msg)}
        />
      )}
    </div>
  );
};

export default App;
