'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, AuthResponse } from './api';

interface UserInfo {
  id: string;
  email: string;
  name: string | null;
  role?: string;
}

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
}

interface AuthContextType {
  user: UserInfo | null;
  tenant: TenantInfo | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { companyName: string; adminName: string; email: string; password: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const setCookie = (tokenValue: string) => {
    document.cookie = `token=${tokenValue}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  };

  const clearCookie = () => {
    document.cookie = 'token=; path=/; max-age=0';
  };

  const hydrate = useCallback(async (tokenValue: string) => {
    try {
      const res = await authApi().me();
      setToken(tokenValue);
      setUser(res.user);
      setTenant(res.tenant);
    } catch {
      localStorage.removeItem('token');
      clearCookie();
      setToken(null);
      setUser(null);
      setTenant(null);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('token');
    if (stored) {
      setToken(stored);
      hydrate(stored).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [hydrate]);

  const handleAuthResponse = (res: AuthResponse) => {
    localStorage.setItem('token', res.access_token);
    setCookie(res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    setTenant(res.tenant);
  };

  const login = async (email: string, password: string) => {
    const res = await authApi().login(email, password);
    handleAuthResponse(res);
  };

  const register = async (data: { companyName: string; adminName: string; email: string; password: string }) => {
    const res = await authApi().register(data);
    handleAuthResponse(res);
  };

  const logout = () => {
    localStorage.removeItem('token');
    clearCookie();
    setToken(null);
    setUser(null);
    setTenant(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, tenant, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
