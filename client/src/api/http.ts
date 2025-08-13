
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8085",
  headers: { "Content-Type": "application/json" },
});


function parseJwt(token?: string | null): { exp?: number } {
  if (!token) return {};
  try {
    const base = token.split(".")[1];
    const json = atob(base.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch { return {}; }
}
function isExpired(token?: string | null) {
  const { exp } = parseJwt(token);
  if (!exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return exp <= now;
}

let isHandling401 = false;

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");


  if (token && isExpired(token)) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  }

  const fresh = localStorage.getItem("access_token");
  if (fresh) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${fresh}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;
    if (status === 401 && !isHandling401) {

      isHandling401 = true;
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      try {

        if (!location.pathname.startsWith("/login")) {
          location.href = "/login";
        }
      } finally {
        isHandling401 = false;
      }
    }
    return Promise.reject(error);
  }
);

export default api;
