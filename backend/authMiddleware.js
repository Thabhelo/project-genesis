/**
 * Verify Firebase ID token from Authorization header or query param.
 * Attaches req.userId (Firebase UID) when valid.
 */
const { admin } = require('./firebaseAdmin');

async function verifyAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
  if (!token) {
    return res.status(401).json({ message: 'Sign in required' });
  }
  if (!admin?.auth) {
    return res.status(503).json({ message: 'Auth not configured' });
  }
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.userId = decoded.uid;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = { verifyAuth };
