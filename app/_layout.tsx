import { Stack } from "expo-router";
import { useEffect } from "react";
import { LogBox } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Notification } from "../src/events/notification";

export default function RootLayout() {
  useEffect(() => {
    LogBox.ignoreLogs(["Unable to activate keep awake"]);

    void import("promise/setimmediate/rejection-tracking")
      .then((rejectionTracking: any) => {
        rejectionTracking?.enable?.({
          allRejections: true,
          onUnhandled: (id: number, rejection: any) => {
            const message = String(
              rejection?.message || rejection?.toString?.() || rejection || ""
            ).toLowerCase();
            if (message.includes("unable to activate keep awake")) {
              return;
            }
            console.warn(`Possible unhandled promise rejection (id: ${id}):`, rejection);
          },
          onHandled: () => {},
        });
      })
      .catch(() => {
        // Keep default RN behavior if tracker cannot be overridden.
      });

    const errorUtils = (global as any)?.ErrorUtils;
    if (!errorUtils?.getGlobalHandler || !errorUtils?.setGlobalHandler) {
      return;
    }

    const previousGlobalHandler = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
      const message = String(error?.message || "").toLowerCase();
      if (message.includes("unable to activate keep awake")) {
        return;
      }

      if (typeof previousGlobalHandler === "function") {
        previousGlobalHandler(error, isFatal);
      }
    });

    return () => {
      if (typeof previousGlobalHandler === "function") {
        errorUtils.setGlobalHandler(previousGlobalHandler);
      }
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Notification />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
