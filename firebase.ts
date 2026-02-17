import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: env.VITE_FIREBASE_APP_ID || "",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || ""
};

const requiredFirebaseKeys = [
  firebaseConfig.apiKey,
  firebaseConfig.authDomain,
  firebaseConfig.projectId,
  firebaseConfig.storageBucket,
  firebaseConfig.messagingSenderId,
  firebaseConfig.appId
];

export const isFirebaseConfigured = requiredFirebaseKeys.every((value) => !!value);

// Padrão Modular (v9+) com Singleton
// Evita o erro "Firebase App already exists" e "Service not available"
const app = isFirebaseConfigured
  ? (!getApps().length ? initializeApp(firebaseConfig) : getApp())
  : (!getApps().length ? initializeApp({ apiKey: 'dev-placeholder', appId: 'dev-placeholder', projectId: 'dev-placeholder' }) : getApp());

export { app };
export const db = getFirestore(app);

/**
 * EXEMPLO DE USO (LEITURA/ESCRITA):
 * 
 * import { collection, addDoc, getDocs } from "firebase/firestore";
 * import { db } from "./firebase.ts";
 * 
 * // Escrita
 * await addDoc(collection(db, "test"), { hello: "world" });
 * 
 * // Leitura
 * const snap = await getDocs(collection(db, "test"));
 * snap.forEach(doc => console.log(doc.data()));
 */