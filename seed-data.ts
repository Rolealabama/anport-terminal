/**
 * SEED DATA V2
 * Dados iniciais para testes locais
 */

import { db } from './firebase';
import { doc, setDoc, collection } from 'firebase/firestore';
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
  TaskFlowType,
  DepartmentCommunication
} from './types-v2';

export class SeedService {
  /**
   * Inicializa sistema com dados de teste
   */
  static async seedTestData(): Promise<void> {
    console.log('🌱 Semeando dados de teste...\n');

    try {
      // 1. Cria empresa de teste
      const company = await this.createTestCompany();
      console.log('✅ Empresa criada:', company.name);

      // 2. Cria departamentos
      const departments = await this.createTestDepartments(company.id);
      console.log('✅ Departamentos criados:', departments.length);

      // 3. Cria roles
      const roles = await this.createTestRoles(company.id);
      console.log('✅ Roles criados:', roles.length);

      // 4. Cria usuários
      const users = await this.createTestUsers(company.id, departments, roles);
      console.log('✅ Usuários criados:', users.length);

      // 5. Cria regras de comunicação entre departamentos
      await this.createDepartmentCommunications(company.id, departments);
      console.log('✅ Regras de comunicação criadas');

      // 6. Cria tarefas de teste
      const tasks = await this.createTestTasks(company.id, users, departments);
      console.log('✅ Tarefas criadas:', tasks.length);

      console.log('\n🎉 Dados de teste criados com sucesso!');
      console.log('\n📋 Credenciais de acesso:');
      console.log('CEO: ceo / senha123');
      console.log('Gerente TI: gerente.ti / senha123');
      console.log('Gerente RH: gerente.rh / senha123');
      console.log('Dev Senior: dev.senior / senha123');
      console.log('Analista RH: analista.rh / senha123');
      console.log('Dev Junior: dev.junior / senha123');
      console.log('Assistente RH: assistente.rh / senha123');
    } catch (error) {
      console.error('❌ Erro ao semear dados:', error);
      throw error;
    }
  }

  /**
   * Cria empresa de teste
   */
  private static async createTestCompany(): Promise<Company> {
    const company: Company = {
      id: 'TESTCORP',
      name: 'TestCorp Ltda',
      slug: 'testcorp',
      ownerId: 'ceo_testcorp',
      isActive: true,
      isSuspended: false,
      plan: 'professional',
      maxUsers: 100,
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      settings: {
        allowCrossDeptComm: false, // Requer configuração explícita
        requireTaskApproval: false,
        enableAuditLog: true
      }
    };

    await setDoc(doc(db, 'companies', company.id), company);
    return company;
  }

  /**
   * Cria departamentos de teste
   */
  private static async createTestDepartments(companyId: string): Promise<Department[]> {
    const departments: Department[] = [
      {
        id: 'DEPT_TI',
        companyId,
        name: 'Tecnologia da Informação',
        description: 'Desenvolvimento e infraestrutura',
        leaderId: 'user_gerente_ti',
        isActive: true,
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      },
      {
        id: 'DEPT_RH',
        companyId,
        name: 'Recursos Humanos',
        description: 'Gestão de pessoas e recrutamento',
        leaderId: 'user_gerente_rh',
        isActive: true,
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      },
      {
        id: 'DEPT_FIN',
        companyId,
        name: 'Financeiro',
        description: 'Contabilidade e finanças',
        leaderId: 'user_ceo', // CEO também lidera financeiro
        isActive: true,
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      }
    ];

    for (const dept of departments) {
      await setDoc(doc(db, 'departments', dept.id), dept);
    }

    return departments;
  }

