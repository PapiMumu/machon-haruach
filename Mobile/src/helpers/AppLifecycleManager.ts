import { AppState, AppStateStatus, NativeEventSubscription } from "react-native";
import { ApiHelper } from "@machonharuach/helpers";
import { router } from "expo-router";
import { SecureStorageHelper } from "./SecureStorageHelper";
import { UserHelper } from "./UserHelper";
import { useUserStore } from "../stores/useUserStore";
import { getAccessBlockCode } from "./AccessStatusHelper";


export class AppLifecycleManager {
  private static appStateSubscription: NativeEventSubscription | null = null;
  private static currentAppState: AppStateStatus = AppState.currentState;
  private static isInitialized = false;

  static initialize() {
    if (this.isInitialized) {
      console.log("AppLifecycleManager already initialized");
      return;
    }

    console.log("Initializing AppLifecycleManager");
    this.isInitialized = true;

    this.appStateSubscription = AppState.addEventListener("change", this.handleAppStateChange);
  }

  static cleanup() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    this.isInitialized = false;
    console.log("AppLifecycleManager cleaned up");
  }

  private static handleAppStateChange = async (nextAppState: AppStateStatus) => {
    const previousState = this.currentAppState;
    this.currentAppState = nextAppState;
    const isComingToForeground = (previousState === "background" || previousState === "inactive") && nextAppState === "active";
    if (isComingToForeground) {
      console.log("App resumed from background, restoring session...");
      await this.restoreSessionOnResume();
    }
  };

  private static async restoreSessionOnResume() {
    try {
      const userStore = useUserStore.getState();
      const user = userStore.user;

      if (!user) {
        console.log("No user logged in, skipping session restore");
        return;
      }

      const jwt = await SecureStorageHelper.getSecureItem("default_jwt");
      if (!jwt) {
        console.log("No JWT found in secure storage, clearing stale session");
        await userStore.logout();
        return;
      }

      if (UserHelper.isTokenValid(jwt)) {
        console.log("JWT token is valid, re-authenticating for fresh API tokens");
        try {
          const data = await ApiHelper.postAnonymous("/users/login", { jwt }, "MembershipApi");
          const accessBlock = getAccessBlockCode(data);
          if (accessBlock) {
            console.log("Session blocked due to billing status:", accessBlock);
            await userStore.logout();
            await SecureStorageHelper.removeSecureItem("default_jwt");
            router.replace({ pathname: "/auth/login", params: { reason: "SUBSCRIPTION_INACTIVE" } });
            return;
          }
          if (data.user) {
            const result = await userStore.handleLogin(data);
            if (result === "full") {
              console.log("Session restored with fresh API tokens");
            } else if (result === "needs_branch") {
              console.log("Session restored; user should pick branch/campus when they open the app.");
            } else {
              console.warn("Session restore: login could not attach a session");
            }
          } else {
            console.log("Re-authentication returned no user, restoring from cache");
            ApiHelper.setDefaultPermissions(jwt);
          }
        } catch (error) {
          if (getAccessBlockCode(error)) {
            await userStore.logout();
            await SecureStorageHelper.removeSecureItem("default_jwt");
            router.replace({ pathname: "/auth/login", params: { reason: "SUBSCRIPTION_INACTIVE" } });
            return;
          }
          console.error("Re-authentication failed, restoring from cache:", error);
          // Fallback: set default permissions so app is at least partially functional
          ApiHelper.setDefaultPermissions(jwt);
        }
      } else {
        console.log("JWT token is expired, attempting refresh...");
        const refreshed = await UserHelper.refreshToken();

        if (refreshed) {
          console.log("Token refreshed successfully");
          const newJwt = await SecureStorageHelper.getSecureItem("default_jwt");
          if (newJwt) {
            try {
              const data = await ApiHelper.postAnonymous("/users/login", { jwt: newJwt }, "MembershipApi");
              const accessBlock = getAccessBlockCode(data);
              if (accessBlock) {
                console.log("Refreshed session blocked due to billing status:", accessBlock);
                await userStore.logout();
                await SecureStorageHelper.removeSecureItem("default_jwt");
                router.replace({ pathname: "/auth/login", params: { reason: "SUBSCRIPTION_INACTIVE" } });
                return;
              }
              if (data.user) {
                const result = await userStore.handleLogin(data);
                if (result === "full") {
                  console.log("Successfully re-authenticated with refreshed token");
                } else if (result === "needs_branch") {
                  console.log("Re-auth after refresh: pick branch/campus when convenient.");
                } else {
                  console.warn("Re-auth after refresh: session not attached");
                }
              }
            } catch (error) {
              if (getAccessBlockCode(error)) {
                await userStore.logout();
                await SecureStorageHelper.removeSecureItem("default_jwt");
                router.replace({ pathname: "/auth/login", params: { reason: "SUBSCRIPTION_INACTIVE" } });
                return;
              }
              console.error("Re-authentication failed after token refresh:", error);
            }
          }
        } else {
          console.log("Token refresh failed, user will need to re-login");
        }
      }
    } catch (error) {
      console.error("Error restoring session on resume:", error);
    }
  }
}
