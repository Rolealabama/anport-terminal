/**
 * TYPES V2 - Nova Arquitetura SaaS Multiempresa
 * Arquitetura hierárquica com permissões granulares
 */

// ==================== ENUMS ====================

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  DONE = 'done',
  BLOCKED = 'blocked'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum TaskFlowType {
  DESCENDANT = 'descendant',      // Para subordinado
  ASCENDANT = 'ascendant',         // Para superior
  SAME_LEVEL = 'same_level',       // Mesmo nível hierárquico
  TO_DEPARTMENT = 'to_department'  // Para setor
}

// ==================== PERMISSÕES ====================

export enum Permission {
  // Usuários
  USER_CREATE = 'user.create',
  USER_EDIT = 'user.edit',
  USER_DEACTIVATE = 'user.deactivate',
  USER_VIEW_ALL = 'user.view.all',
  USER_VIEW_DOWN = 'user.view.down',
  
  // Tarefas
  TASK_CREATE_DOWN = 'task.create.down',
  TASK_CREATE_UP = 'task.create.up',
  TASK_CREATE_SAME = 'task.create.same',
  TASK_CREATE_TO_DEPT = 'task.create.to_dept',
  TASK_EDIT_OWN = 'task.edit.own',
  TASK_EDIT_DOWN = 'task.edit.down',
  TASK_DELETE_OWN = 'task.delete.own',
  TASK_DELETE_ANY = 'task.delete.any',
  TASK_REASSIGN = 'task.reassign',
  
  // Kanban
  BOARD_VIEW_OWN = 'board.view.own',
  BOARD_VIEW_DOWN = 'board.view.down',
  BOARD_VIEW_UP = 'board.view.up',
  BOARD_VIEW_SAME = 'board.view.same',
  BOARD_VIEW_DEPT = 'board.view.dept',
  BOARD_MOVE_OWN = 'board.move.own',
  BOARD_MOVE_DEPT = 'board.move.dept',
  
  // Departamento
  DEPARTMENT_CREATE = 'dept.create',
  DEPARTMENT_EDIT = 'dept.edit',
  DEPARTMENT_DELETE = 'dept.delete',
  DEPARTMENT_LEADER = 'dept.leader',
  DEPARTMENT_VIEW_ALL = 'dept.view.all',
  
  // Cargos
  ROLE_CREATE = 'role.create',
  ROLE_EDIT = 'role.edit',
  ROLE_DELETE = 'role.delete',
  
  // Empresa
  COMPANY_CONFIG = 'company.config',
  COMPANY_VIEW_ANALYTICS = 'company.analytics',
  
  // Comunicação
  COMMUNICATION_CROSS_DEPT = 'comm.cross_dept',
  COMMUNICATION_VIEW_ALL = 'comm.view.all'
}

// ==================== ENTIDADES PRINCIPAIS ====================

/**
 * Empresa - Tenant raiz do sistema
 */
export interface Company {
  id: string;
  name: string;
  slug: string;                    // URL-friendly identifier
  ownerId: string;                 // Usuário criador/dono
  isActive: boolean;
  isSuspended: boolean;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  maxUsers: number;
  metadata: {
    createdAt: number;
    updatedAt: number;
    suspendedAt?: number;
    suspensionReason?: string;
  };
  settings: {
    allowCrossDeptComm: boolean;   // Comunicação entre setores por padrão
    requireTaskApproval: boolean;  // Aprovação de tarefas
    enableAuditLog: boolean;
  };
}

/**
 * Departamento/Setor
 */
export interface Department {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  leaderId: string;                // Líder atual (deve estar ativo)
  fallbackLeaderId?: string;       // Líder temporário se o principal sair
  parentDepartmentId?: string;     // Hierarquia de departamentos
  isActive: boolean;
  metadata: {
    createdAt: number;
    updatedAt: number;
    deactivatedAt?: number;
  };
}

/**
 * Cargo/Role customizável por empresa
 */
export interface Role {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  permissions: Permission[];
  isSystemRole: boolean;           // Roles do sistema não podem ser deletados
  level: number;                   // Nível hierárquico (0=mais alto, para ordenação)
  metadata: {
    createdAt: number;
    updatedAt: number;
  };
}

/**
 * Usuário
 */
export interface User {
  id: string;
  companyId: string;
  username: string;
  email: string;
  name: string;
  password: string;                // Hashed
  passwordSalt: string;
  
  // Estrutura organizacional
  roleId: string;
  departmentId: string;
  superiorId?: string;             // Define hierarquia
  hierarchyPath: string[];         // [topUserId, ..., immediateSuperiodId, thisUserId] - otimização
  hierarchyLevel: number;          // Profundidade na árvore (0=topo)
  
