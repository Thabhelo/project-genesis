/**
 * Firestore persistence for Project Genesis.
 * Per-user state stored in simulation/{userId}.
 */

const { db } = require('./firebaseAdmin');

function isFirestore() {
  try {
    const col = db?.collection?.('simulation');
    return col && typeof col.doc === 'function';
  } catch (_) {
    return false;
  }
}

function stateDocId(userId) {
  return userId ? `user_${userId.replace(/\//g, '_')}` : 'world';
}

async function saveState(state, userId) {
  if (!isFirestore()) return;
  const docId = stateDocId(userId);
  try {
    await db.collection('simulation').doc(docId).set({
      ...state,
      userId: userId || null,
      updatedAt: Date.now()
    });
  } catch (e) {
    console.warn('Firestore save failed:', e.message);
  }
}

async function loadState(userId) {
  if (!isFirestore()) return null;
  const docId = stateDocId(userId);
  try {
    const doc = await db.collection('simulation').doc(docId).get();
    return doc.exists ? doc.data() : null;
  } catch (e) {
    console.warn('Firestore load failed:', e.message);
    return null;
  }
}

async function appendEvent(event, userId) {
  if (!isFirestore()) return;
  try {
    await db.collection('events').add({
      ...event,
      userId: userId || null,
      timestamp: Date.now()
    });
  } catch (e) {
    console.warn('Firestore appendEvent failed:', e.message);
  }
}

module.exports = { saveState, loadState, appendEvent, isFirestore };
