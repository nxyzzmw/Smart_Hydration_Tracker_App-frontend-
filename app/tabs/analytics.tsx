import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Dimensions
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Screen from "../../components/Screen";
import TabHeader from "../../components/TabHeader";
import LoadingAnimation from "../../components/LoadingAnimation";
import { useAnalytics } from "../../hooks/useAnalytics";
import { useProfile } from "../../hooks/useProfile";
import {
  fromMl,
  normalizeUnit,
  roundVolume,
} from "../../src/utils/units";
import { BarChart } from "react-native-gifted-charts";

const WEEK_DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const RING_SEGMENTS = 48;

function formatWeekLabel(date?: string, fallbackIdx = 0) {
  if (!date) return WEEK_DAYS[fallbackIdx] ?? "-";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return WEEK_DAYS[fallbackIdx] ?? "-";
  }
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
  })[0];
}

function monthCellColor(pct?: number) {
  if (pct === undefined || pct <= 0) return "#EAF4FA";
  if (pct >= 100) return "#14B2CF";
  if (pct >= 60) return "#5FC6DE";
  return "#A8DBEE";
}

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    )
  );
}

function startOfUtcWeek(date: Date) {
  const day = startOfUtcDay(date);
  const dayOfWeek = day.getUTCDay();
  const weekStart = new Date(day);
  weekStart.setUTCDate(day.getUTCDate() - dayOfWeek);
  return weekStart;
}

function toDayKey(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return startOfUtcDay(d).toISOString();
}

