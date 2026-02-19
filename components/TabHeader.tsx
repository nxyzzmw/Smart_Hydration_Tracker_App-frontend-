import React, { useCallback, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { getTodayNotificationCount } from "../src/events/notification";

type TabHeaderProps = {
  title: string;
  onProfilePress: () => void;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function TabHeader({
  title,
  onProfilePress,
  action,
  style,
}: TabHeaderProps) {
  const router = useRouter();
  const [todayNotificationCount, setTodayNotificationCount] = useState(0);

  const refreshTodayNotificationCount = useCallback(async () => {
    const count = await getTodayNotificationCount();
    setTodayNotificationCount(count);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshTodayNotificationCount();
    }, [refreshTodayNotificationCount])
  );

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.right}>
        {action}
        <Pressable
          onPress={() => router.push("/tabs/notifications")}
          style={styles.notificationIconBtn}
        >
          <Ionicons name="notifications-outline" size={22} color="#0A9CF0" />
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>{todayNotificationCount}</Text>
          </View>
        </Pressable>
        <Pressable onPress={onProfilePress} style={styles.profileIconBtn}>
          <Ionicons name="person-circle-outline" size={28} color="#4A5D77" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 23,
    fontWeight: "900",
    color: "#0B1630",
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  notificationIconBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#F8FBFE",
    borderWidth: 1,
    borderColor: "#D8E2EC",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#14B2CF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
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
});
