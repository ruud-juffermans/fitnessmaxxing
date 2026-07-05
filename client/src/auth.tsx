import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth as authApi, ApiError } from './api';
import type { AuthUser } from './types';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  guest: () => Promise<void>;
  convert: (data: { email: string; password: string; name?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const { user } = await authApi.me();
      setUser(user);
    } catch (err) {
      // 401 simply means "not logged in"; anything else we also treat as logged out.
      if (!(err instanceof ApiError)) console.error(err);
      setUser(null);
    }
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const { user } = await authApi.login({ email, password });
    setUser(user);
  }

  async function guest() {
    const { user } = await authApi.guest();
    setUser(user);
  }

  async function convert(data: { email: string; password: string; name?: string }) {
    const { user } = await authApi.convert(data);
    setUser(user);
  }

  async function logout() {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, guest, convert, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
