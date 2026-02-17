import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Chip } from "react-native-paper";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import Screen from "../../components/Screen";
import TabHeader from "../../components/TabHeader";
import { useWater } from "../../hooks/useWater";
import { useAnalytics } from "../../hooks/useAnalytics";
import { useProfile } from "../../hooks/useProfile";
import { getExport, ExportFormat } from "../../src/api/analyticsApi";
import { api } from "../../src/api/axiosClient";
import { fromMl, normalizeUnit, roundVolume } from "../../src/utils/units";

const EXPORT_DIRECTORY_URI_KEY = "export_directory_uri_v1";
const WEEK_DAYS = ["S", "M", "T", "W", "T", "F", "S"];

type DateTarget = "start" | "end";

type CalendarCell = {
  date: Date;
  inMonth: boolean;
};

function formatDateTime(iso?: string) {
  if (!iso) return "--";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(iso?: string) {
  if (!iso) return "--";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatApiDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(iso?: string) {
  if (!iso) return "Select date";
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "Select date";
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function buildFileStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function isValidDateInput(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function toMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toDateFromIso(iso?: string) {
  if (!iso) return null;
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function buildCalendarCells(monthStart: Date): CalendarCell[] {
  const first = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  const firstWeekDay = first.getDay();
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - firstWeekDay);

  return Array.from({ length: 42 }).map((_, idx) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + idx);
    return {
      date: d,
      inMonth: d.getMonth() === monthStart.getMonth(),
    };
  });
}

export default function History() {
  const router = useRouter();
  const { profile } = useProfile();
  const { logs, loading: logsLoading } = useWater();
  const { weekly, monthly, streakDays, loading: analyticsLoading } = useAnalytics();

  const [exporting, setExporting] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<DateTarget>("start");
  const [calendarMonth, setCalendarMonth] = useState<Date>(toMonthStart(new Date()));

  const sortedLogs = useMemo(
    () =>
      [...logs].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    [logs]
  );

  const calendarCells = useMemo(
    () => buildCalendarCells(calendarMonth),
    [calendarMonth]
  );

  const unit = normalizeUnit(profile?.unit);
  const dailyGoalMl = Number(profile?.dailyGoal ?? 0);
  const totalIntakeMl = useMemo(
    () => sortedLogs.reduce((sum, log) => sum + log.amountMl, 0),
    [sortedLogs]
  );
  const intakePct =
    dailyGoalMl > 0
      ? Math.max(0, Math.min(100, Math.round((totalIntakeMl / dailyGoalMl) * 100)))
      : 0;

  const weeklyPerformance = useMemo(() => {
    if (weekly.length === 0) return 0;
    const total = weekly.reduce((sum, day) => sum + day.completionPct, 0);
    return Math.round(total / weekly.length);
  }, [weekly]);

  const monthlyComparison = useMemo(() => {
    const monthTotals = new Map<string, number>();
    monthly.forEach((entry) => {
      const d = new Date(entry.date);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      monthTotals.set(key, (monthTotals.get(key) ?? 0) + entry.amountMl);
    });

    const keys = [...monthTotals.keys()].sort();
    const currentKey = keys[keys.length - 1];
    const prevKey = keys[keys.length - 2];
    const currentTotal = currentKey ? monthTotals.get(currentKey) ?? 0 : 0;
    const prevTotal = prevKey ? monthTotals.get(prevKey) ?? 0 : 0;

    return {
      currentTotal,
      prevTotal,
      diff: currentTotal - prevTotal,
      hasPrev: !!prevKey,
    };
  }, [monthly]);

  const ensureExportDirectory = async () => {
    const documentsDir = FileSystem.documentDirectory;
    if (!documentsDir) throw new Error("Local storage is not available on this device.");

    const exportDir = `${documentsDir}exports/`;
    await FileSystem.makeDirectoryAsync(exportDir, { intermediates: true });
    return exportDir;
  };

  const getAndroidExportDirectoryUri = async () => {
    const cached = await AsyncStorage.getItem(EXPORT_DIRECTORY_URI_KEY);
    if (cached) return cached;

    const initialUri = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot("Download");
    const permission =
      await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(initialUri);

    if (!permission.granted || !permission.directoryUri) {
      throw new Error("Storage permission denied.");
    }

    await AsyncStorage.setItem(EXPORT_DIRECTORY_URI_KEY, permission.directoryUri);
    return permission.directoryUri;
  };

  const saveToPublicAndroidDirectory = async (
    localPath: string,
    filenameBase: string,
    mimeType: string,
    encoding: "utf8" | "base64"
  ) => {
    if (Platform.OS !== "android") return;

    const directoryUri = await getAndroidExportDirectoryUri();
    const targetUri = await FileSystem.StorageAccessFramework.createFileAsync(
      directoryUri,
      filenameBase,
      mimeType
    );
    const content = await FileSystem.readAsStringAsync(localPath, {
      encoding:
        encoding === "base64"
          ? FileSystem.EncodingType.Base64
          : FileSystem.EncodingType.UTF8,
    });

    await FileSystem.StorageAccessFramework.writeAsStringAsync(targetUri, content, {
      encoding:
        encoding === "base64"
          ? FileSystem.EncodingType.Base64
          : FileSystem.EncodingType.UTF8,
    });
  };

  const validateDateRange = () => {
    if (!exportStartDate || !exportEndDate) {
      Alert.alert("Missing date", "Please select both From and To dates.");
      return false;
    }

    if (!isValidDateInput(exportStartDate) || !isValidDateInput(exportEndDate)) {
      Alert.alert("Invalid date", "Use valid dates for both From and To.");
      return false;
    }

    if (new Date(exportStartDate) > new Date(exportEndDate)) {
      Alert.alert("Invalid range", "From date cannot be after To date.");
      return false;
    }

    return true;
  };

  const saveJsonToLocal = async (path: string) => {
    const res = await getExport("json", {
      start: exportStartDate,
      end: exportEndDate,
    });
    const data = res.data;

    if (typeof data === "string") {
      if (/^https?:\/\//i.test(data)) {
        await FileSystem.downloadAsync(data, path);
        return;
      }

      await FileSystem.writeAsStringAsync(path, data, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      return;
    }

    const payload = data?.report ?? data;
    await FileSystem.writeAsStringAsync(path, JSON.stringify(payload, null, 2), {
      encoding: FileSystem.EncodingType.UTF8,
    });
  };

  const savePdfToLocal = async (path: string) => {
    const baseUrl = api.defaults.baseURL?.replace(/\/$/, "");
    if (!baseUrl) throw new Error("API base URL is missing.");

    const token = await AsyncStorage.getItem("auth_token");
    const query =
      `start=${encodeURIComponent(exportStartDate)}` +
      `&end=${encodeURIComponent(exportEndDate)}` +
      "&format=pdf";

    const exportUrl = `${baseUrl}/analytics/export?${query}`;
    const downloadRes = await FileSystem.downloadAsync(exportUrl, path, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!downloadRes || downloadRes.status < 200 || downloadRes.status >= 300) {
      throw new Error("Failed to download PDF.");
    }

    const contentType = String(
      downloadRes.headers?.["content-type"] || downloadRes.headers?.["Content-Type"] || ""
    ).toLowerCase();

    const fileInfo = await FileSystem.getInfoAsync(path);
    const fileSize =
      typeof (fileInfo as { size?: number }).size === "number"
        ? (fileInfo as { size?: number }).size ?? 0
        : 0;

    if (!contentType.includes("application/pdf") || fileSize < 100) {
      throw new Error("Server did not return a valid PDF.");
    }

    const pdfHeaderBase64 = await FileSystem.readAsStringAsync(path, {
      encoding: FileSystem.EncodingType.Base64,
      position: 0,
      length: 12,
    });

    if (!pdfHeaderBase64.startsWith("JVBERi0")) {
      throw new Error("Downloaded file is not a valid PDF.");
    }
  };

  const exportReport = async (format: ExportFormat) => {
    try {
      setExporting(true);
      const exportDir = await ensureExportDirectory();
      const filenameBase = `hydration-report-${buildFileStamp()}`;

      if (format === "json") {
        const jsonPath = `${exportDir}${filenameBase}.json`;
        await saveJsonToLocal(jsonPath);
        await saveToPublicAndroidDirectory(jsonPath, filenameBase, "application/json", "utf8");
        Alert.alert("Export complete", "Download completed.");
        return;
      }

      const pdfPath = `${exportDir}${filenameBase}.pdf`;
      await savePdfToLocal(pdfPath);
      await saveToPublicAndroidDirectory(pdfPath, filenameBase, "application/pdf", "base64");
      Alert.alert("Export complete", "Download completed.");
    } catch (error: any) {
      Alert.alert(
        "Export failed",
        error?.response?.data?.message || error?.message || "Unable to export report right now."
      );
    } finally {
      setExporting(false);
    }
  };

  const onExportWithFormat = (format: ExportFormat) => {
    if (!validateDateRange()) return;
    setExportModalVisible(false);
    void exportReport(format);
  };

  const handleExportReport = () => {
    if (exporting) return;
    const today = formatApiDate(new Date());
    setExportStartDate(today);
    setExportEndDate(today);
    setExportModalVisible(true);
  };

  const openCalendar = (target: DateTarget) => {
    setCalendarTarget(target);
    const selected = target === "start" ? toDateFromIso(exportStartDate) : toDateFromIso(exportEndDate);
    setCalendarMonth(toMonthStart(selected ?? new Date()));
    setCalendarVisible(true);
  };

  const onPickCalendarDate = (date: Date) => {
    const iso = formatApiDate(date);
    if (calendarTarget === "start") setExportStartDate(iso);
    else setExportEndDate(iso);
    setCalendarVisible(false);
  };

  const changeMonth = (offset: number) => {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  if (logsLoading || analyticsLoading) {
    return (
      <Screen>
        <TabHeader title="History" onProfilePress={() => router.push("/profile")} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#14B2CF" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <TabHeader
        title="History"
        onProfilePress={() => router.push("/profile")}
        action={
          <Button
            mode="contained"
            onPress={handleExportReport}
            disabled={exporting}
            loading={exporting}
            buttonColor="#14B2CF"
            style={styles.headerExportBtn}
            contentStyle={styles.headerExportBtnContent}
            labelStyle={styles.headerExportBtnLabel}
            compact
          >
            Export
          </Button>
        }
      />

      <View style={styles.intakeStickyWrap}>
        <View style={styles.intakeCard}>
          <View>
            <Text style={styles.intakeLabel}>Total Intake</Text>
            <Text style={styles.intakeValue}>
              {roundVolume(fromMl(totalIntakeMl, unit), unit)} <Text style={styles.intakeUnit}>{unit}</Text>
            </Text>
          </View>
          <View style={styles.intakeRight}>
            <Text style={styles.intakePct}>{intakePct}% of goal</Text>
            <View style={styles.intakeTrack}>
              <View style={[styles.intakeFill, { width: `${intakePct}%` }]} />
            </View>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>History & Reports</Text>
          <Text style={styles.heroSub}>
            Review daily logs, compare monthly performance, and export your hydration report.
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Weekly performance</Text>
            <Text style={styles.statValue}>{weeklyPerformance}%</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Hydration streak badge</Text>
            <Text style={styles.statValue}>{streakDays} days</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeading}>
            <Ionicons name="stats-chart-outline" size={17} color="#22B9C7" />
            <Text style={styles.sectionTitle}>Monthly comparison</Text>
          </View>
          <View style={styles.compareRow}>
            <View style={styles.compareBox}>
              <Text style={styles.compareLabel}>Current</Text>
              <Text style={styles.compareValue}>
                {roundVolume(fromMl(monthlyComparison.currentTotal, unit), unit)} {unit}
              </Text>
            </View>
            <View style={styles.compareBox}>
              <Text style={styles.compareLabel}>Previous</Text>
              <Text style={styles.compareValue}>
                {monthlyComparison.hasPrev
                  ? `${roundVolume(fromMl(monthlyComparison.prevTotal, unit), unit)} ${unit}`
                  : "N/A"}
              </Text>
            </View>
          </View>
          <Text style={styles.compareDelta}>
            Difference:{" "}
            {monthlyComparison.hasPrev
              ? `${monthlyComparison.diff >= 0 ? "+" : "-"}${roundVolume(fromMl(Math.abs(monthlyComparison.diff), unit), unit)} ${unit}`
              : "Need more month data"}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeading}>
            <Ionicons name="calendar-outline" size={17} color="#22B9C7" />
            <Text style={styles.sectionTitle}>Daily history</Text>
          </View>
          {sortedLogs.length === 0 ? (
            <Text style={styles.emptyText}>No logs yet</Text>
          ) : (
            sortedLogs.slice(0, 14).map((log, idx) => (
              <View key={`${log.id}-${idx}`} style={[styles.historyRow, idx === 13 && styles.noBorder]}>
                <View>
                  <Text style={styles.historyAmount}>
                    {roundVolume(fromMl(log.amountMl, unit), unit)} {unit}
                  </Text>
                  <Text style={styles.historyTime}>{formatDateTime(log.timestamp)}</Text>
                </View>
                <Chip compact style={styles.historyChip}>
                  {formatDate(log.timestamp)}
                </Chip>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={exportModalVisible} animationType="fade" transparent onRequestClose={() => setExportModalVisible(false)}>
        <Pressable style={styles.exportModalBackdrop} onPress={() => setExportModalVisible(false)} />
        <View style={styles.exportModalWrap}>
          <View style={styles.exportModalCard}>
            <View style={styles.exportHeadingRow}>
              <View style={styles.exportHeadingIconWrap}>
                <Ionicons name="download-outline" size={16} color="#15B7CD" />
              </View>
              <View style={styles.exportHeadingTextWrap}>
                <Text style={styles.exportModalTitle}>Export Report</Text>
                <Text style={styles.exportModalSub}>Choose date range and format</Text>
              </View>
            </View>

            <View style={styles.exportFieldsWrap}>
              <View style={styles.exportFieldBlock}>
                <Text style={styles.exportInputLabel}>From</Text>
                <Pressable style={styles.exportDateButton} onPress={() => openCalendar("start")}>
                  <Text style={styles.exportDateButtonText}>{formatDisplayDate(exportStartDate)}</Text>
                </Pressable>
              </View>
              <View style={styles.exportFieldBlock}>
                <Text style={styles.exportInputLabel}>To</Text>
                <Pressable style={styles.exportDateButton} onPress={() => openCalendar("end")}>
                  <Text style={styles.exportDateButtonText}>{formatDisplayDate(exportEndDate)}</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.exportActionRow}>
              <Button
                mode="outlined"
                onPress={() => setExportModalVisible(false)}
                disabled={exporting}
                textColor="#46637B"
                style={styles.exportCancelBtn}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={() => onExportWithFormat("json")}
                disabled={exporting}
                buttonColor="#54C5D6"
                textColor="#FFFFFF"
                style={styles.exportJsonBtn}
              >
                JSON
              </Button>
              <Button
                mode="contained"
                onPress={() => onExportWithFormat("pdf")}
                loading={exporting}
                disabled={exporting}
                buttonColor="#14B2CF"
                textColor="#FFFFFF"
                style={styles.exportPdfBtn}
              >
                PDF
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={calendarVisible} animationType="fade" transparent onRequestClose={() => setCalendarVisible(false)}>
        <Pressable style={styles.exportModalBackdrop} onPress={() => setCalendarVisible(false)} />
        <View style={styles.exportPickerWrap}>
          <View style={styles.exportPickerCard}>
            <View style={styles.calendarHeader}>
              <Pressable onPress={() => changeMonth(-1)} style={styles.calendarNavBtn}>
                <Ionicons name="chevron-back" size={16} color="#35556E" />
              </Pressable>
              <Text style={styles.calendarMonthLabel}>
                {calendarMonth.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
              <Pressable onPress={() => changeMonth(1)} style={styles.calendarNavBtn}>
                <Ionicons name="chevron-forward" size={16} color="#35556E" />
              </Pressable>
            </View>

            <View style={styles.calendarWeekRow}>
              {WEEK_DAYS.map((day, idx) => (
                <Text key={`${day}-${idx}`} style={styles.calendarWeekDay}>{day}</Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {calendarCells.map((cell) => {
                const iso = formatApiDate(cell.date);
                const selected =
                  (calendarTarget === "start" && exportStartDate === iso) ||
                  (calendarTarget === "end" && exportEndDate === iso);

                return (
                  <Pressable
                    key={iso + String(cell.inMonth)}
                    style={[
                      styles.calendarDayCell,
                      !cell.inMonth && styles.calendarDayCellMuted,
                      selected && styles.calendarDayCellSelected,
                    ]}
                    onPress={() => onPickCalendarDate(cell.date)}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        !cell.inMonth && styles.calendarDayTextMuted,
                        selected && styles.calendarDayTextSelected,
                      ]}
                    >
                      {cell.date.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Button mode="outlined" onPress={() => setCalendarVisible(false)} style={styles.exportPickerCloseBtn}>
              Close
            </Button>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 16,
    paddingBottom: 24,
  },
  headerExportBtn: {
    borderRadius: 14,
  },
  headerExportBtnContent: {
    minHeight: 40,
    paddingHorizontal: 4,
  },
  headerExportBtnLabel: {
    fontWeight: "800",
    fontSize: 13,
  },
  intakeStickyWrap: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 6,
  },
  intakeCard: {
    backgroundColor: "#F5F7F9",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2EAF1",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 10,
  },
  intakeLabel: {
    color: "#658099",
    fontSize: 12,
    fontWeight: "700",
  },
  intakeValue: {
    marginTop: 2,
    color: "#124565",
    fontSize: 14,
    fontWeight: "900",
  },
  intakeUnit: {
    fontSize: 12,
    color: "#14B2CF",
    fontWeight: "700",
  },
  intakeRight: {
    flex: 1,
    alignItems: "flex-end",
    justifyContent: "flex-end",
    gap: 6,
  },
  intakePct: {
    color: "#14B2CF",
    fontWeight: "800",
    fontSize: 11,
  },
  intakeTrack: {
    width: 86,
    height: 6,
    borderRadius: 99,
    backgroundColor: "#DCEAF2",
    overflow: "hidden",
  },
  intakeFill: {
    height: "100%",
    borderRadius: 99,
    backgroundColor: "#12B4CC",
  },
  heroCard: {
    backgroundColor: "#D9EEFA",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#A8D7F4",
    padding: 18,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0E1E40",
  },
  heroSub: {
    color: "#3F556D",
    marginTop: 4,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: "#F6F7F9",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#E2EAF1",
    padding: 18,
    gap: 14,
    shadowColor: "#0E1E40",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0E1E40",
  },
  emptyText: {
    color: "#8399AF",
    fontWeight: "600",
  },
  historyRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E0EBF3",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  historyAmount: {
    color: "#0E1E40",
    fontWeight: "800",
    fontSize: 16,
  },
  historyTime: {
    color: "#6E879E",
    marginTop: 2,
  },
  historyChip: {
    backgroundColor: "#E9EEF4",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#F6F7F9",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2EAF1",
    padding: 16,
    shadowColor: "#0E1E40",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  statLabel: {
    color: "#607A93",
    fontSize: 12,
    fontWeight: "700",
  },
  statValue: {
    marginTop: 8,
    color: "#14B2CF",
    fontSize: 24,
    fontWeight: "800",
  },
  compareRow: {
    flexDirection: "row",
    gap: 10,
  },
  compareBox: {
    flex: 1,
    backgroundColor: "#F8FBFE",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#D5DEE8",
    padding: 12,
    shadowColor: "#0E1E40",
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  compareLabel: {
    color: "#5B7691",
    fontSize: 12,
    fontWeight: "700",
  },
  compareValue: {
    marginTop: 5,
    color: "#0E1E40",
    fontSize: 18,
    fontWeight: "800",
  },
  compareDelta: {
    color: "#5C7893",
    fontWeight: "700",
  },
  exportModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(7, 22, 40, 0.35)",
  },
  exportModalWrap: {
    flex: 1,
    justifyContent: "center",
    padding: 18,
  },
  exportModalCard: {
    backgroundColor: "#F6F7F9",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#DDE8F2",
    padding: 18,
    gap: 14,
    shadowColor: "#0E1E40",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  exportHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  exportHeadingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E7F6FA",
    borderWidth: 1,
    borderColor: "#BFEAF2",
    alignItems: "center",
    justifyContent: "center",
  },
  exportHeadingTextWrap: {
    flex: 1,
  },
  exportModalTitle: {
    color: "#0E1E40",
    fontSize: 20,
    fontWeight: "900",
  },
  exportModalSub: {
    color: "#607A93",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  exportFieldsWrap: {
    gap: 10,
  },
  exportFieldBlock: {
    gap: 6,
  },
  exportInputLabel: {
    color: "#5B7691",
    fontSize: 12,
    fontWeight: "800",
  },
  exportDateButton: {
    borderWidth: 1,
    borderColor: "#D5DEE8",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: "#FFFFFF",
  },
  exportDateButtonText: {
    color: "#0E1E40",
    fontWeight: "800",
  },
  exportActionRow: {
    marginTop: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  exportCancelBtn: {
    borderColor: "#D3DEE8",
    borderRadius: 12,
  },
  exportJsonBtn: {
    borderRadius: 12,
  },
  exportPdfBtn: {
    borderRadius: 12,
  },
  exportPickerWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 22,
  },
  exportPickerCard: {
    backgroundColor: "#F6F7F9",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DDE8F2",
    padding: 14,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  calendarNavBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E8F3FB",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarMonthLabel: {
    color: "#0E1E40",
    fontWeight: "900",
    fontSize: 15,
  },
  calendarWeekRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  calendarWeekDay: {
    width: "14.2857%",
    textAlign: "center",
    color: "#6B8298",
    fontWeight: "800",
    fontSize: 11,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  calendarDayCell: {
    width: "14.2857%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  calendarDayCellMuted: {
    opacity: 0.45,
  },
  calendarDayCellSelected: {
    backgroundColor: "#14B2CF",
  },
  calendarDayText: {
    color: "#23445E",
    fontWeight: "700",
    fontSize: 12,
  },
  calendarDayTextMuted: {
    color: "#8FA5B8",
  },
  calendarDayTextSelected: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  exportPickerCloseBtn: {
    borderRadius: 12,
    borderColor: "#D3DEE8",
  },
});
