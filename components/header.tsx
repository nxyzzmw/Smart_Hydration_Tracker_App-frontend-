import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { clearAuthTokens } from "../src/api/axiosClient";

type HeaderProps = {
  title?: string;
  showBack?: boolean;
  rightIcon?: "profile" | "logout";
  onRightPress?: () => void;
};

export default function Header({
  title = "HydroTrack",
  showBack = false,
  rightIcon = "profile",
  onRightPress,
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

      await clearAuthTokens();

      router.replace("/auth/login");

    } catch (error) {
      console.log("Logout error:", error);
      Alert.alert("Error", "Logout failed");

    } finally {
      setLoggingOut(false);
    }
  };

  const handleRightPress = () => {
    if (onRightPress) {
      onRightPress();
      return;
    }

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
      ? "#FF5B4D"
      : "#124565";

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        {showBack ? (
          <Pressable onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#124565" />
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
    height: 64,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F4F9FD",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D6E6F1",
  },
  left: {
    width: "auto",
  },
  logoText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0E1E40",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0E1E40",
  },
});
