/**
 * AUTHORIZATION SERVICE
 * Governança centralizada - Backend sempre é a autoridade final
 */

import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import {
  AuthContext,
  AuthorizationResult,
  Permission,
  User,
  Role,
  Department,
  DepartmentCommunication,
  TaskFlowType,
  UserStatus
} from '../types-v2';

export class AuthorizationService {
  /**
   * Verifica se usuário tem permissão específica
   */
  static async hasPermission(
    userId: string,
    permission: Permission
  ): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user || user.status !== UserStatus.ACTIVE) return false;

    const role = await this.getRole(user.roleId);
    if (!role) return false;

    return role.permissions.includes(permission);
  }

  /**
   * Verifica múltiplas permissões (OR logic)
   */
  static async hasAnyPermission(
    userId: string,
    permissions: Permission[]
  ): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user || user.status !== UserStatus.ACTIVE) return false;

    const role = await this.getRole(user.roleId);
    if (!role) return false;

    return permissions.some(p => role.permissions.includes(p));
  }

  /**
   * Verifica múltiplas permissões (AND logic)
   */
  static async hasAllPermissions(
    userId: string,
    permissions: Permission[]
  ): Promise<boolean> {
    const user = await this.getUser(userId);
    if (!user || user.status !== UserStatus.ACTIVE) return false;

    const role = await this.getRole(user.roleId);
    if (!role) return false;

    return permissions.every(p => role.permissions.includes(p));
  }

  /**
   * Autoriza criação de tarefa com validação completa
   */
  static async authorizeTaskCreation(
    creatorId: string,
    flowType: TaskFlowType,
    targetUserId?: string,
    targetDepartmentId?: string
  ): Promise<AuthorizationResult> {
    const creator = await this.getUser(creatorId);
    if (!creator || creator.status !== UserStatus.ACTIVE) {
      return { allowed: false, reason: 'Usuário inativo ou inválido' };
    }

    // Valida permissão baseado no tipo de fluxo
    switch (flowType) {
      case TaskFlowType.DESCENDANT:
        return await this.authorizeDescendantTask(creator, targetUserId);
      
      case TaskFlowType.ASCENDANT:
        return await this.authorizeAscendantTask(creator, targetUserId);
      
      case TaskFlowType.SAME_LEVEL:
        return await this.authorizeSameLevelTask(creator, targetUserId);
      
      case TaskFlowType.TO_DEPARTMENT:
        return await this.authorizeDepartmentTask(creator, targetDepartmentId);
      
      default:
        return { allowed: false, reason: 'Tipo de fluxo inválido' };
    }
  }

  /**
   * Autoriza tarefa descendente (para subordinado)
   */
  private static async authorizeDescendantTask(
    creator: User,
    targetUserId?: string
  ): Promise<AuthorizationResult> {
    const hasPermission = await this.hasPermission(creator.id, Permission.TASK_CREATE_DOWN);
    if (!hasPermission) {
      return { allowed: false, reason: 'Sem permissão para criar tarefa descendente' };
    }

    if (!targetUserId) {
      return { allowed: false, reason: 'Usuário destino não especificado' };
    }

    const target = await this.getUser(targetUserId);
    if (!target || target.status !== UserStatus.ACTIVE) {
      return { allowed: false, reason: 'Usuário destino inativo' };
    }

    // Valida que target é subordinado (está no hierarchyPath do creator)
    const isSubordinate = target.hierarchyPath.includes(creator.id);
    if (!isSubordinate) {
      return { allowed: false, reason: 'Usuário destino não é subordinado' };
    }

    // Valida mesma empresa
    if (creator.companyId !== target.companyId) {
      return { allowed: false, reason: 'Usuários de empresas diferentes' };
    }

    return { allowed: true };
  }

  /**
   * Autoriza tarefa ascendente (para superior)
   */
  private static async authorizeAscendantTask(
    creator: User,
    targetUserId?: string
  ): Promise<AuthorizationResult> {
    const hasPermission = await this.hasPermission(creator.id, Permission.TASK_CREATE_UP);
    if (!hasPermission) {
      return { allowed: false, reason: 'Sem permissão para criar tarefa ascendente' };
    }

    // Se não especificou target, usa superior imediato
    const effectiveTargetId = targetUserId || creator.superiorId;
    
    if (!effectiveTargetId) {
      return { allowed: false, reason: 'Usuário não possui superior' };
    }

    const target = await this.getUser(effectiveTargetId);
    if (!target || target.status !== UserStatus.ACTIVE) {
      return { allowed: false, reason: 'Superior inativo' };
    }

    // Valida que target é superior (creator está no hierarchyPath do target)
    const isSuperior = creator.hierarchyPath.includes(target.id);
    if (!isSuperior) {
      return { allowed: false, reason: 'Usuário destino não é superior' };
    }

    return { allowed: true };
  }

  /**
   * Autoriza tarefa para mesmo nível
   */
  private static async authorizeSameLevelTask(
    creator: User,
    targetUserId?: string
  ): Promise<AuthorizationResult> {
    const hasPermission = await this.hasPermission(creator.id, Permission.TASK_CREATE_SAME);
    if (!hasPermission) {
      return { allowed: false, reason: 'Sem permissão para criar tarefa no mesmo nível' };
    }

    if (!targetUserId) {
      return { allowed: false, reason: 'Usuário destino não especificado' };
    }

    const target = await this.getUser(targetUserId);
    if (!target || target.status !== UserStatus.ACTIVE) {
      return { allowed: false, reason: 'Usuário destino inativo' };
    }

    // Valida mesmo nível hierárquico
    if (creator.hierarchyLevel !== target.hierarchyLevel) {
      return { allowed: false, reason: 'Usuários em níveis hierárquicos diferentes' };
    }

    // Valida mesma empresa
    if (creator.companyId !== target.companyId) {
      return { allowed: false, reason: 'Usuários de empresas diferentes' };
    }

    return { allowed: true };
  }

  /**
   * Autoriza envio para departamento
   */
  private static async authorizeDepartmentTask(
    creator: User,
    targetDepartmentId?: string
  ): Promise<AuthorizationResult> {
    if (!targetDepartmentId) {
      return { allowed: false, reason: 'Departamento destino não especificado' };
    }

    const hasPermission = await this.hasPermission(creator.id, Permission.TASK_CREATE_TO_DEPT);
    
    // Se não tem permissão, tenta escalar
    if (!hasPermission) {
      return await this.escalateToFindPermission(creator, targetDepartmentId);
    }

    // Valida departamento existe e está ativo
    const dept = await this.getDepartment(targetDepartmentId);
    if (!dept || !dept.isActive) {
      return { allowed: false, reason: 'Departamento inativo ou inválido' };
    }

    // Valida mesma empresa
    if (creator.companyId !== dept.companyId) {
      return { allowed: false, reason: 'Departamento de outra empresa' };
    }

    // Valida comunicação entre departamentos
    if (creator.departmentId !== targetDepartmentId) {
      const commAllowed = await this.checkDepartmentCommunication(
        creator.companyId,
        creator.departmentId,
        targetDepartmentId
      );
      
      if (!commAllowed) {
        return { 
          allowed: false, 
          reason: 'Comunicação entre departamentos não autorizada' 
        };
      }
    }

    // Valida que departamento tem líder ativo
    const leader = await this.getUser(dept.leaderId);
    if (!leader || leader.status !== UserStatus.ACTIVE) {
      // Tenta usar fallback leader
      if (dept.fallbackLeaderId) {
        const fallbackLeader = await this.getUser(dept.fallbackLeaderId);
        if (fallbackLeader && fallbackLeader.status === UserStatus.ACTIVE) {
          return { allowed: true };
        }
      }
      return { allowed: false, reason: 'Departamento sem líder ativo' };
    }

    return { allowed: true };
  }

  /**
   * Escala tarefa na hierarquia até encontrar alguém com permissão
   */
  private static async escalateToFindPermission(
    creator: User,
    targetDepartmentId: string
  ): Promise<AuthorizationResult> {
    let currentUser = creator;
    const escalationPath: string[] = [creator.id];

    // Sobe na hierarquia até 10 níveis (proteção contra loops infinitos)
    for (let i = 0; i < 10; i++) {
      if (!currentUser.superiorId) {
        return {
          allowed: false,
          reason: 'Nenhum superior na hierarquia possui permissão para enviar ao departamento',
          requiresEscalation: true,
          escalationPath
        };
      }

      const superior = await this.getUser(currentUser.superiorId);
      if (!superior || superior.status !== UserStatus.ACTIVE) {
        return {
          allowed: false,
          reason: 'Superior na cadeia hierárquica está inativo',
          requiresEscalation: true,
          escalationPath
        };
      }

      escalationPath.push(superior.id);

      const hasPermission = await this.hasPermission(
        superior.id,
        Permission.TASK_CREATE_TO_DEPT
      );

      if (hasPermission) {
        // Valida comunicação entre departamentos
        const commAllowed = await this.checkDepartmentCommunication(
          superior.companyId,
          superior.departmentId,
          targetDepartmentId
        );

        if (commAllowed) {
          return {
            allowed: true,
            requiresEscalation: true,
            escalationPath
          };
        }
      }

      currentUser = superior;
    }

    return {
      allowed: false,
      reason: 'Limite de escalação atingido sem encontrar permissão',
      requiresEscalation: true,
      escalationPath
    };
  }

  /**
   * Verifica se comunicação entre departamentos é permitida
   */
  private static async checkDepartmentCommunication(
    companyId: string,
    fromDeptId: string,
    toDeptId: string
  ): Promise<boolean> {
    // Mesmo departamento sempre permitido
    if (fromDeptId === toDeptId) return true;

    try {
      const q = query(
        collection(db, 'department_communications'),
        where('companyId', '==', companyId),
        where('fromDepartmentId', '==', fromDeptId),
        where('toDepartmentId', '==', toDeptId)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        // Se não tem regra específica, verifica configuração global da empresa
        const companyDoc = await getDoc(doc(db, 'companies', companyId));
        if (companyDoc.exists()) {
          return companyDoc.data()?.settings?.allowCrossDeptComm || false;
        }
        return false;
      }

      const rule = snapshot.docs[0].data() as DepartmentCommunication;
      return rule.allowed;
    } catch (error) {
      console.error('Erro ao verificar comunicação entre departamentos:', error);
      return false;
    }
  }

  /**
   * Autoriza movimentação de tarefa no Kanban
   */
  static async authorizeBoardMove(
    userId: string,
    taskId: string
  ): Promise<AuthorizationResult> {
    const user = await this.getUser(userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      return { allowed: false, reason: 'Usuário inativo' };
    }

    const task = await this.getTask(taskId);
    if (!task) {
      return { allowed: false, reason: 'Tarefa não encontrada' };
    }

    // Valida mesma empresa
    if (user.companyId !== task.companyId) {
      return { allowed: false, reason: 'Tarefa de outra empresa' };
    }

    // Tarefa pessoal - usuário pode mover suas próprias tarefas
    if (task.assignedToUserId === userId) {
      const hasPermission = await this.hasPermission(userId, Permission.BOARD_MOVE_OWN);
      return {
        allowed: hasPermission,
        reason: hasPermission ? undefined : 'Sem permissão para mover tarefa própria'
      };
    }

    // Tarefa de departamento - apenas líder pode mover
    if (task.assignedToDepartmentId) {
      const dept = await this.getDepartment(task.assignedToDepartmentId);
      if (!dept) {
        return { allowed: false, reason: 'Departamento não encontrado' };
      }

      const isLeader = dept.leaderId === userId || dept.fallbackLeaderId === userId;
      if (!isLeader) {
        return { allowed: false, reason: 'Apenas líder do departamento pode mover tarefas' };
      }

      const hasPermission = await this.hasPermission(userId, Permission.BOARD_MOVE_DEPT);
      return {
        allowed: hasPermission,
        reason: hasPermission ? undefined : 'Líder sem permissão para mover tarefas'
      };
    }

    return { allowed: false, reason: 'Tarefa sem atribuição válida' };
  }

  /**
   * Cria contexto de autorização completo para o usuário
   */
  static async createAuthContext(userId: string): Promise<AuthContext | null> {
    const user = await this.getUser(userId);
    if (!user || user.status !== UserStatus.ACTIVE) return null;

    const role = await this.getRole(user.roleId);
    if (!role) return null;

    return {
      userId: user.id,
      companyId: user.companyId,
      roleId: user.roleId,
      departmentId: user.departmentId,
      permissions: role.permissions,
      hierarchyLevel: user.hierarchyLevel,
      hierarchyPath: user.hierarchyPath
    };
  }

  // ==================== HELPERS PRIVADOS ====================

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

  private static async getRole(roleId: string): Promise<Role | null> {
    try {
      const roleDoc = await getDoc(doc(db, 'roles', roleId));
      if (!roleDoc.exists()) return null;
      return { id: roleDoc.id, ...roleDoc.data() } as Role;
    } catch (error) {
      console.error('Erro ao buscar role:', error);
      return null;
    }
  }

  private static async getDepartment(deptId: string): Promise<Department | null> {
    try {
      const deptDoc = await getDoc(doc(db, 'departments', deptId));
      if (!deptDoc.exists()) return null;
      return { id: deptDoc.id, ...deptDoc.data() } as Department;
    } catch (error) {
      console.error('Erro ao buscar departamento:', error);
      return null;
    }
  }

  private static async getTask(taskId: string): Promise<any> {
    try {
      const taskDoc = await getDoc(doc(db, 'tasks_v2', taskId));
      if (!taskDoc.exists()) return null;
      return { id: taskDoc.id, ...taskDoc.data() };
    } catch (error) {
      console.error('Erro ao buscar tarefa:', error);
      return null;
    }
  }
}
