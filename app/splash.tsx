import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
} from "../src/api/axiosClient";
import LoadingAnimation from "../components/LoadingAnimation";

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

        if (!mounted) return;

        if (token?.[1] || refreshToken?.[1]) {
          router.replace("/tabs");
        } else {
          router.replace("/auth/login");
        }

      } catch (error) {
        console.log("Splash error:", error);
        router.replace("/auth/login");
      }
    };

    checkAuth();

    return () => {
      mounted = false;
    };
  }, [router]);

  return (
    <View style={styles.container}>
      <LoadingAnimation size={140} />
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
