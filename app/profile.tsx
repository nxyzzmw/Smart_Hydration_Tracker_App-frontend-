import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Pressable,
} from "react-native";
import {
  TextInput,
  Button,
  Text,
  RadioButton,
  SegmentedButtons,
} from "react-native-paper";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../components/Screen";
import { useProfile } from "../hooks/useProfile";
import { clearAuthTokens } from "../src/api/axiosClient";
import { getUserTypeOptions } from "../src/api/authApi";
import {
  DEFAULT_USER_TYPES,
  inferUserTypeFromProfile,
  applyUserTypePreset,
  calculateDailyGoalMl,
} from "../src/utils/userTypes";

const segmentTheme = {
  colors: {
    secondaryContainer: "#A9D2E3",
    onSecondaryContainer: "#0D203C",
    outline: "#93BDD1",
  },
};

function displayText(value: any) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  const text = String(value);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

type InfoRowProps = {
  label: string;
  value: string;
  noBorder?: boolean;
};

function InfoRow({ label, value, noBorder = false }: InfoRowProps) {
  return (
    <View style={[styles.infoRow, noBorder && styles.noBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function Profile() {
  const { profile, loading, updateProfile } = useProfile();
  const router = useRouter();

  const [form, setForm] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userTypes, setUserTypes] = useState<string[]>([...DEFAULT_USER_TYPES]);

  useEffect(() => {
    if (!profile) return;
    setForm({ ...profile, userType: inferUserTypeFromProfile(profile) });
  }, [profile]);

  useEffect(() => {
    const loadUserTypes = async () => {
      const options = await getUserTypeOptions();
      if (options.length > 0) setUserTypes(options);
    };
    loadUserTypes();
  }, []);

  const logout = async () => {
    try {
      await clearAuthTokens();
      router.replace("/auth/login");
    } catch (error) {
      console.log("Logout error:", error);
      Alert.alert("Error", "Logout failed");
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = { ...form };
      delete payload.pregnancy;
      const normalizedUserType =
        form.userType || inferUserTypeFromProfile(form);
      const dailyGoal = calculateDailyGoalMl({
        ...payload,
        userType: normalizedUserType,
      });

      const updated = await updateProfile({
        ...payload,
        age: Number(form.age),
        weight: Number(form.weight),
        height: Number(form.height),
        gender: form.gender,
        activity: form.activity,
        climate: form.climate,
        userType: normalizedUserType,
        dailyGoal,
      });
      if (updated) {
        setForm({ ...updated, userType: inferUserTypeFromProfile(updated) });
      }
      setIsEditing(false);
    } catch (error) {
      console.log("Update error:", error);
      Alert.alert("Error", "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({ ...profile, userType: inferUserTypeFromProfile(profile) });
    setIsEditing(false);
  };

  if (loading || !form) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#14B2CF" />
        </View>
      </Screen>
    );
  }

  const initial = (form.name || "U").charAt(0).toUpperCase();
  const selectedPreset = form.userType || inferUserTypeFromProfile(form);

  return (
    <Screen>
      <View style={styles.pageHeader}>
        <Pressable onPress={() => router.back()} style={styles.headerIconBtn}>
          <Ionicons name="arrow-back" size={24} color="#4A5D77" />
        </Pressable>
        <Text style={styles.pageTitle}>Profile</Text>
        <View style={styles.headerRight}>
          {!isEditing ? (
            <Pressable
              onPress={() => setIsEditing(true)}
              style={styles.headerIconBtn}
            >
              <Ionicons name="create-outline" size={20} color="#14B2CF" />
            </Pressable>
          ) : null}
          <Pressable onPress={logout} style={styles.headerIconBtn}>
            <Ionicons name="log-out-outline" size={22} color="#F04444" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {!isEditing ? (
          <>
            <View style={styles.identityCard}>
              <View style={styles.avatarBox}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>

              <View style={styles.identityTextWrap}>
                <Text style={styles.nameText}>{form.name}</Text>
                <Text style={styles.emailText}>{form.email}</Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person" size={18} color="#22B9C7" />
                <Text style={styles.sectionTitle}>Personal</Text>
              </View>

              <InfoRow label="Age" value={displayText(form.age)} />
              <InfoRow label="Gender" value={displayText(form.gender)} />
              <InfoRow label="Weight" value={`${displayText(form.weight)} kg`} />
              <InfoRow label="Height" value={`${displayText(form.height)} cm`} noBorder />
            </View>

            <View style={styles.infoCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="water" size={18} color="#22B9C7" />
                <Text style={styles.sectionTitle}>Hydration Preferences</Text>
              </View>

              <InfoRow
                label="Profile preset"
                value={displayText(selectedPreset)}
              />
              <InfoRow
                label="Daily goal (ml)"
                value={displayText(form.dailyGoal)}
              />
              <InfoRow label="Activity" value={displayText(form.activity)} />
              <InfoRow label="Climate" value={displayText(form.climate)} />
              <InfoRow label="Unit" value={displayText(form.unit)} noBorder />
            </View>

          </>
        ) : (
          <View style={styles.editCard}>
            <Text style={styles.sectionTitle}>Edit Profile</Text>

            <TextInput
              label="Name"
              mode="outlined"
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v })}
              style={styles.input}
              outlineColor="#D5E6F1"
              activeOutlineColor="#9DC6DA"
            />

            <TextInput
              label="Email"
              mode="outlined"
              value={form.email}
              onChangeText={(v) => setForm({ ...form, email: v })}
              style={styles.input}
              outlineColor="#D5E6F1"
              activeOutlineColor="#9DC6DA"
            />

            <TextInput
              label="Age"
              mode="outlined"
              keyboardType="numeric"
              value={String(form.age)}
              onChangeText={(v) => setForm({ ...form, age: v })}
              style={styles.input}
              outlineColor="#D5E6F1"
              activeOutlineColor="#9DC6DA"
            />

            <Text style={styles.label}>Custom Profile</Text>
            <View style={styles.presetWrap}>
              {userTypes.map((preset) => {
                const isActive = selectedPreset === preset;
                return (
                  <Pressable
                    key={preset}
                    style={[
                      styles.presetChip,
                      isActive && styles.presetChipActive,
                    ]}
                    onPress={() =>
                      setForm((prev: any) => applyUserTypePreset(prev, preset))
                    }
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        isActive && styles.presetChipTextActive,
                      ]}
                    >
                      {preset}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Gender</Text>
            <RadioButton.Group
              value={form.gender}
              onValueChange={(v) => setForm({ ...form, gender: v })}
            >
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
                  <RadioButton value="others" color="#14B2CF" />
                  <Text>Other</Text>
                </View>
              </View>
            </RadioButton.Group>

            <TextInput
              label="Weight"
              mode="outlined"
              keyboardType="numeric"
              value={String(form.weight)}
              onChangeText={(v) => setForm({ ...form, weight: v })}
              style={styles.input}
              outlineColor="#D5E6F1"
              activeOutlineColor="#9DC6DA"
            />

            <TextInput
              label="Height"
              mode="outlined"
              keyboardType="numeric"
              value={String(form.height)}
              onChangeText={(v) => setForm({ ...form, height: v })}
              style={styles.input}
              outlineColor="#D5E6F1"
              activeOutlineColor="#9DC6DA"
            />

            <Text style={styles.label}>Activity Level</Text>
            <SegmentedButtons
              value={form.activity}
              onValueChange={(v) => setForm({ ...form, activity: v })}
              theme={segmentTheme}
              buttons={[
                { value: "low", label: "Low", checkedColor: "#0D203C", uncheckedColor: "#3D5B78" },
                { value: "moderate", label: "Moderate", checkedColor: "#0D203C", uncheckedColor: "#3D5B78" },
                { value: "high", label: "High", checkedColor: "#0D203C", uncheckedColor: "#3D5B78" },
              ]}
            />

            <Text style={styles.label}>Climate</Text>
            <SegmentedButtons
              value={form.climate}
              onValueChange={(v) => setForm({ ...form, climate: v })}
              theme={segmentTheme}
              buttons={[
                { value: "cold", label: "Cold", checkedColor: "#0D203C", uncheckedColor: "#3D5B78" },
                { value: "moderate", label: "Moderate", checkedColor: "#0D203C", uncheckedColor: "#3D5B78" },
                { value: "hot", label: "Hot", checkedColor: "#0D203C", uncheckedColor: "#3D5B78" },
              ]}
            />

            <Text style={styles.label}>Unit</Text>
            <SegmentedButtons
              value={form.unit}
              onValueChange={(v) => setForm({ ...form, unit: v })}
              theme={segmentTheme}
              buttons={[
                { value: "ml", label: "ML", checkedColor: "#0D203C", uncheckedColor: "#3D5B78" },
                { value: "oz", label: "OZ", checkedColor: "#0D203C", uncheckedColor: "#3D5B78" },
              ]}
            />

            <View style={styles.buttonRow}>
              <Button
                mode="outlined"
                onPress={handleCancel}
                disabled={saving}
                textColor="#4E6780"
                style={styles.cancelBtn}
              >
                Cancel
              </Button>

              <Button
                mode="contained"
                onPress={handleSave}
                loading={saving}
                disabled={saving}
                buttonColor="#14B2CF"
                style={styles.saveBtn}
              >
                Save
              </Button>
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 16,
    paddingBottom: 26,
  },
  pageHeader: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pageTitle: {
    fontSize: 23,
    fontWeight: "900",
    color: "#0B1630",
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F8FBFE",
    borderWidth: 1,
    borderColor: "#D8E2EC",
    alignItems: "center",
    justifyContent: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  identityCard: {
    backgroundColor: "#D9EEFA",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#A8D7F4",
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarBox: {
    width: 84,
    height: 84,
    borderRadius: 22,
    backgroundColor: "#14B2CF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#22B9D6",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  avatarText: {
    color: "#EFFFFF",
    fontSize: 40,
    fontWeight: "800",
  },
  identityTextWrap: {
    flex: 1,
  },
  nameText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0B1733",
  },
  emailText: {
    fontSize: 16,
    marginTop: 2,
    color: "#576A86",
  },
  infoCard: {
    backgroundColor: "#F6F7F9",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#E2EAF1",
    padding: 18,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0E1E40",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2EAF1",
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    color: "#5A6F89",
    fontSize: 18,
  },
  infoValue: {
    color: "#0B1428",
    fontSize: 18,
    fontWeight: "700",
  },
  editCard: {
    backgroundColor: "#F6F7F9",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#E2EAF1",
    padding: 18,
    gap: 12,
  },
  input: {
    backgroundColor: "#F8FBFE",
  },
  label: {
    color: "#4E6780",
    fontWeight: "700",
    marginBottom: -2,
  },
  genderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  genderItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  presetWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#E9EEF4",
    borderWidth: 1,
    borderColor: "#D5DEE8",
  },
  presetChipActive: {
    backgroundColor: "#DFF2FB",
    borderColor: "#8ED4EA",
  },
  presetChipText: {
    color: "#4E6780",
    fontWeight: "700",
    fontSize: 12,
  },
  presetChipTextActive: {
    color: "#0E1E40",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    borderColor: "#BFD7E6",
  },
  saveBtn: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