  /**
   * Cria roles de teste
   */
  private static async createTestRoles(companyId: string): Promise<Role[]> {
    const now = Date.now();

    const roles: Role[] = [
      {
        id: 'role_ceo',
        companyId,
        name: 'CEO',
        description: 'Chief Executive Officer - Controle total',
        permissions: Object.values(Permission),
        isSystemRole: true,
        level: 0,
        metadata: { createdAt: now, updatedAt: now }
      },
      {
        id: 'role_gerente',
        companyId,
        name: 'Gerente',
        description: 'Gerente de departamento',
        permissions: [
          Permission.USER_CREATE,
          Permission.USER_VIEW_DOWN,
          Permission.TASK_CREATE_DOWN,
          Permission.TASK_CREATE_UP,
          Permission.TASK_CREATE_SAME,
          Permission.TASK_CREATE_TO_DEPT,
          Permission.TASK_EDIT_DOWN,
          Permission.TASK_REASSIGN,
          Permission.BOARD_VIEW_OWN,
          Permission.BOARD_VIEW_DOWN,
          Permission.BOARD_VIEW_DEPT,
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
        id: 'role_analista',
        companyId,
        name: 'Analista',
        description: 'Profissional pleno',
        permissions: [
          Permission.TASK_CREATE_DOWN,
          Permission.TASK_CREATE_UP,
          Permission.TASK_CREATE_SAME,
          Permission.TASK_EDIT_OWN,
          Permission.BOARD_VIEW_OWN,
          Permission.BOARD_VIEW_DOWN,
          Permission.BOARD_MOVE_OWN
        ],
        isSystemRole: false,
        level: 2,
        metadata: { createdAt: now, updatedAt: now }
      },
      {
        id: 'role_assistente',
        companyId,
        name: 'Assistente',
        description: 'Profissional junior',
        permissions: [
          Permission.TASK_CREATE_UP,
          Permission.TASK_EDIT_OWN,
          Permission.BOARD_VIEW_OWN,
          Permission.BOARD_MOVE_OWN
        ],
        isSystemRole: false,
        level: 3,
        metadata: { createdAt: now, updatedAt: now }
      }
    ];

    for (const role of roles) {
      await setDoc(doc(db, 'roles', role.id), role);
    }

    return roles;
  }

  /**
   * Cria usuários de teste
   */
  private static async createTestUsers(
    companyId: string,
    departments: Department[],
    roles: Role[]
  ): Promise<User[]> {
    const salt = generateSalt();
    const hashedPassword = await hashPassword('senha123', salt);

    const users: User[] = [
      // CEO (topo da hierarquia)
      {
        id: 'user_ceo',
        companyId,
        username: 'ceo',
        email: 'ceo@testcorp.com',
        name: 'Carlos Eduardo Oliveira',
        password: hashedPassword,
        passwordSalt: salt,
        roleId: 'role_ceo',
        departmentId: 'DEPT_FIN',
        superiorId: undefined,
        hierarchyPath: ['user_ceo'],
        hierarchyLevel: 0,
        status: UserStatus.ACTIVE,
        isOnline: false,
        lastSeenAt: Date.now(),
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      },

      // Gerente TI (reporta ao CEO)
      {
        id: 'user_gerente_ti',
        companyId,
        username: 'gerente.ti',
        email: 'gerente.ti@testcorp.com',
        name: 'Maria Silva',
        password: hashedPassword,
        passwordSalt: salt,
        roleId: 'role_gerente',
        departmentId: 'DEPT_TI',
        superiorId: 'user_ceo',
        hierarchyPath: ['user_ceo', 'user_gerente_ti'],
        hierarchyLevel: 1,
        status: UserStatus.ACTIVE,
        isOnline: false,
        lastSeenAt: Date.now(),
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      },

      // Dev Senior (reporta ao Gerente TI)
      {
        id: 'user_dev_senior',
        companyId,
        username: 'dev.senior',
        email: 'dev.senior@testcorp.com',
        name: 'João Santos',
        password: hashedPassword,
        passwordSalt: salt,
        roleId: 'role_analista',
        departmentId: 'DEPT_TI',
        superiorId: 'user_gerente_ti',
        hierarchyPath: ['user_ceo', 'user_gerente_ti', 'user_dev_senior'],
        hierarchyLevel: 2,
        status: UserStatus.ACTIVE,
        isOnline: false,
        lastSeenAt: Date.now(),
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      },

      // Dev Junior (reporta ao Dev Senior)
      {
        id: 'user_dev_junior',
        companyId,
        username: 'dev.junior',
        email: 'dev.junior@testcorp.com',
        name: 'Pedro Alves',
        password: hashedPassword,
        passwordSalt: salt,
        roleId: 'role_assistente',
        departmentId: 'DEPT_TI',
        superiorId: 'user_dev_senior',
        hierarchyPath: ['user_ceo', 'user_gerente_ti', 'user_dev_senior', 'user_dev_junior'],
        hierarchyLevel: 3,
        status: UserStatus.ACTIVE,
        isOnline: false,
        lastSeenAt: Date.now(),
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      },

      // Gerente RH (reporta ao CEO)
      {
        id: 'user_gerente_rh',
        companyId,
        username: 'gerente.rh',
        email: 'gerente.rh@testcorp.com',
        name: 'Ana Paula Costa',
        password: hashedPassword,
        passwordSalt: salt,
        roleId: 'role_gerente',
        departmentId: 'DEPT_RH',
        superiorId: 'user_ceo',
        hierarchyPath: ['user_ceo', 'user_gerente_rh'],
        hierarchyLevel: 1,
        status: UserStatus.ACTIVE,
        isOnline: false,
        lastSeenAt: Date.now(),
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      },

      // Analista RH (reporta ao Gerente RH)
      {
        id: 'user_analista_rh',
        companyId,
        username: 'analista.rh',
        email: 'analista.rh@testcorp.com',
        name: 'Beatriz Lima',
        password: hashedPassword,
        passwordSalt: salt,
        roleId: 'role_analista',
        departmentId: 'DEPT_RH',
        superiorId: 'user_gerente_rh',
        hierarchyPath: ['user_ceo', 'user_gerente_rh', 'user_analista_rh'],
        hierarchyLevel: 2,
        status: UserStatus.ACTIVE,
        isOnline: false,
        lastSeenAt: Date.now(),
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      },

      // Assistente RH (reporta ao Analista RH)
      {
        id: 'user_assistente_rh',
        companyId,
        username: 'assistente.rh',
        email: 'assistente.rh@testcorp.com',
        name: 'Clara Souza',
        password: hashedPassword,
        passwordSalt: salt,
        roleId: 'role_assistente',
        departmentId: 'DEPT_RH',
        superiorId: 'user_analista_rh',
        hierarchyPath: ['user_ceo', 'user_gerente_rh', 'user_analista_rh', 'user_assistente_rh'],
        hierarchyLevel: 3,
        status: UserStatus.ACTIVE,
        isOnline: false,
        lastSeenAt: Date.now(),
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      }
    ];

    for (const user of users) {
      await setDoc(doc(db, 'users', user.id), user);
    }

    return users;
  }

  /**
   * Cria regras de comunicação entre departamentos
   */
  private static async createDepartmentCommunications(
    companyId: string,
    departments: Department[]
  ): Promise<void> {
    const communications: DepartmentCommunication[] = [
      // TI pode enviar para RH
      {
        id: 'comm_ti_rh',
        companyId,
        fromDepartmentId: 'DEPT_TI',
        toDepartmentId: 'DEPT_RH',
        allowed: true,
        requiresApproval: false,
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'user_ceo'
        }
      },
      // RH pode enviar para TI
      {
        id: 'comm_rh_ti',
        companyId,
        fromDepartmentId: 'DEPT_RH',
        toDepartmentId: 'DEPT_TI',
        allowed: true,
        requiresApproval: false,
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'user_ceo'
        }
      },
      // TI NÃO pode enviar direto para Financeiro
      {
        id: 'comm_ti_fin',
        companyId,
        fromDepartmentId: 'DEPT_TI',
        toDepartmentId: 'DEPT_FIN',
        allowed: false,
        requiresApproval: true,
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          createdBy: 'user_ceo'
        }
      }
    ];

    for (const comm of communications) {
      await setDoc(doc(db, 'department_communications', comm.id), comm);
    }
  }

  /**
   * Cria tarefas de teste
   */
  private static async createTestTasks(
    companyId: string,
    users: User[],
    departments: Department[]
  ): Promise<Task[]> {
    const tasks: Task[] = [
      // Tarefa pessoal do Dev Junior
      {
        id: 'task_001',
        companyId,
        assignedToUserId: 'user_dev_junior',
        createdById: 'user_dev_senior',
        title: 'Implementar autenticação JWT',
        description: 'Criar middleware de autenticação com tokens JWT',
        priority: TaskPriority.HIGH,
        status: TaskStatus.IN_PROGRESS,
        dueDate: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 dias
        flowType: TaskFlowType.DESCENDANT,
        escalationPath: [],
        checklist: [
          {
            id: '1',
            text: 'Instalar biblioteca JWT',
            completed: true,
            completedBy: 'user_dev_junior',
            completedAt: Date.now() - 24 * 60 * 60 * 1000
          },
          {
            id: '2',
            text: 'Criar middleware de validação',
            completed: false
          },
          {
            id: '3',
            text: 'Escrever testes unitários',
            completed: false
          }
        ],
        version: 1,
        metadata: {
          createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
          updatedAt: Date.now(),
          startedAt: Date.now() - 24 * 60 * 60 * 1000
        },
        history: []
      },

      // Tarefa de departamento (TI)
      {
        id: 'task_002',
        companyId,
        assignedToDepartmentId: 'DEPT_TI',
        createdById: 'user_ceo',
        title: 'Migrar servidor para cloud',
        description: 'Planejar e executar migração da infraestrutura para AWS',
        priority: TaskPriority.URGENT,
        status: TaskStatus.TODO,
        dueDate: Date.now() + 14 * 24 * 60 * 60 * 1000, // 14 dias
        flowType: TaskFlowType.TO_DEPARTMENT,
        escalationPath: [],
        version: 1,
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        history: []
      },

      // Tarefa ascendente (Junior pedindo ajuda ao Senior)
      {
        id: 'task_003',
        companyId,
        assignedToUserId: 'user_dev_senior',
        createdById: 'user_dev_junior',
        title: 'Revisão de código - Feature de pagamento',
        description: 'Preciso de revisão no código da integração com gateway de pagamento',
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.TODO,
        flowType: TaskFlowType.ASCENDANT,
        escalationPath: [],
        version: 1,
        metadata: {
          createdAt: Date.now() - 1 * 60 * 60 * 1000, // 1 hora atrás
          updatedAt: Date.now()
        },
        history: []
      },

      // Tarefa RH
      {
        id: 'task_004',
        companyId,
        assignedToUserId: 'user_assistente_rh',
        createdById: 'user_analista_rh',
        title: 'Organizar processo seletivo',
        description: 'Preparar cronograma e divulgar vagas para desenvolvedor',
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.TODO,
        dueDate: Date.now() + 5 * 24 * 60 * 60 * 1000,
        flowType: TaskFlowType.DESCENDANT,
        escalationPath: [],
        version: 1,
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now()
        },
        history: []
      }
    ];

    for (const task of tasks) {
      await setDoc(doc(db, 'tasks_v2', task.id), task);
    }

    return tasks;
  }
}

/**
 * Executa seed (executar via console)
 */
export async function seedDatabase() {
  console.log('⚠️  Esta operação vai criar dados de teste no banco');
  console.log('⚠️  Use apenas em ambiente de desenvolvimento!\n');

  await SeedService.seedTestData();
}
