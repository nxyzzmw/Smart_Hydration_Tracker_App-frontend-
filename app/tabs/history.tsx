import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Button, Text, TextInput } from "react-native-paper";
import Screen from "../../components/Screen";
import Header from "../../components/header";
import { useProfile } from "../../hooks/useProfile";
import { useWater } from "../../hooks/useWater";
import { toDisplayAmount, fromDisplayAmount } from "../../src/utils/hydrationCalculator";

export default function History() {
  const { profile } = useProfile();
  const { logs, updateLog, deleteLog } = useWater();
  const unit = (profile?.unit || "ml") as "ml" | "oz";

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const sorted = useMemo(
    () =>
      [...logs].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      ),
    [logs]
  );

  const startEdit = (id: string, amountMl: number) => {
    setEditingId(id);
    setEditValue(String(toDisplayAmount(amountMl, unit)));
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const val = Number(editValue);
    if (!val || val <= 0) return;
    await updateLog(editingId, fromDisplayAmount(val, unit));
    setEditingId(null);
    setEditValue("");
  };

  return (
    <Screen>
      <Header />

      <View style={styles.container}>
        <Text variant="headlineMedium">Water Logs</Text>

        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => {
            const isEditing = editingId === item.id;
            const displayAmount = toDisplayAmount(item.amountMl, unit);
            const time = new Date(item.timestamp).toLocaleString();

            return (
              <View style={styles.logCard}>
                <Text>
                  {displayAmount} {unit} • {time}
                </Text>

                {isEditing ? (
                  <View style={styles.row}>
                    <TextInput
                      label={`Amount (${unit})`}
                      value={editValue}
                      onChangeText={setEditValue}
                      keyboardType="numeric"
                      style={styles.input}
                    />
                    <Button mode="contained" onPress={saveEdit}>
                      Save
                    </Button>
                    <Button mode="outlined" onPress={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </View>
                ) : (
                  <View style={styles.row}>
                    <Button mode="outlined" onPress={() => startEdit(item.id, item.amountMl)}>
                      Edit
                    </Button>
                    <Button mode="contained" onPress={() => deleteLog(item.id)}>
                      Delete
                    </Button>
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>No logs yet.</Text>
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  logCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
    gap: 8,
  },
  row: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  input: {
    flex: 1,
    minWidth: 140,
  },
  empty: {
    marginTop: 30,
    textAlign: "center",
  },
});
