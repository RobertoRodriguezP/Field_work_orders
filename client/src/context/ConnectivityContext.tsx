import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import api, { bindNetworkHandler } from "../api/http";

type ConnCtx = {
  apiOnline: boolean;     // estable, sin parpadeo
  lastOkAt?: number;      // timestamp del último “ok”
  checkNow: () => Promise<void>;
};

const Ctx = createContext<ConnCtx>({ apiOnline: false, checkNow: async () => {} });

const OFFLINE_AFTER_MS = 8000;    // ventana de gracia para caer a offline
const PING_EVERY_MS = 12000;      // ping periódico a /health
const CHECK_TICK_MS = 1000;       // frecuencia de reevaluación

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
      // no marcamos offline de inmediato; dejamos que lo haga el TICK si vence la ventana
    }
  };

  // Suscribir eventos de red de axios (solo 1 vez)
  useEffect(() => {
    bindNetworkHandler((ev) => {
      if (ev === "ok") {
        // cualquier respuesta renueva el pulso y, si estaba offline, sube a online
        const now = Date.now();
        const wasOnline = computeOnline();
        markOk(now);
        if (!wasOnline) setApiOnline(true);
      } else {
        // "down": no hacemos nada inmediato; dejamos que el TICK decida
      }
    });
    // inicial: intento un ping
    checkNow();
    // TICK: reevaluar online/offline suavemente
    tickRef.current = window.setInterval(() => {
      const online = computeOnline();
      setApiOnline((prev) => (prev !== online ? online : prev));
    }, CHECK_TICK_MS);
    // PING: mantener pulso incluso sin tráfico
    pingRef.current = window.setInterval(() => { checkNow(); }, PING_EVERY_MS);

    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      if (pingRef.current) window.clearInterval(pingRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
