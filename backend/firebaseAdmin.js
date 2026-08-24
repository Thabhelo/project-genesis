require('dotenv').config();
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin SDK
// 1. serviceAccountKey.json (local / explicit key)
// 2. Application Default Credentials (Cloud Run, GCE, etc.)
let db;
let authConfigured = false;
try {
  const keyPath = path.join(__dirname, 'serviceAccountKey.json');
  if (fs.existsSync(keyPath)) {
    const serviceAccount = require(keyPath);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    db = admin.firestore();
    authConfigured = true;
    console.log("Firebase Admin initialized (service account key).");
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.K_SERVICE) {
    // Cloud Run sets K_SERVICE; use Application Default Credentials
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
    db = admin.firestore();
    authConfigured = true;
    console.log("Firebase Admin initialized (Application Default Credentials).");
  } else {
    throw new Error('No credentials');
  }
} catch (error) {
  console.warn("Firebase Admin: No credentials found. State will not persist and sign-in will be unavailable. See README for Firestore setup.");
  db = {
    collection: () => ({
      add: async () => {},
      get: async () => ({ docs: [] }),
      onSnapshot: () => {},
      doc: () => ({ get: async () => ({ exists: false }), set: async () => {} })
    })
  };
}

// `admin.auth` exists as a function on the SDK whether or not an app was
// initialized, so callers must check this flag rather than `admin.auth`
// itself — otherwise verifyIdToken() throws "no default app" and every
// request looks like an invalid token instead of "auth not configured".
module.exports = { db, admin, authConfigured };
