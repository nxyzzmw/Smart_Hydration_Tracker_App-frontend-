import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
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

  const canLogin = email.trim().length > 0 && password.trim().length > 0;

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

      const accessToken = result.access_token || result?.data?.access_token;
      if (!accessToken) {
        throw new Error("Backend did not return tokens correctly");
      }

      await AsyncStorage.setItem("auth_token", accessToken);
      router.replace("/tabs");
    } catch (e: any) {
      Alert.alert(
        "Login failed",
        e?.response?.data?.message || e.message || "Invalid credentials"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.bgCircle} />

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.topIconWrap}>
              <MaterialCommunityIcons name="water" size={30} color="#17AEC9" />
            </View>

            <Text style={styles.title}>Login</Text>
            <Text style={styles.subtitle}>Welcome back to your hydration habit.</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                mode="outlined"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  if (errors.email) setErrors((prev: any) => ({ ...prev, email: undefined }));
                }}
                placeholder="hello@example.com"
                autoCapitalize="none"
                style={styles.input}
                outlineStyle={styles.inputOutline}
                outlineColor="#CAE1EE"
                activeOutlineColor="#B6D7E8"
                right={<TextInput.Icon icon="email-outline" color="#A6B8C9" />}
                error={!!errors.email}
              />
              {errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}
            </View>

            <View style={styles.inputGroup}>
              <TextInput
                mode="outlined"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (errors.password) setErrors((prev: any) => ({ ...prev, password: undefined }));
                }}
                placeholder="Password"
                secureTextEntry
                style={styles.input}
                outlineStyle={styles.inputOutline}
                outlineColor="#DFE5EC"
                activeOutlineColor="#B6D7E8"
                right={<TextInput.Icon icon="lock-outline" color="#A6B8C9" />}
                error={!!errors.password}
              />
              {errors.password ? <Text style={styles.error}>{errors.password}</Text> : null}
            </View>

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading || !canLogin}
              style={styles.loginButton}
              contentStyle={styles.loginButtonContent}
              buttonColor="#14B2CF"
              textColor="#FFFFFF"
              icon={() => <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />}
            >
              Login
            </Button>

            <Button
              mode="text"
              onPress={() => router.push("/auth/register")}
              style={styles.linkButton}
              labelStyle={styles.linkText}
            >
              Create new account
            </Button>

            <View style={styles.bottomDecoWrap}>
              <View style={styles.dropShape}>
                <View style={styles.dropHighlight} />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: "#EAF2F8",
  },
  bgCircle: {
    position: "absolute",
    width: 620,
    height: 620,
    borderRadius: 999,
    top: -130,
    right: -260,
    backgroundColor: "#D5EAF4",
  },
  content: {
    paddingHorizontal: 28,
    paddingTop: 120,
    paddingBottom: 40,
  },
  topIconWrap: {
    marginBottom: 16,
  },
  title: {
    fontSize: 64,
    lineHeight: 66,
    fontWeight: "800",
    color: "#0E1E40",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: "#5E718E",
    marginBottom: 28,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    color: "#11AAC7",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#EFF4F8",
  },
  inputOutline: {
    borderRadius: 20,
    borderWidth: 2,
  },
  loginButton: {
    marginTop: 18,
    borderRadius: 22,
    shadowColor: "#13AFCB",
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  loginButtonContent: {
    minHeight: 64,
  },
  linkButton: {
    marginTop: 26,
  },
  linkText: {
    color: "#10A8C5",
    fontWeight: "700",
    fontSize: 18,
  },
  bottomDecoWrap: {
    marginTop: 52,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 220,
  },
  dropShape: {
    width: 170,
    height: 210,
    borderTopLeftRadius: 120,
    borderTopRightRadius: 120,
    borderBottomLeftRadius: 110,
    borderBottomRightRadius: 110,
    backgroundColor: "#BFE6F3",
    transform: [{ rotate: "45deg" }],
  },
  dropHighlight: {
    position: "absolute",
    width: 18,
    height: 54,
    borderRadius: 40,
    backgroundColor: "#E5F4FA",
    left: 28,
    top: 92,
    transform: [{ rotate: "-25deg" }],
  },
  error: {
    color: "#B01919",
    fontSize: 12,
    marginTop: 4,
    marginLeft: 8,
  },
});
