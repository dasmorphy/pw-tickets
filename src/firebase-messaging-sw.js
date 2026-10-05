importScripts('https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCKaMCwT1N4j7sCYsxFygm10rRCEbV_BN0',
  authDomain: 'zentinel-953ad.firebaseapp.com',
  projectId: 'zentinel-953ad',
  messagingSenderId: '332083144286',
  appId: '1:332083144286:android:20f67876adc2418b4a36cf'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || 'Nueva notificación';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: '/assets/z-logo.png'
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});