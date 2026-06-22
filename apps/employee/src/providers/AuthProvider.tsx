import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "../lib/api";
import {
  clearSession,
  getCachedUser,
  getRefreshToken,
  getToken,
  hasStoredSession,
  setCachedUser,
  setTokens,
  type AuthUser,
} from "../lib/auth-storage";
import { refreshAccessToken } from "../lib/auth-session";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readInitialUser(): AuthUser | null {
  if (!hasStoredSession()) return null;
  return getCachedUser();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readInitialUser);
  const [isLoading, setIsLoading] = useState(() => !readInitialUser() && hasStoredSession());

  useEffect(() => {
    void (async () => {
      if (!hasStoredSession()) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      if (!getToken() && getRefreshToken()) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          setUser(null);
          setIsLoading(false);
          return;
        }
      }

      try {
        const profile = await api<AuthUser>("/me");
        setCachedUser(profile);
        setUser(profile);
      } catch {
        clearSession();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api<{
      user: AuthUser;
      tokens: { accessToken: string; refreshToken: string };
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    setTokens(data.tokens.accessToken, data.tokens.refreshToken);
    setCachedUser(data.user);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      await api("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      }).catch(() => undefined);
    }
    clearSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
    }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
