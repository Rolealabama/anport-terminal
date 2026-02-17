import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  setDocMock,
  docMock,
  getMessagingMock,
  getTokenMock,
  isSupportedMock,
  onMessageMock
} = vi.hoisted(() => ({
  setDocMock: vi.fn(),
  docMock: vi.fn(),
  getMessagingMock: vi.fn(),
  getTokenMock: vi.fn(),
  isSupportedMock: vi.fn(),
  onMessageMock: vi.fn()
}));

vi.mock('firebase/firestore', () => ({
  setDoc: setDocMock,
  doc: docMock
}));

vi.mock('firebase/messaging', () => ({
  getMessaging: getMessagingMock,
  getToken: getTokenMock,
  isSupported: isSupportedMock,
  onMessage: onMessageMock
}));

vi.mock('../../firebase.ts', () => ({
  app: { app: true },
  db: { db: true }
}));

import { initializePushNotifications } from '../../services/PushNotificationService.ts';
import { Role } from '../../types.ts';

describe('PushNotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubEnv('VITE_FIREBASE_VAPID_KEY', 'test-vapid-key');

    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: {
        permission: 'granted',
        requestPermission: vi.fn(async () => 'granted')
      }
    });

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register: vi.fn(async () => ({ scope: '/sw.js' }))
      }
    });

    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'vitest-agent'
    });

    Object.defineProperty(navigator, 'platform', {
      configurable: true,
      value: 'Win32'
    });

    getMessagingMock.mockReturnValue({ messaging: true });
    getTokenMock.mockResolvedValue('push-token-123');
    isSupportedMock.mockResolvedValue(true);
    docMock.mockReturnValue({ ref: true });
    setDocMock.mockResolvedValue(undefined);
  });

  it('registers service worker and stores FCM token', async () => {
    await initializePushNotifications({
      userId: 'user1',
      userName: 'User One',
      role: Role.SUPPORT,
      companyId: 'comp1',
      storeId: 'store1'
    });

    expect(navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
    expect(getMessagingMock).toHaveBeenCalled();
    expect(getTokenMock).toHaveBeenCalled();
    expect(setDocMock).toHaveBeenCalled();
    expect(onMessageMock).toHaveBeenCalled();
  });

  it('does nothing when notification permission is denied', async () => {
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: {
        permission: 'denied',
        requestPermission: vi.fn(async () => 'denied')
      }
    });

    await initializePushNotifications({
      userId: 'user1',
      userName: 'User One',
      role: Role.SUPPORT
    });

    expect(getTokenMock).not.toHaveBeenCalled();
    expect(setDocMock).not.toHaveBeenCalled();
  });
});
