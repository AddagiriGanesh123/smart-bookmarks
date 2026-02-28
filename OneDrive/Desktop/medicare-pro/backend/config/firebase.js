const admin = require('firebase-admin');
require('dotenv').config();

let initialized = false;

function initFirebase() {
  if (initialized) return true;
  if (!process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID === 'your-firebase-project-id') {
    console.warn('⚠️  Firebase not configured — push notifications disabled. Add Firebase keys to .env to enable.');
    return false;
  }
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
    initialized = true;
    console.log('✅ Firebase initialized');
    return true;
  } catch (err) {
    console.error('❌ Firebase init failed:', err.message);
    return false;
  }
}

async function sendPushNotification(fcmToken, title, body, data = {}) {
  if (!initFirebase() || !fcmToken) return { success: false, reason: 'Firebase not configured or no token' };
  try {
    const result = await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data,
      webpush: {
        notification: { title, body, icon: '/favicon.ico' },
        fcm_options: { link: process.env.APP_URL || 'http://localhost:3000/portal' },
      },
    });
    return { success: true, messageId: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { sendPushNotification };
