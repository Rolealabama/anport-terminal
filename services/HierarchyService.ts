/**
 * HIERARCHY SERVICE
 * Gerencia estrutura hierárquica e resolve edge cases
 */

import { db } from '../firebase';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { User, UserStatus, Department } from '../types-v2';

export class HierarchyService {
  /**
   * Calcula hierarchyPath e hierarchyLevel para um usuário
   */
  static async calculateHierarchyPath(userId: string): Promise<{
    path: string[];
    level: number;
  }> {
    const user = await this.getUser(userId);
    if (!user) throw new Error('Usuário não encontrado');

    const path: string[] = [userId];
    let currentUserId = user.superiorId;
    let level = 0;

    // Sobe na hierarquia até o topo (máximo 20 níveis para prevenir loops)
    while (currentUserId && level < 20) {
      const superior = await this.getUser(currentUserId);
      if (!superior) break;

      path.unshift(superior.id);
      currentUserId = superior.superiorId;
      level++;
    }

    return { path, level };
  }

  /**
   * Atualiza hierarchyPath de um usuário e seus subordinados
   */
  static async updateHierarchyPath(userId: string): Promise<void> {
    const { path, level } = await this.calculateHierarchyPath(userId);

    await updateDoc(doc(db, 'users', userId), {
      hierarchyPath: path,
      hierarchyLevel: level,
      'metadata.updatedAt': Date.now()
    });

    // Atualiza todos os subordinados recursivamente
    await this.updateSubordinatesHierarchy(userId);
  }

  /**
   * Atualiza hierarquia de todos os subordinados
   */
  private static async updateSubordinatesHierarchy(userId: string): Promise<void> {
    const subordinates = await this.getDirectSubordinates(userId);

    for (const subordinate of subordinates) {
      const { path, level } = await this.calculateHierarchyPath(subordinate.id);

      await updateDoc(doc(db, 'users', subordinate.id), {
        hierarchyPath: path,
        hierarchyLevel: level,
        'metadata.updatedAt': Date.now()
      });

      // Recursivo para subordinados do subordinado
      await this.updateSubordinatesHierarchy(subordinate.id);
    }
  }

  /**
   * Busca subordinados diretos de um usuário
   */
  static async getDirectSubordinates(userId: string): Promise<User[]> {
    const q = query(
      collection(db, 'users'),
      where('superiorId', '==', userId),
      where('status', '==', UserStatus.ACTIVE)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  }

  /**
   * Busca todos os subordinados (recursivo)
   */
  static async getAllSubordinates(userId: string): Promise<User[]> {
    const user = await this.getUser(userId);
    if (!user) return [];

    // Usa hierarchyPath para buscar eficientemente
    const q = query(
      collection(db, 'users'),
      where('companyId', '==', user.companyId),
      where('hierarchyPath', 'array-contains', userId),
      where('status', '==', UserStatus.ACTIVE)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as User))
      .filter(u => u.id !== userId); // Remove o próprio usuário
  }

  /**
   * Desativa usuário e realoca subordinados (TRANSAÇÃO ATÔMICA)
   */
  static async deactivateUserSafely(
    userId: string,
    deactivatedBy: string,
    reason: string,
    newSuperiorId?: string
  ): Promise<{
    success: boolean;
    reallocatedUsers: number;
    errors?: string[];
  }> {
    const user = await this.getUser(userId);
    if (!user) {
      return { success: false, reallocatedUsers: 0, errors: ['Usuário não encontrado'] };
    }

    const subordinates = await this.getDirectSubordinates(userId);

    // Se tem subordinados e não especificou novo superior, usa o superior do usuário
    let effectiveNewSuperior = newSuperiorId;
    if (subordinates.length > 0 && !effectiveNewSuperior) {
      if (user.superiorId) {
        effectiveNewSuperior = user.superiorId;
      } else {
        // Se é o topo da hierarquia e tem subordinados, precisa especificar novo líder
        return {
          success: false,
          reallocatedUsers: 0,
          errors: ['Usuário no topo da hierarquia com subordinados - especifique novo líder']
        };
      }
    }

    try {
      await runTransaction(db, async (transaction) => {
        // 1. Desativa o usuário
        transaction.update(doc(db, 'users', userId), {
          status: UserStatus.INACTIVE,
          'metadata.deactivatedAt': Date.now(),
          'metadata.deactivatedBy': deactivatedBy,
          'metadata.deactivationReason': reason
        });

        // 2. Realoca subordinados diretos
        if (effectiveNewSuperior && subordinates.length > 0) {
          for (const subordinate of subordinates) {
            transaction.update(doc(db, 'users', subordinate.id), {
              superiorId: effectiveNewSuperior,
              'metadata.updatedAt': Date.now()
            });
          }
        }

        // 3. Se era líder de departamento, remove da liderança
        const deptQuery = query(
          collection(db, 'departments'),
          where('companyId', '==', user.companyId),
          where('leaderId', '==', userId)
        );
        
        const deptSnapshot = await getDocs(deptQuery);
        for (const deptDoc of deptSnapshot.docs) {
          const dept = deptDoc.data() as Department;
          
          // Tenta usar fallback leader
          if (dept.fallbackLeaderId) {
            transaction.update(doc(db, 'departments', deptDoc.id), {
              leaderId: dept.fallbackLeaderId,
              fallbackLeaderId: null,
              'metadata.updatedAt': Date.now()
            });
          } else {
            // Se não tem fallback, encontra usuário mais antigo do departamento
            const newLeader = await this.findOldestActiveMember(user.companyId, deptDoc.id);
            if (newLeader) {
              transaction.update(doc(db, 'departments', deptDoc.id), {
                leaderId: newLeader.id,
                'metadata.updatedAt': Date.now()
              });
            } else {
              // Desativa departamento se não tem mais membros
              transaction.update(doc(db, 'departments', deptDoc.id), {
                isActive: false,
                'metadata.updatedAt': Date.now(),
                'metadata.deactivatedAt': Date.now()
              });
            }
          }
        }
      });

      // 4. Atualiza hierarchyPath de todos os afetados (fora da transação)
      if (effectiveNewSuperior) {
        for (const subordinate of subordinates) {
          await this.updateHierarchyPath(subordinate.id);
        }
      }

      return {
        success: true,
        reallocatedUsers: subordinates.length
      };
    } catch (error) {
      console.error('Erro ao desativar usuário:', error);
      return {
        success: false,
        reallocatedUsers: 0,
        errors: [error instanceof Error ? error.message : 'Erro desconhecido']
      };
    }
  }

