

export enum Priority {
  BAIXA = 'Baixa',
  MEDIA = 'Média',
  ALTA = 'Alta',
  URGENTE = 'Urgente'
}

export enum Status {
  TODO = 'A Fazer',
  DOING = 'Em Andamento',
  DONE = 'Concluído'
}

export enum Role {
  DEV = 'superadmin',       // Dono do Sistema
  COMPANY = 'company',      // Painel da Empresa
  ADMIN = 'admin',         // (LEGACY) Gerente da Unidade
  MANAGER = 'manager',     // Gestor
  SUPERVISOR = 'supervisor', // Supervisor
  SUPPORT = 'support',     // Suporte (recebe chamados)
  USER = 'collaborator'    // Colaborador
}

export interface User {
  username: string;
  role: Role;
  name: string;
  companyId?: string;
  storeId?: string;
  canCreateCompany?: boolean;  // Para suporte que pode criar empresas
}

// Registro de login + vínculo com empresa (multi-tenant)
export interface CompanyMemberRecord {
  id: string; // doc id (ex: EMPRESA__username)
  companyId: string;
  username: string;
  name: string;
  role: Role;
  leaderUsername?: string | null;
  storeId?: string;
  isActive?: boolean;
  password: string;
  passwordSalt: string;
  createdAt: number;
}

export interface Company {
  id: string;
  name: string;
  adminUsername: string;
  adminPassword?: string;
  passwordSalt?: string;
  createdAt: number;
  isSuspended?: boolean;
}

export interface Store {
  id: string;
  companyId: string;
  name: string;
  adminUsername: string;
  adminPassword?: string;
  passwordSalt?: string;
  adminName: string;
  isBlocked?: boolean;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskAttachment {
  name: string;
  type: string;
  data: string;
  uploadedBy?: string;       // Quem enviou a foto
  uploadedAt?: number;       // Timestamp do upload
  uploadedByRole?: Role;     // Role de quem enviou
}

export interface PhotoAuditLog {
  id: string;
  taskId: string;
  photoName: string;
  viewedBy: string;          // Username de quem visualizou
  viewedByRole: Role;        // Role de quem visualizou
  viewedAt: number;          // Timestamp da visualização
  action: 'view' | 'download' | 'print';  // Tipo de ação
  storeId: string;           // Qual loja
  createdAt: number;
}

export interface AppNotification {
  id: string;
  type: 'task' | 'schedule' | 'demand';
  title: string;
  message: string;
  createdAt: number;
  read: boolean;
}

export interface Task {
  id: string;
  companyId?: string;
  storeId: string;
  title: string;
  responsible: string; // username do responsável (mantido por compatibilidade)
  createdBy?: string;  // username de quem criou
  assignedBy?: string; // username de quem delegou (normalmente igual createdBy)
  priority: Priority;
  deadline: string;
  status: Status;
  checklist?: ChecklistItem[];
  createdAt: number;
  completedAt?: number;
  completionDescription?: string;
  completionAttachments?: TaskAttachment[];
}

export interface TeamMember {
  name: string;
  username: string;
  password?: string;
  passwordSalt?: string;
  storeId?: string;
  phone?: string;
}

export interface WorkSchedule {
  responsible: string;
  shift: string;
}

export interface FixedDemand {
  id: string;
  responsible: string;
  title: string;
  daysOfWeek: number[]; // 0-6 (Domingo-Sábado)
  lastGenerated?: string; // YYYY-MM-DD
}

export interface Feedback {
  id: string;
  type: 'solicitacao' | 'reclamacao' | 'comunicado';
  subject: string;
  message: string;
  sender: string;
  receiver: string;
  createdAt: number;
  status: 'pendente' | 'respondido';
  adminReply?: string;
}

export interface SupportTicket {
  id: string;
  companyId: string;
  storeId?: string;
  title: string;
  description: string;
  createdBy: string;        // Username de quem abriu o ticket
  createdByRole: Role;      // Role de quem abriu (company ou admin)
  createdByName?: string;   // Nome de quem abriu o ticket
  ticketNumber?: number;    // Número único para identificação rápida
  assignedTo?: string;      // Username do suporte atribuído
  status: 'aberto' | 'em_progresso' | 'resolvido' | 'fechado';
  priority: Priority;
  category: 'sistema' | 'funcionalidade' | 'auditoria' | 'outro';
  observations?: string;
  createdAt: number;
  resolvedAt?: number;
  resolution?: string;
}


