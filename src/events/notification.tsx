import { useEffect } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { getApp } from "@react-native-firebase/app";
import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  requestPermission,
  setBackgroundMessageHandler,
} from "@react-native-firebase/messaging";

import { saveFcmToken } from "../api/userApi";
import { ACCESS_TOKEN_KEY } from "../api/axiosClient";

/**
 * Modern Firebase messaging instance
 */
const messaging = getMessaging(getApp());
const DAILY_NOTIFICATION_COUNT_KEY_PREFIX = "daily_notification_count_";
const DAILY_NOTIFICATION_LIST_KEY_PREFIX = "daily_notification_list_";
const MAX_DAILY_NOTIFICATIONS = 200;

export type AppNotificationItem = {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
};

const getTodayDateKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDailyCountStorageKey = () =>
  `${DAILY_NOTIFICATION_COUNT_KEY_PREFIX}${getTodayDateKey()}`;

const getDailyListStorageKey = () =>
  `${DAILY_NOTIFICATION_LIST_KEY_PREFIX}${getTodayDateKey()}`;

const incrementTodayNotificationCount = async () => {
  try {
    const key = getDailyCountStorageKey();
    const raw = await AsyncStorage.getItem(key);
    const current = Number(raw || "0");
    const next = Number.isNaN(current) ? 1 : current + 1;
    await AsyncStorage.setItem(key, String(next));
  } catch (error) {
    console.error("Failed to increment notification count:", error);
  }
};

const createNotificationItem = (remoteMessage: any): AppNotificationItem => {
  const title =
    remoteMessage?.notification?.title ||
    remoteMessage?.data?.title ||
    "Hydration reminder";
  const body =
    remoteMessage?.notification?.body ||
    remoteMessage?.data?.body ||
    "Time to drink water";
  const timestamp = new Date().toISOString();
  const id =
    String(remoteMessage?.messageId || "") ||
    `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    id,
    title,
    body,
    timestamp,
    read: false,
  };
};

const appendTodayNotification = async (remoteMessage: any) => {
  try {
    const key = getDailyListStorageKey();
    const raw = await AsyncStorage.getItem(key);
    const existing = raw ? (JSON.parse(raw) as AppNotificationItem[]) : [];
    const item = createNotificationItem(remoteMessage);
    const next = [item, ...existing].slice(0, MAX_DAILY_NOTIFICATIONS);
    await AsyncStorage.setItem(key, JSON.stringify(next));
  } catch (error) {
    console.error("Failed to append notification item:", error);
  }
};

const trackIncomingNotification = async (remoteMessage: any) => {
  await Promise.all([
    appendTodayNotification(remoteMessage),
    incrementTodayNotificationCount(),
  ]);
};

export const getTodayNotificationCount = async (): Promise<number> => {
  try {
    const key = getDailyCountStorageKey();
    const raw = await AsyncStorage.getItem(key);
    const count = Number(raw || "0");
    return Number.isNaN(count) ? 0 : count;
  } catch (error) {
    console.error("Failed to read notification count:", error);
    return 0;
  }
};

export const getTodayNotifications = async (): Promise<AppNotificationItem[]> => {
  try {
    const key = getDailyListStorageKey();
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as AppNotificationItem[];
  } catch (error) {
    console.error("Failed to read notification list:", error);
    return [];
  }
};

export const markTodayNotificationAsRead = async (
  id: string
): Promise<number> => {
  try {
    const listKey = getDailyListStorageKey();
    const countKey = getDailyCountStorageKey();
    const raw = await AsyncStorage.getItem(listKey);
    const items: AppNotificationItem[] = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(items) || !items.length) {
      return getTodayNotificationCount();
    }

    let wasUnread = false;
    const nextItems = items.map((item) => {
      if (item.id !== id) return item;
      if (!item.read) wasUnread = true;
      return { ...item, read: true };
    });

    await AsyncStorage.setItem(listKey, JSON.stringify(nextItems));

    if (!wasUnread) {
      return getTodayNotificationCount();
    }

    const rawCount = await AsyncStorage.getItem(countKey);
    const current = Number(rawCount || "0");
    const nextCount = Number.isNaN(current) ? 0 : Math.max(0, current - 1);
    await AsyncStorage.setItem(countKey, String(nextCount));
    return nextCount;
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
    return getTodayNotificationCount();
  }
};

export const markAllTodayNotificationsAsRead = async (): Promise<number> => {
  try {
    const listKey = getDailyListStorageKey();
    const countKey = getDailyCountStorageKey();
    const raw = await AsyncStorage.getItem(listKey);
    const items: AppNotificationItem[] = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(items) || !items.length) {
      await AsyncStorage.setItem(countKey, "0");
      return 0;
    }

    const nextItems = items.map((item) => ({ ...item, read: true }));
    await AsyncStorage.setItem(listKey, JSON.stringify(nextItems));
    await AsyncStorage.setItem(countKey, "0");
    return 0;
  } catch (error) {
    console.error("Failed to mark all notifications as read:", error);
    return getTodayNotificationCount();
  }
};

const hasAuthToken = async (): Promise<boolean> => {
  const token = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  return !!token;
};

/**
 * Ask notification permission ONLY when user enables toggle
 */
const requestUserPermission = async (): Promise<boolean> => {
  try {
    // Android 13+ permission
    if (Platform.OS === "android") {
      if (Platform.Version < 33) return true;

      const alreadyGranted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );

      if (alreadyGranted) return true;

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );

      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }

    // iOS permission
    if (Platform.OS === "ios") {
      const status = await requestPermission(messaging);
      return status === 1 || status === 2;
    }

    return true;
  } catch (error) {
    console.error("Permission error:", error);
    return false;
  }
};

/**
 * Called ONLY when user enables notifications
 */
export const syncFcmTokenToBackend = async (): Promise<boolean> => {
  try {
    if (!(await hasAuthToken())) {
      return false;
    }

    const hasPermission = await requestUserPermission();
    if (!hasPermission) return false;

    const token = await getToken(messaging);
    if (!token) return false;

    console.log("FCM token:", token);

    await saveFcmToken(token);
    return true;
  } catch (error) {
    console.error("FCM sync error:", error);
    return false;
  }
};

/**
 * Background handler
 * Runs when app is background/killed
 */
setBackgroundMessageHandler(messaging, async (remoteMessage) => {
  console.log("Background message received:", remoteMessage);
  await trackIncomingNotification(remoteMessage);
});

/**
 * Token refresh listener
 */
export const Notification = () => {
  useEffect(() => {
    const unsubscribeTokenRefresh = onTokenRefresh(messaging, async (token) => {
      try {
        if (!(await hasAuthToken())) {
          return;
        }

        if (token) {
          console.log("Token refreshed:", token);
          await saveFcmToken(token);
        }
      } catch (error) {
        console.error("Token refresh error:", error);
      }
    });

    const unsubscribeMessage = onMessage(messaging, async (remoteMessage) => {
      console.log("Foreground message received:", remoteMessage);
      await trackIncomingNotification(remoteMessage);
    });

    return () => {
      unsubscribeTokenRefresh();
      unsubscribeMessage();
    };
  }, []);

  return null;
};
