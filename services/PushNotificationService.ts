import { doc, setDoc } from 'firebase/firestore';
import { getMessaging, getToken, isSupported as isMessagingSupported, onMessage } from 'firebase/messaging';
import { app, db } from '../firebase.ts';
import { Role } from '../types.ts';

interface PushUserContext {
  userId: string;
  userName: string;
  role: Role;
  companyId?: string;
  storeId?: string;
}

let foregroundListenerRegistered = false;

const getVapidKey = (): string | undefined => {
  return import.meta.env.VITE_FIREBASE_VAPID_KEY;
};

const supportsPush = (): boolean => {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'Notification' in window;
};

const toSafeDocId = (userId: string, userAgent: string): string => {
  const encoded = encodeURIComponent(userAgent).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
  return `${userId}_${encoded || 'device'}`;
};

const showForegroundNotification = (payload: any) => {
  if (Notification.permission !== 'granted') return;

  const title = payload?.notification?.title || 'Nova notificação';
  const body = payload?.notification?.body || 'Você recebeu uma atualização.';
  const icon = payload?.notification?.icon || '/icons/icon-192x192.png';

  new Notification(title, {
    body,
    icon,
    data: payload?.data || {}
  });
};

const savePushToken = async (token: string, user: PushUserContext) => {
  const deviceId = toSafeDocId(user.userId, navigator.userAgent || 'unknown');

  await setDoc(doc(db, 'push_tokens', deviceId), {
    token,
    userId: user.userId,
    userName: user.userName,
    role: user.role,
    companyId: user.companyId || null,
    storeId: user.storeId || null,
    platform: navigator.platform || 'unknown',
    userAgent: navigator.userAgent || 'unknown',
    updatedAt: Date.now()
  }, { merge: true });
};

const registerServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
  return navigator.serviceWorker.register('/sw.js');
};

const ensurePermission = async (): Promise<NotificationPermission> => {
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
};

export const initializePushNotifications = async (user: PushUserContext): Promise<void> => {
  if (!supportsPush()) return;

  try {
    const registration = await registerServiceWorker();
    const permission = await ensurePermission();

    if (permission !== 'granted') return;

    const messagingSupported = await isMessagingSupported();
    if (!messagingSupported) return;

    const vapidKey = getVapidKey();
    if (!vapidKey) {
      console.warn('Push não inicializado: VITE_FIREBASE_VAPID_KEY não configurada.');
      return;
    }

    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration
    });

    if (!token) {
      console.warn('Push não inicializado: token vazio.');
      return;
    }

    await savePushToken(token, user);

    if (!foregroundListenerRegistered) {
      onMessage(messaging, (payload) => {
        showForegroundNotification(payload);
      });
      foregroundListenerRegistered = true;
    }
  } catch (error) {
    console.error('Erro ao inicializar push notifications:', error);
  }
};
