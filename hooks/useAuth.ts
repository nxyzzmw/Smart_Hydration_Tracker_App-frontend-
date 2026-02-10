import { useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function useAuth() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  const checkAuth = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("auth_token");

      // Only trust access token
      setAuthenticated(!!token);

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
