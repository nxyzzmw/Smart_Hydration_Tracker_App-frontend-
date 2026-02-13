import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { Button, Switch } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import TabHeader from "../../components/TabHeader";
import { useProfile } from "../../hooks/useProfile";
import { useWater } from "../../hooks/useWater";
import { syncFcmTokenToBackend } from "../../src/events/notification";
import {
  createReminder,
  getReminder,
  updateReminder,
  pauseReminder,
  toggleSleepMode,
} from "../../src/api/reminderApi";

const REMINDER_SETTINGS_KEY = "reminder_settings_v1";

type ReminderSettings = {
  intervalMinutes: string;
  startTime: string;
  endTime: string;
  paused: boolean;
  sleepMode: boolean;
  pushEnabled: boolean;
};

const defaultSettings: ReminderSettings = {
  intervalMinutes: "60",
  startTime: "08:00",
  endTime: "22:00",
  paused: false,
  sleepMode: false,
  pushEnabled: false,
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

function isPaused(pausedUntil?: string | Date | null) {
  if (!pausedUntil) return false;
  return new Date(pausedUntil).getTime() > Date.now();
}

export default function Settings() {
  const router = useRouter();
  const { profile } = useProfile();
  const { logs } = useWater();

  const [settings, setSettings] = useState<ReminderSettings>(defaultSettings);
  const [savedSettings, setSavedSettings] = useState<ReminderSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);


useEffect(() => {
  const initData = async () => {
    try {
      setLoading(true);

      const localRaw = await AsyncStorage.getItem(REMINDER_SETTINGS_KEY);
      let localSettings = defaultSettings;

      if (localRaw) {
        try {
  localSettings = JSON.parse(localRaw);
} catch {
  localSettings = defaultSettings;
}

        setSettings(localSettings);
        setSavedSettings(localSettings);
      }

      let backend = null;

      try {
        backend = await getReminder();
      } catch {}

      // Create default reminder if empty
      if (!backend || !backend.interval) {
        await createReminder();
        backend = await getReminder();
      }

      if (backend) {
        const mapped: ReminderSettings = {
          intervalMinutes: String(backend.interval ?? "60"),
          startTime: backend.startTime ?? "08:00",
          endTime: backend.endTime ?? "22:00",
paused: Boolean(backend.paused),
          sleepMode: !!backend.sleepMode,
          pushEnabled: localSettings.pushEnabled,
        };

        setSettings(mapped);
        setSavedSettings(mapped);

        await AsyncStorage.setItem(
          REMINDER_SETTINGS_KEY,
          JSON.stringify(mapped)
        );
      }
    } catch (error) {
      console.error("Initialization error:", error);
    } finally {
      setLoading(false);
    }
  };

  initData();
}, []);

  

  const lastLogTime = useMemo(() => {
    const sorted = [...(logs || [])].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    return sorted[0]?.timestamp;
  }, [logs]);

  const inactivityMinutes = useMemo(() => {
    if (!lastLogTime) return null;
    const diffMs = Date.now() - new Date(lastLogTime).getTime();
    if (Number.isNaN(diffMs) || diffMs < 0) return null;
    return Math.floor(diffMs / 60000);
  }, [lastLogTime]);

  const activityLevel = profile?.activity || "moderate";

  const saveSettings = async () => {
  try {
    setSaving(true);

    // ✅ STEP 1 — get latest DB state
    const dbReminder = await getReminder();

    const interval = Number(settings.intervalMinutes);

    if (!interval || interval < 1 || interval > 240) {
      Alert.alert("Invalid interval");
      return;
    }

    if (!isValidTime(settings.startTime) || !isValidTime(settings.endTime)) {
      Alert.alert("Invalid time");
      return;
    }

    // ✅ STEP 2 — update main reminder if changed
    if (
      interval !== dbReminder.interval ||
      settings.startTime !== dbReminder.startTime ||
      settings.endTime !== dbReminder.endTime
    ) {
      await updateReminder({
        interval,
        startTime: settings.startTime,
        endTime: settings.endTime,
      });
    }

    // ✅ STEP 3 — pause sync (compare with DB)
    if (Boolean(settings.paused) !== Boolean(dbReminder.paused)) {
      await pauseReminder(Boolean(settings.paused));
    }

    // ✅ STEP 4 — sleep sync
    if (Boolean(settings.sleepMode) !== Boolean(dbReminder.sleepMode)) {
      await toggleSleepMode();
    }

    // ✅ STEP 5 — refresh from DB (very important)
    const refreshed = await getReminder();

    const updated = {
      ...settings,
      paused: Boolean(refreshed.paused),
      sleepMode: Boolean(refreshed.sleepMode),
    };

    setSettings(updated);
    setSavedSettings(updated);

    await AsyncStorage.setItem(
      REMINDER_SETTINGS_KEY,
      JSON.stringify(updated)
    );

    Alert.alert("Saved");
  } catch (error) {
    Alert.alert("Failed to save");
    console.error(error);
  } finally {
    setSaving(false);
  }
};

  const handleTogglePause = (value: boolean) => {
  setSettings((prev) => ({ ...prev, paused: value }));
};




  const handleToggleSleep = (value: boolean) => {
  setSettings((prev) => ({ ...prev, sleepMode: value }));
};

  const handlePushNotificationsToggle = async (value: boolean) => {
    if (!value) {
      setSettings((prev) => ({ ...prev, pushEnabled: false }));
      return;
    }
    const synced = await syncFcmTokenToBackend();
    if (!synced) {
      Alert.alert("Permission Denied", "Enable notifications in your device settings.");
      setSettings((prev) => ({ ...prev, pushEnabled: false }));
      return;
    }
    setSettings((prev) => ({ ...prev, pushEnabled: true }));
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("auth_token");
      router.replace("/auth/login");
    } catch (error) {
      Alert.alert("Error", "Logout failed"+error);
    }
  };

  const hasChanges = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(savedSettings);
  }, [settings, savedSettings]);


  if (loading) {
    return (
      <Screen style={{ justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#14B2CF" />
      </Screen>
    );
  }

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

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Pressable onPress={() => router.push("/profile")} style={styles.accountRow}>
          <View style={styles.accountRowLeft}>
            <Ionicons name="person-outline" size={22} color="#0A9CF0" />
            <Text style={styles.accountRowText}>Profile</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#7A96AD" />
        </Pressable>

        <Pressable onPress={handleLogout} style={styles.accountRowLogout}>
          <View style={styles.accountRowLeft}>
            <Ionicons name="log-out-outline" size={22} color="#FF3333" />
            <Text style={styles.accountRowTextLogout}>Logout</Text>
          </View>
        </Pressable>

        <View style={styles.card}>
          <View style={styles.sectionHeading}>
            <Ionicons name="time-outline" size={22} color="#0A9CF0" />
            <Text style={styles.sectionTitle}>Reminder Interval</Text>
          </View>
          <View style={styles.segmentWrap}>
            {["30", "60", "90", "120"].map((value) => {
              const selected = settings.intervalMinutes === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setSettings((prev) => ({ ...prev, intervalMinutes: value }))}
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
            onChangeText={(v) => setSettings((prev) => ({ ...prev, intervalMinutes: v }))}
            style={styles.input}
            placeholder="90"
            placeholderTextColor="#9BA9BB"
          />

          <View style={styles.row}>
            <View style={styles.halfInputWrap}>
              <Text style={styles.inputLabel}>Start time</Text>
              <RNTextInput
                value={settings.startTime}
                onChangeText={(v) => setSettings((prev) => ({ ...prev, startTime: v }))}
                style={[styles.input, styles.halfInput]}
                placeholder="08:00"
              />
            </View>
            <View style={styles.halfInputWrap}>
              <Text style={styles.inputLabel}>End time</Text>
              <RNTextInput
                value={settings.endTime}
                onChangeText={(v) => setSettings((prev) => ({ ...prev, endTime: v }))}
                style={[styles.input, styles.halfInput]}
                placeholder="22:00"
              />
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeading}>
            <Ionicons name="options-outline" size={20} color="#0A9CF0" />
            <Text style={styles.sectionTitle}>Reminder Behavior</Text>
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Pause reminders</Text>
            <Switch value={settings.paused} color="#14B2CF" onValueChange={handleTogglePause} />
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Sleep mode</Text>
        <Switch
  value={settings.sleepMode}
  onValueChange={(value) => handleToggleSleep(value)}
/>

          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Push notifications</Text>
            <Switch
              value={settings.pushEnabled}
              color="#14B2CF"
              onValueChange={handlePushNotificationsToggle}
            />
          </View>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.sectionHeading}>
            <Ionicons name="sparkles-outline" size={20} color="#0A9CF0" />
            <Text style={styles.sectionTitle}>Smart Status</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Last drink</Text>
            <Text style={styles.statusValue}>{formatTimeSinceDrink(inactivityMinutes)}</Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Activity</Text>
            <Text style={styles.statusValueAccent}>{activityLevel}</Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 8, gap: 16, paddingBottom: 28 },
  pageHeaderWrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, backgroundColor: "#EAF2F8" },
  pageHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  headerSaveBtn: { borderRadius: 14 },
  headerSaveBtnContent: { minHeight: 40, paddingHorizontal: 4 },
  headerSaveBtnLabel: { fontWeight: "800", fontSize: 13 },
  card: { backgroundColor: "#F5F7F9", borderRadius: 28, borderWidth: 1, borderColor: "#E2EAF1", padding: 18, gap: 14 },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionTitle: { fontSize: 20, fontWeight: "900", color: "#0E1E40" },
  accountRow: { minHeight: 76, borderRadius: 22, borderWidth: 1, borderColor: "#E2EAF1", backgroundColor: "#F5F7F9", paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  accountRowLogout: { minHeight: 76, borderRadius: 22, borderWidth: 1, borderColor: "#E2EAF1", backgroundColor: "#F5F7F9", paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: -8 },
  accountRowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  accountRowText: { color: "#0E1E40", fontWeight: "500", fontSize: 17 },
  accountRowTextLogout: { color: "#FF3333", fontWeight: "500", fontSize: 17 },
  segmentWrap: { backgroundColor: "#E9EEF4", borderRadius: 16, padding: 4, flexDirection: "row", gap: 4 },
  segmentBtn: { flex: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", minHeight: 52 },
  segmentBtnActive: { backgroundColor: "#DFF2FB", borderWidth: 1, borderColor: "#D5DEE8" },
  segmentText: { color: "#59708A", fontSize: 16, fontWeight: "600" },
  segmentTextActive: { color: "#0E1E40", fontWeight: "700" },
  inputLabel: { fontSize: 15, color: "#58708B", fontWeight: "500", marginBottom: -4 },
  input: { backgroundColor: "#F8FBFE", borderWidth: 1, borderColor: "#D5DEE8", borderRadius: 14, color: "#0E1E40", fontSize: 17, minHeight: 64, paddingHorizontal: 18 },
  row: { flexDirection: "row", gap: 10 },
  halfInputWrap: { flex: 1, gap: 8 },
  halfInput: { minHeight: 76 },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 2 },
  toggleLabel: { color: "#0E1E40", fontWeight: "500", fontSize: 19, flex: 1 },
  statusCard: { backgroundColor: "#EAF4FA", borderRadius: 28, borderWidth: 1, borderColor: "#D5E6F1", padding: 18, gap: 14 },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statusLabel: { color: "#3F556D", fontSize: 19, fontWeight: "500" },
  statusValue: { color: "#0E1E40", fontSize: 19, fontWeight: "800" },
  statusValueAccent: { color: "#0A9CF0", fontSize: 19, fontWeight: "800" },
});
