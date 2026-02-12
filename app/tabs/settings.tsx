import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
} from "react-native";
import { Button, Switch } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import TabHeader from "../../components/TabHeader";
import { useProfile } from "../../hooks/useProfile";
import { useWater } from "../../hooks/useWater";

const REMINDER_SETTINGS_KEY = "reminder_settings_v1";

type ReminderSettings = {
  intervalMinutes: string;
  startTime: string;
  endTime: string;
  paused: boolean;
  sleepMode: boolean;
  pushEnabled: boolean;
  missedIntakeAlerts: boolean;
  inactivityAlerts: boolean;
};

const defaultSettings: ReminderSettings = {
  intervalMinutes: "60",
  startTime: "08:00",
  endTime: "22:00",
  paused: false,
  sleepMode: false,
  pushEnabled: true,
  missedIntakeAlerts: true,
  inactivityAlerts: true,
};

function isValidTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value);
}

function formatTimeSinceDrink(minutes: number | null) {
  if (minutes === null) return "No logs yet";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hr ago`;
}

export default function Settings() {
  const router = useRouter();
  const { profile } = useProfile();
  const { logs, total } = useWater();

  const [settings, setSettings] =
    useState<ReminderSettings>(defaultSettings);
  const [savedSettings, setSavedSettings] =
    useState<ReminderSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const raw = await AsyncStorage.getItem(
          REMINDER_SETTINGS_KEY
        );
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const merged = { ...defaultSettings, ...parsed };
        setSettings(merged);
        setSavedSettings(merged);
      } catch (error) {
        console.log("Settings load error:", error);
      }
    };

    loadSettings();
  }, []);

  const lastLogTime = useMemo(() => {
    const sorted = [...logs].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() -
        new Date(a.timestamp).getTime()
    );
    return sorted[0]?.timestamp;
  }, [logs]);

  const inactivityMinutes = useMemo(() => {
    if (!lastLogTime) return null;
    const diffMs = Date.now() - new Date(lastLogTime).getTime();
    if (Number.isNaN(diffMs) || diffMs < 0) return null;
    return Math.floor(diffMs / 60000);
  }, [lastLogTime]);

  const smartReminderSummary = useMemo(() => {
    const goal = Number(profile?.dailyGoal ?? 0);
    const missedIntake =
      goal > 0 && total < Math.round(goal * 0.5);
    const inactiveTooLong =
      inactivityMinutes !== null &&
      inactivityMinutes >= Number(settings.intervalMinutes || 60);
    const activityLevel = profile?.activity || "moderate";

    return {
      missedIntake,
      inactiveTooLong,
      activityLevel,
    };
  }, [profile?.activity, profile?.dailyGoal, settings.intervalMinutes, total, inactivityMinutes]);

  const saveSettings = async () => {
    const interval = Number(settings.intervalMinutes);
    if (!interval || interval < 15 || interval > 240) {
      Alert.alert(
        "Invalid interval",
        "Reminder interval must be between 15 and 240 minutes."
      );
      return;
    }
    if (
      !isValidTime(settings.startTime) ||
      !isValidTime(settings.endTime)
    ) {
      Alert.alert(
        "Invalid time",
        "Use HH:MM format for start and end time (e.g., 08:00)."
      );
      return;
    }

    try {
      setSaving(true);
      await AsyncStorage.setItem(
        REMINDER_SETTINGS_KEY,
        JSON.stringify(settings)
      );
      setSavedSettings(settings);
      Alert.alert("Saved", "Reminder settings updated.");
    } catch (error) {
      console.log("Settings save error:", error);
      Alert.alert("Error", "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("auth_token");
      router.replace("/auth/login");
    } catch (error) {
      console.log("Logout error:", error);
      Alert.alert("Error", "Logout failed");
    }
  };

  const hasChanges = useMemo(
    () =>
      JSON.stringify(settings) !==
      JSON.stringify(savedSettings),
    [savedSettings, settings]
  );

  return (
    <Screen>
      <View style={styles.pageHeaderWrap}>
        <TabHeader
          title="Settings"
          onProfilePress={() => router.push("/profile")}
          style={styles.pageHeader}
          action={
            hasChanges ? (
              <Button
                mode="contained"
                onPress={saveSettings}
                loading={saving}
                disabled={saving}
                buttonColor="#14B2CF"
                style={styles.headerSaveBtn}
                contentStyle={styles.headerSaveBtnContent}
                labelStyle={styles.headerSaveBtnLabel}
              >
                Save
              </Button>
            ) : null
          }
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => router.push("/profile")}
          style={styles.accountRow}
        >
          <View style={styles.accountRowLeft}>
            <Ionicons
              name="person-outline"
              size={22}
              color="#0A9CF0"
            />
            <Text style={styles.accountRowText}>Profile</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#7A96AD" />
        </Pressable>

        <Pressable onPress={handleLogout} style={styles.accountRowLogout}>
          <View style={styles.accountRowLeft}>
            <Ionicons
              name="log-out-outline"
              size={22}
              color="#FF3333"
            />
            <Text style={styles.accountRowTextLogout}>Logout</Text>
          </View>
        </Pressable>

        <View style={styles.card}>
          <View style={styles.sectionHeading}>
            <Ionicons
              name="time-outline"
              size={22}
              color="#0A9CF0"
            />
            <Text style={styles.sectionTitle}>Reminder Interval</Text>
          </View>
          <View style={styles.segmentWrap}>
            {["30", "60", "90", "120"].map((value) => {
              const selected = settings.intervalMinutes === value;
              return (
                <Pressable
                  key={value}
                  onPress={() =>
                    setSettings((prev) => ({
                      ...prev,
                      intervalMinutes: value,
                    }))
                  }
                  style={[styles.segmentBtn, selected && styles.segmentBtnActive]}
                >
                  <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>
                    {value}m
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.inputLabel}>Custom interval (minutes)</Text>
          <RNTextInput
            keyboardType="numeric"
            value={settings.intervalMinutes}
            onChangeText={(value) =>
              setSettings((prev) => ({
                ...prev,
                intervalMinutes: value,
              }))
            }
            style={styles.input}
            placeholder="90"
            placeholderTextColor="#9BA9BB"
          />

          <View style={styles.row}>
            <View style={styles.halfInputWrap}>
              <Text style={styles.inputLabel}>Start time (HH:MM)</Text>
              <RNTextInput
                value={settings.startTime}
                onChangeText={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    startTime: value,
                  }))
                }
                style={[styles.input, styles.halfInput]}
                placeholder="08:00"
                placeholderTextColor="#9BA9BB"
              />
            </View>
            <View style={styles.halfInputWrap}>
              <Text style={styles.inputLabel}>End time (HH:MM)</Text>
              <RNTextInput
                value={settings.endTime}
                onChangeText={(value) =>
                  setSettings((prev) => ({
                    ...prev,
                    endTime: value,
                  }))
                }
                style={[styles.input, styles.halfInput]}
                placeholder="22:00"
                placeholderTextColor="#9BA9BB"
              />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeading}>
            <Ionicons
              name="options-outline"
              size={20}
              color="#0A9CF0"
            />
            <Text style={styles.sectionTitle}>Reminder Behavior</Text>
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Pause reminders</Text>
            <Switch
              value={settings.paused}
              color="#14B2CF"
              onValueChange={(value) =>
                setSettings((prev) => ({ ...prev, paused: value }))
              }
              thumbColor={settings.paused ? "#FFFFFF" : "#FFFFFF"}
            />
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Sleep mode</Text>
            <Switch
              value={settings.sleepMode}
              color="#14B2CF"
              onValueChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  sleepMode: value,
                }))
              }
              thumbColor={settings.sleepMode ? "#FFFFFF" : "#FFFFFF"}
            />
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Push notifications</Text>
            <Switch
              value={settings.pushEnabled}
              color="#14B2CF"
              onValueChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  pushEnabled: value,
                }))
              }
              thumbColor={settings.pushEnabled ? "#FFFFFF" : "#FFFFFF"}
            />
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Missed intake alerts</Text>
            <Switch
              value={settings.missedIntakeAlerts}
              color="#14B2CF"
              onValueChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  missedIntakeAlerts: value,
                }))
              }
              thumbColor={settings.missedIntakeAlerts ? "#FFFFFF" : "#FFFFFF"}
            />
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Inactivity alerts</Text>
            <Switch
              value={settings.inactivityAlerts}
              color="#14B2CF"
              onValueChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  inactivityAlerts: value,
                }))
              }
              thumbColor={settings.inactivityAlerts ? "#FFFFFF" : "#FFFFFF"}
            />
          </View>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.sectionHeading}>
            <Ionicons
              name="sparkles-outline"
              size={20}
              color="#0A9CF0"
            />
            <Text style={styles.sectionTitle}>Smart Reminder Status</Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Missed intake</Text>
            <Text style={styles.statusValue}>
              {smartReminderSummary.missedIntake ? "Yes" : "No"}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Time since last drink</Text>
            <Text style={styles.statusValue}>
              {formatTimeSinceDrink(inactivityMinutes)}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Activity level</Text>
            <Text style={styles.statusValueAccent}>{smartReminderSummary.activityLevel}</Text>
          </View>
        </View>

      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 16,
    paddingBottom: 28,
  },
  pageHeaderWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    backgroundColor: "#EAF2F8",
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerSaveBtn: {
    borderRadius: 14,
  },
  headerSaveBtnContent: {
    minHeight: 40,
    paddingHorizontal: 4,
  },
  headerSaveBtnLabel: {
    fontWeight: "800",
    fontSize: 13,
  },
  pageTitle: {
    fontSize: 46 / 2,
    fontWeight: "900",
    color: "#0B1630",
  },
  profileIconBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#F8FBFE",
    borderWidth: 1,
    borderColor: "#D8E2EC",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#F5F7F9",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#E2EAF1",
    padding: 18,
    gap: 14,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 40 / 2,
    fontWeight: "900",
    color: "#0E1E40",
  },
  accountRow: {
    minHeight: 76,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E2EAF1",
    backgroundColor: "#F5F7F9",
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accountRowLogout: {
    minHeight: 76,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E2EAF1",
    backgroundColor: "#F5F7F9",
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accountRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  accountRowText: {
    color: "#0E1E40",
    fontWeight: "500",
    fontSize: 34 / 2,
  },
  accountRowTextLogout: {
    color: "#FF3333",
    fontWeight: "500",
    fontSize: 34 / 2,
  },
  segmentWrap: {
    backgroundColor: "#E9EEF4",
    borderRadius: 16,
    padding: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  segmentBtnActive: {
    backgroundColor: "#DFF2FB",
    borderWidth: 1,
    borderColor: "#D5DEE8",
  },
  segmentText: {
    color: "#59708A",
    fontSize: 33 / 2,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: "#0E1E40",
    fontWeight: "700",
  },
  inputLabel: {
    fontSize: 15,
    color: "#58708B",
    fontWeight: "500",
    marginBottom: -4,
  },
  input: {
    backgroundColor: "#F8FBFE",
    borderWidth: 1,
    borderColor: "#D5DEE8",
    borderRadius: 14,
    color: "#0E1E40",
    fontSize: 34 / 2,
    minHeight: 64,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  halfInputWrap: {
    flex: 1,
    gap: 8,
  },
  halfInput: {
    minHeight: 76,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  toggleLabel: {
    color: "#0E1E40",
    fontWeight: "500",
    fontSize: 38 / 2,
    flex: 1,
    paddingRight: 12,
  },
  statusCard: {
    backgroundColor: "#EAF4FA",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#D5E6F1",
    padding: 18,
    gap: 14,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusLabel: {
    color: "#3F556D",
    fontSize: 19,
    fontWeight: "500",
  },
  statusValue: {
    color: "#0E1E40",
    fontSize: 19,
    fontWeight: "800",
  },
  statusValueAccent: {
    color: "#0A9CF0",
    fontSize: 19,
    fontWeight: "800",
  },
});
