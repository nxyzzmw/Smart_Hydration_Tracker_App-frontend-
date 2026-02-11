import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import Screen from "../../components/Screen";
import Header from "../../components/header";

const WEEK_DAYS = ["M", "T", "W", "T", "F", "S", "S"];

export default function Analytics() {
  const hasAnalyticsData = false;

  return (
    <Screen>
      <Header title="Insights" />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Visual Progress Tracker</Text>
          <Text style={styles.heroSub}>
            {hasAnalyticsData
              ? "Track your hydration consistency across day, week, and month."
              : "No analytics data yet. Start logging daily to unlock insights."}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Daily completion %</Text>
          <View style={styles.dailyRow}>
            <View style={styles.circleWrap}>
              <View style={styles.circleOuterEmpty}>
                <View style={styles.circleInner}>
                  <Text style={styles.circlePercent}>--</Text>
                </View>
              </View>
            </View>

            <View style={styles.dailyTextWrap}>
              <Text style={styles.metricBig}>-- ml</Text>
              <Text style={styles.metricSub}>out of -- ml</Text>
              <Text style={styles.metricHint}>Completion today</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Weekly bar graph</Text>
          <View style={styles.weekChart}>
            {WEEK_DAYS.map((label, idx) => (
              <View key={`week-${idx}`} style={styles.weekCol}>
                <View style={styles.weekBarEmpty} />
                <Text style={styles.axisLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Monthly chart</Text>
          <View style={styles.monthGrid}>
            {Array.from({ length: 30 }).map((_, idx) => (
              <View key={`month-${idx}`} style={styles.dayCellEmpty} />
            ))}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Streak counter</Text>
            <Text style={styles.statValue}>--</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Hydration score</Text>
            <Text style={styles.statValue}>--</Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
    paddingBottom: 24,
  },
  heroCard: {
    backgroundColor: "#DFF2FB",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#C9E6F5",
    padding: 14,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0E1E40",
  },
  heroSub: {
    color: "#5C7590",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#F4F9FD",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D6E6F1",
    padding: 14,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#123B5A",
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
    borderWidth: 10,
    borderColor: "#D6E6F1",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EEF5FA",
  },
  circleInner: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#F4F9FD",
    justifyContent: "center",
    alignItems: "center",
  },
  circlePercent: {
    fontSize: 22,
    fontWeight: "800",
    color: "#8AA0B5",
  },
  dailyTextWrap: {
    flex: 1,
  },
  metricBig: {
    fontSize: 26,
    fontWeight: "800",
    color: "#8AA0B5",
  },
  metricSub: {
    color: "#8AA0B5",
    fontWeight: "600",
  },
  metricHint: {
    marginTop: 6,
    color: "#9AAEC2",
  },
  weekChart: {
    height: 126,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
  },
  weekCol: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  weekBarEmpty: {
    width: "100%",
    height: 22,
    borderRadius: 8,
    backgroundColor: "#DDEBF4",
  },
  axisLabel: {
    color: "#8FA3B8",
    fontSize: 12,
    fontWeight: "700",
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  dayCellEmpty: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: "#DDEBF4",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#F4F9FD",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D6E6F1",
    padding: 14,
  },
  statLabel: {
    color: "#607A93",
    fontSize: 12,
    fontWeight: "700",
  },
  statValue: {
    marginTop: 8,
    color: "#8AA0B5",
    fontSize: 24,
    fontWeight: "800",
  },
});
