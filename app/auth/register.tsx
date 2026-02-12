import React, { useState } from "react";
import { ScrollView, StyleSheet, View, Alert, Text } from "react-native";
import Screen from "../../components/Screen";
import {
  TextInput,
  Button,
  RadioButton,
  SegmentedButtons,
} from "react-native-paper";
import { useRouter } from "expo-router";
import { registerUser, loginUser } from "../../src/api/authApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

type Step = 1 | 2 | 3;

const PROFILE_PRESETS = [
  { key: "athlete", label: "Athlete" },
  { key: "office_worker", label: "Office worker" },
  { key: "outdoor_worker", label: "Outdoor worker" },
  { key: "pregnant", label: "Pregnant" },
  { key: "senior_citizen", label: "Senior citizen" },
] as const;

type ProfilePreset = (typeof PROFILE_PRESETS)[number]["key"];

const segmentTheme = {
  colors: {
    secondaryContainer: "#A9D2E3",
    onSecondaryContainer: "#0D203C",
    outline: "#93BDD1",
  },
};

export default function Register() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
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
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [selectedPreset, setSelectedPreset] = useState<ProfilePreset | null>(
    null
  );

  const applyPreset = (preset: ProfilePreset) => {
    setSelectedPreset(preset);

    if (preset === "athlete") {
      setActivity("high");
      setClimate("moderate");
      setPregnancy(false);
      return;
    }
    if (preset === "office_worker") {
      setActivity("low");
      setClimate("moderate");
      setPregnancy(false);
      return;
    }
    if (preset === "outdoor_worker") {
      setActivity("high");
      setClimate("hot");
      setPregnancy(false);
      return;
    }
    if (preset === "pregnant") {
      setActivity("moderate");
      setClimate("moderate");
      setPregnancy(true);
      return;
    }

    setActivity("low");
    setClimate("moderate");
    setPregnancy(false);
    if (!age || Number(age) < 60) {
      setAge("60");
    }
  };

  const clearFieldError = (field: string) => {
    setErrors((prev: any) => ({ ...prev, [field]: undefined }));
  };

  const validateStep = (targetStep: Step) => {
    const newErrors: any = {};

    if (targetStep === 1) {
      if (!name.trim()) newErrors.name = "Name is required";
      if (!email.trim()) newErrors.email = "Email is required";
      if (!password.trim()) newErrors.password = "Password is required";
    }

    if (targetStep === 2) {
      if (!age.trim()) newErrors.age = "Age is required";
      if (!weight.trim()) newErrors.weight = "Weight is required";
      if (!height.trim()) newErrors.height = "Height is required";
    }

    setErrors((prev: any) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const validateAll = () => {
    const newErrors: any = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    if (!password.trim()) newErrors.password = "Password is required";
    if (!age.trim()) newErrors.age = "Age is required";
    if (!weight.trim()) newErrors.weight = "Weight is required";
    if (!height.trim()) newErrors.height = "Height is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((prev) => (prev < 3 ? ((prev + 1) as Step) : prev));
  };

  const goBack = () => {
    setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev));
  };

  const handleRegister = async () => {
    if (!validateAll()) return;

    const userData = {
      name,
      email,
      password,
      age: Number(age),
      gender,
      weight: Number(weight),
      height: Number(height),
      activity,
      climate,
      pregnancy,
      unit,
    };

    try {
      setLoading(true);
      await registerUser(userData);
      const loginResult = await loginUser(email, password);

      const accessToken = loginResult.access_token || loginResult?.data?.access_token;
      if (!accessToken) {
        throw new Error("Invalid token response from server");
      }

      await AsyncStorage.setItem("auth_token", accessToken);
      router.replace("/tabs");
    } catch (error: any) {
      Alert.alert(
        "Registration failed",
        error?.response?.data?.message || "Server error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.bgCircle} />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <MaterialCommunityIcons name="water" size={30} color="#17AEC9" style={styles.topIcon} />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Step {step} of 3</Text>

          <View style={styles.stepperRow}>
            <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]} />
            <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]} />
            <View style={[styles.stepDot, step >= 3 && styles.stepDotActive]} />
          </View>

          {step === 1 && (
            <View style={styles.formBlock}>
              <TextInput
                mode="outlined"
                value={name}
                onChangeText={(v) => {
                  setName(v);
                  clearFieldError("name");
                }}
                placeholder="Name"
                style={styles.input}
                outlineStyle={styles.inputOutline}
                outlineColor="#DFE5EC"
                activeOutlineColor="#B6D7E8"
                error={!!errors.name}
              />
              {errors.name ? <Text style={styles.error}>{errors.name}</Text> : null}

              <TextInput
                mode="outlined"
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  clearFieldError("email");
                }}
                autoCapitalize="none"
                placeholder="Email"
                style={styles.input}
                outlineStyle={styles.inputOutline}
                outlineColor="#DFE5EC"
                activeOutlineColor="#B6D7E8"
                right={<TextInput.Icon icon="email-outline" color="#A6B8C9" />}
                error={!!errors.email}
              />
              {errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}

              <TextInput
                mode="outlined"
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  clearFieldError("password");
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
          )}

          {step === 2 && (
            <View style={styles.formBlock}>
              <View style={styles.twoCol}>
                <TextInput
                  mode="outlined"
                  value={age}
                  onChangeText={(v) => {
                    setAge(v);
                    clearFieldError("age");
                  }}
                  placeholder="Age"
                  keyboardType="numeric"
                  style={[styles.input, styles.col]}
                  outlineStyle={styles.inputOutline}
                  outlineColor="#DFE5EC"
                  activeOutlineColor="#B6D7E8"
                  error={!!errors.age}
                />

                <TextInput
                  mode="outlined"
                  value={weight}
                  onChangeText={(v) => {
                    setWeight(v);
                    clearFieldError("weight");
                  }}
                  placeholder="Weight (kg)"
                  keyboardType="numeric"
                  style={[styles.input, styles.col]}
                  outlineStyle={styles.inputOutline}
                  outlineColor="#DFE5EC"
                  activeOutlineColor="#B6D7E8"
                  error={!!errors.weight}
                />
              </View>

              {(errors.age || errors.weight) ? (
                <Text style={styles.error}>{errors.age || errors.weight}</Text>
              ) : null}

              <TextInput
                mode="outlined"
                value={height}
                onChangeText={(v) => {
                  setHeight(v);
                  clearFieldError("height");
                }}
                placeholder="Height (cm)"
                keyboardType="numeric"
                style={styles.input}
                outlineStyle={styles.inputOutline}
                outlineColor="#DFE5EC"
                activeOutlineColor="#B6D7E8"
                error={!!errors.height}
              />
              {errors.height ? <Text style={styles.error}>{errors.height}</Text> : null}

              <Text style={styles.label}>Gender</Text>
              <RadioButton.Group value={gender} onValueChange={setGender}>
                <View style={styles.genderRow}>
                  <View style={styles.genderItem}>
                    <RadioButton value="male" color="#14B2CF" />
                    <Text>Male</Text>
                  </View>
                  <View style={styles.genderItem}>
                    <RadioButton value="female" color="#14B2CF" />
                    <Text>Female</Text>
                  </View>
                  <View style={styles.genderItem}>
                    <RadioButton value="other" color="#14B2CF" />
                    <Text>Other</Text>
                  </View>
                </View>
              </RadioButton.Group>
            </View>
          )}

          {step === 3 && (
            <View style={styles.formBlock}>
              <Text style={styles.label}>Custom Profile</Text>
              <View style={styles.presetWrap}>
                {PROFILE_PRESETS.map((preset) => {
                  const isActive = selectedPreset === preset.key;
                  return (
                    <Button
                      key={preset.key}
                      mode={isActive ? "contained" : "outlined"}
                      compact
                      onPress={() => applyPreset(preset.key)}
                      style={styles.presetBtn}
                      buttonColor={isActive ? "#14B2CF" : "#E9EEF4"}
                      textColor={isActive ? "#FFFFFF" : "#4E6780"}
                    >
                      {preset.label}
                    </Button>
                  );
                })}
              </View>

              <Text style={styles.label}>Activity Level</Text>
              <SegmentedButtons
                value={activity}
                onValueChange={setActivity}
                theme={segmentTheme}
                buttons={[
                  { value: "low", label: "Low", checkedColor: "#0D203C", uncheckedColor: "#3D5B78" },
                  { value: "moderate", label: "Moderate", checkedColor: "#0D203C", uncheckedColor: "#3D5B78" },
                  { value: "high", label: "High", checkedColor: "#0D203C", uncheckedColor: "#3D5B78" },
                ]}
              />

              <Text style={styles.label}>Climate</Text>
              <SegmentedButtons
                value={climate}
                onValueChange={setClimate}
                theme={segmentTheme}
                buttons={[
                  { value: "cold", label: "Cold", checkedColor: "#0D203C", uncheckedColor: "#3D5B78" },
                  { value: "moderate", label: "Moderate", checkedColor: "#0D203C", uncheckedColor: "#3D5B78" },
                  { value: "hot", label: "Hot", checkedColor: "#0D203C", uncheckedColor: "#3D5B78" },
                ]}
              />

              <Text style={styles.label}>Unit</Text>
              <SegmentedButtons
                value={unit}
                onValueChange={setUnit}
                theme={segmentTheme}
                buttons={[
                  { value: "ml", label: "ML", checkedColor: "#0D203C", uncheckedColor: "#3D5B78" },
                  { value: "oz", label: "OZ", checkedColor: "#0D203C", uncheckedColor: "#3D5B78" },
                ]}
              />
            </View>
          )}

          {step === 1 ? (
            <View style={styles.centerNextRow}>
              <Button
                mode="contained"
                onPress={goNext}
                style={styles.centerNextButton}
                contentStyle={styles.buttonContent}
                buttonColor="#14B2CF"
                textColor="#FFFFFF"
                icon={() => <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
              >
                Next
              </Button>
            </View>
          ) : (
            <View style={styles.actionsRow}>
              <Button mode="outlined" onPress={goBack} style={styles.backButton}>
                Back
              </Button>

              {step < 3 ? (
                <Button
                  mode="contained"
                  onPress={goNext}
                  style={styles.nextButton}
                  contentStyle={styles.buttonContent}
                  buttonColor="#14B2CF"
                  textColor="#FFFFFF"
                  icon={() => <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
                >
                  Next
                </Button>
              ) : (
                <Button
                  mode="contained"
                  onPress={handleRegister}
                  loading={loading}
                  disabled={loading}
                  style={styles.nextButton}
                  contentStyle={styles.buttonContent}
                  buttonColor="#14B2CF"
                  textColor="#FFFFFF"
                >
                  Create account
                </Button>
              )}
            </View>
          )}

          <Button
            mode="text"
            onPress={() => router.push("/auth/login")}
            style={styles.linkButton}
            labelStyle={styles.linkText}
          >
            Already have an account? Login
          </Button>
        </ScrollView>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 40,
  },
  topIcon: {
    marginBottom: 14,
  },
  title: {
    fontSize: 23,
    lineHeight: 28,
    fontWeight: "900",
    color: "#0B1630",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    color: "#58708B",
    fontWeight: "500",
  },
  stepperRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    marginBottom: 18,
  },
  stepDot: {
    height: 8,
    flex: 1,
    borderRadius: 999,
    backgroundColor: "#C8D9E6",
  },
  stepDotActive: {
    backgroundColor: "#14B2CF",
  },
  formBlock: {
    gap: 10,
  },
  input: {
    backgroundColor: "#EFF4F8",
  },
  inputOutline: {
    borderRadius: 18,
    borderWidth: 2,
  },
  twoCol: {
    flexDirection: "row",
    gap: 10,
  },
  col: {
    flex: 1,
  },
  label: {
    marginTop: 4,
    marginBottom: 2,
    color: "#58708B",
    fontSize: 15,
    fontWeight: "500",
  },
  genderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  genderItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  switchRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  presetWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  presetBtn: {
    borderRadius: 14,
    borderColor: "#D5DEE8",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
    alignItems: "center",
  },
  centerNextRow: {
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  centerNextButton: {
    minWidth: 220,
    borderRadius: 16,
    shadowColor: "#13AFCB",
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  backButton: {
    flex: 1,
    borderRadius: 16,
    borderColor: "#9FBFD2",
    borderWidth: 1.5,
    backgroundColor: "#E7F1F7",
  },
  nextButton: {
    flex: 1,
    borderRadius: 16,
    shadowColor: "#13AFCB",
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  buttonContent: {
    minHeight: 54,
  },
  linkButton: {
    marginTop: 18,
  },
  linkText: {
    color: "#10A8C5",
    fontWeight: "700",
    fontSize: 15,
  },
  error: {
    color: "#B01919",
    fontSize: 12,
    marginLeft: 8,
    marginTop: -4,
  },
});