export default function Analytics() {
  const router = useRouter();
  const { profile } = useProfile();
  const {
    weekly,
    monthly,
    hasData,
    loading,
    streakDays,
    performancePct,
    todayCompletionPct,
    todayIntakeMl,
    todayGoalMl,
  } = useAnalytics();
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthModalVisible, setMonthModalVisible] = useState(false);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number | null>(null);
  const [selectedMonthYear, setSelectedMonthYear] = useState<number>(
    new Date().getUTCFullYear()
  );

  const dailyAnalyticsMap = useMemo(() => {
    const merged = [...monthly, ...weekly];
    const map = new Map<string, { date: string; amountMl: number; goalMl: number; completionPct: number }>();
    merged.forEach((item) => {
      const key = toDayKey(item.date);
      if (!key) return;
      map.set(key, item);
    });
    return map;
  }, [monthly, weekly]);

  const maxPreviousWeeks = useMemo(() => {
    if (dailyAnalyticsMap.size === 0) return 0;
    const keys = Array.from(dailyAnalyticsMap.keys()).sort();
    const first = keys[0] ? new Date(keys[0]) : null;
    if (!first || Number.isNaN(first.getTime())) return 0;

    const firstWeekStart = startOfUtcWeek(first);
    const currentWeekStart = startOfUtcWeek(new Date());
    const diffMs = currentWeekStart.getTime() - firstWeekStart.getTime();
    if (diffMs <= 0) return 0;
    return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  }, [dailyAnalyticsMap]);

  const weeklyForChart = useMemo(() => {
    const currentWeekStart = startOfUtcWeek(new Date());
    const targetWeekStart = new Date(currentWeekStart);
    targetWeekStart.setUTCDate(currentWeekStart.getUTCDate() - weekOffset * 7);

    return Array.from({ length: 7 }).map((_, idx) => {
      const date = new Date(targetWeekStart);
      date.setUTCDate(targetWeekStart.getUTCDate() + idx);
      const key = toDayKey(date);

      return (
        dailyAnalyticsMap.get(key) || {
          date: key,
          amountMl: 0,
          goalMl: 0,
          completionPct: 0,
        }
      );
    });
  }, [dailyAnalyticsMap, weekOffset]);

  const weekRangeLabel = useMemo(() => {
    if (weeklyForChart.length === 0) return "";
    const start = new Date(weeklyForChart[0].date);
    const end = new Date(weeklyForChart[6].date);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";

    const startText = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    const endText = end.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return `${startText} - ${endText}`;
  }, [weeklyForChart]);

  const yearlyConsistency = useMemo(() => {
    const monthBuckets = Array.from({ length: 12 }).map(() => ({
      totalPct: 0,
      count: 0,
    }));

    monthly.forEach((entry) => {
      const parsed = new Date(entry.date);
      if (Number.isNaN(parsed.getTime())) return;
      const monthIdx = parsed.getUTCMonth();
      monthBuckets[monthIdx].totalPct += entry.completionPct;
      monthBuckets[monthIdx].count += 1;
    });

    return monthBuckets.map((bucket, monthIdx) => ({
      monthIdx,
      avgPct:
        bucket.count > 0
          ? Math.round(bucket.totalPct / bucket.count)
          : 0,
    }));
  }, [monthly]);

  const dailyCompletionsByMonth = useMemo(() => {
    const map = new Map<string, Set<number>>();

    monthly.forEach((entry) => {
      const parsed = new Date(entry.date);
      if (Number.isNaN(parsed.getTime())) return;
      const year = parsed.getUTCFullYear();
      const month = parsed.getUTCMonth();
      const day = parsed.getUTCDate();
      const key = `${year}-${month}`;

      if (!map.has(key)) {
        map.set(key, new Set<number>());
      }
      if (entry.completionPct >= 100) {
        map.get(key)?.add(day);
      }
    });

    return map;
  }, [monthly]);

  const selectedMonthDays = useMemo(() => {
    if (selectedMonthIdx === null) return [];
    const daysInMonth = new Date(
      Date.UTC(selectedMonthYear, selectedMonthIdx + 1, 0)
    ).getUTCDate();
    const firstDayOfMonth = new Date(
      Date.UTC(selectedMonthYear, selectedMonthIdx, 1)
    ).getUTCDay();
    const grid: { day: number | null; achieved: boolean }[] = [];

    for (let i = 0; i < firstDayOfMonth; i += 1) {
      grid.push({ day: null, achieved: false });
    }

    const achievedDays =
      dailyCompletionsByMonth.get(`${selectedMonthYear}-${selectedMonthIdx}`) ||
      new Set<number>();

    for (let day = 1; day <= daysInMonth; day += 1) {
      grid.push({ day, achieved: achievedDays.has(day) });
    }

    while (grid.length % 7 !== 0) {
      grid.push({ day: null, achieved: false });
    }

    return grid;
  }, [selectedMonthIdx, selectedMonthYear, dailyCompletionsByMonth]);

  const openMonthModal = (monthIdx: number) => {
    const currentYear = new Date().getUTCFullYear();
    const yearsWithMonth = monthly
      .map((entry) => new Date(entry.date))
      .filter((date) => !Number.isNaN(date.getTime()) && date.getUTCMonth() === monthIdx)
      .map((date) => date.getUTCFullYear())
      .sort((a, b) => b - a);

    setSelectedMonthIdx(monthIdx);
    setSelectedMonthYear(yearsWithMonth[0] ?? currentYear);
    setMonthModalVisible(true);
  };

  const ringFilledSegments = useMemo(() => {
    if (todayGoalMl <= 0) return 0;
    const clamped = Math.max(0, Math.min(100, todayCompletionPct));
    return Math.round((clamped / 100) * RING_SEGMENTS);
  }, [todayCompletionPct, todayGoalMl]);

  const displayStreak = useMemo(() => {
    if (streakDays > 0) return streakDays;
    return todayCompletionPct >= 100 ? 1 : 0;
  }, [streakDays, todayCompletionPct]);
  const unit = normalizeUnit(profile?.unit);
  const displayTodayIntake = roundVolume(fromMl(todayIntakeMl, unit), unit);
  const displayTodayGoal = roundVolume(fromMl(todayGoalMl, unit), unit);
  const intakePct =
    todayGoalMl > 0
      ? Math.max(0, Math.min(100, Math.round((todayIntakeMl / todayGoalMl) * 100)))
      : 0;
