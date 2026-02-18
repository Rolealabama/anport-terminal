/**
 * KANBAN SERVICE
 * Gerencia movimentação de tarefas com controle de concorrência
 */

import { db } from '../firebase';
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  runTransaction,
  query,
  collection,
  where,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { Task, TaskStatus, DistributedLock, TaskHistoryEntry } from '../types-v2';
import { AuthorizationService } from './AuthorizationService';

export class KanbanService {
  private static readonly LOCK_TIMEOUT_MS = 30000; // 30 segundos

  /**
   * Move tarefa no Kanban com controle de concorrência otimista
   */
  static async moveTask(
    userId: string,
    taskId: string,
    newStatus: TaskStatus,
    expectedVersion: number
  ): Promise<{
    success: boolean;
    error?: string;
    newVersion?: number;
  }> {
    // 1. Valida autorização
    const authResult = await AuthorizationService.authorizeBoardMove(userId, taskId);
    if (!authResult.allowed) {
      return { success: false, error: authResult.reason };
    }

    // 2. Tenta adquirir lock
    const lockId = await this.acquireLock(taskId, userId);
    if (!lockId) {
      return { success: false, error: 'Tarefa sendo modificada por outro usuário' };
    }

    try {
      // 3. Move tarefa com versionamento otimista
      const result = await runTransaction(db, async (transaction) => {
        const taskRef = doc(db, 'tasks_v2', taskId);
        const taskDoc = await transaction.get(taskRef);

        if (!taskDoc.exists()) {
          throw new Error('Tarefa não encontrada');
        }

        const task = taskDoc.data() as Task;

        // Valida versão (controle otimista)
        if (task.version !== expectedVersion) {
          throw new Error(
            `Conflito de versão. Esperado: ${expectedVersion}, Atual: ${task.version}`
          );
        }

        // Atualiza tarefa
        const newVersion = task.version + 1;
        const now = Date.now();

        transaction.update(taskRef, {
          status: newStatus,
          version: newVersion,
          'metadata.updatedAt': now,
          'metadata.lastMovedAt': now,
          'metadata.lastMovedBy': userId
        });

        // Adiciona entrada no histórico
        const historyEntry: TaskHistoryEntry = {
          id: crypto.randomUUID(),
          action: 'moved',
          userId,
          userName: '', // Será preenchido pelo frontend
          timestamp: now,
          details: {
            from: task.status,
            to: newStatus
          }
        };

        const currentHistory = task.history || [];
        transaction.update(taskRef, {
          history: [...currentHistory, historyEntry]
        });

        return { newVersion };
      });

      return { success: true, newVersion: result.newVersion };
    } catch (error) {
      console.error('Erro ao mover tarefa:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    } finally {
      // 4. Libera lock
      await this.releaseLock(lockId);
    }
  }

  /**
   * Busca tarefas do Kanban pessoal
   */
  static async getPersonalTasks(userId: string): Promise<Task[]> {
    try {
      const q = query(
        collection(db, 'tasks_v2'),
        where('assignedToUserId', '==', userId)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
    } catch (error) {
      console.error('Erro ao buscar tarefas pessoais:', error);
      return [];
    }
  }

  /**
   * Busca tarefas do Kanban de departamento
   */
  static async getDepartmentTasks(departmentId: string): Promise<Task[]> {
    try {
      const q = query(
        collection(db, 'tasks_v2'),
        where('assignedToDepartmentId', '==', departmentId)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
    } catch (error) {
      console.error('Erro ao buscar tarefas do departamento:', error);
      return [];
    }
  }

  /**
   * Busca tarefas visíveis para um usuário (baseado em permissões)
   */
  static async getVisibleTasks(
    userId: string,
    companyId: string
  ): Promise<{
    personalTasks: Task[];
    departmentTasks: Task[];
    subordinateTasks: Task[];
  }> {
    const user = await this.getUser(userId);
    if (!user) {
      return { personalTasks: [], departmentTasks: [], subordinateTasks: [] };
    }

    // Tarefas pessoais
    const personalTasks = await this.getPersonalTasks(userId);

    // Tarefas do departamento
    const departmentTasks = await this.getDepartmentTasks(user.departmentId);

    // Tarefas de subordinados (se tiver permissão)
    let subordinateTasks: Task[] = [];
    const hasViewDown = await AuthorizationService.hasPermission(
      userId,
      'board.view.down' as any
    );

    if (hasViewDown) {
      // Busca tarefas de usuários que estão no hierarchyPath
      const q = query(
        collection(db, 'tasks_v2'),
        where('companyId', '==', companyId)
      );

      const snapshot = await getDocs(q);
      subordinateTasks = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Task))
        .filter(task => {
          if (!task.assignedToUserId) return false;
          // Verifica se o usuário atribuído é subordinado
          return user.hierarchyPath.includes(task.assignedToUserId);
        });
    }

    return {
      personalTasks,
      departmentTasks,
      subordinateTasks
    };
  }

  /**
   * Atualiza checklist de tarefa
   */
  static async toggleChecklistItem(
    userId: string,
    taskId: string,
    checklistItemId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const taskRef = doc(db, 'tasks_v2', taskId);
      const taskDoc = await getDoc(taskRef);

      if (!taskDoc.exists()) {
        return { success: false, error: 'Tarefa não encontrada' };
      }

      const task = taskDoc.data() as Task;

      // Valida que usuário pode editar
      if (task.assignedToUserId !== userId) {
        const authResult = await AuthorizationService.authorizeBoardMove(userId, taskId);
        if (!authResult.allowed) {
          return { success: false, error: 'Sem permissão para editar tarefa' };
        }
      }

      // Atualiza checklist
      const updatedChecklist = task.checklist?.map(item => {
        if (item.id === checklistItemId) {
          return {
            ...item,
            completed: !item.completed,
            completedBy: !item.completed ? userId : undefined,
            completedAt: !item.completed ? Date.now() : undefined
          };
        }
        return item;
      });

      await updateDoc(taskRef, {
        checklist: updatedChecklist,
        version: task.version + 1,
        'metadata.updatedAt': Date.now()
      });

      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar checklist:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  // ==================== LOCK DISTRIBUÍDO ====================

  /**
   * Adquire lock distribuído para recurso
   */
  private static async acquireLock(
    taskId: string,
    userId: string
  ): Promise<string | null> {
    const lockId = `task:${taskId}`;
    const expiresAt = Date.now() + this.LOCK_TIMEOUT_MS;

    try {
      // Verifica se já existe lock ativo
      const lockRef = doc(db, 'distributed_locks', lockId);
      const lockDoc = await getDoc(lockRef);

      if (lockDoc.exists()) {
        const existingLock = lockDoc.data() as DistributedLock;

        // Se lock expirou, pode adquirir
        if (existingLock.expiresAt < Date.now()) {
          await updateDoc(lockRef, {
            ownerId: userId,
            expiresAt,
            'metadata.acquiredAt': Date.now()
          });
          return lockId;
        }

        // Se é o mesmo dono, renova
        if (existingLock.ownerId === userId) {
          await updateDoc(lockRef, {
            expiresAt,
            'metadata.renewedAt': Date.now()
          });
          return lockId;
        }

        // Lock ativo de outro usuário
        return null;
      }

      // Cria novo lock
      await setDoc(doc(db, 'distributed_locks', lockId), {
        id: lockId,
        resourceType: 'task',
        resourceId: taskId,
        ownerId: userId,
        expiresAt,
        companyId: '', // Será preenchido se necessário
        metadata: {
          acquiredAt: Date.now()
        }
      });

      return lockId;
    } catch (error) {
      console.error('Erro ao adquirir lock:', error);
      return null;
    }
  }

  /**
   * Libera lock distribuído
   */
  private static async releaseLock(lockId: string): Promise<void> {
    try {
      const lockRef = doc(db, 'distributed_locks', lockId);
      await deleteDoc(lockRef);
    } catch (error) {
      console.error('Erro ao liberar lock:', error);
    }
  }

  /**
   * Limpa locks expirados (deve ser executado periodicamente)
   */
  static async cleanupExpiredLocks(): Promise<number> {
    try {
      const q = query(collection(db, 'distributed_locks'));
      const snapshot = await getDocs(q);

      const now = Date.now();
      let cleaned = 0;

      for (const lockDoc of snapshot.docs) {
        const lock = lockDoc.data() as DistributedLock;
        if (lock.expiresAt < now) {
          await deleteDoc(doc(db, 'distributed_locks', lockDoc.id));
          cleaned++;
        }
      }

      return cleaned;
    } catch (error) {
      console.error('Erro ao limpar locks expirados:', error);
      return 0;
    }
  }

  private static async getUser(userId: string): Promise<any> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return null;
      return { id: userDoc.id, ...userDoc.data() };
    } catch (error) {
      if (import.meta.env.MODE !== 'test') console.error('Erro ao buscar usuário:', error);
      return null;
    }
  }
}
