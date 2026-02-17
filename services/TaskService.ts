/**
 * TASK SERVICE
 * Gerencia criação e fluxo de tarefas na hierarquia
 */

import { db } from '../firebase';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import {
  Task,
  CreateTaskRequest,
  TaskStatus,
  TaskFlowType,
  User,
  TaskHistoryEntry
} from '../types-v2';
import { AuthorizationService } from './AuthorizationService';

export class TaskService {
  /**
   * Cria nova tarefa com validação de autorização
   */
  static async createTask(
    creatorId: string,
    request: CreateTaskRequest
  ): Promise<{
    success: boolean;
    taskId?: string;
    error?: string;
    escalationPath?: string[];
  }> {
    const creator = await this.getUser(creatorId);
    if (!creator) {
      return { success: false, error: 'Usuário criador não encontrado' };
    }

    // Valida autorização
    const authResult = await AuthorizationService.authorizeTaskCreation(
      creatorId,
      request.flowType,
      request.assignedToUserId,
      request.assignedToDepartmentId
    );

    if (!authResult.allowed) {
      return {
        success: false,
        error: authResult.reason,
        escalationPath: authResult.escalationPath
      };
    }

    // Se precisa escalação, ajusta atribuição
    let effectiveAssignedTo = request.assignedToUserId;
    let escalationPath: string[] = [];

    if (authResult.requiresEscalation && authResult.escalationPath) {
      escalationPath = authResult.escalationPath;
      // Atribui para o último usuário na cadeia de escalação
      effectiveAssignedTo = escalationPath[escalationPath.length - 1];
    }

    try {
      // Cria tarefa
      const task: Omit<Task, 'id'> = {
        companyId: creator.companyId,
        assignedToUserId: effectiveAssignedTo,
        assignedToDepartmentId: request.assignedToDepartmentId,
        createdById: creatorId,
        title: request.title,
        description: request.description,
        priority: request.priority,
        status: TaskStatus.TODO,
        dueDate: request.dueDate,
        flowType: request.flowType,
        escalationPath,
        checklist: request.checklist?.map(item => ({
          id: crypto.randomUUID(),
          text: item.text,
          completed: false
        })),
        attachments: [],
        version: 1,
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        history: [
          {
            id: crypto.randomUUID(),
            action: 'created',
            userId: creatorId,
            userName: creator.name,
            timestamp: Date.now(),
            details: {
              flowType: request.flowType,
              escalated: authResult.requiresEscalation
            }
          }
        ]
      };

      const docRef = await addDoc(collection(db, 'tasks_v2'), task);

      // Se foi escalada, registra auditoria
      if (authResult.requiresEscalation) {
        await this.logTaskEscalation(docRef.id, creatorId, escalationPath);
      }

      return {
        success: true,
        taskId: docRef.id,
        escalationPath: authResult.requiresEscalation ? escalationPath : undefined
      };
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao criar tarefa'
      };
    }
  }

  /**
   * Reatribui tarefa para outro usuário/departamento
   */
  static async reassignTask(
    userId: string,
    taskId: string,
    newAssignedToUserId?: string,
    newAssignedToDepartmentId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const user = await this.getUser(userId);
    if (!user) {
      return { success: false, error: 'Usuário não encontrado' };
    }

    // Valida permissão de reatribuição
    const hasPermission = await AuthorizationService.hasPermission(
      userId,
      'task.reassign' as any
    );

    if (!hasPermission) {
      return { success: false, error: 'Sem permissão para reatribuir tarefas' };
    }

    try {
      const taskRef = doc(db, 'tasks_v2', taskId);
      const taskDoc = await getDoc(taskRef);

      if (!taskDoc.exists()) {
        return { success: false, error: 'Tarefa não encontrada' };
      }

      const task = taskDoc.data() as Task;

      // Valida mesma empresa
      if (task.companyId !== user.companyId) {
        return { success: false, error: 'Tarefa de outra empresa' };
      }

      // Valida novo destino
      if (newAssignedToUserId) {
        const newUser = await this.getUser(newAssignedToUserId);
        if (!newUser || newUser.companyId !== user.companyId) {
          return { success: false, error: 'Usuário destino inválido' };
        }
      } else if (newAssignedToDepartmentId) {
        const newDept = await this.getDepartment(newAssignedToDepartmentId);
        if (!newDept || newDept.companyId !== user.companyId) {
          return { success: false, error: 'Departamento destino inválido' };
        }
      } else {
        return { success: false, error: 'Novo destino não especificado' };
      }

      // Adiciona entrada no histórico
      const historyEntry: TaskHistoryEntry = {
        id: crypto.randomUUID(),
        action: 'assigned',
        userId,
        userName: user.name,
        timestamp: Date.now(),
        details: {
          from: task.assignedToUserId || task.assignedToDepartmentId,
          to: newAssignedToUserId || newAssignedToDepartmentId,
          type: newAssignedToUserId ? 'user' : 'department'
        }
      };

      await updateDoc(taskRef, {
        assignedToUserId: newAssignedToUserId || null,
        assignedToDepartmentId: newAssignedToDepartmentId || null,
        version: task.version + 1,
        'metadata.updatedAt': Date.now(),
        history: [...(task.history || []), historyEntry]
      });

      return { success: true };
    } catch (error) {
      console.error('Erro ao reatribuir tarefa:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Busca tarefa por ID
   */
  static async getTask(taskId: string): Promise<Task | null> {
    try {
      const taskDoc = await getDoc(doc(db, 'tasks_v2', taskId));
      if (!taskDoc.exists()) return null;
      return { id: taskDoc.id, ...taskDoc.data() } as Task;
    } catch (error) {
      console.error('Erro ao buscar tarefa:', error);
      return null;
    }
  }

  /**
   * Busca tarefas criadas por usuário
   */
  static async getTasksCreatedBy(userId: string): Promise<Task[]> {
    try {
      const q = query(
        collection(db, 'tasks_v2'),
        where('createdById', '==', userId)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
    } catch (error) {
      console.error('Erro ao buscar tarefas criadas:', error);
      return [];
    }
  }

  /**
   * Busca tarefas atribuídas a usuário
   */
  static async getTasksAssignedToUser(userId: string): Promise<Task[]> {
    try {
      const q = query(
        collection(db, 'tasks_v2'),
        where('assignedToUserId', '==', userId)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
    } catch (error) {
      console.error('Erro ao buscar tarefas atribuídas:', error);
      return [];
    }
  }

  /**
   * Busca tarefas atribuídas a departamento
   */
  static async getTasksAssignedToDepartment(departmentId: string): Promise<Task[]> {
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
   * Move tarefa para novo status (com versionamento otimista)
   */
  static async moveTask(
    taskId: string,
    newStatus: TaskStatus,
    expectedVersion: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const taskRef = doc(db, 'tasks_v2', taskId);
      const taskSnap = await getDoc(taskRef);
      
      if (!taskSnap.exists()) {
        return { success: false, error: 'Tarefa não encontrada' };
      }

      const task = taskSnap.data() as Task;

      // Valida versão (controle otimista)
      if (task.version !== expectedVersion) {
        return {
          success: false,
          error: `Conflito de versão! Esperado: ${expectedVersion}, Atual: ${task.version}`
        };
      }

      // Valida transição de status
      const validTransitions: Record<TaskStatus, TaskStatus[]> = {
        [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED],
        [TaskStatus.IN_PROGRESS]: [TaskStatus.REVIEW, TaskStatus.BLOCKED, TaskStatus.TODO],
        [TaskStatus.REVIEW]: [TaskStatus.DONE, TaskStatus.IN_PROGRESS, TaskStatus.BLOCKED],
        [TaskStatus.DONE]: [],
        [TaskStatus.BLOCKED]: [TaskStatus.TODO, TaskStatus.IN_PROGRESS]
      };

      if (!validTransitions[task.status]?.includes(newStatus)) {
        return {
          success: false,
          error: `Transição inválida: ${task.status} → ${newStatus}`
        };
      }

      // Atualiza tarefa
      await updateDoc(taskRef, {
        status: newStatus,
        version: task.version + 1,
        'metadata.lastMovedAt': Date.now()
      });

      return { success: true };
    } catch (error) {
      console.error('Erro ao mover tarefa:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Completa tarefa
   */
  static async completeTask(
    userId: string,
    taskId: string,
    completionNotes?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const taskRef = doc(db, 'tasks_v2', taskId);
      const taskDoc = await getDoc(taskRef);

      if (!taskDoc.exists()) {
        return { success: false, error: 'Tarefa não encontrada' };
      }

      const task = taskDoc.data() as Task;

      // Valida que usuário pode completar
      if (task.assignedToUserId !== userId) {
        const authResult = await AuthorizationService.authorizeBoardMove(userId, taskId);
        if (!authResult.allowed) {
          return { success: false, error: 'Sem permissão para completar tarefa' };
        }
      }

      // Valida que checklist está completo (se existir)
      if (task.checklist && task.checklist.length > 0) {
        const allCompleted = task.checklist.every(item => item.completed);
        if (!allCompleted) {
          return { success: false, error: 'Complete todos os itens do checklist antes' };
        }
      }

      const user = await this.getUser(userId);
      const historyEntry: TaskHistoryEntry = {
        id: crypto.randomUUID(),
        action: 'completed',
        userId,
        userName: user?.name || 'Unknown',
        timestamp: Date.now(),
        details: {
          notes: completionNotes
        }
      };

      await updateDoc(taskRef, {
        status: TaskStatus.DONE,
        version: task.version + 1,
        'metadata.completedAt': Date.now(),
        'metadata.updatedAt': Date.now(),
        history: [...(task.history || []), historyEntry]
      });

      return { success: true };
    } catch (error) {
      console.error('Erro ao completar tarefa:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Registra log de escalação de tarefa
   */
  private static async logTaskEscalation(
    taskId: string,
    originUserId: string,
    escalationPath: string[]
  ): Promise<void> {
    try {
      const user = await this.getUser(originUserId);
      if (!user) return;

      await addDoc(collection(db, 'audit_logs'), {
        companyId: user.companyId,
        userId: originUserId,
        userName: user.name,
        action: 'task_escalated',
        resource: 'task',
        resourceId: taskId,
        details: {
          escalationPath,
          reason: 'Usuário sem permissão para envio direto ao departamento'
        },
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('Erro ao registrar escalação:', error);
    }
  }

  private static async getUser(userId: string): Promise<User | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return null;
      return { id: userDoc.id, ...userDoc.data() } as User;
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      return null;
    }
  }

  private static async getDepartment(deptId: string): Promise<any> {
    try {
      const deptDoc = await getDoc(doc(db, 'departments', deptId));
      if (!deptDoc.exists()) return null;
      return { id: deptDoc.id, ...deptDoc.data() };
    } catch (error) {
      console.error('Erro ao buscar departamento:', error);
      return null;
    }
  }
}
