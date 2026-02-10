import React, { useEffect, useState } from "react";
import { View, StyleSheet, ActivityIndicator, Alert } from "react-native";
import {
  TextInput,
  Button,
  Text,
  RadioButton,
  Switch,
  SegmentedButtons,
} from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import Screen from "../components/Screen";
import Header from "../components/header";
import { useProfile } from "../hooks/useProfile";

export default function Profile() {
  const { profile, loading, updateProfile } = useProfile();
  const router = useRouter();

  const [form, setForm] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load profile into editable form
  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  // Safe logout
  const logout = async () => {
    try {
      await AsyncStorage.multiRemove([
        "auth_token",
        "refresh_token",
      ]);

      router.replace("/auth/login");

    } catch (error) {
      console.log("Logout error:", error);
      Alert.alert("Error", "Logout failed");
    }
  };

  // Save profile
  const handleSave = async () => {
    try {
      setSaving(true);

      await updateProfile(form);

      setIsEditing(false);

    } catch (error) {
      console.log("Update error:", error);
      Alert.alert("Error", "Update failed");

    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm(profile);
    setIsEditing(false);
  };

  return (
    <Screen>
      <Header
        title="Profile"
        showBack
        rightIcon="logout"
        onRightPress={logout}
      />

      <View style={styles.container}>
        {(loading || !form) && (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        )}

        {/* ================= VIEW MODE ================= */}
        {!loading && form && !isEditing && (
          <>
            <Text>Name: {form.name}</Text>
            <Text>Email: {form.email}</Text>
            <Text>Age: {form.age}</Text>
            <Text>Gender: {form.gender}</Text>
            <Text>Weight: {form.weight}</Text>
            <Text>Height: {form.height}</Text>
            <Text>Activity: {form.activity}</Text>
            <Text>Climate: {form.climate}</Text>
            <Text>Pregnancy: {form.pregnancy ? "Yes" : "No"}</Text>
            <Text>Unit: {form.unit}</Text>

            <Button
              mode="contained"
              onPress={() => setIsEditing(true)}
              style={{ marginTop: 20 }}
            >
              Edit Profile
            </Button>
          </>
        )}

        {/* ================= EDIT MODE ================= */}
        {!loading && form && isEditing && (
          <>
            <TextInput
              label="Name"
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v })}
            />

            <TextInput
              label="Email"
              value={form.email}
              onChangeText={(v) => setForm({ ...form, email: v })}
            />

            <TextInput
              label="Age"
              keyboardType="numeric"
              value={String(form.age)}
              onChangeText={(v) => setForm({ ...form, age: v })}
            />

            <Text>Gender</Text>
            <RadioButton.Group
              value={form.gender}
              onValueChange={(v) =>
                setForm({ ...form, gender: v })
              }
            >
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
              label="Weight"
              keyboardType="numeric"
              value={String(form.weight)}
              onChangeText={(v) =>
                setForm({ ...form, weight: v })
              }
            />

            <TextInput
              label="Height"
              keyboardType="numeric"
              value={String(form.height)}
              onChangeText={(v) =>
                setForm({ ...form, height: v })
              }
            />

            <Text>Activity Level</Text>
            <SegmentedButtons
              value={form.activity}
              onValueChange={(v) =>
                setForm({ ...form, activity: v })
              }
              buttons={[
                { value: "low", label: "Low" },
                { value: "moderate", label: "Moderate" },
                { value: "high", label: "High" },
              ]}
            />

            <Text>Climate Level</Text>
            <SegmentedButtons
              value={form.climate}
              onValueChange={(v) =>
                setForm({ ...form, climate: v })
              }
              buttons={[
                { value: "cold", label: "Cold" },
                { value: "moderate", label: "Moderate" },
                { value: "hot", label: "Hot" },
              ]}
            />

            <View style={styles.row}>
              <Text>Pregnancy / BreastFeeding</Text>
              <Switch
                value={form.pregnancy}
                onValueChange={(v) =>
                  setForm({ ...form, pregnancy: v })
                }
              />
            </View>

            <Text>Unit</Text>
            <SegmentedButtons
              value={form.unit}
              onValueChange={(v) =>
                setForm({ ...form, unit: v })
              }
              buttons={[
                { value: "ml", label: "ML" },
                { value: "oz", label: "OZ" },
              ]}
            />

            <View style={styles.buttonRow}>
              <Button
                mode="outlined"
                onPress={handleCancel}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button
                mode="contained"
                onPress={handleSave}
                loading={saving}
                disabled={saving}
              >
                Save
              </Button>
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
