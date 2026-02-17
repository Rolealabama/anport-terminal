/**
 * MIGRATION SCRIPT V1 → V2
 * Migra dados do sistema antigo para a nova arquitetura
 */

import { db } from './firebase';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  writeBatch,
  query,
  where
} from 'firebase/firestore';
import { hashPassword, generateSalt } from './utils';
import {
  Company,
  Department,
  Role,
  User,
  Task,
  Permission,
  UserStatus,
  TaskStatus,
  TaskPriority,
  TaskFlowType
} from './types-v2';

export class MigrationService {
  /**
   * Executa migração completa
   */
  static async migrateAll(): Promise<{
    success: boolean;
    migrated: {
      companies: number;
      departments: number;
      roles: number;
      users: number;
      tasks: number;
    };
    errors: string[];
  }> {
    console.log('🚀 Iniciando migração V1 → V2...\n');

    const errors: string[] = [];
    const migrated = {
      companies: 0,
      departments: 0,
      roles: 0,
      users: 0,
      tasks: 0
    };

    try {
      // 1. Migra empresas
      console.log('📊 Migrando empresas...');
      migrated.companies = await this.migrateCompanies();
      console.log(`✅ ${migrated.companies} empresas migradas\n`);

      // 2. Migra stores para departments
      console.log('🏢 Migrando stores → departments...');
      migrated.departments = await this.migrateStoresToDepartments();
      console.log(`✅ ${migrated.departments} departamentos criados\n`);

      // 3. Cria roles padrão por empresa
      console.log('👔 Criando roles padrão...');
      migrated.roles = await this.createDefaultRoles();
      console.log(`✅ ${migrated.roles} roles criados\n`);

      // 4. Migra usuários
      console.log('👥 Migrando usuários...');
      migrated.users = await this.migrateUsers();
      console.log(`✅ ${migrated.users} usuários migrados\n`);

      // 5. Migra tarefas
      console.log('📝 Migrando tarefas...');
      migrated.tasks = await this.migrateTasks();
      console.log(`✅ ${migrated.tasks} tarefas migradas\n`);

      console.log('🎉 Migração concluída com sucesso!\n');
      console.log('📊 Resumo:', migrated);

      return { success: true, migrated, errors };
    } catch (error) {
      console.error('❌ Erro durante migração:', error);
      errors.push(error instanceof Error ? error.message : 'Erro desconhecido');
      return { success: false, migrated, errors };
    }
  }

  /**
   * Migra companies (mantém IDs)
   */
  private static async migrateCompanies(): Promise<number> {
    const v1Companies = await getDocs(collection(db, 'companies'));
    let count = 0;

    for (const companyDoc of v1Companies.docs) {
      const v1Data = companyDoc.data();

      const v2Company: Company = {
        id: companyDoc.id,
        name: v1Data.name,
        slug: this.slugify(v1Data.name),
        ownerId: v1Data.adminUsername || 'system',
        isActive: !v1Data.isSuspended,
        isSuspended: v1Data.isSuspended || false,
        plan: 'free',
        maxUsers: 50,
        metadata: {
          createdAt: v1Data.createdAt || Date.now(),
          updatedAt: Date.now(),
          suspendedAt: v1Data.isSuspended ? Date.now() : undefined,
          suspensionReason: v1Data.isSuspended ? 'Migrado do V1' : undefined
        },
        settings: {
          allowCrossDeptComm: true,
          requireTaskApproval: false,
          enableAuditLog: true
        }
      };

      await setDoc(doc(db, 'companies', companyDoc.id), v2Company);
      count++;
    }

    return count;
  }

  /**
   * Migra stores para departments
   */
  private static async migrateStoresToDepartments(): Promise<number> {
    const v1Stores = await getDocs(collection(db, 'stores'));
    let count = 0;

    for (const storeDoc of v1Stores.docs) {
      const v1Data = storeDoc.data();

      const department: Department = {
        id: storeDoc.id,
        companyId: v1Data.companyId,
        name: v1Data.name,
        description: `Departamento migrado de ${v1Data.name}`,
        leaderId: v1Data.adminUsername || 'pending',
        isActive: !v1Data.isBlocked,
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          deactivatedAt: v1Data.isBlocked ? Date.now() : undefined
        }
      };

      await setDoc(doc(db, 'departments', storeDoc.id), department);
      count++;
    }

