import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { initFirebase, googleProvider } from '../firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const auth = initFirebase();
    if (!auth) {
      setLoading(false);
      setAuthReady(false);
      return;
    }
    setAuthReady(true);
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const signInWithGoogle = async () => {
    const auth = initFirebase();
    if (!auth) return;
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Sign in failed:', err);
    }
  };

  const signOut = async () => {
    const auth = initFirebase();
    if (!auth) return;
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  return { user, loading, authReady, signInWithGoogle, signOut };
}
