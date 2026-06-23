import { clearTokens, getRefreshToken, setTokens } from "./auth-storage";

const API_URL = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");

let refreshPromise: Promise<boolean> | null = null;

export async function refreshAccessToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      const json = (await response.json()) as {
        success?: boolean;
        data?: { accessToken: string; refreshToken: string };
      };

      if (!response.ok || !json.success || !json.data) {
        clearTokens();
        return false;
      }

      setTokens(json.data.accessToken, json.data.refreshToken);
      return true;
    } catch {
      clearTokens();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
