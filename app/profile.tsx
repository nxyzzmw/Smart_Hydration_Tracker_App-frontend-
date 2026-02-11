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
  Switch,
  SegmentedButtons,
} from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../components/Screen";
import { useProfile } from "../hooks/useProfile";

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

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("auth_token");
      router.replace("/auth/login");
    } catch (error) {
      console.log("Logout error:", error);
      Alert.alert("Error", "Logout failed");
    }
  };

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

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={26} color="#455A77" />
          </Pressable>

          <Text style={styles.topTitle}>Profile</Text>

          <Pressable onPress={logout} style={styles.iconBtn}>
            <Ionicons name="log-out-outline" size={25} color="#F04444" />
          </Pressable>
        </View>

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

              <InfoRow label="Activity" value={displayText(form.activity)} />
              <InfoRow label="Climate" value={displayText(form.climate)} />
              <InfoRow label="Pregnancy" value={displayText(form.pregnancy)} />
              <InfoRow label="Unit" value={displayText(form.unit)} noBorder />
            </View>

            <Button
              mode="contained"
              icon="pencil"
              onPress={() => setIsEditing(true)}
              buttonColor="#14B2CF"
              style={styles.editBtn}
              contentStyle={styles.editBtnContent}
            >
              Edit Profile
            </Button>
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
                  <RadioButton value="other" color="#14B2CF" />
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
              buttons={[
                { value: "low", label: "Low" },
                { value: "moderate", label: "Moderate" },
                { value: "high", label: "High" },
              ]}
            />

            <Text style={styles.label}>Climate</Text>
            <SegmentedButtons
              value={form.climate}
              onValueChange={(v) => setForm({ ...form, climate: v })}
              buttons={[
                { value: "cold", label: "Cold" },
                { value: "moderate", label: "Moderate" },
                { value: "hot", label: "Hot" },
              ]}
            />

            <View style={styles.switchRow}>
              <Text>Pregnancy / BreastFeeding</Text>
              <Switch
                value={form.pregnancy}
                onValueChange={(v) => setForm({ ...form, pregnancy: v })}
                color="#14B2CF"
              />
            </View>

            <Text style={styles.label}>Unit</Text>
            <SegmentedButtons
              value={form.unit}
              onValueChange={(v) => setForm({ ...form, unit: v })}
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
    padding: 16,
    gap: 14,
    paddingBottom: 26,
    backgroundColor: "#ECEFF3",
  },
  topBar: {
    minHeight: 72,
    borderRadius: 22,
    backgroundColor: "#F6F8FB",
    borderWidth: 1,
    borderColor: "#DDE5EC",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#0E1E40",
  },
  iconBtn: {
    width: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  identityCard: {
    backgroundColor: "#CFE4F2",
    borderRadius: 28,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  avatarBox: {
    width: 84,
    height: 84,
    borderRadius: 22,
    backgroundColor: "#22B9D6",
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
    backgroundColor: "#F7F9FB",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#DDE5EC",
    padding: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0E1E40",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#DEE6ED",
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
  editBtn: {
    borderRadius: 18,
    shadowColor: "#14B2CF",
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  editBtnContent: {
    minHeight: 64,
  },
  editCard: {
    backgroundColor: "#F7F9FB",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#DDE5EC",
    padding: 14,
    gap: 10,
  },
  input: {
    backgroundColor: "#EFF4F8",
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
