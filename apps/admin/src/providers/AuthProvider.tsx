import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { UserRole } from "@19er/types";
import { api, setUnauthorizedHandler } from "@/lib/api-client";
import { clearTokens, getRefreshToken, getToken, setTokens } from "@/lib/auth-storage";

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  hourlyRate?: number;
  isActive?: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    }>("/auth/login", { email, password }, { showSuccessToast: true, successMessage: "Signed in" });

    if (response.isError || !response.data) {
      throw new Error(response.message || "Login failed");
    }

    setTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
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
