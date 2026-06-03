import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserInterface, ChurchInterface, LoginUserChurchInterface, LoginResponseInterface } from "../helpers/Interfaces";
import { ApiHelper } from "@machonharuach/helpers";
import { SecureStorageHelper } from "../helpers/SecureStorageHelper";
import { Platform } from "react-native";
import { logAnalyticsEvent } from "../config/firebase";
import { useChurchStore } from "./useChurchStore";
import { useEngagementStore } from "./useEngagementStore";

/** Copy billing fields from the login response root onto `user` so they persist with `partialize` (only `user` is stored). */
function userWithSubscriptionFromLogin(data: LoginResponseInterface): UserInterface | null {
  if (!data.user) return null;
  return {
    ...data.user,
    accessStatus: data.accessStatus ?? data.user.accessStatus,
    subscriptionStatus: data.subscriptionStatus ?? data.user.subscriptionStatus,
    trialEndsAt: data.trialEndsAt ?? data.user.trialEndsAt,
    subscriptionEndsAt: data.subscriptionEndsAt ?? data.user.subscriptionEndsAt
  };
}

/** `full` = normal login with church(es). `needs_branch` = authenticated user JWT only; send user to branch/campus picker. `failed` = cannot establish session. */
export type HandleLoginResult = "full" | "needs_branch" | "failed";

interface AuthState {
  user: UserInterface | null;
  churches: ChurchInterface[];
  userChurches: LoginUserChurchInterface[];

  setUser: (user: UserInterface | null) => void;
  handleLogin: (data: LoginResponseInterface) => Promise<HandleLoginResult>;
  logout: () => Promise<void>;
  checkAccess: (params: { api: string; contentType: string; action: string }) => boolean;
  isInitialized: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      churches: [],
      userChurches: [],

      setUser: user => set({ user }),

      handleLogin: async (data: LoginResponseInterface) => {
        const churchStore = useChurchStore.getState();
        const accessBlocked = data?.accessStatus === "inactive" || (Array.isArray(data?.errors) && (data.errors.includes("TRIAL_EXPIRED") || data.errors.includes("SUBSCRIPTION_INACTIVE")));
        if (accessBlocked) {
          ApiHelper.setDefaultPermissions("");
          ApiHelper.setPermissions("MessagingApi", "", []);
          await SecureStorageHelper.removeSecureItem("default_jwt");
          set({ user: null, churches: [], userChurches: [] });
          const prevChurch = churchStore.currentUserChurch?.church;
          if (prevChurch) await churchStore.setAnonymousChurch(prevChurch);
          else churchStore.clearChurchState();
          return "failed";
        }

        if (!data.userChurches || data.userChurches.length === 0) {
          const userJwt = data.user?.jwt;
          if (userJwt) {
            if (__DEV__) {
              console.log("[auth] Authenticated without church rows — pick branch/campus next.");
            }
            ApiHelper.setDefaultPermissions(userJwt);
            ApiHelper.setPermissions("MessagingApi", "", []);
            await SecureStorageHelper.setSecureItem("default_jwt", userJwt);
            set({ user: userWithSubscriptionFromLogin(data) ?? data.user, userChurches: [], churches: [] });
            churchStore.clearChurchState();
            return "needs_branch";
          }
          if (__DEV__) {
            console.log("[auth] Login returned no user churches and no user JWT.");
          }
          ApiHelper.setDefaultPermissions("");
          ApiHelper.setPermissions("MessagingApi", "", []);
          await SecureStorageHelper.removeSecureItem("default_jwt");
          set({ user: null, churches: [], userChurches: [] });
          const prevChurch = churchStore.currentUserChurch?.church;
          if (prevChurch) {
            await churchStore.setAnonymousChurch(prevChurch);
          } else {
            churchStore.clearChurchState();
          }
          return "failed";
        }

        let currentChurch: LoginUserChurchInterface = data.userChurches[0];
        if (churchStore.currentUserChurch?.church?.id) {
          currentChurch = data.userChurches.find(uc => uc.church.id === churchStore.currentUserChurch?.church.id) ?? data.userChurches[0];
        }

        const churches = data.userChurches.map(uc => uc.church);

        set({ user: userWithSubscriptionFromLogin(data) ?? data.user, userChurches: data.userChurches, churches });

        ApiHelper.setDefaultPermissions(currentChurch?.jwt || "");
        currentChurch?.apis?.forEach(api => ApiHelper.setPermissions(api.keyName || "", api.jwt, api.permissions));
        ApiHelper.setPermissions("MessagingApi", currentChurch?.jwt || "", []);

        if (currentChurch) {
          await churchStore.setCurrentUserChurch(currentChurch);
        }

        await logAnalyticsEvent("login", {
          id: Date.now(),
          device: Platform.OS,
          church: currentChurch.church.name
        });

        await storeSecureTokens(currentChurch, data.user?.jwt);

        await churchStore.loadPersonRecord();

        if (currentChurch) {
          useEngagementStore.getState().addRecentChurch(currentChurch.church);
        }

        return "full";
      },

      logout: async () => {
        const churchStore = useChurchStore.getState();
        const currentChurch = churchStore.currentUserChurch?.church;

        ApiHelper.setDefaultPermissions("");
        await SecureStorageHelper.removeSecureItem("default_jwt");

        set({ user: null, churches: [], userChurches: [] });

        if (currentChurch) {
          await churchStore.setAnonymousChurch(currentChurch);
        } else {
          churchStore.clearChurchState();
        }
      },

      checkAccess: ({ api, contentType, action }) => {
        const permissions = ApiHelper.getConfig(api)?.permissions;
        if (!permissions) return false;
        return permissions.some((p: any) => p.contentType === contentType && p.action === action);
      },

      isInitialized: () => {
        const state = get();
        const churchStore = useChurchStore.getState();
        return !!(state.user && churchStore.currentUserChurch);
      }
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: state => ({ user: state.user })
    }
  )
);

async function storeSecureTokens(userChurch: LoginUserChurchInterface, userJwt?: string): Promise<void> {
  try {
    if (userJwt) {
      await SecureStorageHelper.setSecureItem("default_jwt", userJwt);
    }

    if (userChurch?.apis && userChurch.apis.length > 0) {
      userChurch.apis.forEach(api => {
        if (api.keyName && api.jwt) {
          ApiHelper.setPermissions(api.keyName, api.jwt, api.permissions || []);
        }
      });

      if (userChurch.jwt) {
        ApiHelper.setPermissions("MessagingApi", userChurch.jwt, []);
      }
    }
  } catch (error) {
    console.error("Failed to store secure tokens:", error);
  }
}
