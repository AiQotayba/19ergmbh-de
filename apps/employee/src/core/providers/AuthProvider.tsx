import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, setUnauthorizedHandler } from "@/core/lib/api-client";
import {
  clearTokens,
  getCachedUser,
  getRefreshToken,
  getToken,
  hasStoredSession,
  setCachedUser,
  setTokens,
  type AuthUser,
} from "@/core/lib/auth-storage";
import { refreshAccessToken } from "@/core/lib/auth-session";

export type { AuthUser };

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readInitialUser(): AuthUser | null {
  if (!hasStoredSession()) return null;
  return getCachedUser();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readInitialUser);
  const [isLoading, setIsLoading] = useState(() => !readInitialUser() && hasStoredSession());

  const refreshProfile = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      return;
    }

    const response = await api.get<AuthUser>("/me", { showErrorToast: false });
    if (response.isError || !response.data) {
      clearTokens();
      setUser(null);
      return;
    }

    setCachedUser(response.data);
    setUser(response.data);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearTokens();
      setUser(null);
    });
  }, []);

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
        await refreshProfile();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [refreshProfile]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post<{
      user: AuthUser;
      tokens: { accessToken: string; refreshToken: string };
    }>("/auth/login", { email, password }, { showSuccessToast: false });

    if (response.isError || !response.data) {
      throw new Error(response.message || "Login failed");
    }

    setTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
    setCachedUser(response.data.user);
    setUser(response.data.user);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      await api
        .post("/auth/logout", { refreshToken }, { showErrorToast: false })
        .catch(() => undefined);
    }
    clearTokens();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      refreshProfile,
    }),
    [user, isLoading, login, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
