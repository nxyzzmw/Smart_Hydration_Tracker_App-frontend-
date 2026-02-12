import React, { useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Button, Chip } from "react-native-paper";
import { useRouter } from "expo-router";
import Screen from "../../components/Screen";
import TabHeader from "../../components/TabHeader";
import { useWater } from "../../hooks/useWater";
import { useAnalytics } from "../../hooks/useAnalytics";
import { useProfile } from "../../hooks/useProfile";
import {
  fromMl,
  normalizeUnit,
  roundVolume,
} from "../../src/utils/units";

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

export default function History() {
  const router = useRouter();
  const { profile } = useProfile();
  const { logs, loading: logsLoading } = useWater();
  const {
    weekly,
    monthly,
    streakDays,
    performancePct,
    loading: analyticsLoading,
  } = useAnalytics();

  const sortedLogs = useMemo(
    () =>
      [...logs].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() -
          new Date(a.timestamp).getTime()
      ),
    [logs]
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
    const total = weekly.reduce(
      (sum, day) => sum + day.completionPct,
      0
    );
    return Math.round(total / weekly.length);
  }, [weekly]);

  const monthlyComparison = useMemo(() => {
    const monthTotals = new Map<string, number>();
    monthly.forEach((entry) => {
      const d = new Date(entry.date);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getUTCFullYear()}-${String(
        d.getUTCMonth() + 1
      ).padStart(2, "0")}`;
      monthTotals.set(
        key,
        (monthTotals.get(key) ?? 0) + entry.amountMl
      );
    });

    const keys = [...monthTotals.keys()].sort();
    const currentKey = keys[keys.length - 1];
    const prevKey = keys[keys.length - 2];
    const currentTotal = currentKey
      ? monthTotals.get(currentKey) ?? 0
      : 0;
    const prevTotal = prevKey ? monthTotals.get(prevKey) ?? 0 : 0;
    const diff = currentTotal - prevTotal;

    return { currentTotal, prevTotal, diff, hasPrev: !!prevKey };
  }, [monthly]);

  const handleExportReport = async () => {
    const reportLines = [
      "Hydration Report",
      `Generated: ${new Date().toLocaleString()}`,
      "",
      `Weekly performance: ${weeklyPerformance}%`,
      `Hydration score: ${performancePct}%`,
      `Streak: ${streakDays} day(s)`,
      `Monthly current total: ${roundVolume(fromMl(monthlyComparison.currentTotal, unit), unit)} ${unit}`,
      `Monthly previous total: ${roundVolume(fromMl(monthlyComparison.prevTotal, unit), unit)} ${unit}`,
      `Monthly difference: ${monthlyComparison.diff >= 0 ? "+" : "-"}${roundVolume(fromMl(Math.abs(monthlyComparison.diff), unit), unit)} ${unit}`,
      "",
      "Daily history:",
      ...sortedLogs.slice(0, 30).map(
        (log) =>
          `- ${formatDateTime(log.timestamp)} | ${roundVolume(fromMl(log.amountMl, unit), unit)} ${unit}`
      ),
    ];

    await Share.share({
      title: "Hydration Report",
      message: reportLines.join("\n"),
    });
  };

  if (logsLoading || analyticsLoading) {
    return (
      <Screen>
        <TabHeader
          title="History"
          onProfilePress={() => router.push("/profile")}
        />
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
              {roundVolume(fromMl(totalIntakeMl, unit), unit)}{" "}
              <Text style={styles.intakeUnit}>{unit}</Text>
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

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
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
            <Ionicons
              name="stats-chart-outline"
              size={17}
              color="#22B9C7"
            />
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
            <Ionicons
              name="calendar-outline"
              size={17}
              color="#22B9C7"
            />
            <Text style={styles.sectionTitle}>Daily history</Text>
          </View>
          {sortedLogs.length === 0 ? (
            <Text style={styles.emptyText}>No logs yet</Text>
          ) : (
            sortedLogs.slice(0, 14).map((log, idx) => (
              <View
                key={`${log.id}-${idx}`}
                style={[
                  styles.historyRow,
                  idx === 13 && styles.noBorder,
                ]}
              >
                <View>
                  <Text style={styles.historyAmount}>
                    {roundVolume(fromMl(log.amountMl, unit), unit)} {unit}
                  </Text>
                  <Text style={styles.historyTime}>
                    {formatDateTime(log.timestamp)}
                  </Text>
                </View>
                <Chip compact style={styles.historyChip}>
                  {formatDate(log.timestamp)}
                </Chip>
              </View>
            ))
          )}
        </View>

      </ScrollView>
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
  pageHeader: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
    fontSize: 28 / 2,
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
  pageTitle: {
    fontSize: 23,
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
  dayNavCard: {
    minHeight: 72,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DEE7EF",
    backgroundColor: "#F8FBFE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  dayNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNavBtnDisabled: {
    opacity: 0.65,
  },
  dayNavCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNavTop: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#7B94AA",
  },
  dayNavBottom: {
    marginTop: 2,
    fontSize: 22 / 2,
    fontWeight: "800",
    color: "#122D4A",
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
});
