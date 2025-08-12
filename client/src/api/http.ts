import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  timeout: 7000,
});

let networkHandler: ((event: "ok" | "down") => void) | null = null;
export function bindNetworkHandler(fn: (event: "ok" | "down") => void) {
  networkHandler = fn;
}

let authHandler: ((kind: "unauthorized") => void) | null = null;
export function bindAuthHandler(fn: (kind: "unauthorized") => void) {
  authHandler = fn;
}

api.interceptors.response.use(
  (res) => {
    // Cualquier respuesta del server (200..499) = hubo conexión
    networkHandler?.("ok");
    return res;
  },
  (err) => {
    // Si el server respondió (incluye 401, 403, 500) → también hay señal
    if (err?.response) {
      networkHandler?.("ok");
      if (err.response.status === 401) authHandler?.("unauthorized");
    } else {
      // Sin respuesta: timeout, DNS, CORS bloqueado, etc.
      networkHandler?.("down");
    }
    return Promise.reject(err);
  }
);

export default api;
