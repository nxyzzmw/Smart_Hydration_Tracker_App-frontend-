import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { Text, Button } from "react-native-paper";
import Screen from "../../components/Screen";
import Header from "../../components/header";
import { useProfile } from "../../hooks/useProfile";
import { useWater } from "../../hooks/useWater";

export default function Dashboard() {
  const { profile, loading: profileLoading } = useProfile();
  const { logs, total, loading, addLog, removeLog } = useWater();

  // Wait for profile only (water is mocked anyway)
  if (profileLoading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </Screen>
    );
  }

  const username = profile?.name || "Friend";

  // ✅ Get daily goal from backend ONLY
  const goal = profile?.dailyGoal;

  const progress =
    goal && goal > 0
      ? Math.min(Math.round((total / goal) * 100), 100)
      : 0;

  return (
    <Screen>
      <Header title="Dashboard" />

      <View style={styles.container}>
        <Text variant="titleSmall">TODAY</Text>

        <Text variant="headlineMedium">
          Stay hydrated, {username}
        </Text>

        {/* If backend didn’t return goal */}
        {!goal ? (
          <Text>
            Daily goal not available
          </Text>
        ) : (
          <>
            <Text variant="titleMedium">
              {total} / {goal} ml
            </Text>

            <Text>Progress: {progress}%</Text>
          </>
        )}

        {/* Quick add buttons */}
        <View style={styles.row}>
          <Button onPress={() => addLog(250)}>
            +250ml
          </Button>
          <Button onPress={() => addLog(500)}>
            +500ml
          </Button>
        </View>

        {/* Logs */}
        {logs.length === 0 ? (
          <Text>No water logged yet</Text>
        ) : (
          logs.map((log) => (
            <View
              key={log._id}
              style={styles.logRow}
            >
              <Text>{log.amount} ml</Text>
              <Button
                onPress={() =>
                  removeLog(log._id)
                }
              >
                Delete
              </Button>
            </View>
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  logRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
