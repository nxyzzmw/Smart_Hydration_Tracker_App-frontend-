import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";

function getExpoDevHost() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants as any)?.manifest?.debuggerHost;

  if (!hostUri || typeof hostUri !== "string") return null;
  const [host] = hostUri.split(":");
  return host || null;
}

const API_PORT =
  process.env.EXPO_PUBLIC_API_PORT?.trim() || "2000";
const expoDevHost = getExpoDevHost();
const inferredExpoBaseUrl = expoDevHost
  ? `http://${expoDevHost}:${API_PORT}`
  : null;

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL?.trim() ||
  inferredExpoBaseUrl ||
  (Platform.OS === "android"
    ? "http://10.0.2.2:2000"
    : "http://localhost:2000");

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export const ACCESS_TOKEN_KEY = "auth_token";
export const REFRESH_TOKEN_KEY = "refresh_token";
const REFRESH_ENDPOINTS = [
  "/api/auth/refresh",
  "/auth/refresh",
  "/api/auth/refresh-token",
];

type TokenSet = {
  accessToken: string;
  refreshToken?: string;
};

function extractTokens(payload: any) {
  const accessToken =
    payload?.access_token ??
    payload?.accessToken ??
    payload?.token ??
    payload?.data?.access_token ??
    payload?.data?.accessToken;
  const refreshToken =
    payload?.refresh_token ??
    payload?.refreshToken ??
    payload?.data?.refresh_token ??
    payload?.data?.refreshToken;

  return {
    accessToken: typeof accessToken === "string" ? accessToken : "",
    refreshToken: typeof refreshToken === "string" ? refreshToken : "",
  };
}

export async function saveAuthTokens(
  accessToken: string,
  refreshToken?: string
) {
  await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
}

export async function clearAuthTokens() {
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
}

let refreshInFlight: Promise<TokenSet> | null = null;

function isRefreshRequestUrl(url: string) {
  return REFRESH_ENDPOINTS.some((endpoint) => url.includes(endpoint));
}

function isAuthFailureStatus(status?: number) {
  return status === 400 || status === 401 || status === 403;
}

function extractErrorMessage(error: any) {
  const data = error?.response?.data;
  const msg =
    data?.message ??
    data?.error ??
    data?.detail ??
    error?.message ??
    "";
  return String(msg).toLowerCase();
}

function isExpiredTokenError(error: any) {
  const message = extractErrorMessage(error);
  return (
    message.includes("jwt expired") ||
    message.includes("token expired") ||
    message.includes("expired token")
  );
}

function shouldAttemptRefresh(error: any) {
  const status = Number(error?.response?.status || 0);
  return status === 401 || isExpiredTokenError(error);
}

async function tryRefreshWithEndpoint(
  endpoint: string,
  refreshToken: string
): Promise<TokenSet> {
  const url = `${API_BASE_URL}${endpoint}`;
  const candidates = [
    { refresh_token: refreshToken },
    { refreshToken },
    { token: refreshToken },
    { refresh_token: refreshToken, refreshToken },
  ];

  let lastError: any = null;

  for (const payload of candidates) {
    try {
      const res = await axios.post(url, payload, {
        timeout: 10000,
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      });
      const parsed = extractTokens(res.data);
      if (parsed.accessToken) {
        return {
          accessToken: parsed.accessToken,
          refreshToken: parsed.refreshToken || refreshToken,
        };
      }
    } catch (error: any) {
      lastError = error;
    }
  }

  throw lastError || new Error("Refresh request failed");
}

async function refreshAccessToken(refreshToken: string): Promise<TokenSet> {
  let lastError: any = null;

  for (const endpoint of REFRESH_ENDPOINTS) {
    try {
      return await tryRefreshWithEndpoint(endpoint, refreshToken);
    } catch (error: any) {
      lastError = error;
      const status = Number(error?.response?.status || 0) || undefined;
      if (status && !isAuthFailureStatus(status)) {
        break;
      }
    }
  }

  throw lastError || new Error("Unable to refresh token");
}

async function getRefreshedTokenSet(): Promise<TokenSet> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const storedRefreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (!storedRefreshToken) {
        throw new Error("No refresh token available");
      }

      const next = await refreshAccessToken(storedRefreshToken);
      await saveAuthTokens(next.accessToken, next.refreshToken || storedRefreshToken);
      return next;
    })().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
}

// ================= REQUEST INTERCEPTOR =================
api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);

    if (token && !config.headers?.Authorization) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

  return config;
});

// ================= RESPONSE INTERCEPTOR =================
api.interceptors.response.use(
  (response) => response,

  async (error) => {
    if (!error?.response) {
      console.log(
        "API network error. baseURL:",
        API_BASE_URL
      );
    }

    const originalRequest = error.config;

    if (!originalRequest || !shouldAttemptRefresh(error)) {
      return Promise.reject(error);
    }
    const expiredByMessage = isExpiredTokenError(error);
    const failedStatus = Number(error?.response?.status || 0) || undefined;
    console.log(
      `[AUTH] Access token expired for ${String(originalRequest?.url || "unknown")} (status: ${
        failedStatus ?? "n/a"
      }, byMessage: ${expiredByMessage})`
    );

    const requestUrl = String(originalRequest.url || "");
    if (originalRequest._retry || isRefreshRequestUrl(requestUrl)) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      console.log("[AUTH] Attempting refresh token...");
      const { accessToken } = await getRefreshedTokenSet();
      console.log("[AUTH] Refresh token success. Retrying original request.");

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError: any) {
      console.log(
        "[AUTH] Refresh token failed:",
        refreshError?.response?.data || refreshError?.message || refreshError
      );
      const status = Number(refreshError?.response?.status || 0) || undefined;
      // Clear auth only for definitive auth failures, not transient server/network issues.
      if (!status || isAuthFailureStatus(status)) {
        await clearAuthTokens();
      }
      return Promise.reject(refreshError);
    }
  }
);
