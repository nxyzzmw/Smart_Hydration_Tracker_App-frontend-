import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

type LoadingAnimationProps = {
  size?: number;
};

export default function LoadingAnimation({
  size = 120,
}: LoadingAnimationProps) {
  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <ActivityIndicator size="large" color="#14B2CF" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
