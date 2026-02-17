import { describe, expect, it } from 'vitest';
import config from '../../playwright.config.ts';

describe('playwright config', () => {
  it('uses the e2e test directory', () => {
    expect(config.testDir).toBe('./tests/e2e');
  });
});
