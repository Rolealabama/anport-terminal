import { describe, expect, it, vi } from 'vitest';

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ app: true })),
  getApps: vi.fn(() => []),
  getApp: vi.fn(() => ({ app: true }))
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({ db: true }))
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ auth: true }))
}));

vi.mock('firebase/functions', () => ({
  getFunctions: vi.fn(() => ({ functions: true }))
}));

import { getFirestore } from 'firebase/firestore';

describe('firebase', () => {
  it('exports firestore instance when configured', async () => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-api-key');
    vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'example.firebaseapp.com');
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'example-project');
    vi.stubEnv('VITE_FIREBASE_STORAGE_BUCKET', 'example.appspot.com');
    vi.stubEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', '123456789');
    vi.stubEnv('VITE_FIREBASE_APP_ID', '1:123456789:web:abcdef');

    vi.resetModules();
    const { db, isFirebaseConfigured } = await import('../../firebase.ts');

    expect(isFirebaseConfigured).toBe(true);
    expect(db).toBeTruthy();
    expect(vi.mocked(getFirestore)).toHaveBeenCalled();

    vi.unstubAllEnvs();
  });
});
