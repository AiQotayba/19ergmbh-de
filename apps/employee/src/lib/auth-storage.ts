export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  hourlyRate?: number;
  isActive?: boolean;
}

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_CACHE_KEY = "authUser";

export function getToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function getCachedUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_CACHE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    localStorage.removeItem(USER_CACHE_KEY);
    return null;
  }
}

export function setCachedUser(user: AuthUser): void {
  localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_CACHE_KEY);
}

export function hasStoredSession(): boolean {
  return Boolean(getToken() && getRefreshToken());
}
