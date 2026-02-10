import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const api = axios.create({
  baseURL: "http://10.0.4.50:2000",
  timeout: 10000,
});

// ================= REQUEST INTERCEPTOR =================
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("auth_token");

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ================= REFRESH LOCK =================
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

// ================= RESPONSE INTERCEPTOR =================
api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // ❌ Don't try refreshing if already retried
    if (originalRequest._retry) {
      await AsyncStorage.multiRemove([
        "auth_token",
        "refresh_token",
      ]);
      return Promise.reject(error);
    }

    // ❌ Don't refresh refresh-token endpoint itself
    if (originalRequest.url?.includes("/api/auth/refresh")) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    // ================= HANDLE SINGLE REFRESH =================
    if (!isRefreshing) {
      isRefreshing = true;

      try {
        const refreshToken =
          await AsyncStorage.getItem("refresh_token");

        const res = await axios.post(
          "http://10.0.4.50:2000/api/auth/refresh",
          { refreshToken }
        );

        const newAccessToken = res.data.accessToken;

        await AsyncStorage.setItem(
          "auth_token",
          newAccessToken
        );

        isRefreshing = false;
        onRefreshed(newAccessToken);

      } catch (refreshError) {
        isRefreshing = false;

        await AsyncStorage.multiRemove([
          "auth_token",
          "refresh_token",
        ]);

        return Promise.reject(refreshError);
      }
    }

    // Wait for refresh to complete
    return new Promise((resolve) => {
      subscribeTokenRefresh((token: string) => {
        if (originalRequest.headers) {
          originalRequest.headers.Authorization =
            `Bearer ${token}`;
        }
        resolve(api(originalRequest));
      });
    });
  }
);
