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

// ================= REQUEST INTERCEPTOR =================
api.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem("auth_token");

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

    originalRequest._retry = true;

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/auth/refresh`,
        undefined,
        { withCredentials: true }
      );

      const newAccessToken = res.data.access_token;
      if (!newAccessToken) {
        throw new Error("No access token from refresh");
      }

      await AsyncStorage.setItem("auth_token", newAccessToken);

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  }
);
