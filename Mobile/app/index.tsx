import React from "react";
import { ApiHelper, EnvironmentHelper, UserHelper } from "../src/helpers";
import { ErrorHelper } from "../src/helpers/ErrorHelper";
import { PushNotificationHelper } from "../src/helpers/PushNotificationHelper";
import { UpdateHelper } from "../src/helpers/UpdateHelper";
import { SecureStorageHelper } from "../src/helpers/SecureStorageHelper";
import { router } from "expo-router";
import { useEffect } from "react";
import { Platform, View, StatusBar, Dimensions, Image } from "react-native";
import { useUserStore } from "../src/stores/useUserStore";
import { getAccessBlockCode } from "../src/helpers/AccessStatusHelper";

if (Platform.OS === "android") {
  // See https://github.com/expo/expo/issues/6536 for this issue.
  if (typeof (Intl as any).__disableRegExpRestore === "function") {
    (Intl as any).__disableRegExpRestore();
  }
}

EnvironmentHelper.init();

const SplashScreen = () => {
  const [isInitialized, setIsInitialized] = React.useState(false);

  const init = async () => {
    // Prevent multiple initializations
    if (isInitialized) {
      console.log("Splash screen already initialized, skipping...");
      return;
    }

    setIsInitialized(true);

    const INIT_TIMEOUT_MS = 12_000;
    const startup = Promise.all([
      UserHelper.loadSecureTokens(),
      UpdateHelper.initializeUpdates(),
      PushNotificationHelper.requestUserPermission()
    ]);

    try {
      await Promise.race([
        startup,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Splash init exceeded ${INIT_TIMEOUT_MS}ms`)), INIT_TIMEOUT_MS))
      ]);

      // Set up notification listeners (these don't need to be awaited)
      PushNotificationHelper.NotificationListener();
      PushNotificationHelper.NotificationPermissionAndroid();

      // Only authentication check needs to be sequential after token loading
      checkUser();
    } catch (error) {
      console.error("Initialization error:", error);
      // Continue with app initialization even if some steps fail
      checkUser();
    }
  };

  useEffect(() => {
    ErrorHelper.init();
    ApiHelper.onError = () => { };
    UserHelper.addOpenScreenEvent("Splash Screen");
  }, []);

  useEffect(() => {
    init();
  }, []);

  const setUserDataNew = async (): Promise<false | "needs_branch" | "blocked" | true> => {
    try {
      // Get JWT from secure storage instead of user object
      const jwt = await SecureStorageHelper.getSecureItem("default_jwt");
      if (!jwt) {
        console.log("No JWT token found in secure storage");
        return false;
      }

      // Check if token is expired before making API call
      if (!UserHelper.isTokenValid(jwt)) {
        console.log("Stored JWT token is expired, attempting refresh...");
        const refreshed = await UserHelper.refreshToken();
        if (!refreshed) {
          console.log("Token refresh failed, user needs to re-login");
          await clearAuthData();
          return false;
        }
        // Get the refreshed token
        const newJwt = await SecureStorageHelper.getSecureItem("default_jwt");
        if (!newJwt) return false;
      }

      // Attempt to re-authenticate with JWT
      const data = await ApiHelper.postAnonymous("/users/login", { jwt: await SecureStorageHelper.getSecureItem("default_jwt") }, "MembershipApi");
      const accessBlock = getAccessBlockCode(data);
      if (accessBlock) {
        console.log("Account access blocked due to billing status:", accessBlock);
        await clearAuthData();
        return "blocked";
      }

      if (data.user != null) {
        const result = await useUserStore.getState().handleLogin(data);
        if (result === "failed") {
          console.log("Re-authentication could not attach session; clearing credentials");
          await clearAuthData();
          return false;
        }
        if (result === "needs_branch") {
          return "needs_branch";
        }
        console.log("Successfully re-authenticated user");
        return true;
      } else {
        console.log("Re-authentication failed: no user data returned");
        await clearAuthData();
        return false;
      }
    } catch (error: any) {
      console.error("Re-authentication failed:", error);
      if (getAccessBlockCode(error)) {
        await clearAuthData();
        return "blocked";
      }

      // Handle specific error cases
      if (error.status === 401 || error.status === 403 || error.status === 402) {
        console.log("Authentication failed (401/403), clearing stored credentials");
        await clearAuthData();
      }

      return false;
    }
  };

  const clearAuthData = async () => {
    try {
      await SecureStorageHelper.removeSecureItem("default_jwt");
      await useUserStore.getState().logout();
      console.log("Cleared authentication data");
    } catch (error) {
      console.error("Error clearing auth data:", error);
    }
  };

  const checkUser = async () => {
    let restore: false | "needs_branch" | "blocked" | true = false;

    try {
      // Try to re-authenticate using stored JWT
      restore = await setUserDataNew();
    } catch (e: any) {
      console.error("App initialization error:", e);
      ErrorHelper.logError("splash-screen-error", e);
    }

    // Initialize app from persisted data (loads appearance and links)
    await useUserStore.getState().initializeFromPersistence();

    const currentChurch = useUserStore.getState().currentUserChurch?.church;
    const user = useUserStore.getState().user;

    if (restore === "needs_branch" && user) {
      router.replace("/(drawer)/churchSearch");
      return;
    }
    if (restore === "blocked") {
      router.replace({ pathname: "/auth/login", params: { reason: "SUBSCRIPTION_INACTIVE" } });
      return;
    }

    const authenticationSuccessful = restore === true;

    // Determine navigation based on authentication status
    if (!user || !authenticationSuccessful) {
      // Signed-out or failed restore: land on Welcome first, then account choice via Get Started.
      router.replace("/welcome");
      return;
    } else {
      // User is successfully authenticated
      if (!currentChurch) {
        router.navigate("/welcome");
      } else {
        router.replace("/(drawer)/(tabs)/dashboard");
      }
    }
  };

  const screenData = Dimensions.get("screen");
  const maxDimension = Math.min(screenData.width, screenData.height) * 0.9;

  return (
    <>
      <StatusBar hidden={false} translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={{ flex: 1, backgroundColor: "black", justifyContent: "center", alignItems: "center" }}>
        <Image
          source={require("../assets/images/machon-haruach-icon.png")}
          style={{
            width: maxDimension * 0.62,
            height: maxDimension * 0.62
          }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      </View>
    </>
  );
};

export default SplashScreen;
