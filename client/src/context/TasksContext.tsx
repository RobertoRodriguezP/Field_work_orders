import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/http";
import { useConnectivity } from "./ConnectivityContext";
import type { Paged, Task, TaskFilters, TaskStatus } from "../types";


const LS_KEY = "offline_tasks";

const toServerStatus = (s?: string | null): string | undefined => {
  if (!s) return undefined;
  return s === "In Progress" ? "InProgress" : s;
};

const toClientStatus = (s?: string | null): TaskStatus => {
  if (s === "InProgress") return "In Progress";
  if (s === "Pending" || s === "In Progress" || s === "Done") return s as TaskStatus;
  return "Pending";
};

const mapServerToClient = (e: any): Task => ({
  id: String(e.id),
  title: e.title,
  description: e.description ?? null,
  dueDate: e.dueDate ?? null,
  status: toClientStatus(e.status),
  createdBy: e.createdBySub ?? null,
  assignedTo: e.assignedToSub ?? null,
  createdAt: e.createdAt ?? null,
  updatedAt: e.updatedAt ?? null,
});

const mapClientToServer = (t: Partial<Task>) => ({
  title: t.title,
  description: t.description ?? null,
  dueDate: t.dueDate ?? null,
  status: toServerStatus(t.status), 
  assignedToSub: t.assignedTo ?? null,
});

function loadLocal(): Task[] { try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch { return []; } }
function saveLocal(items: Task[]) { localStorage.setItem(LS_KEY, JSON.stringify(items)); }

function applyFilters(items: Task[], f: TaskFilters): Task[] {
  let out = [...items];
  if (f.status && f.status !== "All") out = out.filter(t => t.status === f.status);
  return out;
}
function paginate(items: Task[], f: TaskFilters): Paged<Task> {
  const page = f.page ?? 1, pageSize = f.pageSize ?? 12;
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
}
function buildQuery(f: TaskFilters) {
  const p = new URLSearchParams();
  if (f.status && f.status !== "All") p.set("status", f.status as TaskStatus);
  p.set("page", String(f.page ?? 1));
  p.set("pageSize", String(f.pageSize ?? 12));
  return p.toString();
}
function toErrorMessage(err: any): string {
  const r = err?.response?.data;
  if (typeof r === "string") return r;
  if (r?.error && r?.message) return `${r.error}: ${r.message}`;
  if (err?.message) return err.message;
  try { return JSON.stringify(r || err); } catch { return "Unexpected error"; }
}