  // Status
  status: UserStatus;
  isOnline: boolean;
  lastSeenAt: number;
  
  // Metadata
  metadata: {
    createdAt: number;
    updatedAt: number;
    createdBy?: string;
    deactivatedAt?: number;
    deactivatedBy?: string;
    deactivationReason?: string;
  };
  
  // Profile
  avatar?: string;
  phone?: string;
  timezone?: string;
}

/**
 * Tarefa
 */
export interface Task {
  id: string;
  companyId: string;
  
  // Atribuição
  assignedToUserId?: string;       // Tarefa pessoal
  assignedToDepartmentId?: string; // Tarefa de setor
  createdById: string;
  
  // Conteúdo
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: number;
  
  // Fluxo
  flowType: TaskFlowType;
  escalationPath: string[];        // IDs de quem recebeu por escalação
  
  // Checklist
  checklist?: ChecklistItem[];
  
  // Anexos
  attachments?: TaskAttachment[];
  
  // Versionamento (controle de concorrência)
  version: number;
  
  // Metadata
  metadata: {
    createdAt: number;
    updatedAt: number;
    startedAt?: number;
    completedAt?: number;
    lastMovedAt?: number;
    lastMovedBy?: string;
  };
  
  // Histórico
  history?: TaskHistoryEntry[];
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: number;
}

export interface TaskAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  size: number;
  uploadedBy: string;
  uploadedAt: number;
}

export interface TaskHistoryEntry {
  id: string;
  action: 'created' | 'assigned' | 'status_changed' | 'moved' | 'commented' | 'completed';
  userId: string;
  userName: string;
  timestamp: number;
  details: any;
}

/**
 * Comentário em tarefa
 */
export interface TaskComment {
  id: string;
  taskId: string;
  companyId: string;
  userId: string;
  userName: string;
  content: string;
  mentions: string[];              // IDs de usuários mencionados
  metadata: {
    createdAt: number;
    updatedAt?: number;
    editedAt?: number;
  };
}

/**
 * Regra de comunicação entre departamentos
 */
export interface DepartmentCommunication {
  id: string;
  companyId: string;
  fromDepartmentId: string;
  toDepartmentId: string;
  allowed: boolean;
  requiresApproval: boolean;       // Precisa aprovação do líder destino
  metadata: {
    createdAt: number;
    updatedAt: number;
    createdBy: string;
  };
}

/**
 * Log de auditoria
 */
export interface AuditLog {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: number;
}

/**
 * Sessão de usuário (para WebSocket)
 */
export interface UserSession {
  id: string;
  userId: string;
  companyId: string;
  token: string;
  isActive: boolean;
  lastActivity: number;
  deviceInfo?: {
    platform: string;
    browser: string;
    ip: string;
  };
  metadata: {
    createdAt: number;
    expiresAt: number;
  };
}

/**
 * Notificação em tempo real
 */
export interface RealtimeNotification {
  id: string;
  companyId: string;
  userId: string;
  type: 'task_assigned' | 'task_moved' | 'task_completed' | 'mention' | 'system';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  timestamp: number;
}

/**
 * Lock distribuído para controle de concorrência
 */
export interface DistributedLock {
  id: string;                      // resourceType:resourceId
  companyId: string;
  resourceType: 'task' | 'department' | 'user';
  resourceId: string;
  ownerId: string;                 // Quem detém o lock
  expiresAt: number;
  metadata: {
    acquiredAt: number;
    renewedAt?: number;
  };
}

// ==================== DTOs & HELPERS ====================

/**
 * Contexto de autorização
 */
export interface AuthContext {
  userId: string;
  companyId: string;
  roleId: string;
  departmentId: string;
  permissions: Permission[];
  hierarchyLevel: number;
  hierarchyPath: string[];
}

/**
 * Request de criação de tarefa
 */
export interface CreateTaskRequest {
  title: string;
  description: string;
  priority: TaskPriority;
  flowType: TaskFlowType;
  assignedToUserId?: string;
  assignedToDepartmentId?: string;
  dueDate?: number;
  checklist?: Omit<ChecklistItem, 'id' | 'completed' | 'completedBy' | 'completedAt'>[];
}

/**
 * Request de movimentação de tarefa
 */
export interface MoveTaskRequest {
  taskId: string;
  newStatus: TaskStatus;
  version: number;                 // Para controle otimista
}

/**
 * Response de autorização
 */
export interface AuthorizationResult {
  allowed: boolean;
  reason?: string;
  requiresEscalation?: boolean;
  escalationPath?: string[];
}
