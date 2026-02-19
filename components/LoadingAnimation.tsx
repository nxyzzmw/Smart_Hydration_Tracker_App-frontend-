import React from "react";
import { ActivityIndicator, StyleSheet, UIManager, View } from "react-native";
import LottieView from "lottie-react-native";

type LoadingAnimationProps = {
  size?: number;
};

export default function LoadingAnimation({ size = 120 }: LoadingAnimationProps) {
  const hasLottieNativeView =
    !!UIManager.getViewManagerConfig?.("LottieAnimationView") ||
    !!UIManager.getViewManagerConfig?.("RCTLottieAnimationView");

  return (
    <View style={styles.wrap}>
      {hasLottieNativeView ? (
        <LottieView
          source={require("../assets/animations/water-loading.json")}
          autoPlay
          loop
          style={{ width: size, height: size }}
        />
      ) : (
        <ActivityIndicator size="large" color="#14B2CF" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
