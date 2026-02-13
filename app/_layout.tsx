import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Notification } from "../src/events/notification";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Notification />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
