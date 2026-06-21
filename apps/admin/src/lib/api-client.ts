import { toast } from "sonner";
import type { PaginatedResponse } from "@19er/types";
import { clearTokens, getToken } from "./auth-storage";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
export type ToastType = "success" | "error" | "warning" | "info";

export interface ApiResponse<T = unknown> {
  isError: boolean;
  data: T;
  message?: string;
  status?: number;
  meta?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface ApiOptions {
  query?: boolean;
  msgs?: boolean;
  fetchOptions?: RequestInit;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined | null>;
  timeout?: number;
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  errorMessage?: string;
  successMessage?: string;
}

export interface ApiConfig {
  baseUrl: string;
  getToken?: () => string | null | undefined;
  showToast?: (message: string, type: ToastType) => void;
  onUnauthorized?: () => void;
  onError?: (error: Error, response?: Response) => void;
  onSuccess?: (response: ApiResponse) => void;
  onRequestStart?: () => void;
  onRequestEnd?: () => void;
  defaultHeaders?: Record<string, string>;
  defaultTimeout?: number;
  credentials?: RequestCredentials;
}

interface BackendResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

let unauthorizedHandler: (() => void) | undefined;

export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

class ApiCore {
  private config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = {
      defaultTimeout: 20000,
      credentials: "omit",
      ...config,
    };
  }

  updateConfig(newConfig: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  async get<T>(endpoint: string, options?: ApiOptions): Promise<ApiResponse<T>> {
    return this.request<T>("GET", endpoint, undefined, options);
  }

  async post<T>(endpoint: string, data?: unknown, options?: ApiOptions): Promise<ApiResponse<T>> {
    return this.request<T>("POST", endpoint, data, options);
  }

  async put<T>(endpoint: string, data?: unknown, options?: ApiOptions): Promise<ApiResponse<T>> {
    return this.request<T>("PUT", endpoint, data, options);
  }

  async delete<T>(endpoint: string, options?: ApiOptions): Promise<ApiResponse<T>> {
    return this.request<T>("DELETE", endpoint, undefined, options);
  }

  async patch<T>(endpoint: string, data?: unknown, options?: ApiOptions): Promise<ApiResponse<T>> {
    return this.request<T>("PATCH", endpoint, data, options);
  }

  async request<T>(
    method: HttpMethod,
    endpoint: string,
    data?: unknown,
    options?: ApiOptions,
  ): Promise<ApiResponse<T>> {
    try {
      this.config.onRequestStart?.();
      const requestOptions = this.mergeOptions(options);
      const fullUrl = this.buildUrl(endpoint, requestOptions);
      const headers = this.prepareHeaders(requestOptions);

      const fetchOptions: RequestInit = {
        method,
        headers,
        ...(this.config.credentials && { credentials: this.config.credentials }),
        ...requestOptions.fetchOptions,
      };

      if (data && method !== "GET") {
        if (data instanceof FormData) {
          fetchOptions.body = data;
          delete headers["Content-Type"];
        } else {
          fetchOptions.body = JSON.stringify(data);
          headers["Content-Type"] = "application/json";
        }
      }

      const timeout = requestOptions.timeout || this.config.defaultTimeout || 10000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      fetchOptions.signal = controller.signal;

      const response = await fetch(fullUrl, fetchOptions);
      clearTimeout(timeoutId);

      const apiResponse = await this.parseResponse<T>(response);

      if (response.status === 401) {
        this.config.onUnauthorized?.();
        unauthorizedHandler?.();
        return {
          ...apiResponse,
          isError: true,
          message: apiResponse.message || "Session expired. Please sign in again.",
        };
      }

      this.handleSuccess(apiResponse, requestOptions);
      return apiResponse;
    } catch (error) {
      return this.handleError(error, options) as ApiResponse<T>;
    } finally {
      this.config.onRequestEnd?.();
    }
  }

  private mergeOptions(options?: ApiOptions): ApiOptions {
    return {
      showErrorToast: true,
      showSuccessToast: false,
      msgs: false,
      query: false,
      ...options,
    };
  }

  private buildUrl(endpoint: string, options: ApiOptions): string {
    const base = this.config.baseUrl.replace(/\/$/, "");
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    let fullUrl = `${base}${path}`;

    if (options.params && Object.keys(options.params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.append(key, String(value));
        }
      });

      const queryString = searchParams.toString();
      if (queryString) {
        fullUrl += fullUrl.includes("?") ? `&${queryString}` : `?${queryString}`;
      }
    }

