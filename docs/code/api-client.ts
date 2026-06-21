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
  params?: Record<string, string | number | boolean>;
  timeout?: number;
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  errorMessage?: string;
  successMessage?: string;
}

export interface ApiConfig {
  baseUrl: string;
  getToken?: () => string | null | undefined;
  getLang?: () => string;
  getSearchParams?: () => string | URLSearchParams | Record<string, unknown>;
  showToast?: (message: string, type: ToastType) => void;
  onUnauthorized?: () => void;
  onError?: (error: Error, response?: Response) => void;
  onSuccess?: (response: ApiResponse) => void;
  onRequestStart?: () => void;
  onRequestEnd?: () => void;
  defaultHeaders?: Record<string, string>;
  defaultTimeout?: number;
  credentials?: RequestCredentials;
  fetch?: typeof fetch;
  uploadImagePath?: string;
  uploadFilePath?: string;
}

export interface UploadImageOptions {
  onProgress?: (progress: number) => void;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
}

export interface UploadResponse {
  url?: string;
  image_url?: string;
  imageUrl?: string;
  path?: string;
  image_name?: string;
  filename?: string;
}

export interface ApiInstance {
  get: <T = unknown>(endpoint: string, options?: ApiOptions) => Promise<ApiResponse<T>>;
  post: <T = unknown>(endpoint: string, data?: unknown, options?: ApiOptions) => Promise<ApiResponse<T>>;
  put: <T = unknown>(endpoint: string, data?: unknown, options?: ApiOptions) => Promise<ApiResponse<T>>;
  delete: <T = unknown>(endpoint: string, options?: ApiOptions) => Promise<ApiResponse<T>>;
  patch: <T = unknown>(endpoint: string, data?: unknown, options?: ApiOptions) => Promise<ApiResponse<T>>;
  request: <T = unknown>(method: HttpMethod, endpoint: string, data?: unknown, options?: ApiOptions) => Promise<ApiResponse<T>>;
  uploadImage: (file: File, folder: string, options?: UploadImageOptions) => Promise<ApiResponse<UploadResponse>>;
  uploadFile: (file: File, options?: UploadImageOptions) => Promise<ApiResponse<UploadResponse>>;
  updateConfig: (newConfig: Partial<ApiConfig>) => void;
}

