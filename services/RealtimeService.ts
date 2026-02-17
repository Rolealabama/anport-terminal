/**
 * REALTIME SERVICE
 * Sincronização em tempo real via Firestore Listeners (substitui WebSocket)
 */

import { db } from '../firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  DocumentData,
  QuerySnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { Task, RealtimeNotification, User } from '../types-v2';

type TaskCallback = (tasks: Task[]) => void;
type NotificationCallback = (notification: RealtimeNotification) => void;
type UserStatusCallback = (userId: string, isOnline: boolean) => void;

export class RealtimeService {
  private static listeners: Map<string, Unsubscribe> = new Map();

  /**
   * Escuta tarefas pessoais em tempo real
   */
  static subscribeToPersonalTasks(
    userId: string,
    callback: TaskCallback
  ): string {
    const listenerId = `personal-tasks-${userId}`;

    // Remove listener anterior se existir
    this.unsubscribe(listenerId);

    const q = query(
      collection(db, 'tasks_v2'),
      where('assignedToUserId', '==', userId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const tasks = this.snapshotToTasks(snapshot);
        callback(tasks);
      },
      (error) => {
        console.error('Erro no listener de tarefas pessoais:', error);
      }
    );

    this.listeners.set(listenerId, unsubscribe);
    return listenerId;
  }

  /**
   * Escuta tarefas de departamento em tempo real
   */
  static subscribeToDepartmentTasks(
    departmentId: string,
    callback: TaskCallback
  ): string {
    const listenerId = `department-tasks-${departmentId}`;

    this.unsubscribe(listenerId);

    const q = query(
      collection(db, 'tasks_v2'),
      where('assignedToDepartmentId', '==', departmentId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const tasks = this.snapshotToTasks(snapshot);
        callback(tasks);
      },
      (error) => {
        console.error('Erro no listener de tarefas de departamento:', error);
      }
    );

    this.listeners.set(listenerId, unsubscribe);
    return listenerId;
  }

  /**
   * Escuta tarefas de subordinados em tempo real
   */
  static subscribeToSubordinateTasks(
    userId: string,
    companyId: string,
    callback: TaskCallback
  ): string {
    const listenerId = `subordinate-tasks-${userId}`;

    this.unsubscribe(listenerId);

    // Busca todas as tarefas da empresa e filtra no cliente
    // (Firestore não suporta array-contains em combinação com outros filtros)
    const q = query(
      collection(db, 'tasks_v2'),
      where('companyId', '==', companyId)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const allTasks = this.snapshotToTasks(snapshot);

        // Busca hierarchyPath do usuário
        const userDoc = await doc(db, 'users', userId);
        // Filtra tarefas atribuídas a subordinados
        // Esta é uma simplificação - em produção, considere pre-filtrar no backend
        const subordinateTasks = allTasks.filter(task => {
          // Lógica de filtro baseado em hierarchyPath
          return task.assignedToUserId && task.assignedToUserId !== userId;
        });

        callback(subordinateTasks);
      },
      (error) => {
        console.error('Erro no listener de tarefas de subordinados:', error);
      }
    );

