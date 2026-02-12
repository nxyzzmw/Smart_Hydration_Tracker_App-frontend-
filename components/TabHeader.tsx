import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.right}>
        {action}
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
