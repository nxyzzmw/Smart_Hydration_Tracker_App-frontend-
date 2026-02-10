import React, { useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { TextInput, Button, Text } from "react-native-paper";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Screen from "../../components/Screen";
import { loginUser } from "../../src/api/authApi";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});

  const validate = () => {
    let newErrors: any = {};
    if (!email.trim()) newErrors.email = "Email is required";
    if (!password.trim()) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
  if (!validate()) return;

  try {
    setLoading(true);

    const result = await loginUser(email, password);

    console.log(
      "Login FULL RAW RESPONSE:",
      JSON.stringify(result, null, 2)
    );

    // Try all possible backend formats
    const accessToken =
      result.accessToken ||
      result.token ||
      result.access_token ||
      result?.data?.accessToken ||
      result?.data?.token;

    const refreshToken =
      result.refreshToken ||
      result.refresh_token ||
      result?.data?.refreshToken ||
      result?.data?.refresh_token;

    if (!accessToken || !refreshToken) {
      throw new Error(
        "Backend did not return tokens correctly"
      );
    }

    await AsyncStorage.multiSet([
      ["auth_token", accessToken],
      ["refresh_token", refreshToken],
    ]);

    router.replace("/tabs");

  } catch (e: any) {
    console.log("Login error:", e);

    Alert.alert(
      "Login failed",
      e?.response?.data?.message ||
        e.message ||
        "Invalid credentials"
    );

  } finally {
    setLoading(false);
  }
};


  return (
    <Screen>
      <View style={styles.outerContainer}>
        <View style={styles.card}>

          {/* Logo */}
          <View style={styles.logoBox}>
<MaterialCommunityIcons
  name="water"
  size={32}
  color="white"
/>
          </View>

          <Text style={styles.appName}>HydroTrack</Text>

          <Text variant="headlineMedium" style={styles.title}>
            Login
          </Text>

          <Text style={styles.subtitle}>
            Stay hydrated and track your daily intake.
          </Text>

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            mode="outlined"
            style={styles.input}
            error={!!errors.email}
          />
          {errors.email && <Text style={styles.error}>{errors.email}</Text>}

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            mode="outlined"
            style={styles.input}
            error={!!errors.password}
          />
          {errors.password && (
            <Text style={styles.error}>{errors.password}</Text>
          )}
<Button
  mode="contained"
  onPress={handleLogin}
  loading={loading}
  style={styles.loginButton}
  contentStyle={{ paddingVertical: 6 }}
  icon={() => (
    <Ionicons name="arrow-forward" size={20} color="white" />
  )}
>
  Login
</Button>

          <Button
            onPress={() => router.push("/auth/register")}
            style={styles.linkButton}
            labelStyle={styles.linkText}
          >
            Create new account
          </Button>

        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#dfeaf6",
  },

  card: {
    backgroundColor: "#eaf2fb",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },

  logoBox: {
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  logoText: {
    fontSize: 28,
    color: "white",
  },

  appName: {
    textAlign: "center",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },

  title: {
    fontWeight: "bold",
  },

  subtitle: {
    marginBottom: 20,
    color: "#6b7280",
  },

  input: {
    marginBottom: 8,
    backgroundColor: "white",
  },

  loginButton: {
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: "#2563eb",
  },

  linkButton: {
    marginTop: 10,
  },

  linkText: {
    color: "#2563eb",
  },

  error: {
    color: "red",
    fontSize: 12,
    marginBottom: 8,
  },
});
