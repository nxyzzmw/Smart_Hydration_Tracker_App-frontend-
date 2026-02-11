import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import {
  Text,
  Button,
  TextInput,
  IconButton,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import Header from "../../components/header";
import { useProfile } from "../../hooks/useProfile";
import { useWater } from "../../hooks/useWater";

function formatTime(iso?: string) {
  if (!iso) return "--:--";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Dashboard() {
  const [customAmount, setCustomAmount] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");

  const { profile, loading: profileLoading } = useProfile();
  const {
    logs,
    total,
    loading,
    saving,
    addLog,
    updateLog,
    deleteLog,
  } = useWater();

  const sortedLogs = useMemo(
    () =>
      [...logs].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() -
          new Date(a.timestamp).getTime()
      ),
    [logs]
  );

  if (profileLoading || loading) {
    return (
      <Screen>
        <Header title="Dashboard" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#14B2CF" />
        </View>
      </Screen>
    );
  }

  const username = profile?.name || "Friend";
  const goal = profile?.dailyGoal;
  const progress =
    goal && goal > 0
      ? Math.min(Math.round((total / goal) * 100), 100)
      : 0;

  const handleAddAmount = async (amount: number) => {
    if (!amount || amount <= 0) return;
    await addLog(amount);
  };

  const handleAddCustom = async () => {
    const amount = Number(customAmount);
    if (!amount || amount <= 0) return;
    await addLog(amount);
    setCustomAmount("");
  };

  const startEdit = (id: string, amountMl: number) => {
    setEditingId(id);
    setEditAmount(String(amountMl));
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const amount = Number(editAmount);
    if (!amount || amount <= 0) return;

    await updateLog(editingId, amount);
    setEditingId(null);
    setEditAmount("");
  };

  return (
    <Screen>
      <Header title="Dashboard" />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroBubble} />

          <Text style={styles.todayLabel}>TODAY</Text>
          <Text style={styles.heroTitle}>
            Stay hydrated, {username}
          </Text>

          <View style={styles.amountRow}>
            <Text style={styles.totalText}>{total}</Text>
            <Text style={styles.goalText}> / {goal || 0} ml</Text>
          </View>

          <View style={styles.progressLabelRow}>
            <Text style={styles.progressLabel}>Progress</Text>
            <Text style={styles.progressPercent}>{progress}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%` },
              ]}
            />
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeading}>
            <Ionicons
              name="flash"
              size={16}
              color="#22B9C7"
            />
            <Text style={styles.sectionTitle}>Quick Add</Text>
          </View>

          <View style={styles.quickGrid}>
            <Button
              mode="contained"
              icon="cup-water"
              buttonColor="#14B2CF"
              textColor="#FFFFFF"
              onPress={() => handleAddAmount(250)}
              disabled={saving}
              style={styles.quickTile}
              contentStyle={styles.quickTileContent}
            >
              +250 ml
            </Button>

            <Button
              mode="contained"
              icon="cup-water"
              buttonColor="#14B2CF"
              textColor="#FFFFFF"
              onPress={() => handleAddAmount(500)}
              disabled={saving}
              style={styles.quickTile}
              contentStyle={styles.quickTileContent}
            >
              +500 ml
            </Button>
          </View>

          <View style={styles.customRow}>
            <TextInput
              mode="outlined"
              placeholder="Custom amount (ml)"
              value={customAmount}
              onChangeText={setCustomAmount}
              keyboardType="numeric"
              style={styles.customInput}
              disabled={saving}
              outlineColor="#E1E7ED"
              activeOutlineColor="#C3D6E4"
            />
            <Button
              mode="contained"
              onPress={handleAddCustom}
              disabled={saving}
              buttonColor="#14B2CF"
              style={styles.addButton}
            >
              Add
            </Button>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.logsHeader}>
            <View style={styles.sectionHeading}>
              <Ionicons
                name="time-outline"
                size={17}
                color="#22B9C7"
              />
              <Text style={styles.sectionTitle}>Today Logs</Text>
            </View>
            <View style={styles.entriesBadge}>
              <Text style={styles.entriesText}>
                {sortedLogs.length} Entries
              </Text>
            </View>
          </View>

          {sortedLogs.length === 0 ? (
            <Text style={styles.emptyText}>
              No water logged yet
            </Text>
          ) : (
            sortedLogs.map((log) => (
              <View key={log.id} style={styles.logItem}>
                {editingId === log.id ? (
                  <View style={styles.editRow}>
                    <TextInput
                      mode="outlined"
                      value={editAmount}
                      onChangeText={setEditAmount}
                      keyboardType="numeric"
                      style={styles.editInput}
                      label="Amount (ml)"
                      disabled={saving}
                      outlineColor="#D5E6F1"
                      activeOutlineColor="#9DC6DA"
                    />
                    <Button
                      mode="contained"
                      onPress={handleSaveEdit}
                      disabled={saving}
                      buttonColor="#14B2CF"
                    >
                      Save
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={() => setEditingId(null)}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                  </View>
                ) : (
                  <>
                    <View style={styles.logLeft}>
                      <View style={styles.logIconCircle}>
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color="#14B2CF"
                        />
                      </View>
                      <View>
                        <Text style={styles.logAmount}>
                          {log.amountMl} ml
                        </Text>
                        <Text style={styles.logTime}>
                          {formatTime(log.timestamp)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.iconActions}>
                      <IconButton
                        icon="pencil-outline"
                        size={18}
                        mode="outlined"
                        onPress={() =>
                          startEdit(log.id, log.amountMl)
                        }
                        disabled={saving}
                      />
                      <IconButton
                        icon="trash-can-outline"
                        size={18}
                        mode="outlined"
                        onPress={() => deleteLog(log.id)}
                        disabled={saving}
                      />
                    </View>
                  </>
                )}
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
    paddingBottom: 24,
    gap: 14,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  heroCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 24,
    backgroundColor: "#14B2CF",
    padding: 20,
    gap: 10,
    shadowColor: "#14B2CF",
    shadowOpacity: 0.28,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  heroBubble: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 999,
    backgroundColor: "rgba(213,234,244,0.28)",
    top: -16,
    right: -20,
  },
  todayLabel: {
    color: "#DFF2FB",
    fontWeight: "700",
    letterSpacing: 1,
    fontSize: 12,
  },
  heroTitle: {
    color: "#0E1E40",
    fontWeight: "800",
    fontSize: 22,
    lineHeight: 28,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  totalText: {
    color: "#0E1E40",
    fontWeight: "800",
    fontSize: 40,
    lineHeight: 42,
  },
  goalText: {
    color: "#EAF2F8",
    fontWeight: "700",
    fontSize: 28,
  },
  progressLabelRow: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressLabel: {
    color: "#EAF2F8",
    fontWeight: "600",
  },
  progressPercent: {
    color: "#EAF2F8",
    fontWeight: "700",
  },
  progressTrack: {
    marginTop: 2,
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(234,242,248,0.45)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#EAF2F8",
  },
  card: {
    borderRadius: 22,
    backgroundColor: "#F5F7F9",
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: "#E3E9EE",
  },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    color: "#1D293F",
    fontWeight: "800",
    fontSize: 16,
  },
  quickGrid: {
    flexDirection: "row",
    gap: 12,

  },
  quickTile: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#ECF0F4",
  },
  quickTileContent: {
    minHeight: 74,
    flexDirection: "column",
  },
  customRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  customInput: {
    flex: 1,
    backgroundColor: "#EDF1F5",
  },
  addButton: {
    borderRadius: 12,
  },
  logsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  entriesBadge: {
    backgroundColor: "#E8EDF2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  entriesText: {
    color: "#77879A",
    fontWeight: "700",
    fontSize: 12,
  },
  emptyText: {
    color: "#6E8197",
    textAlign: "center",
    paddingVertical: 16,
  },
  logItem: {
    borderRadius: 16,
    backgroundColor: "#ECEFF3",
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DFF2FB",
    justifyContent: "center",
    alignItems: "center",
  },
  logAmount: {
    color: "#233249",
    fontWeight: "800",
    fontSize: 28,
  },
  logTime: {
    color: "#7A8EA3",
    fontSize: 12,
  },
  iconActions: {
    flexDirection: "row",
    gap: 2,
    alignItems: "center",
  },
  editRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editInput: {
    flex: 1,
    backgroundColor: "#EFF4F8",
  },
});