const chartWidth = Dimensions.get("window").width - 100;
const canGoPrevWeek = weekOffset < maxPreviousWeeks;
const canGoNextWeek = weekOffset > 0;

  return (
    <Screen>
      <View style={styles.pageHeaderWrap}>
        <TabHeader
          title="Insights"
          onProfilePress={() => router.push("/profile")}
          style={styles.pageHeader}
        />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <LoadingAnimation size={96} />
        </View>
      ) : null}

      <View style={styles.intakeStickyWrap}>
        <View style={styles.intakeCard}>
          <View>
            <Text style={styles.intakeLabel}>Total Intake</Text>
            <Text style={styles.intakeValue}>
              {displayTodayIntake} <Text style={styles.intakeUnit}>{unit}</Text>
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
          <Text style={styles.heroTitle}>Visual Progress Tracker</Text>
          <Text style={styles.heroSub}>
            {hasData
              ? "Track your hydration consistency across day, week, and month."
              : "No analytics data yet. Start logging daily to unlock insights."}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeading}>
            <Ionicons
              name="water-outline"
              size={17}
              color="#22B9C7"
            />
            <Text style={styles.sectionTitle}>Daily completion %</Text>
          </View>
          <View style={styles.dailyRow}>
            <View style={styles.circleWrap}>
              <View style={styles.circleOuterEmpty}>
                <View style={styles.ringSegmentsWrap}>
                  {Array.from({ length: RING_SEGMENTS }).map((_, idx) => (
                    <View
                      key={`ring-seg-${idx}`}
                      style={[
                        styles.ringSegment,
                        {
                          transform: [
                            {
                              rotate: `${(360 / RING_SEGMENTS) * idx}deg`,
                            },
                            { translateY: -45 },
                          ],
                        },
                        idx < ringFilledSegments
                          ? styles.ringSegmentActive
                          : styles.ringSegmentInactive,
                      ]}
                    />
                  ))}
                </View>
                <View style={styles.circleInner}>
                  <Text
                    style={[
                      styles.circlePercent,
                      todayGoalMl > 0 && styles.circlePercentActive,
                    ]}
                  >
                    {todayGoalMl > 0
                      ? `${todayCompletionPct}%`
                      : "--"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.dailyTextWrap}>
              <Text
                style={[
                  styles.metricBig,
                  todayGoalMl > 0 && styles.metricBigActive,
                ]}
              >
                {displayTodayIntake} {unit}
              </Text>
              <Text
                style={[
                  styles.metricSub,
                  todayGoalMl > 0 && styles.metricSubActive,
                ]}
              >
                out of {todayGoalMl > 0 ? displayTodayGoal : "--"} {unit}
              </Text>
              <Text style={styles.metricHint}>Completion today</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Daily streak</Text>
            <Text style={styles.statValue}>{displayStreak} days</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Hydration score</Text>
            <Text style={styles.statValue}>
              {performancePct}%
            </Text>
          </View>
        </View>
<View style={styles.card}>

  {/* Heading stays same */}
  <View style={styles.sectionHeading}>
    <Ionicons
      name="bar-chart-outline"
      size={17}
      color="#22B9C7"
    />
    <Text style={styles.sectionTitle}>
      Weekly bar graph
    </Text>
  </View>
  <View style={styles.weekNavRow}>
    <Pressable
      onPress={() => canGoPrevWeek && setWeekOffset((prev) => prev + 1)}
      disabled={!canGoPrevWeek}
      style={[styles.weekNavBtn, !canGoPrevWeek && styles.weekNavBtnDisabled]}
    >
      <Ionicons name="chevron-back" size={16} color={canGoPrevWeek ? "#0A9CF0" : "#9EB2C4"} />
      <Text style={[styles.weekNavText, !canGoPrevWeek && styles.weekNavTextDisabled]}>Prev week</Text>
    </Pressable>

    <Text style={styles.weekRangeText}>{weekRangeLabel || "Current week"}</Text>

    <Pressable
      onPress={() => canGoNextWeek && setWeekOffset((prev) => prev - 1)}
      disabled={!canGoNextWeek}
      style={[styles.weekNavBtn, !canGoNextWeek && styles.weekNavBtnDisabled]}
    >
      <Text style={[styles.weekNavText, !canGoNextWeek && styles.weekNavTextDisabled]}>Next week</Text>
      <Ionicons name="chevron-forward" size={16} color={canGoNextWeek ? "#0A9CF0" : "#9EB2C4"} />
    </Pressable>
  </View>


  {/* Chart row container stays same */}
  <View style={styles.weekChartWrap}>

  {/* Left scale */}
  <View style={styles.weekScaleCol}>
    <Text style={styles.weekScaleText}>100%</Text>
    <Text style={styles.weekScaleText}>50%</Text>
    <Text style={styles.weekScaleText}>0%</Text>
  </View>


  {/* Chart container FIXED */}
  <View style={{ flex: 1, marginLeft: 10 }}>

    <BarChart
  width={chartWidth}

      data={weeklyForChart.map((day, idx) => ({
        value: Math.max(0, Math.min(100, day.completionPct)),
        label: formatWeekLabel(day.date, idx),
        frontColor: "#14B2CF",
      }))}

      height={142}

      maxValue={100}

      noOfSections={2}

      barWidth={12}

      spacing={18}

      initialSpacing={10}

      roundedTop

      hideRules

      hideYAxisText

      yAxisThickness={0}

      xAxisThickness={0}

      xAxisLabelTextStyle={styles.axisLabel}

    />

  </View>

