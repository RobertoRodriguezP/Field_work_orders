import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import api from '../api/http';

type ConnCtx = {
  apiOnline: boolean;
  lastOkAt?: number;
  checkNow: () => Promise<void>;
};

const Ctx = createContext<ConnCtx>({ apiOnline: false, checkNow: async () => {} });

const OFFLINE_AFTER_MS = 2000000;
const PING_EVERY_MS = 2000000;
const CHECK_TICK_MS = 100000;

export function ConnectivityProvider({ children }: { children: React.ReactNode }) {
  const [apiOnline, setApiOnline] = useState(false);
  const lastOkAtRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);
  const pingRef = useRef<number | null>(null);

  const markOk = (when = Date.now()) => {
    lastOkAtRef.current = when;
  };

  const computeOnline = () => {
    const last = lastOkAtRef.current;
    if (!last) return false;
    return Date.now() - last < OFFLINE_AFTER_MS;
  };

  const checkNow = async () => {
    try {
      await api.get("/health", { timeout: 4000 });
      markOk();
      setApiOnline(true);
    } catch {
      console.log("API offline");
      setApiOnline(false);
    }
  };

  useEffect(() => {
    // Eventos de red del navegador
    window.addEventListener("online", (_ev: Event) => setApiOnline(true));
    window.addEventListener("offline", (_ev: Event) => setApiOnline(false));

    // Primer chequeo
    checkNow();

    // Reevaluar estado cada X tiempo
    tickRef.current = window.setInterval(() => {
      const online = computeOnline();
      setApiOnline((prev) => (prev !== online ? online : prev));
    }, CHECK_TICK_MS);

    // Ping periódico a la API
    pingRef.current = window.setInterval(() => {
      checkNow();
    }, PING_EVERY_MS);

    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      if (pingRef.current) window.clearInterval(pingRef.current);
      window.removeEventListener("online", (_ev: Event) => setApiOnline(true));
      window.removeEventListener("offline", (_ev: Event) => setApiOnline(false));
    };
  }, []);

  const value = useMemo<ConnCtx>(() => ({
    apiOnline,
    lastOkAt: lastOkAtRef.current ?? undefined,
    checkNow,
  }), [apiOnline]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useConnectivity() {
  return useContext(Ctx);
}
