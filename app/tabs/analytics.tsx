import React, { useMemo } from "react";
import {
  ActivityIndicator,
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
import { useAnalytics } from "../../hooks/useAnalytics";
import { useProfile } from "../../hooks/useProfile";
import {
  fromMl,
  normalizeUnit,
  roundVolume,
} from "../../src/utils/units";
import { BarChart } from "react-native-gifted-charts";
import { ProgressChart } from "react-native-chart-kit";

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

  const weeklyForChart = useMemo(() => {
    const today = startOfUtcDay(new Date());
    const dayOfWeek = today.getUTCDay();
    const weekStart = new Date(today);
    weekStart.setUTCDate(today.getUTCDate() - dayOfWeek);

    const map = new Map(weekly.map((item) => [toDayKey(item.date), item]));

    return Array.from({ length: 7 }).map((_, idx) => {
      const date = new Date(weekStart);
      date.setUTCDate(weekStart.getUTCDate() + idx);
      const key = toDayKey(date);

      return (
        map.get(key) || {
          date: key,
          amountMl: 0,
          goalMl: 0,
          completionPct: 0,
        }
      );
    });
  }, [weekly]);

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
const progressData = {
  labels: [],
  data: [
    todayGoalMl > 0
      ? todayCompletionPct / 100
      : 0,
  ],
};

  return (
    <Screen>
      <TabHeader
        title="Insights"
        onProfilePress={() => router.push("/profile")}
      />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#14B2CF" />
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
              <View
                key={`month-${month.monthIdx}`}
                style={styles.monthCellWrap}
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
                    Date.UTC(2026, month.monthIdx, 1)
                  ).toLocaleString(undefined, {
                    month: "short",
                  })}
                </Text>
              </View>
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
