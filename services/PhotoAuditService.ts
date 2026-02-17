import { db } from '../firebase.ts';
import { addDoc, collection, query, where, getDocs, deleteDoc, orderBy, Timestamp } from 'firebase/firestore';
import { PhotoAuditLog } from '../types.ts';

/**
 * Serviço de Auditoria de Fotos
 * Centraliza o registro e consulta de trilhas de acesso
 */
export class PhotoAuditService {
  /**
   * Registra uma ação de visualização, download ou print de foto
   */
  static async logPhotoAction(
    taskId: string,
    photoName: string,
    viewedBy: string,
    viewedByRole: string,
    action: 'view' | 'download' | 'print' | 'upload',
    storeId: string
  ): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'photo_audit_logs'), {
        taskId,
        photoName,
        viewedBy,
        viewedByRole,
        viewedAt: Date.now(),
        action,
        storeId,
        createdAt: Date.now()
      } as PhotoAuditLog);
      
      console.log(`✅ Auditoria registrada: ${action} da foto ${photoName} por ${viewedBy}`);
      return docRef.id;
    } catch (error) {
      console.error('❌ Erro ao registrar auditoria:', error);
      throw error;
    }
  }

  /**
   * Obtém todas as visualizações de uma foto
   */
  static async getPhotoViewHistory(photoName: string, storeId: string): Promise<PhotoAuditLog[]> {
    try {
      const q = query(
        collection(db, 'photo_audit_logs'),
        where('photoName', '==', photoName),
        where('storeId', '==', storeId)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    } catch (error) {
      console.error('❌ Erro ao buscar histórico:', error);
      return [];
    }
  }

  /**
   * Obtém auditoria de uma tarefa específica
   */
  static async getTaskAuditLog(taskId: string): Promise<PhotoAuditLog[]> {
    try {
      const q = query(
        collection(db, 'photo_audit_logs'),
        where('taskId', '==', taskId)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    } catch (error) {
      console.error('❌ Erro ao buscar auditoria da tarefa:', error);
      return [];
    }
  }

  /**
   * Obtém auditoria de um usuário (fotos que ele visualizou)
   */
  static async getUserViewingHistory(username: string, storeId: string): Promise<PhotoAuditLog[]> {
    try {
      const q = query(
        collection(db, 'photo_audit_logs'),
        where('viewedBy', '==', username),
        where('storeId', '==', storeId),
        where('action', '==', 'view')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    } catch (error) {
      console.error('❌ Erro ao buscar histórico do usuário:', error);
      return [];
    }
  }

  /**
   * Gera relatório de auditoria para compliance
   */
  static async generateAuditReport(storeId: string, days: number = 90): Promise<any> {
    try {
      const cutoffDate = Date.now() - (days * 24 * 60 * 60 * 1000);
      
      const q = query(
        collection(db, 'photo_audit_logs'),
        where('storeId', '==', storeId)
      );

      const snapshot = await getDocs(q);
      const logs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(log => log.createdAt >= cutoffDate);

      return {
        storeId,
        period: `${days} dias`,
        totalActions: logs.length,
        byAction: {
          views: logs.filter(l => l.action === 'view').length,
          downloads: logs.filter(l => l.action === 'download').length,
          prints: logs.filter(l => l.action === 'print').length,
          uploads: logs.filter(l => l.action === 'upload').length
        },
        byUser: this._groupBy(logs, 'viewedBy'),
        logs
      };
    } catch (error) {
      console.error('❌ Erro ao gerar relatório:', error);
      return null;
    }
  }

  /**
   * Função auxiliar para agrupar dados
   */
  private static _groupBy(array: any[], key: string) {
    return array.reduce((acc, item) => {
      const group = item[key];
      acc[group] = (acc[group] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Formata um log para exibição legal/compliance
   */
  static formatLogForCompliance(log: PhotoAuditLog): string {
    const date = new Date(log.viewedAt);
    return `
      [${date.toISOString()}] 
      ${log.action.toUpperCase()} 
      Usuário: ${log.viewedBy} (${log.viewedByRole}) 
      Foto: ${log.photoName}
      Tarefa: ${log.taskId}
    `.trim();
  }

  /**
   * Calcula data de expiração com base na retenção (padrão: 60 dias)
   */
  static getExpirationDate(retentionDays: number = 60): Date {
    const date = new Date();
    date.setDate(date.getDate() + retentionDays);
    return date;
  }

  /**
   * Verifica se um log expirou (padrão: 60 dias)
   */
  static isExpired(createdAt: number, retentionDays: number = 60): boolean {
    const expirationTime = createdAt + (retentionDays * 24 * 60 * 60 * 1000);
    return Date.now() > expirationTime;
  }

  /**
   * Aplica a política de retenção - Deleta logs mais antigos que 60 dias
   * ⚠️ CUIDADO: Função destrutiva, não pode ser desfeita
   */
  static async enforceRetentionPolicy(retentionDays: number = 60): Promise<{ deleted: number; error?: string }> {
    try {
      const cutoffDate = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
      let deletedCount = 0;

      console.log(`⏳ Iniciando política de retenção (${retentionDays} dias)...`);
      console.log(`📅 Data limite: ${new Date(cutoffDate).toLocaleString('pt-BR')}`);

      // Buscar todos os logs expirados
      const q = query(
        collection(db, 'photo_audit_logs'),
        where('createdAt', '<', cutoffDate)
      );

      const snapshot = await getDocs(q);
      const totalExpired = snapshot.size;

      // Deletar em lotes (batches) para melhor performance
      const batchSize = 100;
      for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        const batch = snapshot.docs.slice(i, i + batchSize);
        
        for (const docSnap of batch) {
          await deleteDoc(docSnap.ref);
          deletedCount++;
        }

        console.log(`📊 Progresso: ${deletedCount}/${totalExpired} logs deletados...`);
      }

      console.log(`✅ Política de retenção finalizada: ${deletedCount} logs deletados`);
      return { deleted: deletedCount };
    } catch (error) {
      console.error('❌ Erro ao aplicar política de retenção:', error);
      return { 
        deleted: 0, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      };
    }
  }

  /**
   * Obtém estatísticas sobre logs (quantos vão expirar em breve)
   */
  static async getRetentionStats(storeId: string, retentionDays: number = 60): Promise<any> {
    try {
      const now = Date.now();
      const cutoffDate = now - (retentionDays * 24 * 60 * 60 * 1000);
      const warningDate = now - ((retentionDays - 7) * 24 * 60 * 60 * 1000); // Aviso com 7 dias antes

      const q = query(
        collection(db, 'photo_audit_logs'),
        where('storeId', '==', storeId)
      );

      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(doc => doc.data() as PhotoAuditLog);

      const expired = logs.filter(log => log.createdAt < cutoffDate);
      const expiring = logs.filter(log => log.createdAt >= cutoffDate && log.createdAt < warningDate);
      const active = logs.filter(log => log.createdAt >= warningDate);

      return {
        storeId,
        totalLogs: logs.length,
        retentionDays,
        active: {
          count: active.length,
          status: '✅ Ativo'
        },
        expiring: {
          count: expiring.length,
          daysRemaining: 'Entre 0-7 dias',
          message: '⚠️ Será deletado em breve'
        },
        expired: {
          count: expired.length,
          message: '❌ Pronto para deleção'
        }
      };
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas de retenção:', error);
      return null;
    }
  }
}

export default PhotoAuditService;
