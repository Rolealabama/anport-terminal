import { describe, expect, it } from 'vitest';
import { generateSalt, hashPassword } from '../../utils.ts';

describe('utils', () => {
  it('generateSalt returns a unique value', () => {
    const a = generateSalt();
    const b = generateSalt();
    expect(typeof a).toBe('string');
    expect(a).not.toBe(b);
  });

  it('hashPassword is deterministic for same salt and password', async () => {
    const salt = 'salt';
    const hash1 = await hashPassword('secret', salt);
    const hash2 = await hashPassword('secret', salt);
    expect(hash1).toBe(hash2);
  });

  it('hashPassword changes when salt changes', async () => {
    const hash1 = await hashPassword('secret', 'salt1');
    const hash2 = await hashPassword('secret', 'salt2');
    expect(hash1).not.toBe(hash2);
  });
});