class ApiCore implements ApiInstance {
  private config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = {
      defaultTimeout: 20000,
      credentials: "same-origin",
      uploadImagePath: "/upload/image",
      uploadFilePath: "/upload/file",
      ...config,
    };
  }

  updateConfig(newConfig: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  async get<T = unknown>(endpoint: string, options?: ApiOptions): Promise<ApiResponse<T>> {
    return this.request<T>("GET", endpoint, undefined, options);
  }

  async post<T = unknown>(endpoint: string, data?: unknown, options?: ApiOptions): Promise<ApiResponse<T>> {
    return this.request<T>("POST", endpoint, data, options);
  }

  async put<T = unknown>(endpoint: string, data?: unknown, options?: ApiOptions): Promise<ApiResponse<T>> {
    return this.request<T>("PUT", endpoint, data, options);
  }

  async delete<T = unknown>(endpoint: string, options?: ApiOptions): Promise<ApiResponse<T>> {
    return this.request<T>("DELETE", endpoint, undefined, options);
  }

  async patch<T = unknown>(endpoint: string, data?: unknown, options?: ApiOptions): Promise<ApiResponse<T>> {
    return this.request<T>("PATCH", endpoint, data, options);
  }

  async uploadImage(
    file: File,
    folder: string,
    options?: UploadImageOptions,
  ): Promise<ApiResponse<UploadResponse>> {
    try {
      this.config.onRequestStart?.();

      const formData = new FormData();
      formData.append("image", file);
      formData.append("folder", folder);

      const headers = this.prepareHeaders({});
      delete headers["Content-Type"];

      const xhr = new XMLHttpRequest();

      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable && options?.onProgress) {
            const progress = Math.round((event.loaded / event.total) * 100);
            options.onProgress(progress);
          }
        });

        xhr.addEventListener("load", () => {
          try {
            const response = JSON.parse(xhr.responseText);
            const isError = xhr.status < 200 || xhr.status >= 300;
            const responseData = response.data || response;

            const apiResponse: ApiResponse<UploadResponse> = {
              isError,
              data: responseData,
              message: response.message,
              status: xhr.status,
            };

            if (!isError) {
              if (options?.showSuccessToast && this.config.showToast && response.message) {
                this.config.showToast(response.message, "success");
              }
              this.config.onSuccess?.(apiResponse);
              resolve(apiResponse);
            } else {
              if (options?.showErrorToast !== false && this.config.showToast) {
                this.config.showToast(response.message || "فشل رفع الصورة", "error");
              }
              reject(apiResponse);
            }
          } catch (error) {
            reject(this.handleError(error, { showErrorToast: options?.showErrorToast }));
          }
        });

        xhr.addEventListener("error", () => {
          reject(this.handleError(new Error("فشل رفع الصورة"), { showErrorToast: options?.showErrorToast }));
        });

        xhr.addEventListener("abort", () => {
          reject(this.handleError(new Error("تم إلغاء رفع الصورة"), { showErrorToast: options?.showErrorToast }));
        });

        const fullUrl = `${this.config.baseUrl}${this.config.uploadImagePath}`;
        xhr.open("POST", fullUrl);

        Object.entries(headers).forEach(([key, value]) => {
          if (key !== "Content-Type") {
            xhr.setRequestHeader(key, value);
          }
        });

        xhr.send(formData);
      });
    } finally {
      this.config.onRequestEnd?.();
    }
  }

  async uploadFile(file: File, options?: UploadImageOptions): Promise<ApiResponse<UploadResponse>> {
    try {
      this.config.onRequestStart?.();

      const formData = new FormData();
      formData.append("file", file);

      const headers = this.prepareHeaders({});
      delete headers["Content-Type"];

      const xhr = new XMLHttpRequest();

      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable && options?.onProgress) {
            const progress = Math.round((event.loaded / event.total) * 100);
            options.onProgress(progress);
          }
        });

        xhr.addEventListener("load", () => {
          try {
            const response = JSON.parse(xhr.responseText);
            const isError = xhr.status < 200 || xhr.status >= 300;
            const responseData = response.data || response;

            const apiResponse: ApiResponse<UploadResponse> = {
              isError,
              data: responseData,
              message: response.message,
              status: xhr.status,
            };

            if (!isError) {
              if (options?.showSuccessToast && this.config.showToast && response.message) {
                this.config.showToast(response.message, "success");
              }
              this.config.onSuccess?.(apiResponse);
              resolve(apiResponse);
            } else {
              if (options?.showErrorToast !== false && this.config.showToast) {
                this.config.showToast(response.message || "فشل رفع الملف", "error");
              }
              reject(apiResponse);
            }
          } catch (error) {
            reject(this.handleError(error, { showErrorToast: options?.showErrorToast }));
          }
        });

        xhr.addEventListener("error", () => {
          reject(this.handleError(new Error("فشل رفع الملف"), { showErrorToast: options?.showErrorToast }));
        });

        xhr.addEventListener("abort", () => {
          reject(this.handleError(new Error("تم إلغاء رفع الملف"), { showErrorToast: options?.showErrorToast }));
        });

        const fullUrl = `${this.config.baseUrl}${this.config.uploadFilePath}`;
        xhr.open("POST", fullUrl);

        Object.entries(headers).forEach(([key, value]) => {
          if (key !== "Content-Type") {
            xhr.setRequestHeader(key, value);
          }
        });

        xhr.send(formData);
      });
    } finally {
      this.config.onRequestEnd?.();
    }
  }

  async request<T = unknown>(
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

      const fetchFn = this.config.fetch || fetch;
      const response = await fetchFn(fullUrl, fetchOptions);
      clearTimeout(timeoutId);

      const apiResponse = await this.parseResponse<T>(response);

      if (response.status === 401) {
        this.config.onUnauthorized?.();
        return {
          ...apiResponse,
          isError: true,
          message: apiResponse.message || "تم تسجيل الخروج - انتهت صلاحية الجلسة",
        } as ApiResponse<T>;
      }

      this.handleSuccess(apiResponse, requestOptions);

      return apiResponse as ApiResponse<T>;
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
    const cleanEndpoint = endpoint.startsWith("/") && this.config.baseUrl.endsWith("/") ? endpoint.slice(1) : endpoint;

    let fullUrl = `${this.config.baseUrl}${cleanEndpoint}`;

    if (options.query && this.config.getSearchParams) {
      const searchParams = this.config.getSearchParams();
      if (searchParams) {
        const queryString =
          typeof searchParams === "string" ? searchParams : new URLSearchParams(searchParams as Record<string, string>).toString();
        fullUrl += endpoint.includes("?") ? `&${queryString}` : `?${queryString}`;
      }
    }

    if (options.params && Object.keys(options.params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
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

    if (this.config.getLang) {
      const lang = this.config.getLang();
      if (lang) {
        headers["Accept-Language"] = lang;
      }
    }

    if (this.config.getToken) {
      const token = this.config.getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    return headers;
  }

  private async parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const isError = !response.ok;

    try {
      const data = await response.json();
      return {
        isError,
        ...data,
        status: response.status,
      };
    } catch {
      return {
        isError,
        data: undefined as T,
        message: "Failed to parse response",
        status: response.status,
      };
    }
  }

  private handleSuccess<T>(response: ApiResponse<T>, options: ApiOptions): void {
    this.config.onSuccess?.(response as ApiResponse);

    if (options.showSuccessToast && this.config.showToast && response.message) {
      this.config.showToast(response.message, "success");
    } else if (options.msgs && this.config.showToast && response.message) {
      this.config.showToast(response.message, "success");
    }
  }

  private handleError(error: unknown, options?: ApiOptions): ApiResponse {
    const errorMessage = this.getErrorMessage(error);

    this.config.onError?.(error as Error);

    const errorObj = error as { status?: number };
    if (errorObj.status === 401 || errorObj.status === 403) {
      this.config.onUnauthorized?.();
      return {
        isError: true,
        data: undefined,
        message: errorMessage || "تم تسجيل الخروج - انتهت صلاحية الجلسة",
        status: errorObj.status || 401,
      };
    }

    if (options?.showErrorToast !== false && this.config.showToast) {
      const message = options?.errorMessage || errorMessage;
      this.config.showToast(message, "error");
    } else if (options?.msgs && this.config.showToast) {
      this.config.showToast(errorMessage, "error");
    }

    return {
      isError: true,
      data: undefined,
      message: errorMessage,
      status: errorObj.status || 500,
    };
  }

  private getErrorMessage(error: unknown): string {
    const err = error as { name?: string; message?: string };
    if (err.name === "AbortError") {
      return "Request timeout";
    }

    if (err.message) {
      return err.message;
    }

    if (typeof error === "string") {
      return error;
    }

    return "حدث خطأ غير متوقع";
  }
}

export function createApi(config: ApiConfig): ApiInstance {
  if (!config.baseUrl) {
    throw new Error("baseUrl is required in API configuration");
  }

  const apiInstance = new ApiCore(config);

  return {
    get: <T = unknown>(endpoint: string, options?: ApiOptions) => apiInstance.request<T>("GET", endpoint, undefined, options),
    post: <T = unknown>(endpoint: string, data?: unknown, options?: ApiOptions) => apiInstance.request<T>("POST", endpoint, data, options),
    put: <T = unknown>(endpoint: string, data?: unknown, options?: ApiOptions) => apiInstance.request<T>("PUT", endpoint, data, options),
    delete: <T = unknown>(endpoint: string, options?: ApiOptions) => apiInstance.request<T>("DELETE", endpoint, undefined, options),
    patch: <T = unknown>(endpoint: string, data?: unknown, options?: ApiOptions) => apiInstance.request<T>("PATCH", endpoint, data, options),
    request: <T = unknown>(method: HttpMethod, endpoint: string, data?: unknown, options?: ApiOptions) => apiInstance.request<T>(method, endpoint, data, options),
    uploadImage: (file: File, folder: string, options?: UploadImageOptions) => apiInstance.uploadImage(file, folder, options),
    uploadFile: (file: File, options?: UploadImageOptions) => apiInstance.uploadFile(file, options),
    updateConfig: (newConfig: Partial<ApiConfig>) => apiInstance.updateConfig(newConfig),
  };
}
