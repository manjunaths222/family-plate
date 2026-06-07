'use client';
/**
 * AuthContext — provides the current Firebase user to the entire app.
 * Wraps the root layout so every page can call useAuth().
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase/client';

interface AuthContextValue {
  user:     User | null;
  loading:  boolean;
  signIn:   () => Promise<void>;
  signOut:  () => Promise<void>;
  idToken:  () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function signIn() {
    await signInWithPopup(auth, googleProvider);
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  async function idToken(): Promise<string | null> {
    return user ? user.getIdToken() : null;
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, idToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