    return fullUrl;
  }

  private prepareHeaders(options: ApiOptions): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...this.config.defaultHeaders,
    };

    if (this.config.getToken) {
      const token = this.config.getToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    return headers;
  }

  private async parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const json = (await response.json()) as BackendResponse<T>;
      const isError = !response.ok || json.success === false;
      const message = json.error || json.message;

      return {
        isError,
        data: (json.data ?? undefined) as T,
        message,
        status: response.status,
      };
    } catch {
      return {
        isError: !response.ok,
        data: undefined as T,
        message: "Failed to parse response",
        status: response.status,
      };
    }
  }

  private handleSuccess<T>(response: ApiResponse<T>, options: ApiOptions): void {
    if (!response.isError) {
      this.config.onSuccess?.(response as ApiResponse);
    }

    if (response.isError && options.showErrorToast !== false && this.config.showToast) {
      this.config.showToast(options.errorMessage || response.message || "Request failed", "error");
      return;
    }

    if (options.showSuccessToast && this.config.showToast) {
      this.config.showToast(options.successMessage || response.message || "Success", "success");
    } else if (options.msgs && this.config.showToast && response.message) {
      this.config.showToast(response.message, "success");
    }
  }

  private handleError(error: unknown, options?: ApiOptions): ApiResponse {
    const errorMessage = this.getErrorMessage(error);
    this.config.onError?.(error as Error);

    if (options?.showErrorToast !== false && this.config.showToast) {
      this.config.showToast(options?.errorMessage || errorMessage, "error");
    }

    return {
      isError: true,
      data: undefined,
      message: errorMessage,
      status: 500,
    };
  }

  private getErrorMessage(error: unknown): string {
    const err = error as { name?: string; message?: string };
    if (err.name === "AbortError") return "Request timeout";
    if (err.message) return err.message;
    if (typeof error === "string") return error;
    return "An unexpected error occurred";
  }
}

const apiCore = new ApiCore({
  baseUrl: import.meta.env.VITE_API_URL ?? "/api",
  getToken,
  showToast: (message, type) => {
    if (type === "success") toast.success(message);
    else if (type === "error") toast.error(message);
    else if (type === "warning") toast.warning(message);
    else toast.info(message);
  },
  onUnauthorized: () => {
    clearTokens();
  },
});

export const api = {
  get: <T>(endpoint: string, options?: ApiOptions) => apiCore.get<T>(endpoint, options),
  post: <T>(endpoint: string, data?: unknown, options?: ApiOptions) =>
    apiCore.post<T>(endpoint, data, options),
  put: <T>(endpoint: string, data?: unknown, options?: ApiOptions) =>
    apiCore.put<T>(endpoint, data, options),
  delete: <T>(endpoint: string, options?: ApiOptions) => apiCore.delete<T>(endpoint, options),
  patch: <T>(endpoint: string, data?: unknown, options?: ApiOptions) =>
    apiCore.patch<T>(endpoint, data, options),
  request: <T>(method: HttpMethod, endpoint: string, data?: unknown, options?: ApiOptions) =>
    apiCore.request<T>(method, endpoint, data, options),
  updateConfig: (config: Partial<ApiConfig>) => apiCore.updateConfig(config),
};

export function normalizePaginated<T>(
  data: PaginatedResponse<T> | T[] | undefined,
  page: number,
  limit: number,
): { items: T[]; meta: ApiResponse["meta"] } {
  if (Array.isArray(data)) {
    return {
      items: data,
      meta: {
        current_page: page,
        last_page: 1,
        per_page: limit,
        total: data.length,
      },
    };
  }

  if (data && "items" in data) {
    return {
      items: data.items,
      meta: {
        current_page: data.page,
        last_page: data.totalPages,
        per_page: data.limit,
        total: data.total,
      },
    };
  }

  return {
    items: [],
    meta: { current_page: 1, last_page: 1, per_page: limit, total: 0 },
  };
}
