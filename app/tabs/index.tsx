import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  Text,
  View,
  StyleSheet,
  ScrollView,
} from "react-native";
import {
  Button,
  TextInput,
  IconButton,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Screen from "../../components/Screen";
import TabHeader from "../../components/TabHeader";
import LoadingAnimation from "../../components/LoadingAnimation";
import { useProfile } from "../../hooks/useProfile";
import { useWater } from "../../hooks/useWater";
import {
  fromMl,
  normalizeUnit,
  roundVolume,
  toMl,
} from "../../src/utils/units";

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
  const router = useRouter();
  const [customAmount, setCustomAmount] = useState("");
  const [customModalVisible, setCustomModalVisible] = useState(false);
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
        <View style={styles.pageHeaderWrap}>
          <TabHeader
            title="Dashboard"
            onProfilePress={() => router.push("/profile")}
            style={styles.pageHeader}
          />
        </View>
        <View style={styles.center}>
          <LoadingAnimation size={96} />
        </View>
      </Screen>
    );
  }

  const username = profile?.name || "Friend";
  const unit = normalizeUnit(profile?.unit);
  const goal = profile?.dailyGoal;
  const progress =
    goal && goal > 0
      ? Math.min(Math.round((total / goal) * 100), 100)
      : 0;
  const displayTotal = roundVolume(fromMl(total, unit), unit);
  const displayGoal = roundVolume(fromMl(Number(goal || 0), unit), unit);
  const quickAddMlValues = [250, 500, 750];

  const handleAddAmount = async (amount: number) => {
    if (!amount || amount <= 0) return;
    try {
      await addLog(amount);
    } catch (error) {
      console.log("Add log failed:", error);
    }
  };

  const handleAddCustom = async () => {
    const inputAmount = Number(customAmount);
    if (!inputAmount || inputAmount <= 0) return;
    const amountMl = Math.round(toMl(inputAmount, unit));
    if (amountMl <= 0) return;
    try {
      await addLog(amountMl);
      setCustomAmount("");
      setCustomModalVisible(false);
    } catch (error) {
      console.log("Add custom log failed:", error);
    }
  };

  const startEdit = (id: string, amountMl: number) => {
    setEditingId(id);
    setEditAmount(String(roundVolume(fromMl(amountMl, unit), unit)));
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const amountInput = Number(editAmount);
    if (!amountInput || amountInput <= 0) return;
    const amountMl = Math.round(toMl(amountInput, unit));
    if (amountMl <= 0) return;

    try {
      await updateLog(editingId, amountMl);
      setEditingId(null);
      setEditAmount("");
    } catch (error) {
      console.log("Update log failed:", error);
    }
  };

  return (
    <Screen>
      <View style={styles.pageHeaderWrap}>
        <TabHeader
          title="Dashboard"
          onProfilePress={() => router.push("/profile")}
          style={styles.pageHeader}
        />
      </View>

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
            <Text style={styles.totalText}>{displayTotal}</Text>
            <Text style={styles.goalText}> / {displayGoal} {unit}</Text>
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
            <Pressable
              onPress={() => handleAddAmount(quickAddMlValues[0])}
              disabled={saving}
              style={styles.quickTile}
            >
              <Text style={styles.quickTileLabel}>
                {roundVolume(fromMl(quickAddMlValues[0], unit), unit)}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleAddAmount(quickAddMlValues[1])}
              disabled={saving}
              style={styles.quickTile}
            >
              <Text style={styles.quickTileLabel}>
                {roundVolume(fromMl(quickAddMlValues[1], unit), unit)}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => handleAddAmount(quickAddMlValues[2])}
              disabled={saving}
              style={styles.quickTile}
            >
              <Text style={styles.quickTileLabel}>
                {roundVolume(fromMl(quickAddMlValues[2], unit), unit)}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setCustomModalVisible(true)}
              disabled={saving}
              style={styles.quickTileAdd}
            >
              <Ionicons name="add" size={24} color="#FFFFFF" />
            </Pressable>
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
            sortedLogs.map((log, idx) => {
              const logId = log.id;
              const rowKey =
                logId ||
                `${log.timestamp ?? "no-ts"}-${log.amountMl ?? 0}-${idx}`;

              return (
                <View key={rowKey} style={styles.logItem}>
                {editingId === logId ? (
                  <View style={styles.editRow}>
                    <TextInput
                      mode="outlined"
                      value={editAmount}
                      onChangeText={setEditAmount}
                      keyboardType="numeric"
                      style={styles.editInput}
                      label={`Amount (${unit})`}
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
                          {roundVolume(fromMl(log.amountMl, unit), unit)} {unit}
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
                          logId &&
                          startEdit(logId, log.amountMl)
                        }
                        disabled={saving}
                      />
                      <IconButton
                        icon="trash-can-outline"
                        size={18}
                        mode="outlined"
                        onPress={async () => {
                          if (!logId) return;
                          try {
                            await deleteLog(logId);
                          } catch (error) {
                            console.log(
                              "Delete log failed:",
                              error
                            );
                          }
                        }}
                        disabled={saving}
                      />
                    </View>
                  </>
                )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      <Modal
        visible={customModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setCustomModalVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => null}>
            <Text style={styles.modalTitle}>Custom amount</Text>
            <TextInput
              mode="outlined"
              placeholder={`Custom amount (${unit})`}
              value={customAmount}
              onChangeText={setCustomAmount}
              keyboardType="numeric"
              style={styles.customInput}
              disabled={saving}
              outlineColor="#D5DEE8"
              activeOutlineColor="#0A9CF0"
            />
            <View style={styles.modalActions}>
              <Button
                mode="text"
                onPress={() => setCustomModalVisible(false)}
                textColor="#5B6F86"
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                icon="plus"
                onPress={handleAddCustom}
                disabled={saving}
                loading={saving}
                buttonColor="#14B2CF"
                style={styles.addButton}
                contentStyle={styles.addButtonContent}
              >
                Add
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 24,
    gap: 16,
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
    borderRadius: 28,
    backgroundColor: "#F5F7F9",
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: "#E2EAF1",
    shadowColor: "#0E1E40",
    shadowOpacity: 0.07,
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
    color: "#0E1E40",
    fontWeight: "900",
    fontSize: 20,
  },
  quickGrid: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  quickTile: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#DBEAF2",
    alignItems: "center",
    justifyContent: "center",
  },
  quickTileAdd: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#14B2CF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#14B2CF",
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  quickTileLabel: {
    marginVertical: 0,
    textAlign: "center",
    fontWeight: "800",
    color: "#1BA3C7",
  },
  customInput: {
    backgroundColor: "#F8FBFE",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(12, 23, 40, 0.3)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    borderRadius: 20,
    backgroundColor: "#F5F7F9",
    borderWidth: 1,
    borderColor: "#E2EAF1",
    padding: 16,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0E1E40",
  },
  modalActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
  },
  addButton: {
    borderRadius: 14,
    shadowColor: "#14B2CF",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  addButtonContent: {
    paddingHorizontal: 8,
  },
  logsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  entriesBadge: {
    backgroundColor: "#E9EEF4",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
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
    borderRadius: 18,
    backgroundColor: "#F8FBFE",
    borderWidth: 1,
    borderColor: "#E2EAF1",
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#0E1E40",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
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
