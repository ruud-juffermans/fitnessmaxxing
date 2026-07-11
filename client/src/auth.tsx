import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth as authApi, ApiError } from './api';
import type { AuthUser } from './types';

// Session context against the platform API. This app has NO login UI anymore —
// authentication happens on the account app; we only read the shared session
// (App.tsx redirects there when it's missing). Only sign-out remains in-app.
interface AuthState {
  user: AuthUser | null;
  loading: boolean;
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

  async function logout() {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