type TasksCtx = {
  page: Paged<Task> | null;
  loading: boolean;
  error: string | null;
  filters: TaskFilters;
  setFilters: (patch: Partial<TaskFilters>) => void;
  refresh: () => void;
  create: (input: Partial<Task>) => Promise<Task>;
  update: (id: string, patch: Partial<Task>) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

const Ctx = createContext<TasksCtx>({} as any);
const defaultFilters: TaskFilters = { status: "All", page: 1, pageSize: 12 };

export function TasksProvider({ children }: { children: React.ReactNode }) {

  const { apiOnline } = useConnectivity();
  const [filters, _setFilters] = useState<TaskFilters>(defaultFilters);
  const [page, setPage] = useState<Paged<Task> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!apiOnline) {
        const all = loadLocal();
        setPage(paginate(applyFilters(all, filters), filters));
        return;
      }
      const qs = buildQuery(filters);
      const token = localStorage.getItem("access_token");
      console.log(token)
      const { data } = await api.get(`/api/tasks?${qs}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }
      });
      
      
      const items: Task[] = (data.items ?? []).map(mapServerToClient);
      setPage({ items, total: data.total ?? items.length, page: filters.page ?? 1, pageSize: filters.pageSize ?? 12 });
      if (filters.page === 1 && (filters.status === "All" || !filters.status)) saveLocal(items);
    } catch (err: any) {
      const msg = toErrorMessage(err);
      if (err?.response?.status === 401) {
        const all = loadLocal();
        setPage(paginate(applyFilters(all, filters), filters));
        setError("No autorizado. Inicia sesión para sincronizar.");
      } else {
        setError(msg);
        if (!apiOnline) {
          const all = loadLocal();
          setPage(paginate(applyFilters(all, filters), filters));
        } else {
          setPage({ items: [], total: 0, page: filters.page ?? 1, pageSize: filters.pageSize ?? 12 });
        }
      }
    } finally {
      setLoading(false);
    }
  }, [apiOnline, filters]);

  useEffect(() => { fetchPage(); }, [fetchPage]);

  const setFilters = (patch: Partial<TaskFilters>) => _setFilters(prev => ({ ...prev, ...patch }));
  const refresh = useCallback(() => { fetchPage(); }, [fetchPage]);

  const create = useCallback(async (input: Partial<Task>) => {
    if (!apiOnline) {
      const t: Task = {
        id: crypto.randomUUID(),
        title: input.title || "Untitled",
        description: input.description ?? null,
        dueDate: input.dueDate ?? null,
        status: (input.status as TaskStatus) || "Pending",
        assignedTo: input.assignedTo ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const all = [t, ...loadLocal()];
      saveLocal(all);
      await fetchPage();
      return t;
    }
    try {
      const token = localStorage.getItem("access_token");
      
      const { data } = await api.post(
                      `/api/tasks`,
                      mapClientToServer(input),
                      {
                        headers: {
                          Authorization: `Bearer ${token}`,
                          "Content-Type": "application/json",
                        }
                      }
                    );
      const item = mapServerToClient(data);
      await fetchPage();
      return item;
    } catch (err: any) {
      if (err?.response?.status === 401) {
        const t: Task = {
          id: crypto.randomUUID(),
          title: input.title || "Untitled",
          description: input.description ?? null,
          dueDate: input.dueDate ?? null,
          status: (input.status as TaskStatus) || "Pending",
          assignedTo: input.assignedTo ?? null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const all = [t, ...loadLocal()];
        saveLocal(all);
        await fetchPage();
        return t;
      }
      throw err;
    }
  }, [apiOnline, fetchPage]);

  const update = useCallback(async (id: string, patch: Partial<Task>) => {
    if (!apiOnline) {
    const all = loadLocal();
    const idx = all.findIndex(t => t.id === id);
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
      saveLocal(all);
      await fetchPage();
    }
    return;
  }

  setPage(prev => {
    if (!prev) return prev;
    const items = prev.items.map(t => t.id === id ? { ...t, ...patch } : t);
    return { ...prev, items };
  });
    try {
    const token = localStorage.getItem("access_token");
    await api.put(`/api/tasks/${id}`, mapClientToServer(patch), {
      headers: { Authorization: `Bearer ${token}` },
    });
    await fetchPage();
  } catch (err: any) {
    await fetchPage();
    if (err?.response?.status === 401) {
      const all = loadLocal();
      const idx = all.findIndex(t => t.id === id);
      if (idx >= 0) {
        all[idx] = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
        saveLocal(all);
        await fetchPage();
        return;
      }
    }
    throw err;
  }
  }, [apiOnline, fetchPage]);

  const remove = useCallback(async (id: string) => {
    if (!apiOnline) {
      const all = loadLocal().filter(t => t.id !== id);
      saveLocal(all);
      await fetchPage();
      return;
    }
    try {
      const token = localStorage.getItem("access_token");
      
      await api.delete(`/api/tasks/${id}`, {
                headers: {
                  Authorization: `Bearer ${token}`
                }
              });
      await fetchPage();
    } catch (err: any) {
      if (err?.response?.status === 401) {
        const all = loadLocal().filter(t => t.id !== id);
        saveLocal(all);
        await fetchPage();
        return;
      }
      throw err;
    }
  }, [apiOnline, fetchPage]);

    const value = useMemo(() => ({
    page, loading, error,
    filters, setFilters, refresh,
    create, update, remove
  }), [page, loading, error, filters, refresh, create, update, remove]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useTasks = () => useContext(Ctx);
