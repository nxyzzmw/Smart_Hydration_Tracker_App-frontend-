import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const api = axios.create({
  baseURL: "http://10.0.4.50:2000",
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
    const originalRequest = error.config;

    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const res = await axios.post(
        "http://10.0.4.50:2000/api/auth/refresh",
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
