import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
} from "react-native";
import { Button, Switch } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import TabSwipeScreen from "../../components/TabSwipeScreen";
import TabHeader from "../../components/TabHeader";
import LoadingAnimation from "../../components/LoadingAnimation";
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
import { clearAuthTokens } from "../../src/api/axiosClient";

const REMINDER_SETTINGS_KEY = "reminder_settings_v1";

type ReminderSettings = {
  intervalMinutes: string;
  startTime: string;
  endTime: string;
  paused: boolean;
  sleepMode: boolean;
  pushEnabled: boolean;
  pauseStartTime: string;
  pauseEndTime: string;
  customReminderEnabled: boolean;
  notificationMessage: string;
};

const defaultSettings: ReminderSettings = {
  intervalMinutes: "60",
  startTime: "01:00",
  endTime: "22:00",
  paused: false,
  sleepMode: false,
  pushEnabled: false,
  pauseStartTime: "",
  pauseEndTime: "",
  customReminderEnabled: false,
  notificationMessage: "Time to drink water",
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

function parseTimeToDate(value: string, baseDate: Date) {
  const trimmed = value.trim();
  const match = /^(\d{2}):([0-5]\d)$/.exec(trimmed);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours > 23) return null;

  const date = new Date(baseDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function parseTimeToMinutes(value: string) {
  const trimmed = value.trim();
  const match = /^(\d{2}):([0-5]\d)$/.exec(trimmed);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours > 23) return null;

  return hours * 60 + minutes;
}

function resolvePauseEndDate(
  pauseStartTime?: string,
  pauseEndTime?: string,
  now: Date = new Date()
) {
  if (!pauseEndTime) return null;

  const parsedEndAbsolute = new Date(pauseEndTime);
  if (!Number.isNaN(parsedEndAbsolute.getTime())) {
    return parsedEndAbsolute;
  }

  const endMinutes = parseTimeToMinutes(pauseEndTime);
  if (endMinutes === null) return null;

  const endDate = new Date(now);
  endDate.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);

  const startMinutes = pauseStartTime ? parseTimeToMinutes(pauseStartTime) : null;
  if (startMinutes !== null && endMinutes <= startMinutes) {
    endDate.setDate(endDate.getDate() + 1);
    return endDate;
  }

  // If only HH:mm end exists and it's already passed for today, treat as next day.
  if (startMinutes === null && endDate.getTime() <= now.getTime()) {
    endDate.setDate(endDate.getDate() + 1);
  }

  return endDate;
}

