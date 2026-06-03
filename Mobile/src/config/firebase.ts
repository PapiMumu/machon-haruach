// Firebase Analytics via @react-native-firebase — not available in Expo Go (no native module).
// Never import RNFirebase at module load; use require() only after a native presence check.

import { NativeModules } from "react-native";

type FirebaseNativeModules = {
  RNFBAppModule?: unknown;
  RNFBAnalyticsModule?: unknown;
};

/** True when @react-native-firebase/app is linked (required for Android FCM / Expo push token). */
export function isFirebaseAppAvailable(): boolean {
  try {
    const modules = NativeModules as FirebaseNativeModules;
    return !!modules.RNFBAppModule;
  } catch {
    return false;
  }
}

/** True when a dev/production build has linked Firebase app + analytics. False in Expo Go. */
export function isNativeFirebaseAvailable(): boolean {
  try {
    const modules = NativeModules as FirebaseNativeModules;
    return !!modules.RNFBAppModule && !!modules.RNFBAnalyticsModule;
  } catch {
    return false;
  }
}

export const initializeFirebase = async () => {
  if (!isNativeFirebaseAvailable()) {
    if (__DEV__) {
      console.log("[firebase] Skipped: RN Firebase app/analytics native modules not present (e.g. Expo Go or analytics pod not linked).");
    }
    return;
  }
  try {
    const { getApp } = require("@react-native-firebase/app") as typeof import("@react-native-firebase/app");
    const { getAnalytics, setAnalyticsCollectionEnabled } = require("@react-native-firebase/analytics") as typeof import("@react-native-firebase/analytics");
    const app = getApp();
    const analytics = getAnalytics(app);
    await setAnalyticsCollectionEnabled(analytics, true);
    console.log("Firebase Analytics enabled successfully");
  } catch (error) {
    console.log("Firebase initialization error:", error);
  }
};

export const logAnalyticsEvent = async (eventName: string, parameters?: any) => {
  if (!isNativeFirebaseAvailable()) return;
  try {
    const { getApp } = require("@react-native-firebase/app") as typeof import("@react-native-firebase/app");
    const { getAnalytics, logEvent } = require("@react-native-firebase/analytics") as typeof import("@react-native-firebase/analytics");
    const app = getApp();
    const analytics = getAnalytics(app);
    await logEvent(analytics, eventName, parameters);
    console.log("Analytics event logged:", eventName, parameters);
  } catch (error) {
    console.log("Analytics event logging error:", error);
  }
};

export const testFirebaseFeatures = async (): Promise<boolean> => {
  if (!isNativeFirebaseAvailable()) return false;
  try {
    const { getApp } = require("@react-native-firebase/app") as typeof import("@react-native-firebase/app");
    const { getAnalytics, logEvent } = require("@react-native-firebase/analytics") as typeof import("@react-native-firebase/analytics");
    const app = getApp();
    const analytics = getAnalytics(app);
    await logEvent(analytics, "test_event", { test: true });
    return true;
  } catch (error) {
    console.error("Firebase features test failed:", error);
    return false;
  }
};
