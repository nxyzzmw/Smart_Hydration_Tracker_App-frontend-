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

// ================= REQUEST INTERCEPTOR =================
api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);

    if (token) {
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

    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    if (originalRequest._retry || String(originalRequest.url || "").includes("/api/auth/refresh")) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const res = await axios.post(
        `${API_BASE_URL}/api/auth/refresh`,
        {
          refresh_token: refreshToken,
          refreshToken,
        }
      );

      const { accessToken, refreshToken: nextRefreshToken } = extractTokens(res.data);
      if (!accessToken) {
        throw new Error("No access token from refresh");
      }

      await saveAuthTokens(accessToken, nextRefreshToken || refreshToken);

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      await clearAuthTokens();
      return Promise.reject(refreshError);
    }
  }
);