function formatPauseEnd(pauseStartTime?: string, pauseEndTime?: string) {
  const date = resolvePauseEndDate(pauseStartTime, pauseEndTime);
  if (!date) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function pickPauseStartTime(reminder: any) {
  return (
    reminder?.pauseStartTime ||
    reminder?.pause_start_time ||
    reminder?.pauseStart ||
    ""
  );
}

function pickPauseEndTime(reminder: any) {
  return (
    reminder?.pauseEndTime ||
    reminder?.pause_end_time ||
    reminder?.pauseEnd ||
    ""
  );
}

export default function Settings() {
  const router = useRouter();
  const { profile } = useProfile();
  const { logs } = useWater();
  const [settings, setSettings] = useState<ReminderSettings>(defaultSettings);
  const [savedSettings, setSavedSettings] = useState<ReminderSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pauseModalVisible, setPauseModalVisible] = useState(false);
  const [pauseStartValue, setPauseStartValue] = useState("00:00");
  const [pauseEndValue, setPauseEndValue] = useState("00:00");
  const [isCustomReminderEditing, setIsCustomReminderEditing] = useState(false);

  const syncPauseStatusIfExpired = async (nextSettings: ReminderSettings, backendPaused: boolean) => {
    if (!backendPaused) return nextSettings;

    const pauseEndDate = resolvePauseEndDate(
      nextSettings.pauseStartTime,
      nextSettings.pauseEndTime
    );
    if (!pauseEndDate) {
      return nextSettings;
    }

    if (isPaused(pauseEndDate)) {
      return nextSettings;
    }

    try {
      await pauseReminder(false);
      return {
        ...nextSettings,
        paused: false,
        pauseStartTime: "",
        pauseEndTime: "",
      };
    } catch {
      return nextSettings;
    }
  };

  const refreshSettingsFromBackend = useCallback(async (showLoading: boolean) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const localRaw = await AsyncStorage.getItem(REMINDER_SETTINGS_KEY);
      let localSettings = defaultSettings;

      if (localRaw) {
        try {
          localSettings = { ...defaultSettings, ...JSON.parse(localRaw) };
        } catch {
          localSettings = defaultSettings;
        }
      }

      let backend = null;
      let reminderStatus: number | null = null;

      try {
        backend = await getReminder();
      } catch (error: any) {
        reminderStatus = Number(error?.response?.status || 0) || null;
      }

      // Create default reminder only when backend says it does not exist.
      if ((!backend || !backend.interval) && reminderStatus === 404) {
        try {
          await createReminder();
          backend = await getReminder();
        } catch (createError) {
          console.error("Reminder create/fetch failed:", createError);
        }
      }

      // Always prefer backend values when available, fallback to defaults.
      const mappedFromBackend: ReminderSettings = {
        intervalMinutes: String(backend?.interval ?? defaultSettings.intervalMinutes),
        startTime: backend?.startTime ?? defaultSettings.startTime,
        endTime: backend?.endTime ?? defaultSettings.endTime,
        paused:
          Boolean(backend?.paused) ||
          Boolean(pickPauseStartTime(backend) && pickPauseEndTime(backend)),
        sleepMode: Boolean(backend?.sleepMode ?? defaultSettings.sleepMode),
        // Push toggle is app-side permission state; keep local persisted value.
        pushEnabled: Boolean(localSettings.pushEnabled),
        pauseStartTime: pickPauseStartTime(backend) || defaultSettings.pauseStartTime,
        pauseEndTime: pickPauseEndTime(backend) || defaultSettings.pauseEndTime,
        customReminderEnabled: Boolean(backend?.notificationMessage),
        notificationMessage:
          backend?.notificationMessage ||
          defaultSettings.notificationMessage,
      };

      const normalized = await syncPauseStatusIfExpired(
        mappedFromBackend,
        Boolean(backend?.paused)
      );

      setSettings(normalized);
      setSavedSettings(normalized);
      setIsCustomReminderEditing(false);

      await AsyncStorage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(normalized));
    } catch (error) {
      console.error("Initialization error:", error);
      // If backend refresh fails completely, keep a safe local/default fallback.
      try {
        const localRaw = await AsyncStorage.getItem(REMINDER_SETTINGS_KEY);
        if (localRaw) {
          const localSettings = { ...defaultSettings, ...JSON.parse(localRaw) };
          setSettings(localSettings);
          setSavedSettings(localSettings);
        } else {
          setSettings(defaultSettings);
          setSavedSettings(defaultSettings);
        }
      } catch {
        setSettings(defaultSettings);
        setSavedSettings(defaultSettings);
      }
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    refreshSettingsFromBackend(true);
  }, [refreshSettingsFromBackend]);

  useFocusEffect(
    useCallback(() => {
      refreshSettingsFromBackend(false);
    }, [refreshSettingsFromBackend])
  );

  useEffect(() => {
    if (!settings.paused || !settings.pauseEndTime) return;

    const pauseEndDate = resolvePauseEndDate(
      settings.pauseStartTime,
      settings.pauseEndTime
    );
    if (!pauseEndDate) return;
    const endTimeMs = pauseEndDate.getTime();

    const timeLeft = endTimeMs - Date.now();
    if (timeLeft <= 0) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        await pauseReminder(false);
        setSettings((prev) => ({
          ...prev,
          paused: false,
          pauseStartTime: "",
          pauseEndTime: "",
        }));
        setSavedSettings((prev) => ({
          ...prev,
          paused: false,
          pauseStartTime: "",
          pauseEndTime: "",
        }));
        await AsyncStorage.setItem(
          REMINDER_SETTINGS_KEY,
          JSON.stringify({
            ...settings,
            paused: false,
            pauseStartTime: "",
            pauseEndTime: "",
          })
        );
      } catch (error) {
        console.error("Failed to auto resume reminders:", error);
      }
    }, timeLeft);

    return () => clearTimeout(timer);
  }, [settings]);

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

      const reminderMessageToSend = settings.customReminderEnabled
        ? (settings.notificationMessage || "").trim() || defaultSettings.notificationMessage
        : defaultSettings.notificationMessage;

      if (
        interval !== dbReminder.interval ||
        settings.startTime !== dbReminder.startTime ||
        settings.endTime !== dbReminder.endTime ||
        reminderMessageToSend !== (dbReminder?.notificationMessage || defaultSettings.notificationMessage)
      ) {
        await updateReminder({
          interval,
          startTime: settings.startTime,
          endTime: settings.endTime,
          notificationMessage: reminderMessageToSend,
        });
      }

      const dbPauseStartTime = dbReminder?.pauseStartTime || "";
      const dbPauseEndTime = dbReminder?.pauseEndTime || "";
      const pauseStartToSend = settings.pauseStartTime || dbPauseStartTime || "";
      const pauseEndToSend = settings.pauseEndTime || dbPauseEndTime || "";

      if (settings.paused && (!pauseStartToSend || !pauseEndToSend)) {
        Alert.alert("Invalid pause time", "Select pause start and end time before saving.");
        return;
      }

      const shouldSyncPause =
        Boolean(settings.paused) !== Boolean(dbReminder.paused) ||
        (Boolean(settings.paused) &&
          (pauseStartToSend !== dbPauseStartTime ||
            pauseEndToSend !== dbPauseEndTime));

      if (shouldSyncPause) {
        await pauseReminder(
          Boolean(settings.paused),
          pauseStartToSend || undefined,
          pauseEndToSend || undefined
        );
      }

      if (Boolean(settings.sleepMode) !== Boolean(dbReminder.sleepMode)) {
        await toggleSleepMode();
      }

      const refreshed = await getReminder();

      const updated: ReminderSettings = {
        ...settings,
        paused: settings.paused,
        sleepMode: Boolean(refreshed.sleepMode),
        notificationMessage:
          refreshed?.notificationMessage ||
          reminderMessageToSend,
      };

      setSettings(updated);
      setSavedSettings(updated);
      setIsCustomReminderEditing(false);

      await AsyncStorage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(updated));

      Alert.alert("Saved");
    } catch (error) {
      Alert.alert("Failed to save");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePause = async (value: boolean) => {
    if (value && !settings.pushEnabled) {
      Alert.alert("Enable push notifications first");
      setSettings((prev) => ({ ...prev, paused: false }));
      return;
    }

    if (!value) {
      setSettings((prev) => ({
        ...prev,
        paused: false,
        pauseStartTime: "",
        pauseEndTime: "",
      }));
      return;
    }

    setPauseStartValue("00:00");
    setPauseEndValue("00:00");
    setPauseModalVisible(true);
  };

  const handlePauseModalCancel = () => {
    setPauseModalVisible(false);
    setPauseStartValue("00:00");
    setPauseEndValue("00:00");
    setSettings((prev) => ({ ...prev, paused: false }));
  };

  const handlePauseModalConfirm = async () => {
    const now = new Date();
    const startMinutes = parseTimeToMinutes(pauseStartValue);
    const endMinutes = parseTimeToMinutes(pauseEndValue);

    if (startMinutes === null || endMinutes === null) {
      Alert.alert("Invalid time", "Enter start and end as HH:MM.");
      return;
    }

    // Quick duration mode:
    // Start = duration, End = 00:00  (e.g. 00:03 -> pause for 3 mins from now)
    if (endMinutes === 0 && startMinutes > 0) {
      const pauseEnd = new Date(now.getTime() + startMinutes * 60000);
      const nextSettings = {
        ...settings,
        paused: true,
        pauseStartTime: now.toISOString(),
        pauseEndTime: pauseEnd.toISOString(),
      };

      setSettings(nextSettings);
      setPauseModalVisible(false);
      setPauseStartValue("00:00");
      setPauseEndValue("00:00");
      return;
    }

    const parsedStart = parseTimeToDate(pauseStartValue, now);
    const parsedEnd = parseTimeToDate(pauseEndValue, now);

    if (!parsedStart || !parsedEnd) {
      Alert.alert("Invalid time", "Enter start and end as HH:MM.");
      return;
    }

    const pauseStart = parsedStart;
    const pauseEnd = new Date(parsedEnd);
    if (pauseEnd.getTime() <= pauseStart.getTime()) {
      pauseEnd.setDate(pauseEnd.getDate() + 1);
    }

    if (pauseEnd.getTime() <= now.getTime()) {
      Alert.alert("Invalid end time", "Pause end time must be in the future.");
      return;
    }

    const nextSettings = {
      ...settings,
      paused: true,
      pauseStartTime: pauseStart.toISOString(),
      pauseEndTime: pauseEnd.toISOString(),
    };

    setSettings(nextSettings);
    setPauseModalVisible(false);
    setPauseStartValue("00:00");
    setPauseEndValue("00:00");
  };

  const handleToggleSleep = (value: boolean) => {
    if (value && !settings.pushEnabled) {
      Alert.alert("Enable push notifications first");
      setSettings((prev) => ({ ...prev, sleepMode: false }));
      return;
    }
    setSettings((prev) => ({ ...prev, sleepMode: value }));
  };

  const handlePushNotificationsToggle = async (value: boolean) => {
    if (!value) {
      setSettings((prev) => ({
        ...prev,
        pushEnabled: false,
        sleepMode: false,
        paused: false,
        pauseStartTime: "",
        pauseEndTime: "",
      }));
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

  const reminderTitle = `Hydration Reminder for ${profile?.name || "you"}`;

  const handleLogout = async () => {
    try {
      await clearAuthTokens();
      router.replace("/auth/login");
    } catch (error) {
      Alert.alert("Error", "Logout failed" + error);
    }
  };

  const hasChanges = useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(savedSettings);
  }, [settings, savedSettings]);

  if (loading) {
    return (
      <TabSwipeScreen>
        <View style={styles.loadingWrap}>
          <LoadingAnimation size={96} />
        </View>
      </TabSwipeScreen>
    );
  }

  return (
    <TabSwipeScreen>
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
                  <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>{value}m</Text>
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
                placeholder="01:00"
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
            <Text style={styles.toggleLabel}>Reminder</Text>
            <Switch
              value={settings.pushEnabled}
              color="#14B2CF"
              onValueChange={handlePushNotificationsToggle}
            />
          </View>

          {!settings.pushEnabled ? (
            <Text style={styles.pauseInfoText}>Enable reminder to use Pause and Sleep.</Text>
          ) : null}

          {settings.pushEnabled ? (
            <>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Custom reminder</Text>
                <Switch
                  value={settings.customReminderEnabled}
                  color="#14B2CF"
                  onValueChange={(value) =>
                    {
                      setSettings((prev) => ({
                        ...prev,
                        customReminderEnabled: value,
                      }));
                      setIsCustomReminderEditing(value);
                    }
                  }
                />
              </View>

              {settings.customReminderEnabled ? (
                <View style={styles.customReminderWrap}>
                  <Text style={styles.inputLabel}>Reminder title</Text>
                  <View style={styles.customReminderTitleBox}>
                    <Text style={styles.customReminderTitleText}>{reminderTitle}</Text>
                  </View>

                  {isCustomReminderEditing ? (
                    <>
                      <Text style={styles.inputLabel}>Notification message</Text>
                      <RNTextInput
                        value={settings.notificationMessage}
                        onChangeText={(v) =>
                          setSettings((prev) => ({ ...prev, notificationMessage: v }))
                        }
                        style={styles.input}
                        placeholder={defaultSettings.notificationMessage}
                        placeholderTextColor="#9BA9BB"
                      />
                    </>
                  ) : (
                    <View style={styles.customReminderPreviewRow}>
                      <Text style={styles.customReminderPreviewText}>
                        {settings.notificationMessage || defaultSettings.notificationMessage}
                      </Text>
                      <Pressable
                        onPress={() => setIsCustomReminderEditing(true)}
                        style={styles.customReminderEditBtn}
                      >
                        <Text style={styles.customReminderEditBtnText}>Edit</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              ) : null}
            </>
          ) : null}

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Pause reminders</Text>
            <Switch
              value={settings.paused}
              color="#14B2CF"
              onValueChange={handleTogglePause}
              disabled={!settings.pushEnabled}
            />
          </View>

          {settings.paused && settings.pauseEndTime ? (
            <Text style={styles.pauseInfoText}>
              Paused until {formatPauseEnd(settings.pauseStartTime, settings.pauseEndTime)}
            </Text>
          ) : null}

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Sleep mode</Text>
            <Switch
              value={settings.sleepMode}
              onValueChange={(value) => handleToggleSleep(value)}
              disabled={!settings.pushEnabled}
            />
          </View>
        </View>

      </ScrollView>

      <Modal
        visible={pauseModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handlePauseModalCancel}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Pause reminders</Text>
            <Text style={styles.modalSubtitle}>Enter pause start and end (HH:MM)</Text>
            <RNTextInput
              value={pauseStartValue}
              onChangeText={setPauseStartValue}
              placeholder="Start time (00:00)"
              placeholderTextColor="#9BA9BB"
              style={styles.modalInput}
              maxLength={5}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <RNTextInput
              value={pauseEndValue}
              onChangeText={setPauseEndValue}
              placeholder="End time (00:00)"
              placeholderTextColor="#9BA9BB"
              style={styles.modalInput}
              maxLength={5}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalActions}>
              <Button mode="text" onPress={handlePauseModalCancel}>
                Cancel
              </Button>
              <Button mode="contained" buttonColor="#14B2CF" onPress={handlePauseModalConfirm}>
                Confirm
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </TabSwipeScreen>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 8, gap: 16, paddingBottom: 28 },
  loadingWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  pageHeaderWrap: { paddingHorizontal: 16, paddingTop: 15, paddingBottom: 4, backgroundColor: "#EAF2F8" },
  pageHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  headerSaveBtn: { borderRadius: 14 },
  headerSaveBtnContent: { minHeight: 40, paddingHorizontal: 4 },
  headerSaveBtnLabel: { fontWeight: "800", fontSize: 13 },
  card: {
    shadowColor: "#0E1E40",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    backgroundColor: "#F5F7F9",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#E2EAF1",
    padding: 18,
    gap: 14,
  },
  sectionHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionTitle: { fontSize: 20, fontWeight: "900", color: "#0E1E40" },
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
    marginTop: -8,
  },
  accountRowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  accountRowText: { color: "#0E1E40", fontWeight: "500", fontSize: 17 },
  accountRowTextLogout: { color: "#FF3333", fontWeight: "500", fontSize: 17 },
  segmentWrap: { backgroundColor: "#E9EEF4", borderRadius: 16, padding: 4, flexDirection: "row", gap: 4 },
  segmentBtn: { flex: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", minHeight: 52 },
  segmentBtnActive: { backgroundColor: "#DFF2FB", borderWidth: 1, borderColor: "#D5DEE8" },
  segmentText: { color: "#59708A", fontSize: 16, fontWeight: "600" },
  segmentTextActive: { color: "#0E1E40", fontWeight: "700" },
  inputLabel: { fontSize: 15, color: "#58708B", fontWeight: "500", marginBottom: -4 },
  input: {
    backgroundColor: "#F8FBFE",
    borderWidth: 1,
    borderColor: "#D5DEE8",
    borderRadius: 14,
    color: "#0E1E40",
    fontSize: 17,
    minHeight: 64,
    paddingHorizontal: 18,
  },
  row: { flexDirection: "row", gap: 10 },
  halfInputWrap: { flex: 1, gap: 8 },
  halfInput: { minHeight: 76 },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 2 },
  toggleLabel: { color: "#0E1E40", fontWeight: "500", fontSize: 19, flex: 1 },
  customReminderWrap: { gap: 8 },
  customReminderTitleBox: {
    backgroundColor: "#F8FBFE",
    borderWidth: 1,
    borderColor: "#D5DEE8",
    borderRadius: 14,
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  customReminderTitleText: { color: "#0E1E40", fontSize: 15, fontWeight: "700" },
  customReminderPreviewRow: {
    marginTop: 2,
    backgroundColor: "#F8FBFE",
    borderWidth: 1,
    borderColor: "#D5DEE8",
    borderRadius: 14,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  customReminderPreviewText: { color: "#0E1E40", fontSize: 14, fontWeight: "600", flex: 1 },
  customReminderEditBtn: {
    borderWidth: 1,
    borderColor: "#BFD0DF",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#EEF6FB",
  },
  customReminderEditBtnText: { color: "#0A9CF0", fontSize: 12, fontWeight: "700" },
  pauseInfoText: { color: "#58708B", fontSize: 14, fontWeight: "600", marginTop: -6 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(14, 30, 64, 0.45)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#D5DEE8",
    gap: 12,
  },
  modalTitle: { color: "#0E1E40", fontSize: 20, fontWeight: "800" },
  modalSubtitle: { color: "#58708B", fontSize: 14, fontWeight: "500" },
  modalInput: {
    backgroundColor: "#F8FBFE",
    borderWidth: 1,
    borderColor: "#D5DEE8",
    borderRadius: 14,
    color: "#0E1E40",
    fontSize: 18,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  statusCard: { backgroundColor: "#EAF4FA", borderRadius: 28, borderWidth: 1, borderColor: "#D5E6F1", padding: 18, gap: 14 },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statusLabel: { color: "#3F556D", fontSize: 19, fontWeight: "500" },
  statusValue: { color: "#0E1E40", fontSize: 19, fontWeight: "800" },
  statusValueAccent: { color: "#0A9CF0", fontSize: 19, fontWeight: "800" },
});
