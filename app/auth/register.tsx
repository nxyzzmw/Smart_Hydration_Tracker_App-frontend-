import React, { useState } from "react";
import { ScrollView, StyleSheet, View, Alert } from "react-native";
import Screen from "../../components/Screen";
import {
  TextInput,
  Button,
  Text,
  RadioButton,
  Switch,
  SegmentedButtons,
} from "react-native-paper";
import { useRouter } from "expo-router";
import { registerUser, loginUser } from "../../src/api/authApi";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Register() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [activity, setActivity] = useState("moderate");
  const [climate, setClimate] = useState("moderate");
  const [pregnancy, setPregnancy] = useState(false);
  const [unit, setUnit] = useState("ml");

  // error state
  const [errors, setErrors] = useState<any>({});

  const validate = () => {
    let newErrors: any = {};

    if (!name.trim()) newErrors.name = "Name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    if (!password.trim()) newErrors.password = "Password is required";
    if (!age.trim()) newErrors.age = "Age is required";
    if (!weight.trim()) newErrors.weight = "Weight is required";
    if (!height.trim()) newErrors.height = "Height is required";

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

 const handleRegister = async () => {
  if (!validate()) return;

  const userData = {
    name,
    email,
    password,
    age,
    gender,
    weight,
    height,
    activity,
    climate,
    pregnancy,
    unit,
  };

  try {
    // Step 1: Register user
    await registerUser(userData);

    // Step 2: Auto login
    const loginResult = await loginUser(email, password);

    // Normalize backend response
    const accessToken =
      loginResult.accessToken || loginResult.token;

    const refreshToken =
      loginResult.refreshToken || loginResult.refresh_token;

    if (!accessToken || !refreshToken) {
      console.log("Login response:", loginResult);
      throw new Error("Invalid token response from server");
    }

    // Step 3: Save BOTH tokens atomically
    await AsyncStorage.multiSet([
      ["auth_token", accessToken],
      ["refresh_token", refreshToken],
    ]);

    // Step 4: Redirect
    router.replace("/tabs");

  } catch (error: any) {
    console.log("Register error:", error);

    Alert.alert(
      "Registration failed",
      error?.response?.data?.message || "Server error"
    );
  }
};


  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="headlineMedium">Create Account</Text>

        <TextInput
          label="Name"
          value={name}
          onChangeText={setName}
          error={!!errors.name}
        />
        {errors.name && <Text style={styles.error}>{errors.name}</Text>}

        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          error={!!errors.email}
        />
        {errors.email && <Text style={styles.error}>{errors.email}</Text>}

        <TextInput
          label="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          error={!!errors.password}
        />
        {errors.password && (
          <Text style={styles.error}>{errors.password}</Text>
        )}

        <TextInput
          label="Age"
          keyboardType="numeric"
          value={age}
          onChangeText={setAge}
          error={!!errors.age}
        />
        {errors.age && <Text style={styles.error}>{errors.age}</Text>}

        <Text>Gender</Text>
        <RadioButton.Group value={gender} onValueChange={setGender}>
          <View style={styles.row}>
            <RadioButton value="male" />
            <Text>Male</Text>

            <RadioButton value="female" />
            <Text>Female</Text>

            <RadioButton value="other" />
            <Text>Others</Text>
          </View>
        </RadioButton.Group>

        <TextInput
          label="Weight (kg)"
          keyboardType="numeric"
          value={weight}
          onChangeText={setWeight}
          error={!!errors.weight}
        />
        {errors.weight && (
          <Text style={styles.error}>{errors.weight}</Text>
        )}

        <TextInput
          label="Height (cm)"
          keyboardType="numeric"
          value={height}
          onChangeText={setHeight}
          error={!!errors.height}
        />
        {errors.height && (
          <Text style={styles.error}>{errors.height}</Text>
        )}

        <Text>Activity Level</Text>
        <SegmentedButtons
          value={activity}
          onValueChange={setActivity}
          buttons={[
            { value: "low", label: "Low" },
            { value: "moderate", label: "Moderate" },
            { value: "high", label: "High" },
          ]}
        />

        <Text>Climate</Text>
        <SegmentedButtons
          value={climate}
          onValueChange={setClimate}
          buttons={[
            { value: "cold", label: "Cold" },
            { value: "moderate", label: "Moderate" },
            { value: "hot", label: "Hot" },
          ]}
        />

        <View style={styles.row}>
          <Text>Pregnancy / Breastfeeding</Text>
          <Switch value={pregnancy} onValueChange={setPregnancy} />
        </View>

        <Text>Unit</Text>
        <SegmentedButtons
          value={unit}
          onValueChange={setUnit}
          buttons={[
            { value: "ml", label: "ML" },
            { value: "oz", label: "OZ" },
          ]}
        />

        <Button
          mode="contained"
          onPress={handleRegister}
          style={{ marginTop: 20 }}
        >
          Register
        </Button>

        <Button onPress={() => router.push("/auth/login")}>
          Already have an account? Login
        </Button>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 6 },
  row: { flexDirection: "row", alignItems: "center", gap: 5 },
  error: {
    color: "red",
    fontSize: 12,
    marginBottom: 5,
  },
});
