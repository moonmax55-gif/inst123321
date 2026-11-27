import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { fetchJson } from '../lib/api';
import { auth, googleAuthProvider } from '../lib/firebase';
import { ClassUser } from '../types';

interface AuthContextValue {
  firebaseUser: User | null;
  dbUser: ClassUser | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  getAuthHeaders: () => Promise<Record<string, string>>;
  setDbUser: React.Dispatch<React.SetStateAction<ClassUser | null>>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [dbUser, setDbUser] = useState<ClassUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const syncWithBackend = useCallback(async (user: User) => {
    try {
      const token = await user.getIdToken();
      const data = await fetchJson<{ user: ClassUser }>('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      setDbUser(data.user);
      setAuthError(null);
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : '로그인 연동 중 오류가 발생했습니다.');
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await syncWithBackend(user);
      } else {
        setDbUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [syncWithBackend]);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      await syncWithBackend(result.user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google 로그인에 실패했습니다.';
      if (!msg.includes('popup-closed-by-user')) {
        setAuthError('Google 로그인 창을 열거나 인증하는 중 문제가 발생했습니다.');
      }
    }
  }, [syncWithBackend]);

  const logout = useCallback(async () => {
    await signOut(auth);
    setDbUser(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (firebaseUser) {
      await syncWithBackend(firebaseUser);
    }
  }, [firebaseUser, syncWithBackend]);

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    if (!auth.currentUser) {
      throw new Error('로그인이 필요합니다.');
    }
    const token = await auth.currentUser.getIdToken();
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        dbUser,
        loading,
        authError,
        signInWithGoogle,
        logout,
        refreshProfile,
        getAuthHeaders,
        setDbUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