    return count;
  }

  /**
   * Cria roles padrão para cada empresa
   */
  private static async createDefaultRoles(): Promise<number> {
    const companies = await getDocs(collection(db, 'companies'));
    let count = 0;

    for (const companyDoc of companies.docs) {
      const roles = this.getDefaultRoles(companyDoc.id);

      for (const role of roles) {
        const roleId = `${companyDoc.id}_${role.name.toLowerCase().replace(/\s/g, '_')}`;
        await setDoc(doc(db, 'roles', roleId), { ...role, id: roleId });
        count++;
      }
    }

    return count;
  }

  /**
   * Define roles padrão
   */
  private static getDefaultRoles(companyId: string): Omit<Role, 'id'>[] {
    const now = Date.now();

    return [
      {
        companyId,
        name: 'CEO/Diretor',
        description: 'Controle total da empresa',
        permissions: Object.values(Permission),
        isSystemRole: true,
        level: 0,
        metadata: { createdAt: now, updatedAt: now }
      },
      {
        companyId,
        name: 'Gerente',
        description: 'Gerencia departamento e subordinados',
        permissions: [
          Permission.USER_CREATE,
          Permission.USER_VIEW_DOWN,
          Permission.TASK_CREATE_DOWN,
          Permission.TASK_CREATE_UP,
          Permission.TASK_CREATE_SAME,
          Permission.TASK_CREATE_TO_DEPT,
          Permission.TASK_EDIT_DOWN,
          Permission.BOARD_VIEW_OWN,
          Permission.BOARD_VIEW_DOWN,
          Permission.BOARD_MOVE_OWN,
          Permission.BOARD_MOVE_DEPT,
          Permission.DEPARTMENT_LEADER,
          Permission.COMMUNICATION_CROSS_DEPT
        ],
        isSystemRole: true,
        level: 1,
        metadata: { createdAt: now, updatedAt: now }
      },
      {
        companyId,
        name: 'Coordenador',
        description: 'Coordena equipe e tarefas',
        permissions: [
          Permission.TASK_CREATE_DOWN,
          Permission.TASK_CREATE_UP,
          Permission.TASK_CREATE_SAME,
          Permission.TASK_EDIT_OWN,
          Permission.BOARD_VIEW_OWN,
          Permission.BOARD_VIEW_DOWN,
          Permission.BOARD_VIEW_SAME,
          Permission.BOARD_MOVE_OWN,
          Permission.COMMUNICATION_CROSS_DEPT
        ],
        isSystemRole: true,
        level: 2,
        metadata: { createdAt: now, updatedAt: now }
      },
      {
        companyId,
        name: 'Colaborador',
        description: 'Executa tarefas',
        permissions: [
          Permission.TASK_CREATE_UP,
          Permission.TASK_EDIT_OWN,
          Permission.TASK_DELETE_OWN,
          Permission.BOARD_VIEW_OWN,
          Permission.BOARD_MOVE_OWN
        ],
        isSystemRole: true,
        level: 3,
        metadata: { createdAt: now, updatedAt: now }
      }
    ];
  }

  /**
   * Migra usuários (stores_config.teamMembers + store admins)
   */
  private static async migrateUsers(): Promise<number> {
    let count = 0;

    // 1. Migra admins de store (agora líderes de departamento)
    const stores = await getDocs(collection(db, 'stores'));
    for (const storeDoc of stores.docs) {
      const storeData = storeDoc.data();
      const companyId = storeData.companyId;

      // Busca role de gerente
      const managerRoleId = `${companyId}_gerente`;

      const userId = `${companyId}_${storeData.adminUsername}`;
      const user: User = {
        id: userId,
        companyId,
        username: storeData.adminUsername,
        email: `${storeData.adminUsername}@${companyId}.com`,
        name: storeData.adminName || storeData.adminUsername,
        password: storeData.adminPassword,
        passwordSalt: storeData.passwordSalt || generateSalt(),
        roleId: managerRoleId,
        departmentId: storeDoc.id,
        superiorId: undefined, // Será definido após migrar todos
        hierarchyPath: [userId],
        hierarchyLevel: 0,
        status: storeData.isBlocked ? UserStatus.INACTIVE : UserStatus.ACTIVE,
        isOnline: false,
        lastSeenAt: Date.now(),
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      };

      await setDoc(doc(db, 'users', userId), user);
      count++;
    }

    // 2. Migra colaboradores (stores_config.teamMembers)
    const storesConfig = await getDocs(collection(db, 'stores_config'));
    for (const configDoc of storesConfig.docs) {
      const configData = configDoc.data();
      const storeId = configDoc.id;

      // Busca o store para pegar companyId
      const storeDoc = await getDocs(query(collection(db, 'stores'), where('id', '==', storeId)));
      if (storeDoc.empty) continue;

      const store = storeDoc.docs[0].data();
      const companyId = store.companyId;

      // Busca role de colaborador
      const collaboratorRoleId = `${companyId}_colaborador`;

      // Busca líder do departamento (admin do store)
      const leaderId = `${companyId}_${store.adminUsername}`;

      const teamMembers = configData.teamMembers || [];
      for (const member of teamMembers) {
        const userId = `${companyId}_${member.username}`;

        const user: User = {
          id: userId,
          companyId,
          username: member.username,
          email: `${member.username}@${companyId}.com`,
          name: member.name,
          password: member.password,
          passwordSalt: member.passwordSalt || generateSalt(),
          roleId: collaboratorRoleId,
          departmentId: storeId,
          superiorId: leaderId,
          hierarchyPath: [leaderId, userId],
          hierarchyLevel: 1,
          status: UserStatus.ACTIVE,
          isOnline: false,
          lastSeenAt: Date.now(),
          metadata: {
            createdAt: Date.now(),
            updatedAt: Date.now()
          },
          phone: member.phone
        };

        await setDoc(doc(db, 'users', userId), user);
        count++;
      }
    }

    return count;
  }

  /**
   * Migra tarefas
   */
  private static async migrateTasks(): Promise<number> {
    const v1Tasks = await getDocs(collection(db, 'tasks'));
    let count = 0;

    for (const taskDoc of v1Tasks.docs) {
      const v1Data = taskDoc.data();

      // Busca o store para pegar companyId
      const storeDoc = await getDocs(
        query(collection(db, 'stores'), where('id', '==', v1Data.storeId))
      );
      if (storeDoc.empty) continue;

      const store = storeDoc.docs[0].data();
      const companyId = store.companyId;

      // Busca usuário responsável
      const responsibleId = `${companyId}_${v1Data.responsible}`;

      const v2Task: Task = {
        id: taskDoc.id,
        companyId,
        assignedToUserId: responsibleId,
        createdById: 'system',
        title: v1Data.title,
        description: v1Data.description || '',
        priority: this.mapPriority(v1Data.priority),
        status: this.mapStatus(v1Data.status),
        dueDate: v1Data.deadline ? new Date(v1Data.deadline).getTime() : undefined,
        flowType: TaskFlowType.DESCENDANT,
        escalationPath: [],
        checklist: v1Data.checklist || [],
        attachments: v1Data.completionAttachments || [],
        version: 1,
        metadata: {
          createdAt: v1Data.createdAt || Date.now(),
          updatedAt: Date.now(),
          completedAt: v1Data.completedAt
        },
        history: [
          {
            id: crypto.randomUUID(),
            action: 'created',
            userId: 'system',
            userName: 'Sistema',
            timestamp: v1Data.createdAt || Date.now(),
            details: { migrated: true }
          }
        ]
      };

      await setDoc(doc(db, 'tasks_v2', taskDoc.id), v2Task);
      count++;
    }

    return count;
  }

  /**
   * Mapeia prioridade V1 → V2
   */
  private static mapPriority(v1Priority: string): TaskPriority {
    const map: Record<string, TaskPriority> = {
      'Baixa': TaskPriority.LOW,
      'Média': TaskPriority.MEDIUM,
      'Alta': TaskPriority.HIGH,
      'Urgente': TaskPriority.URGENT
    };
    return map[v1Priority] || TaskPriority.MEDIUM;
  }

  /**
   * Mapeia status V1 → V2
   */
  private static mapStatus(v1Status: string): TaskStatus {
    const map: Record<string, TaskStatus> = {
      'A Fazer': TaskStatus.TODO,
      'Em Andamento': TaskStatus.IN_PROGRESS,
      'Concluído': TaskStatus.DONE
    };
    return map[v1Status] || TaskStatus.TODO;
  }

  /**
   * Converte string para slug
   */
  private static slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}

/**
 * Executa migração (executar via console)
 */
export async function runMigration() {
  console.log('⚠️  ATENÇÃO: Esta operação vai criar dados V2 em paralelo ao V1');
  console.log('⚠️  Certifique-se de ter backup do banco de dados!');
  console.log('\n');

  const result = await MigrationService.migrateAll();

  if (result.success) {
    console.log('\n✅ Migração concluída!');
    console.log('📊 Dados migrados:', result.migrated);
  } else {
    console.log('\n❌ Migração falhou!');
    console.log('Erros:', result.errors);
  }

  return result;
}
