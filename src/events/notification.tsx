import { useEffect } from "react";
import { PermissionsAndroid, Platform } from "react-native";

import { getApp } from "@react-native-firebase/app";
import {
  getMessaging,
  getToken,
  onTokenRefresh,
  requestPermission,
  setBackgroundMessageHandler,
} from "@react-native-firebase/messaging";

import { saveFcmToken } from "../api/userApi";

/**
 * Modern Firebase messaging instance
 */
const messaging = getMessaging(getApp());

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
});

/**
 * Token refresh listener
 */
export const Notification = () => {
  useEffect(() => {
    const unsubscribe = onTokenRefresh(messaging, async (token) => {
      try {
        if (token) {
          console.log("Token refreshed:", token);
          await saveFcmToken(token);
        }
      } catch (error) {
        console.error("Token refresh error:", error);
      }
    });

    return unsubscribe;
  }, []);

  return null;
};
