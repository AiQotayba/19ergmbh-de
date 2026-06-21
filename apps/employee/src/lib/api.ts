const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function getToken(): string | null {
  return localStorage.getItem("accessToken");
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const json = (await res.json()) as ApiResponse<T>;

  if (!res.ok || !json.success) {
    throw new Error(json.error ?? "Request failed");
  }

  return json.data as T;
}

export async function login(email: string, password: string) {
  const data = await api<{
    user: { fullName: string };
    tokens: { accessToken: string; refreshToken: string };
  }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  localStorage.setItem("accessToken", data.tokens.accessToken);
  localStorage.setItem("refreshToken", data.tokens.refreshToken);
  return data.user;
}

export function logout() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
}
