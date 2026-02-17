import { describe, expect, it, vi, afterEach } from 'vitest';
import RETENTION_POLICIES, {
  RETENTION_POLICIES as NAMED_RETENTION_POLICIES,
  RETENTION_SCHEDULES,
  PHOTO_RETENTION_DAYS,
  TASK_RETENTION_DAYS,
  FEEDBACK_RETENTION_DAYS,
  calculateExpirationDate,
  hasExpired,
  formatRetentionDays
} from '../../config/retentionPolicy.ts';

afterEach(() => {
  vi.useRealTimers();
});

describe('retentionPolicy', () => {
  it('exports retention constants and policies', () => {
    expect(PHOTO_RETENTION_DAYS).toBe(60);
    expect(TASK_RETENTION_DAYS).toBe(90);
    expect(FEEDBACK_RETENTION_DAYS).toBe(180);

    expect(NAMED_RETENTION_POLICIES.photoAuditLogs.days).toBe(60);
    expect(NAMED_RETENTION_POLICIES.taskCompletionData.days).toBe(90);
    expect(NAMED_RETENTION_POLICIES.feedbackRecords.days).toBe(180);

    expect(RETENTION_SCHEDULES.daily.time).toBe('02:00');
    expect(RETENTION_SCHEDULES.weekly.day).toBe(0);
    expect(RETENTION_POLICIES).toBe(NAMED_RETENTION_POLICIES);
  });

  it('calculateExpirationDate adds the given number of days', () => {
    const now = new Date('2026-02-16T12:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const result = calculateExpirationDate(15);
    const expected = new Date(now);
    expected.setDate(expected.getDate() + 15);

    expect(result.getTime()).toBe(expected.getTime());
  });

  it('hasExpired returns true only when current time is after expiration', () => {
    const now = new Date('2026-02-16T12:00:00.000Z').getTime();
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
    const createdRecently = now - twoDaysMs;
    const createdLongAgo = now - (10 * 24 * 60 * 60 * 1000);

    expect(hasExpired(createdRecently, 5)).toBe(false);
    expect(hasExpired(createdLongAgo, 5)).toBe(true);
  });

  it('formatRetentionDays formats days, months and years', () => {
    expect(formatRetentionDays(7)).toBe('7 dias');
    expect(formatRetentionDays(60)).toBe('2 mês(es)');
    expect(formatRetentionDays(365)).toBe('1 ano(s)');
    expect(formatRetentionDays(800)).toBe('2 ano(s)');
  });
});
