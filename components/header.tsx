import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

type HeaderProps = {
  title?: string;
  showBack?: boolean;
  rightIcon?: "profile" | "logout";
};

export default function Header({
  title = "HydroTrack",
  showBack = false,
  rightIcon = "profile",
}: HeaderProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  // ✅ Better back behavior
  const handleBack = () => {
    router.back();
  };

  // ✅ Safe logout
  const logout = async () => {
    if (loggingOut) return;

    try {
      setLoggingOut(true);

      await AsyncStorage.removeItem("auth_token");

      router.replace("/auth/login");

    } catch (error) {
      console.log("Logout error:", error);
      Alert.alert("Error", "Logout failed");

    } finally {
      setLoggingOut(false);
    }
  };

  const handleRightPress = () => {
    if (rightIcon === "profile") {
      router.push("/profile");
    } else {
      logout();
    }
  };

  const iconName =
    rightIcon === "logout"
      ? "log-out-outline"
      : "person-circle-outline";

  const iconColor =
    rightIcon === "logout"
      ? "#FF3B30"
      : "#000";

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {showBack ? (
          <Pressable onPress={handleBack}>
            <Ionicons name="arrow-back" size={26} color="#000" />
          </Pressable>
        ) : (
          <Text style={styles.logoText}>{title}</Text>
        )}
      </View>

      {showBack && (
        <Text style={styles.title}>{title}</Text>
      )}

      <Pressable
        onPress={handleRightPress}
        disabled={loggingOut}
      >
        <Ionicons
          name={iconName}
          size={30}
          color={iconColor}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 60,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  left: {
    width: "auto",
  },
  logoText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
});
