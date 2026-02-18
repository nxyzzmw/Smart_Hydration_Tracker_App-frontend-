import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
} from "../src/api/axiosClient";

export default function Splash() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const [token, refreshToken] = await AsyncStorage.multiGet([
          ACCESS_TOKEN_KEY,
          REFRESH_TOKEN_KEY,
        ]);

        // Small delay for splash animation feel
        setTimeout(() => {
          if (!mounted) return;

          if (token?.[1] || refreshToken?.[1]) {
            router.replace("/tabs");
          } else {
            router.replace("/auth/login");
          }
        }, 800);

      } catch (error) {
        console.log("Splash error:", error);
        router.replace("/auth/login");
      }
    };

    checkAuth();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
