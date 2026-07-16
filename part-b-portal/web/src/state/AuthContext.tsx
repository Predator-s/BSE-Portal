import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, clearToken, getToken, setToken } from '../lib/api';
import type { Access } from '../lib/types';

interface AuthState {
  access: Access | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState<Access | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session from a stored token on first load.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api<{ access: Access }>('/api/auth/me')
      .then((r) => setAccess(r.access))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api<{ token: string; access: Access }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(r.token);
    setAccess(r.access);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setAccess(null);
  }, []);

  const value = useMemo(() => ({ access, loading, login, logout }), [access, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
