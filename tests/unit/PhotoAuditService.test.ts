import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';

const {
  addDocMock,
  collectionMock,
  queryMock,
  whereMock,
  getDocsMock,
  deleteDocMock,
  orderByMock
} = vi.hoisted(() => ({
  addDocMock: vi.fn(),
  collectionMock: vi.fn(),
  queryMock: vi.fn(),
  whereMock: vi.fn(),
  getDocsMock: vi.fn(),
  deleteDocMock: vi.fn(),
  orderByMock: vi.fn()
}));

vi.mock('../../firebase.ts', () => ({
  db: { mockedDb: true }
}));

vi.mock('firebase/firestore', () => ({
  addDoc: addDocMock,
  collection: collectionMock,
  query: queryMock,
  where: whereMock,
  getDocs: getDocsMock,
  deleteDoc: deleteDocMock,
  orderBy: orderByMock,
  Timestamp: { now: vi.fn() }
}));

import { PhotoAuditService } from '../../services/PhotoAuditService.ts';

const dayMs = 24 * 60 * 60 * 1000;

describe('PhotoAuditService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    collectionMock.mockImplementation((_db, name) => ({ kind: 'collection', name }));
    whereMock.mockImplementation((...args) => ({ kind: 'where', args }));
    queryMock.mockImplementation((...args) => ({ kind: 'query', args }));
    orderByMock.mockImplementation((...args) => ({ kind: 'orderBy', args }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('logPhotoAction saves log and returns document id', async () => {
    addDocMock.mockResolvedValue({ id: 'audit-1' });

    const id = await PhotoAuditService.logPhotoAction(
      'task-1',
      'foto.png',
      'joao',
      'support',
      'view',
      'store-1'
    );

    expect(id).toBe('audit-1');
    expect(collectionMock).toHaveBeenCalled();
    expect(addDocMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        taskId: 'task-1',
        photoName: 'foto.png',
        viewedBy: 'joao',
        viewedByRole: 'support',
        action: 'view',
        storeId: 'store-1',
        viewedAt: expect.any(Number),
        createdAt: expect.any(Number)
      })
    );
  });

  it('logPhotoAction rethrows on firestore error', async () => {
    addDocMock.mockRejectedValue(new Error('write-failed'));

    await expect(
      PhotoAuditService.logPhotoAction('task-1', 'foto.png', 'joao', 'support', 'view', 'store-1')
    ).rejects.toThrow('write-failed');

    expect(console.error).toHaveBeenCalled();
  });

  it('returns photo history and task history', async () => {
    getDocsMock.mockResolvedValue({
      docs: [{ id: '1', data: () => ({ photoName: 'foto.png', taskId: 'task-1' }) }]
    });

    const photoHistory = await PhotoAuditService.getPhotoViewHistory('foto.png', 'store-1');
    const taskHistory = await PhotoAuditService.getTaskAuditLog('task-1');

    expect(photoHistory).toHaveLength(1);
    expect(taskHistory).toHaveLength(1);
    expect(whereMock).toHaveBeenCalledWith('photoName', '==', 'foto.png');
    expect(whereMock).toHaveBeenCalledWith('taskId', '==', 'task-1');
  });

  it('returns empty arrays on history query errors', async () => {
    getDocsMock.mockRejectedValue(new Error('query-failed'));

    await expect(PhotoAuditService.getPhotoViewHistory('foto.png', 'store-1')).resolves.toEqual([]);
    await expect(PhotoAuditService.getTaskAuditLog('task-1')).resolves.toEqual([]);
    await expect(PhotoAuditService.getUserViewingHistory('joao', 'store-1')).resolves.toEqual([]);
  });

  it('filters logs and builds audit report by action and user', async () => {
    const now = new Date('2026-02-16T12:00:00.000Z').getTime();
    vi.useFakeTimers();
    vi.setSystemTime(now);

    getDocsMock.mockResolvedValue({
      docs: [
        { id: '1', data: () => ({ viewedBy: 'ana', action: 'view', createdAt: now - (5 * dayMs) }) },
        { id: '2', data: () => ({ viewedBy: 'ana', action: 'download', createdAt: now - (8 * dayMs) }) },
        { id: '3', data: () => ({ viewedBy: 'bob', action: 'print', createdAt: now - (10 * dayMs) }) },
        { id: '4', data: () => ({ viewedBy: 'carol', action: 'upload', createdAt: now - (12 * dayMs) }) },
        { id: '5', data: () => ({ viewedBy: 'old', action: 'view', createdAt: now - (40 * dayMs) }) }
      ]
    });

    const report = await PhotoAuditService.generateAuditReport('store-1', 30);

    expect(report).not.toBeNull();
    expect(report.totalActions).toBe(4);
    expect(report.byAction).toEqual({
      views: 1,
      downloads: 1,
      prints: 1,
      uploads: 1
    });
    expect(report.byUser).toEqual({ ana: 2, bob: 1, carol: 1 });
  });

  it('returns null when report generation fails', async () => {
    getDocsMock.mockRejectedValue(new Error('report-failed'));

    await expect(PhotoAuditService.generateAuditReport('store-1', 30)).resolves.toBeNull();
  });

  it('formats compliance text', () => {
    const text = PhotoAuditService.formatLogForCompliance({
      id: 'id-1',
      taskId: 'task-1',
      photoName: 'foto.png',
      viewedBy: 'joao',
      viewedByRole: 'support' as any,
      viewedAt: new Date('2026-02-16T12:00:00.000Z').getTime(),
      action: 'download',
      storeId: 'store-1',
      createdAt: Date.now()
    });

    expect(text).toContain('DOWNLOAD');
    expect(text).toContain('Usuário: joao');
    expect(text).toContain('Foto: foto.png');
    expect(text).toContain('Tarefa: task-1');
  });

  it('calculates expiration and expiration status', () => {
    const now = new Date('2026-02-16T12:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const expirationDate = PhotoAuditService.getExpirationDate(7);
    const expected = new Date(now);
    expected.setDate(expected.getDate() + 7);

    expect(expirationDate.getTime()).toBe(expected.getTime());
    expect(PhotoAuditService.isExpired(now.getTime() - (10 * dayMs), 7)).toBe(true);
    expect(PhotoAuditService.isExpired(now.getTime() - (2 * dayMs), 7)).toBe(false);
  });

  it('enforces retention policy and deletes in batches', async () => {
    const docs = Array.from({ length: 105 }).map((_, index) => ({
      ref: { id: `doc-${index}` }
    }));

    getDocsMock.mockResolvedValue({
      size: docs.length,
      docs
    });
    deleteDocMock.mockResolvedValue(undefined);

    const result = await PhotoAuditService.enforceRetentionPolicy(60);

    expect(result).toEqual({ deleted: 105 });
    expect(deleteDocMock).toHaveBeenCalledTimes(105);
  });

  it('returns error object when retention policy fails', async () => {
    getDocsMock.mockRejectedValue(new Error('delete-failed'));

    const result = await PhotoAuditService.enforceRetentionPolicy(60);

    expect(result.deleted).toBe(0);
    expect(result.error).toBe('delete-failed');
  });

  it('returns retention stats and handles stats errors', async () => {
    const now = new Date('2026-02-16T12:00:00.000Z').getTime();
    vi.useFakeTimers();
    vi.setSystemTime(now);

    getDocsMock.mockResolvedValueOnce({
      docs: [
        { data: () => ({ createdAt: now - (61 * dayMs) }) },
        { data: () => ({ createdAt: now - (55 * dayMs) }) },
        { data: () => ({ createdAt: now - (2 * dayMs) }) }
      ]
    });

    const stats = await PhotoAuditService.getRetentionStats('store-1', 60);

    expect(stats.totalLogs).toBe(3);
    expect(stats.expired.count).toBe(1);
    expect(stats.expiring.count).toBe(1);
    expect(stats.active.count).toBe(1);

    getDocsMock.mockRejectedValueOnce(new Error('stats-failed'));
    await expect(PhotoAuditService.getRetentionStats('store-1', 60)).resolves.toBeNull();
  });
});
