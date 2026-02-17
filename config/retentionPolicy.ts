/**
 * Configuração de Políticas de Retenção
 * Define por quanto tempo manter dados de auditoria
 * 
 * LGPD Compliance: Reter apenas o necessário, deletar após período
 */

export const RETENTION_POLICIES = {
  // 📸 Logs de visualização/download de fotos
  photoAuditLogs: {
    days: 60,
    description: 'Rastreamento de quem viu/baixou fotos',
    reason: 'Conformidade LGPD + Auditoria de 2 meses'
  },

  // ✅ Histórico de tarefas completadas
  taskCompletionData: {
    days: 90,
    description: 'Dados de conclusão de tarefas',
    reason: 'Período de garantia + auditoria trimestral'
  },

  // 💬 Feedback e comunicados
  feedbackRecords: {
    days: 180,
    description: 'Registros de sugestões e reclamações',
    reason: 'Análise de tendências + resolução de conflitos'
  }
};

/**
 * Configuração para Cloud Functions
 * Agendamento automático de limpeza de dados expirados
 */
export const RETENTION_SCHEDULES = {
  daily: {
    time: '02:00',                    // 2AM UTC
    timezone: 'America/Sao_Paulo',   // Horário de Brasília
    description: 'Execução diária (recomendado)'
  },

  weekly: {
    day: 0,                           // Domingo
    time: '03:00',
    description: 'Uma vez por semana'
  }
};

/**
 * Constants para usar no código
 */
export const PHOTO_RETENTION_DAYS = 60 as const;
export const TASK_RETENTION_DAYS = 90 as const;
export const FEEDBACK_RETENTION_DAYS = 180 as const;

/**
 * Função helper para calcular data de expiração
 */
export const calculateExpirationDate = (days: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

/**
 * Função helper para verificar se item expirou
 */
export const hasExpired = (createdAt: number, retentionDays: number): boolean => {
  const expirationTime = createdAt + (retentionDays * 24 * 60 * 60 * 1000);
  return Date.now() > expirationTime;
};

/**
 * Formata dias para formato legível
 */
export const formatRetentionDays = (days: number): string => {
  if (days < 30) return `${days} dias`;
  if (days < 365) return `${Math.floor(days / 30)} mês(es)`;
  return `${Math.floor(days / 365)} ano(s)`;
};

export default RETENTION_POLICIES;
