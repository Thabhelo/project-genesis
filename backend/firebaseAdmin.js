require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
// You need to download the serviceAccountKey.json from Firebase Console
// Project Settings > Service Accounts > Generate New Private Key
let db;
try {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  db = admin.firestore();
  console.log("Firebase Admin initialized successfully.");
} catch (error) {
  console.warn("Firebase Admin: No serviceAccountKey.json found. State will not persist across restarts. See README for Firestore setup.");
  // Mock DB for local testing without Firebase
  db = {
    collection: () => ({
      add: async (data) => console.log("Mock DB Add:", data),
      get: async () => ({ docs: [] }),
      onSnapshot: () => {}
    })
  };
}

module.exports = { db, admin };
