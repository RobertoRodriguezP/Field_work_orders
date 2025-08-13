import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import api, { bindAuthHandler } from "../api/http";
import type { Me } from "../types";
import { useConnectivity } from "./ConnectivityContext";

type AuthCtx = {
  me: Me | null;
  loading: boolean;
  apiOnline: boolean;
  login: () => void;
  logout: () => void;
  isGuest: boolean;
  has: (role: string) => boolean;
};

const Ctx = createContext<AuthCtx>({} as any);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { apiOnline } = useConnectivity();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(false);

  // Un solo handler global para 401
  useEffect(() => {
    bindAuthHandler(() => setMe(null));
  }, []);

  // Carga de /api/auth/me (solo si hay señal)
  useEffect(() => {
    let cancelled = false;
    if (!apiOnline) { setLoading(false); return; }
    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get<Me>("/api/auth/me");
        if (!cancelled) setMe(data);
      } catch {
        if (!cancelled) setMe(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [apiOnline]);

  const login = () => {
    const guest: Me = {
      email: "guest@local",
      roles: []        // requerido por tu tipo Me
    };
    setMe(guest);
  };

  const logout = () => { window.location.href = `${import.meta.env.VITE_API_URL}/api/auth/logout`; };

  const value = useMemo(() => ({
    me, loading, apiOnline,
    login, 
    logout,
    isGuest: !apiOnline || !me,
    has: (role: string) => !!me?.roles?.includes(role),
  }), [me, loading, apiOnline]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() { return useContext(Ctx); }
