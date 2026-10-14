import axios, { type InternalAxiosRequestConfig, AxiosError } from "axios";

const BASE_URL = "http://localhost:3000";

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

type RetryableRequest = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

let refreshInProgress: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (!refreshInProgress) {
    refreshInProgress = refreshClient
      .post("/auth/refresh")
      .then((response) => {
        const newToken = response.data.accessToken;

        if (typeof newToken !== "string" || !newToken) {
          throw new Error("Refresh response did not contain an access token");
        }

        localStorage.setItem("accessToken", newToken);
        return newToken;
      })
      .finally(() => {
        refreshInProgress = null;
      });
  }

  return refreshInProgress;
}

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableRequest | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/refresh") ||
      originalRequest.url?.includes("/auth/logout")
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const newToken = await refreshAccessToken();

      originalRequest.headers.Authorization = `Bearer ${newToken}`;

      return api(originalRequest);
    } catch (refreshError) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("userRole");

      try {
        await refreshClient.post("/auth/logout");
      } catch {
        // The server may already have an expired or invalid cookie.
      }

      window.dispatchEvent(new Event("auth:session-expired"));

      return Promise.reject(refreshError);
    }
  },
);

export default api;
