import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/http';

type Me = {
  email?: string;
  preferred_username?: string;
  roles: string[];
};

type AuthCtx = {
  me: Me | null;
  loading: boolean;
  apiOnline: boolean; // si ya lo usas en tu app
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isGuest: boolean;
  has: (role: string) => boolean;
};

const Ctx = createContext<AuthCtx>({} as any);
export const useAuth = () => useContext(Ctx);

// helpers
function parseJwt<T = any>(token: string): T | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => `%${('00' + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(false);


  const apiOnline = true;

  useEffect(() => {
    const t = localStorage.getItem('access_token');
    if (!t) return;
    const payload = parseJwt<any>(t);
    const roles: string[] = payload?.realm_access?.roles ?? [];
    setMe({
      email: payload?.email,
      preferred_username: payload?.preferred_username ?? payload?.preferred_username,
      roles,
    });
  }, []);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      const body = new URLSearchParams();
      body.set('client_id', import.meta.env.VITE_CLIENT_ID);
      body.set('grant_type', 'password');
      body.set('username', username);
      body.set('password', password);
      const res = await fetch("http://localhost:8080/realms/workops/protocol/openid-connect/token", {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(`Auth failed: ${res.status} ${msg}`);
      }
      const json = await res.json();
      const accessToken: string = json.access_token;
      localStorage.setItem('access_token', accessToken);

      const payload = parseJwt<any>(accessToken);
      const roles: string[] = payload?.realm_access?.roles ?? [];
      setMe({
        email: payload?.email,
        preferred_username: payload?.preferred_username ?? username,
        roles,
      });
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setMe(null);
  };

  const value = useMemo(
    () => ({
      me,
      loading,
      apiOnline,
      login,
      logout,
      isGuest: !me,
      has: (role: string) => !!me?.roles?.includes(role),
    }),
    [me, loading, apiOnline]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
