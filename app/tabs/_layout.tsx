import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../hooks/useAuth";
import LoadingAnimation from "../../components/LoadingAnimation";

export default function TabLayout() {
  const { loading, authenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const floatingBottom = Math.max(insets.bottom, 12);
  const tabBarHeight = 64;

  // Avoid visible spinner flicker between splash and tabs auth check.
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#F4F9FD",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <LoadingAnimation size={96} />
      </View>
    );
  }

  // Redirect to login if not authenticated
  if (!authenticated) {
    return <Redirect href="/auth/login" />;
  }

  // Protected tabs
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        lazy: false,
        tabBarShowLabel: false,
        sceneStyle: {
          paddingBottom: tabBarHeight + floatingBottom - 8,
        },
        tabBarActiveTintColor: "#14B2CF",
        tabBarInactiveTintColor: "#6E879E",
        tabBarActiveBackgroundColor: "transparent",
        tabBarStyle: {
          position: "absolute",
          alignSelf: "center",
          bottom: 20,
          height: tabBarHeight,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          paddingTop: 8,
          paddingBottom: 8,
          paddingHorizontal: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarBackground: () => (
          <View
            style={{
              flex: 1,
              borderRadius: 999,
              backgroundColor: "#F6FAFD",
              shadowColor: "#0D223A",
              shadowOpacity: 0.1,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 5 },
              elevation: 8,
            }}
          />
        ),
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "700",
          marginTop: 0,
        },
        tabBarItemStyle: {
          borderRadius: 999,
          marginHorizontal: 4,
          marginVertical: 2,
          paddingVertical: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={focused ? size + 1 : size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "bar-chart" : "bar-chart-outline"}
              size={focused ? size + 1 : size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "time" : "time-outline"}
              size={focused ? size + 1 : size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "settings" : "settings-outline"}
              size={focused ? size + 1 : size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          href: null,
        }}
      />
    </Tabs>
  );
}
