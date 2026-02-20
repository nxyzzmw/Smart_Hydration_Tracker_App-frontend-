import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Screen from "./Screen";

type Props = {
  children: React.ReactNode;
};

const SWIPEABLE_TABS = [
  "/tabs/index",
  "/tabs/analytics",
  "/tabs/history",
  "/tabs/settings",
] as const;
const MIN_SWIPE_DISTANCE = 40;
const MAX_VERTICAL_DRIFT = 40;

function normalizePathname(pathname: string) {
  if (pathname === "/tabs") return "/tabs/index";
  return pathname;
}

export default function TabSwipeScreen({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .activeOffsetX([-20, 20])
        .failOffsetY([-15, 15])
        .onEnd((event) => {
          if (Math.abs(event.translationY) > MAX_VERTICAL_DRIFT) return;
          if (Math.abs(event.translationX) < MIN_SWIPE_DISTANCE) return;

          const currentPath = normalizePathname(pathname);
          const currentIdx = SWIPEABLE_TABS.indexOf(
            currentPath as (typeof SWIPEABLE_TABS)[number]
          );
          if (currentIdx < 0) return;

          const targetIdx =
            event.translationX < 0 ? currentIdx + 1 : currentIdx - 1;
          const targetPath = SWIPEABLE_TABS[targetIdx];
          if (!targetPath) return;

          router.replace(targetPath);
        }),
    [pathname, router]
  );

  return (
    <Screen>
      <GestureDetector gesture={swipeGesture}>
        <View style={styles.content}>{children}</View>
      </GestureDetector>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
});
