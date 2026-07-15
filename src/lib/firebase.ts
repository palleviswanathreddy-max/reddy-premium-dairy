import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDummyKeyForDevelopment12345",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "reddy-premium-dairy.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "reddy-premium-dairy",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "reddy-premium-dairy.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1234567890:web:abcdef12345"
};

// Initialize Firebase client
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = typeof window !== 'undefined' ? getAuth(app) : null;

export const getFirebaseMessaging = async () => {
  if (typeof window === 'undefined') return null;

  try {
    const { isSupported } = await import('firebase/messaging');
    const supported = await isSupported();
    if (!supported) {
      console.warn("FCM is not supported in this browser.");
      return null;
    }
    const { getMessaging } = await import('firebase/messaging');
    return getMessaging(app);
  } catch (err) {
    console.error("Failed to load Firebase messaging:", err);
    return null;
  }
};

export const requestForToken = async () => {
  if (typeof window === 'undefined') return null;

  try {
    // Check Notification support
    if (!('Notification' in window)) {
      console.warn("This browser does not support notifications.");
      return null;
    }

    // Ask notification permission
    let permission = Notification.permission;
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      console.warn("Notification permission was not granted:", permission);
      return null;
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;

    const { getToken } = await import('firebase/messaging');
    
    // Set up service worker registration for FCM
    let serviceWorkerRegistration: ServiceWorkerRegistration | undefined;
    if ('serviceWorker' in navigator) {
      serviceWorkerRegistration = await navigator.serviceWorker.ready;
    }

    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || 'BDummyVapidKeyForFirebaseCloudMessagingDevelopmentOnly',
      serviceWorkerRegistration
    });

    return token || null;
  } catch (err) {
    console.error('Error generating FCM token:', err);
    return null;
  }
};
