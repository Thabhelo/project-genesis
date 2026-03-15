/**
 * Firestore persistence for Project Genesis.
 * When serviceAccountKey.json exists, state syncs to Firestore.
 * Otherwise runs in-memory only.
 */

const { db } = require('./firebaseAdmin');

const STATE_DOC = 'world';
const EVENTS_COLLECTION = 'events';

function isFirestore() {
  try {
    const col = db?.collection?.('simulation');
    return col && typeof col.doc === 'function';
  } catch (_) {
    return false;
  }
}

async function saveState(state) {
  if (!isFirestore()) return;
  try {
    await db.collection('simulation').doc(STATE_DOC).set({
      ...state,
      updatedAt: Date.now()
    });
  } catch (e) {
    console.warn('Firestore save failed:', e.message);
  }
}

async function loadState() {
  if (!isFirestore()) return null;
  try {
    const doc = await db.collection('simulation').doc(STATE_DOC).get();
    return doc.exists ? doc.data() : null;
  } catch (e) {
    console.warn('Firestore load failed:', e.message);
    return null;
  }
}

async function appendEvent(event) {
  if (!isFirestore()) return;
  try {
    await db.collection('events').add({
      ...event,
      timestamp: Date.now()
    });
  } catch (e) {
    console.warn('Firestore appendEvent failed:', e.message);
  }
}

module.exports = { saveState, loadState, appendEvent, isFirestore };