  /**
   * Move usuário para novo superior (atualiza hierarquia)
   */
  static async moveUserToNewSuperior(
    userId: string,
    newSuperiorId: string
  ): Promise<{ success: boolean; error?: string }> {
    const user = await this.getUser(userId);
    if (!user) {
      return { success: false, error: 'Usuário não encontrado' };
    }

    const newSuperior = await this.getUser(newSuperiorId);
    if (!newSuperior || newSuperior.status !== UserStatus.ACTIVE) {
      return { success: false, error: 'Novo superior inválido ou inativo' };
    }

    // Valida mesma empresa
    if (user.companyId !== newSuperior.companyId) {
      return { success: false, error: 'Usuários de empresas diferentes' };
    }

    // Previne ciclos - usuário não pode ser superior de seu próprio superior
    if (newSuperior.hierarchyPath.includes(userId)) {
      return { success: false, error: 'Movimento criaria ciclo na hierarquia' };
    }

    try {
      // Atualiza superior
      await updateDoc(doc(db, 'users', userId), {
        superiorId: newSuperiorId,
        'metadata.updatedAt': Date.now()
      });

      // Recalcula hierarchyPath do usuário e seus subordinados
      await this.updateHierarchyPath(userId);

      return { success: true };
    } catch (error) {
      console.error('Erro ao mover usuário:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Valida integridade da hierarquia de uma empresa
   */
  static async validateCompanyHierarchy(companyId: string): Promise<{
    valid: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    try {
      // Busca todos os usuários ativos
      const q = query(
        collection(db, 'users'),
        where('companyId', '==', companyId),
        where('status', '==', UserStatus.ACTIVE)
      );

      const snapshot = await getDocs(q);
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));

      // Verifica órfãos (usuários sem superior que não são topo)
      const usersWithoutSuperior = users.filter(u => !u.superiorId);
      if (usersWithoutSuperior.length > 1) {
        issues.push(`Múltiplos usuários no topo da hierarquia: ${usersWithoutSuperior.length}`);
      }

      // Verifica superiores inativos
      for (const user of users) {
        if (user.superiorId) {
          const superior = users.find(u => u.id === user.superiorId);
          if (!superior) {
            issues.push(`Usuário ${user.id} tem superior inexistente: ${user.superiorId}`);
          }
        }
      }

      // Verifica cycles
      for (const user of users) {
        const visited = new Set<string>();
        let current = user;
        
        while (current.superiorId && visited.size < 50) {
          if (visited.has(current.id)) {
            issues.push(`Ciclo detectado na hierarquia envolvendo ${user.id}`);
            break;
          }
          visited.add(current.id);
          
          const superior = users.find(u => u.id === current.superiorId);
          if (!superior) break;
          current = superior;
        }
      }

      return {
        valid: issues.length === 0,
        issues
      };
    } catch (error) {
      console.error('Erro ao validar hierarquia:', error);
      return {
        valid: false,
        issues: ['Erro ao validar hierarquia']
      };
    }
  }

  /**
   * Encontra membro mais antigo ativo de um departamento
   */
  private static async findOldestActiveMember(
    companyId: string,
    departmentId: string
  ): Promise<User | null> {
    const q = query(
      collection(db, 'users'),
      where('companyId', '==', companyId),
      where('departmentId', '==', departmentId),
      where('status', '==', UserStatus.ACTIVE)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    
    // Ordena por data de criação (mais antigo primeiro)
    users.sort((a, b) => a.metadata.createdAt - b.metadata.createdAt);

    return users[0];
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
}
