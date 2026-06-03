import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { DeviceEventEmitter, PermissionsAndroid, Platform, AppState, NativeModules } from "react-native";
import * as Device from "expo-device";
import { useUserStore } from "../stores/useUserStore";
import { ApiHelper } from "@machonharuach/helpers";
import { isFirebaseAppAvailable } from "../config/firebase";

const FCM_SETUP_URL = "https://docs.expo.dev/push-notifications/fcm-credentials/";

function isRemotePushConfigured(): boolean {
  if (isExpoGo) return false;
  if (Platform.OS === "ios") return true;
  const fcmConfigured = Constants.expoConfig?.extra?.FCM_CONFIGURED === true;
  return fcmConfigured && isFirebaseAppAvailable();
}

function logRemotePushSkipped(reason: string) {
  console.log(`[push] Skipping remote push token (${reason}). Setup: ${FCM_SETUP_URL}`);
}

// Track current screen and app state
let currentScreen = "";
let isAppInForeground = true;
const isExpoGo = Constants.appOwnership === "expo";

// react-native-device-info is not available in Expo Go.
const hasNativeDeviceInfo = !!(NativeModules as { RNDeviceInfo?: unknown }).RNDeviceInfo;
const DeviceInfoSafe = {
  async getDeviceName(): Promise<string> {
    if (hasNativeDeviceInfo) {
      try {
        const { default: DeviceInfo } = require("react-native-device-info");
        return await DeviceInfo.getDeviceName();
      } catch {
        // fall through to Expo fallback
      }
    }
    return Device.deviceName || `${Platform.OS} device`;
  },
  async getUniqueId(): Promise<string> {
    if (hasNativeDeviceInfo) {
      try {
        const { default: DeviceInfo } = require("react-native-device-info");
        return await DeviceInfo.getUniqueId();
      } catch {
        // fall through to Expo fallback
      }
    }
    return Device.osInternalBuildId || Device.modelId || "unknown-device";
  },
  async getSystemName(): Promise<string> {
    if (hasNativeDeviceInfo) {
      try {
        const { default: DeviceInfo } = require("react-native-device-info");
        return await DeviceInfo.getSystemName();
      } catch {
        // fall through to Expo fallback
      }
    }
    return Platform.OS;
  },
  async getSystemVersion(): Promise<string> {
    if (hasNativeDeviceInfo) {
      try {
        const { default: DeviceInfo } = require("react-native-device-info");
        return await DeviceInfo.getSystemVersion();
      } catch {
        // fall through to Expo fallback
      }
    }
    return Device.osVersion || "";
  },
  async getModel(): Promise<string> {
    if (hasNativeDeviceInfo) {
      try {
        const { default: DeviceInfo } = require("react-native-device-info");
        return await DeviceInfo.getModel();
      } catch {
        // fall through to Expo fallback
      }
    }
    return Device.modelName || "unknown";
  },
  async getBrand(): Promise<string> {
    if (hasNativeDeviceInfo) {
      try {
        const { default: DeviceInfo } = require("react-native-device-info");
        return await DeviceInfo.getBrand();
      } catch {
        // fall through to Expo fallback
      }
    }
    return Device.brand || "unknown";
  }
};

// Function to update current screen
export const updateCurrentScreen = (screen: string) => {
  currentScreen = screen;
};

// Initialize app state listener
AppState.addEventListener("change", nextAppState => {
  isAppInForeground = nextAppState === "active";
});

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async notification => {
    const isInMessageScreen = currentScreen === "/messageScreenRoot";
    const isInNotificationsScreen = currentScreen === "/(drawer)/notifications";

    // Check if we're currently viewing the relevant content
    const notificationData = notification.request.content.data;
    const isViewingRelevantMessage = notificationData?.type === "chat" && notificationData?.chatId && isInMessageScreen;

    // If app is in foreground, handle internally and suppress OS notification
    if (isAppInForeground) {
      // Always emit the notification event for bell badge updates
      eventBus.emit("notification", notification.request.content);

      return {
        shouldShowAlert: false, // Never show OS alert when app is in foreground
        shouldPlaySound: !isViewingRelevantMessage && !isInNotificationsScreen, // Don't play sound if viewing relevant content
        shouldSetBadge: true,
        shouldShowBanner: false,
        shouldShowList: false
      };
    }

    // If app is in background or closed, show system notification
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true
    };
  }
});

export class PushNotificationHelper {
  static async registerUserDevice() {
    try {
      const userStore = useUserStore.getState();
      const currentUserChurch = userStore.currentUserChurch;

      // Only register if user is logged in and has a person record
      if (!currentUserChurch?.person?.id) {
        console.log("No user logged in, skipping device registration");
        return;
      }

      // Get device information
      const fcmToken = userStore.fcmToken; // Use Expo push token as fcmToken
      const deviceName = await DeviceInfoSafe.getDeviceName();
      const deviceInfo = await PushNotificationHelper.getDeviceInfo();

      if (!fcmToken) {
        console.log("No FCM token available, skipping device registration");
        return;
      }

      // Register device with API
      await ApiHelper.post(
        "/devices/enroll",
        {
          personId: currentUserChurch.person.id,
          fcmToken,
          label: deviceName,
          deviceInfo: JSON.stringify(deviceInfo)
        },
        "MessagingApi"
      );

      console.log("Device registered successfully for user:", currentUserChurch.person.name);
    } catch (error) {
      console.error("Error registering device:", error);
    }
  }

