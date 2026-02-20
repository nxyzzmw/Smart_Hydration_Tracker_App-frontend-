import React, { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import LoadingAnimation from "../../components/LoadingAnimation";
import {
  AppNotificationItem,
  getTodayNotifications,
  markAllTodayNotificationsAsRead,
  markTodayNotificationAsRead,
} from "../../src/events/notification";

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function NotificationsTab() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AppNotificationItem[]>([]);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const list = await getTodayNotifications();
      setItems(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(

    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const unreadCount = useMemo(
    () => items.filter((item) => !item.read).length,
    [items]
  );

  const handleOpenNotification = async (item: AppNotificationItem) => {
    await markTodayNotificationAsRead(item.id);
    setItems((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, read: true } : row))
    );
    router.push("/tabs");
  };

  const handleMarkAllAsRead = async () => {
    await markAllTodayNotificationsAsRead();
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  return (
    <Screen>
      <View style={styles.pageHeaderWrap}>
        <View style={styles.pageHeader}>
          <Pressable onPress={() => router.back()} style={styles.headerIconBtn}>
            <Ionicons name="arrow-back" size={24} color="#4A5D77" />
          </Pressable>
          <Text style={styles.pageTitle}>Notifications</Text>
          <View style={styles.headerRight} />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <LoadingAnimation size={96} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Today</Text>
            <View style={styles.summaryRight}>
              <Text style={styles.summaryValue}>{unreadCount} unread</Text>
              <TouchableOpacity onPress={handleMarkAllAsRead}>
                <Text style={styles.markAllText}>Mark all as read</Text>
              </TouchableOpacity>
            </View>
          </View>

          {items.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="notifications-off-outline" size={22} color="#7A96AD" />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          ) : (
            items.map((item) => (
              <Pressable
                key={item.id}
                style={[styles.itemCard, item.read && styles.itemCardRead]}
                onPress={() => handleOpenNotification(item)}
              >
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemTime}>{formatTime(item.timestamp)}</Text>
                </View>
                <Text style={styles.itemBody}>{item.body}</Text>
                {!item.read ? <View style={styles.unreadDot} /> : null}
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageHeaderWrap: {
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 4,
    backgroundColor: "#EAF2F8",
  },
  pageHeader: {
    marginBottom: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerIconBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#F8FBFE",
    borderWidth: 1,
    borderColor: "#D8E2EC",
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 23,
    fontWeight: "900",
    color: "#0B1630",
  },
  headerRight: { width: 54, height: 54 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28, gap: 10 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryRight: { flexDirection: "row", alignItems: "center", gap: 12 },
  summaryLabel: { color: "#3F556D", fontSize: 15, fontWeight: "600" },
  summaryValue: { color: "#0A9CF0", fontSize: 15, fontWeight: "700" },
  markAllText: { color: "#0A9CF0", fontSize: 13, fontWeight: "700" },
  emptyCard: {
    minHeight: 80,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2EAF1",
    backgroundColor: "#F5F7F9",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: { color: "#6B829A", fontSize: 15, fontWeight: "600" },
  itemCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D6E6F1",
    backgroundColor: "#EAF4FA",
    padding: 14,
    gap: 6,
    position: "relative",
  },
  itemCardRead: {
    backgroundColor: "#F5F7F9",
    borderColor: "#E2EAF1",
  },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  itemTitle: { color: "#0E1E40", fontSize: 15, fontWeight: "800", flex: 1 },
  itemTime: { color: "#59708A", fontSize: 12, fontWeight: "600" },
  itemBody: { color: "#3F556D", fontSize: 14, fontWeight: "500" },
  unreadDot: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#14B2CF",
  },
});