</View>



</View>


        <View style={styles.card}>
          <View style={styles.sectionHeading}>
            <Ionicons
              name="calendar-outline"
              size={17}
              color="#22B9C7"
            />
            <Text style={styles.sectionTitle}>Monthly consistency</Text>
          </View>
          <View style={styles.monthGrid}>
            {yearlyConsistency.map((month) => (
              <Pressable
                key={`month-${month.monthIdx}`}
                style={styles.monthCellWrap}
                onPress={() => openMonthModal(month.monthIdx)}
              >
                <View
                  style={[
                    styles.dayCellEmpty,
                    {
                      backgroundColor: monthCellColor(month.avgPct),
                    },
                  ]}
                />
                <Text style={styles.monthLabel}>
                  {new Date(
                    Date.UTC(new Date().getUTCFullYear(), month.monthIdx, 1)
                  ).toLocaleString(undefined, {
                    month: "short",
                  })}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.monthLegendRow}>
            <Text style={styles.monthLegendText}>Low</Text>
            <View style={[styles.legendSwatch, { backgroundColor: "#EAF4FA" }]} />
            <View style={[styles.legendSwatch, { backgroundColor: "#A8DBEE" }]} />
            <View style={[styles.legendSwatch, { backgroundColor: "#5FC6DE" }]} />
            <View style={[styles.legendSwatch, { backgroundColor: "#14B2CF" }]} />
            <Text style={styles.monthLegendText}>High</Text>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={monthModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMonthModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.monthModalCard}>
            <View style={styles.monthModalHeader}>
              <Text style={styles.monthModalTitle}>
                {selectedMonthIdx === null
                  ? "Month"
                  : `${new Date(
                      Date.UTC(selectedMonthYear, selectedMonthIdx, 1)
                    ).toLocaleString(undefined, { month: "long" })} ${selectedMonthYear}`}
              </Text>
              <Pressable
                onPress={() => setMonthModalVisible(false)}
                style={styles.monthModalCloseBtn}
              >
                <Ionicons name="close" size={20} color="#4A5D77" />
              </Pressable>
            </View>

            <Text style={styles.monthModalHint}>Highlighted dates reached 100% daily goal.</Text>

            <View style={styles.calendarWeekHeader}>
              {["S", "M", "T", "W", "T", "F", "S"].map((d, idx) => (
                <Text key={`cal-h-${idx}`} style={styles.calendarWeekText}>
                  {d}
                </Text>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {selectedMonthDays.map((cell, idx) => (
                <View
                  key={`cal-d-${idx}`}
                  style={styles.calendarCell}
                >
                  <View
                    style={[
                      styles.calendarCellInner,
                      cell.achieved && styles.calendarCellInnerAchieved,
                    ]}
                  >
                    <Text
                      style={[
                        styles.calendarCellText,
                        cell.achieved && styles.calendarCellTextAchieved,
                      ]}
                    >
                      {cell.day ?? ""}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
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
  pageHeaderWrap: {
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 4,
    backgroundColor: "#EAF2F8",
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
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
  loadingWrap: {
    paddingTop: 12,
    alignItems: "center",
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
  dailyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  circleWrap: {
    width: 118,
    height: 118,
    justifyContent: "center",
    alignItems: "center",
  },
  circleOuterEmpty: {
    width: 112,
    height: 112,
    borderRadius: 56,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EAF1F7",
    position: "relative",
  },
  ringSegmentsWrap: {
    position: "absolute",
    width: 112,
    height: 112,
    borderRadius: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  ringSegment: {
    position: "absolute",
    width: 6,
    height: 13,
    borderRadius: 99,
    top: "50%",
    left: "50%",
    marginLeft: -3,
    marginTop: -6.5,
  },
  ringSegmentActive: {
    backgroundColor: "#14B2CF",
  },
  ringSegmentInactive: {
    backgroundColor: "#CFE0EC",
  },
  circleInner: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#F8FBFE",
    justifyContent: "center",
    alignItems: "center",
  },
  circleOuterActive: {
    borderColor: "#14B2CF",
    backgroundColor: "#DFF2FB",
  },
  circlePercent: {
    fontSize: 22,
    fontWeight: "800",
    color: "#8AA0B5",
  },
  circlePercentActive: {
    color: "#14B2CF",
  },
  dailyTextWrap: {
    flex: 1,
  },
  metricBig: {
    fontSize: 26,
    fontWeight: "800",
    color: "#8AA0B5",
  },
  metricBigActive: {
    color: "#14B2CF",
  },
  metricSub: {
    color: "#8AA0B5",
    fontWeight: "600",
  },
  metricSubActive: {
    color: "#5A7B93",
  },
  metricHint: {
    marginTop: 6,
    color: "#9AAEC2",
  },
  weekChart: {
    flex: 1,
    height: 142,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
  },
  weekChartWrap: {
    flexDirection: "row",
    gap: 8,
  },
  weekNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: -2,
    marginBottom: 2,
    gap: 8,
  },
  weekNavBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#EAF4FA",
    borderWidth: 1,
    borderColor: "#D6E6F1",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  weekNavBtnDisabled: {
    backgroundColor: "#F2F6FA",
    borderColor: "#E2EAF1",
  },
  weekNavText: {
    color: "#0A9CF0",
    fontSize: 12,
    fontWeight: "700",
  },
  weekNavTextDisabled: {
    color: "#9EB2C4",
  },
  weekRangeText: {
    flex: 1,
    textAlign: "center",
    color: "#5B748E",
    fontSize: 12,
    fontWeight: "700",
  },
  weekScaleCol: {
    width: 32,
    height: 142,
    justifyContent: "space-between",
    paddingBottom: 22,
  },
  weekScaleText: {
    color: "#8FA3B8",
    fontSize: 10,
    fontWeight: "700",
  },
  weekCol: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  weekBarTrack: {
    width: "100%",
    height: 90,
    borderRadius: 8,
    backgroundColor: "#DDEBF4",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  weekBarFill: {
    width: "100%",
    borderRadius: 8,
    backgroundColor: "#14B2CF",
  },
  axisLabel: {
    color: "#8FA3B8",
    fontSize: 12,
    fontWeight: "700",
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  monthCellWrap: {
    width: "22%",
    alignItems: "center",
    gap: 5,
  },
  monthLabel: {
    fontSize: 11,
    color: "#6A879D",
    fontWeight: "700",
  },
  dayCellEmpty: {
    width: 20,
    height: 20,
    borderRadius: 5,
    backgroundColor: "#EAF3FA",
  },
  monthLegendRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  monthLegendText: {
    fontSize: 11,
    color: "#7D95A8",
    fontWeight: "700",
  },
  legendSwatch: {
    width: 18,
    height: 10,
    borderRadius: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(14, 30, 64, 0.45)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  monthModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D5DEE8",
    padding: 16,
    gap: 12,
  },
  monthModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthModalTitle: {
    color: "#0E1E40",
    fontSize: 18,
    fontWeight: "800",
  },
  monthModalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#D8E2EC",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FBFE",
  },
  monthModalHint: {
    color: "#5B748E",
    fontSize: 13,
    fontWeight: "600",
  },
  calendarWeekHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  calendarWeekText: {
    width: "14.2%",
    textAlign: "center",
    color: "#7D95A8",
    fontSize: 12,
    fontWeight: "700",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
    justifyContent: "space-between",
  },
  calendarCell: {
    width: "14.2857%",
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarCellInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarCellInnerAchieved: {
    backgroundColor: "#14B2CF",
  },
  calendarCellText: {
    color: "#526D86",
    fontSize: 12,
    fontWeight: "600",
  },
  calendarCellTextAchieved: {
    color: "#FFFFFF",
    fontWeight: "800",
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
    minHeight: 108,
    justifyContent: "center",
    alignItems: "center",
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
    textAlign: "center",
  },
  statValue: {
    marginTop: 8,
    color: "#14B2CF",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
});
