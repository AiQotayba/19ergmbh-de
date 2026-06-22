import { refreshAccessToken } from "./auth-session";
import { clearSession, getToken } from "./auth-storage";

const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:3001").replace(/\/$/, "");

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ApiCallOptions extends RequestInit {
  _retry?: boolean;
}

export async function api<T>(path: string, options: ApiCallOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const json = (await res.json()) as ApiResponse<T>;

  if (res.status === 401 && !path.startsWith("/auth/") && !options._retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return api<T>(path, { ...options, _retry: true });
    }
    clearSession();
    throw new Error("Session expired. Please sign in again.");
  }

  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Request failed");
  }

  return json.data as T;
}

export { clearSession as logout, getToken } from "./auth-storage";
export { setCachedUser, setTokens } from "./auth-storage";
export type { AuthUser } from "./auth-storage";