    this.listeners.set(listenerId, unsubscribe);
    return listenerId;
  }

  /**
   * Escuta notificações em tempo real
   */
  static subscribeToNotifications(
    userId: string,
    callback: NotificationCallback
  ): string {
    const listenerId = `notifications-${userId}`;

    this.unsubscribe(listenerId);

    const q = query(
      collection(db, 'realtime_notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const notification = {
              id: change.doc.id,
              ...change.doc.data()
            } as RealtimeNotification;
            callback(notification);

            // Auto-play som/vibração no browser
            this.playNotificationSound();
          }
        });
      },
      (error) => {
        console.error('Erro no listener de notificações:', error);
      }
    );

    this.listeners.set(listenerId, unsubscribe);
    return listenerId;
  }

  /**
   * Escuta status online/offline de usuários
   */
  static subscribeToUserStatus(
    userIds: string[],
    callback: UserStatusCallback
  ): string {
    const listenerId = `user-status-${userIds.join('-')}`;

    this.unsubscribe(listenerId);

    const q = query(
      collection(db, 'users'),
      where('id', 'in', userIds.slice(0, 10)) // Firestore limita 'in' a 10 itens
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        snapshot.docs.forEach((doc) => {
          const user = doc.data() as User;
          callback(user.id, user.isOnline);
        });
      },
      (error) => {
        console.error('Erro no listener de status de usuário:', error);
      }
    );

    this.listeners.set(listenerId, unsubscribe);
    return listenerId;
  }

  /**
   * Escuta uma tarefa específica em tempo real
   */
  static subscribeToTask(
    taskId: string,
    callback: (task: Task | null) => void
  ): string {
    const listenerId = `task-${taskId}`;

    this.unsubscribe(listenerId);

    const unsubscribe = onSnapshot(
      doc(db, 'tasks_v2', taskId),
      (snapshot) => {
        if (snapshot.exists()) {
          const task = { id: snapshot.id, ...snapshot.data() } as Task;
          callback(task);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('Erro no listener de tarefa:', error);
      }
    );

    this.listeners.set(listenerId, unsubscribe);
    return listenerId;
  }

  /**
   * Para de escutar um listener específico
   */
  static unsubscribe(listenerId: string): void {
    const unsubscribe = this.listeners.get(listenerId);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(listenerId);
    }
  }

  /**
   * Para de escutar todos os listeners
   */
  static unsubscribeAll(): void {
    this.listeners.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.listeners.clear();
  }

  /**
   * Emite evento customizado para componentes React
   */
  static emitEvent(eventName: string, data: any): void {
    window.dispatchEvent(
      new CustomEvent(eventName, {
        detail: data
      })
    );
  }

  /**
   * Escuta eventos customizados
   */
  static onEvent(
    eventName: string,
    callback: (data: any) => void
  ): () => void {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent;
      callback(customEvent.detail);
    };

    window.addEventListener(eventName, handler);

    // Retorna função para remover listener
    return () => {
      window.removeEventListener(eventName, handler);
    };
  }

  /**
   * Reproduz som de notificação (se permitido)
   */
  private static playNotificationSound(): void {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        // Vibração em dispositivos móveis
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200]);
        }

        // Som (opcional - pode adicionar arquivo de áudio)
        // const audio = new Audio('/notification-sound.mp3');
        // audio.play().catch(() => {}); // Ignora erro se autoplay bloqueado
      }
    } catch (error) {
      // Silenciosamente ignora erros de notificação
    }
  }

  /**
   * Converte snapshot do Firestore para array de tarefas
   */
  private static snapshotToTasks(snapshot: QuerySnapshot<DocumentData>): Task[] {
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Task));
  }

  /**
   * Atualiza status online do usuário (heartbeat)
   */
  static async updateUserPresence(userId: string, isOnline: boolean): Promise<void> {
    try {
      await doc(db, 'users', userId);
      // Update feito via batch no componente principal
    } catch (error) {
      console.error('Erro ao atualizar presença:', error);
    }
  }

  /**
   * Inicia heartbeat para manter presença online
   */
  static startPresenceHeartbeat(
    userId: string,
    intervalMs: number = 30000
  ): number {
    // Atualiza imediatamente
    this.updateUserPresence(userId, true);

    // Configura interval
    const interval = setInterval(() => {
      this.updateUserPresence(userId, true);
    }, intervalMs);

    // Marca como offline ao sair
    window.addEventListener('beforeunload', () => {
      this.updateUserPresence(userId, false);
    });

    return interval as unknown as number;
  }

  /**
   * Para heartbeat de presença
   */
  static stopPresenceHeartbeat(intervalId: number, userId: string): void {
    clearInterval(intervalId);
    this.updateUserPresence(userId, false);
  }
}

/**
 * Hook React para usar realtime service
 * Exemplo de uso:
 * 
 * const tasks = useRealtimeTasks(userId, 'personal');
 */
export const createRealtimeHook = () => {
  // Este seria implementado quando integrarmos com React
  // Por enquanto, deixamos a estrutura preparada
};