  static async getDeviceInfo() {
    try {
      return {
        deviceId: await DeviceInfoSafe.getUniqueId(),
        deviceName: await DeviceInfoSafe.getDeviceName(),
        systemName: await DeviceInfoSafe.getSystemName(),
        systemVersion: await DeviceInfoSafe.getSystemVersion(),
        model: await DeviceInfoSafe.getModel(),
        brand: await DeviceInfoSafe.getBrand(),
        isDevice: Device.isDevice,
        platform: Platform.OS
      };
    } catch (error) {
      console.error("Error getting device info:", error);
      return {
        platform: Platform.OS,
        isDevice: Device.isDevice
      };
    }
  }

  static async requestUserPermission() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus === "granted") {
        await PushNotificationHelper.GetFCMToken();
      } else {
        // Permission not granted, but we continue without notification permissions
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
    }
  }

  static async registerForPushNotificationsAsync() {
    if (isExpoGo) {
      console.log("[push] Skipping remote push registration in Expo Go (SDK 53+).");
      return null;
    }
    if (!isRemotePushConfigured()) {
      logRemotePushSkipped("Firebase/FCM not configured for this build");
      return null;
    }
    if (!Device.isDevice) {
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return null;
    }

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      return tokenData.data;
    } catch (error) {
      console.error("Error getting Expo push token:", error);
      return null;
    }
  }

  static async NotificationPermissionAndroid() {
    if (Platform.OS === "android") {
      try {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      } catch {
        // Permission request failed, but we continue without notification permissions
      }
    }
  }

  static async GetFCMToken() {
    if (isExpoGo) {
      console.log("[push] Expo Go detected; skipping GetFCMToken (remote push unavailable).");
      return;
    }
    if (!isRemotePushConfigured()) {
      logRemotePushSkipped("Firebase/FCM not configured for this build");
      return;
    }
    let fcmToken = useUserStore.getState().fcmToken;
    if (!fcmToken) {
      try {
        // Get the Expo push token
        const token = await Notifications.getExpoPushTokenAsync({ projectId: "f72e5911-b8d5-467c-ad9e-423c180e9938" });

        if (token.data) {
          fcmToken = token.data;
          useUserStore.getState().setFcmToken(fcmToken);

          // 🚨 TESTING: Log device info for push notification testing
          console.log("=== PUSH NOTIFICATION TESTING INFO ===");
          console.log("Expo Push Token:", fcmToken);
          console.log("EAS Project ID: f72e5911-b8d5-467c-ad9e-423c180e9938");

          // Get device info
          const deviceName = await DeviceInfoSafe.getDeviceName();
          const deviceId = await DeviceInfoSafe.getUniqueId();
          const currentUser = useUserStore.getState().currentUserChurch;

          console.log("Device Name:", deviceName);
          console.log("Device ID:", deviceId);
          console.log("Current User:", currentUser?.person?.name || "Not logged in");
          console.log("Current Church:", currentUser?.church?.name || "No church selected");
          console.log("Person ID:", currentUser?.person?.id || "N/A");
          console.log("=====================================");
        }
      } catch (error) {
        if (__DEV__) {
          console.warn("Expo push token not created:", error);
        } else {
          console.error("Expo push token not created:", error);
        }
      }
    } else {
      // Token already exists, log it anyway for testing
      console.log("=== EXISTING PUSH TOKEN ===");
      console.log("Expo Push Token:", fcmToken);
      console.log("==========================");
    }
  }

  static async NotificationListener() {
    try {
      // Listen for notifications received while app is foregrounded
      const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
        const content = notification.request.content;

        // Emit notification event for internal handling
        eventBus.emit("notification", content);

        // If it's a chat notification, emit chat update event
        if (content.data?.type === "chat") {
          eventBus.emit("chatNotification", content.data);
        }
      });

      // Listen for user interactions with notifications
      const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
        const content = response.notification.request.content;

        // Handle navigation based on notification type
        if (content.data?.type === "chat") {
          eventBus.emit("navigateToChat", content.data);
        } else if (content.data?.type === "notification") {
          eventBus.emit("navigateToNotification", content.data);
        }
      });

      // Get notification that opened the app
      const lastNotificationResponse = await Notifications.getLastNotificationResponseAsync();
      if (lastNotificationResponse) {
        const content = lastNotificationResponse.notification.request.content;

        // Handle navigation for app launch from notification
        if (content.data?.type === "chat") {
          eventBus.emit("navigateToChat", content.data);
        } else if (content.data?.type === "notification") {
          eventBus.emit("navigateToNotification", content.data);
        }
      }

      return () => {
        foregroundSubscription.remove();
        responseSubscription.remove();
      };
    } catch (error) {
      console.error("Error setting up notification listeners:", error);
    }
  }
}

export const eventBus = {

  emit(eventName: string, data?: any) {
    DeviceEventEmitter.emit(eventName, data);
  },

  addListener(eventName: string, callback: (data?: any) => void) {
    return DeviceEventEmitter.addListener(eventName, callback);
  },
  /** @deprecated Use the subscription returned by addListener().remove() instead */
  removeListener(eventName: string) {
    DeviceEventEmitter.removeAllListeners(eventName);
  }
};

export const pushEventBus = eventBus;
