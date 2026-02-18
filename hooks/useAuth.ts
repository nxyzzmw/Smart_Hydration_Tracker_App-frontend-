import { useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
} from "../src/api/axiosClient";

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const [token, refreshToken] = await AsyncStorage.multiGet([
        ACCESS_TOKEN_KEY,
        REFRESH_TOKEN_KEY,
      ]);

      setAuthenticated(Boolean(token?.[1] || refreshToken?.[1]));

    } catch (error) {
      console.log("Auth check error:", error);
      setAuthenticated(false);

    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    loading,
    authenticated,
    refreshAuth: checkAuth, // allows manual re-check
  };
}
