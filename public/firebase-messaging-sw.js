importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyA129Q9NMQ9fa7fpc70ID3E6DHb09uAv-U",
  authDomain: "reddy-premium-dairy-f4233.firebaseapp.com",
  projectId: "reddy-premium-dairy-f4233",
  storageBucket: "reddy-premium-dairy-f4233.firebasestorage.app",
  messagingSenderId: "81086282376",
  appId: "1:81086282376:web:6e5036546fe53392a8fd3d"
};

// Initialize the Firebase app in the service worker
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification?.title || 'Order Update!';
  const notificationOptions = {
    body: payload.notification?.body || 'Your order has been updated.',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
