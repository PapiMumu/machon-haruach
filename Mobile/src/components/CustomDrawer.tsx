import { EnvironmentHelper, SecureStorageHelper } from "../../src/helpers";
import { NavigationUtils } from "../../src/helpers/NavigationUtils";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useGlobalSearchParams, usePathname } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { clearAllCachedData } from "../../src/helpers/QueryClient";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { Button, Divider, List, Surface, Text } from "react-native-paper";
import { useUser, useCurrentChurch } from "../../src/stores/useUserStore";
import { useChurchStore } from "../../src/stores/useChurchStore";
import { useAuthStore } from "../../src/stores/useAuthStore";
import { useEngagementStore } from "../../src/stores/useEngagementStore";
import { DrawerActions } from "@react-navigation/native";
import { useNavigation } from "@react-navigation/native";
import type { DrawerNavigationProp } from "@react-navigation/drawer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { eventBus } from "@/helpers/PushNotificationHelper";
import { useThemeColors } from "../theme/index";
import { useTranslation } from "react-i18next";
import { HapticsHelper } from "../helpers/HapticsHelper";
import pkg from "../../package.json";
import { DrawerSubscriptionStatus } from "./billing/DrawerSubscriptionStatus";

type ItemType = {
  linkType?: string;
  text?: string;
  url?: string;
};

type ParamsType = {
  url?: string;
};

/** Drawer-only: hide these `linkType`s (Bible, Verse of the Day, Sermons, Live/stream, Give, My Groups, Lessons). */
const DRAWER_HIDDEN_LINK_TYPES = new Set(["bible", "votd", "sermons", "stream", "donation", "give", "groups", "lessons"]);

function collapseDrawerSeparators(items: any[]): any[] {
  const out: any[] = [];
  let lastWasSep = true;
  for (const item of items) {
    if (!item) continue;
    if (item.linkType === "separator") {
      if (lastWasSep) continue;
      out.push(item);
      lastWasSep = true;
    } else {
      out.push(item);
      lastWasSep = false;
    }
  }
  while (out.length && out[0]?.linkType === "separator") out.shift();
  while (out.length && out[out.length - 1]?.linkType === "separator") out.pop();
  return out;
}

function buildDrawerMenuLinks(links: any[], checkInLabel: string): any[] {
  const filtered = links.filter((item: any) => {
    if (!item) return false;
    if (item.linkType === "separator") return true;
    const lt = String(item.linkType || "").toLowerCase();
    return !DRAWER_HIDDEN_LINK_TYPES.has(lt);
  });
  let result = collapseDrawerSeparators(filtered);
  const hasCheckin = result.some((l: any) => String(l?.linkType || "").toLowerCase() === "checkin");
  if (!hasCheckin) {
    result = [
      ...result,
      {
        id: "__b1mobile_drawer_checkin__",
        linkType: "checkin",
        text: checkInLabel,
        icon: "how_to_reg"
      }
    ];
  }
  return result.map((item: any) =>
    String(item?.linkType || "").toLowerCase() === "checkin" ? { ...item, text: checkInLabel } : item);
}

export function CustomDrawer(props?: any & { themeMode?: string }) {
  const { t } = useTranslation();
  // Use the drawer navigation prop if available, otherwise fallback to useNavigation
  const navigation = props?.navigation || useNavigation<DrawerNavigationProp<any>>();
  // Use hooks instead of local state
  const user = useUser();
  const currentChurch = useCurrentChurch();
  const selectedAttendanceCampusName = useEngagementStore(state => state.selectedAttendanceCampusName);
  const links = useChurchStore(state => state.links);
  const loadChurchLinks = useChurchStore(state => state.loadChurchLinks);
  const pathname = usePathname();
  const params = useGlobalSearchParams();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const tc = useThemeColors();

  const { top } = useSafeAreaInsets();

  const drawerMenuLinks = useMemo(
    () => buildDrawerMenuLinks(links, t("navigation.checkin")),
    [links, t]
  );

  const drawerChurchIndicatorLabel = useMemo(() => {
    const branchName = (selectedAttendanceCampusName || "").trim();
    if (branchName) return branchName;
    return currentChurch?.name || t("churchSearch.selectChurch");
  }, [selectedAttendanceCampusName, currentChurch?.name, t]);

  const exitToGetStarted = useCallback(() => {
    try {
      navigation.dispatch(DrawerActions.closeDrawer());
    } catch {
      /* drawer may already be unmounted */
    }
    /**
     * Do **not** use `navigationRef.resetRoot({ routes: [{ name: "get-started" }] })`.
     * Expo Router’s container root is the internal `__root` slot — `get-started` is not a top-level
     * route there, so an invalid `resetRoot` leaves the app on a **blank black screen**.
     *
     * `router.replace` from a drawer is turned into `JUMP_TO` on the drawer (expo-router `routing.js`),
     * which keeps Home mounted. Prefer **`navigate`** so the action targets the stack that owns
     * `get-started`, then fall back to `dismissTo` / `replace`.
     */
    queueMicrotask(() => {
      try {
        router.navigate("/get-started");
      } catch {
        try {
          router.dismissTo("/get-started");
        } catch {
          router.replace("/get-started");
        }
      }
    });
  }, [navigation]);

  useEffect(() => {
    // Reload links when church changes
    if (currentChurch?.id) {
      loadChurchLinks(currentChurch.id);
    }
  }, [currentChurch?.id]);

  const checkIsActive = (item: ItemType, pathname: string, params?: ParamsType): boolean => {
    const path = (pathname || "").toLowerCase();
    const linkType = (item.linkType || "").toLowerCase();
    const text = (item.text || "").toLowerCase();
    const url = (item.url || "").toLowerCase();
    const paramUrl = (params?.url || "").toLowerCase();

    const normalize = (s: string) => s.replace(/\s+/g, "").toLowerCase();

    if (url && paramUrl && path.includes("websiteurl") && normalize(paramUrl).includes(normalize(url))) {
      return true;
    }

    if (
      (path.includes("memberssearch") && (linkType === "directory" || normalize(text).includes("directory"))) ||
      (path.includes("/plan") && (linkType.startsWith("plan") || normalize(text).includes("plan"))) ||
      (path.includes("/service") && (linkType.startsWith("checkin") || normalize(text).includes("checkin")))
    ) {
      return true;
    }

    if (linkType && !path.includes("websiteurl") && normalize(path).includes(normalize(linkType))) {
      return true;
    }

    if (text && !path.includes("websiteurl") && normalize(path).includes(normalize(text))) {
      return true;
    }

    return false;
  };

  const logoutAction = useCallback(async () => {
    try {
      setIsLoggingOut(true);
      console.log("Starting logout process...");

      // Clear React Query cache and persisted data
      await clearAllCachedData();

      // Clear JWT from secure storage
      try {
        await SecureStorageHelper.removeSecureItem("default_jwt");
        console.log("Cleared JWT from secure storage");
      } catch (error) {
        console.warn("Failed to clear JWT from secure storage:", error);
      }

      // Use the store's logout method
      await useAuthStore.getState().logout();

      // Clear AsyncStorage (except church data to preserve church selection)
      await AsyncStorage.getAllKeys()
        .then(keys => AsyncStorage.multiRemove(keys.filter(key => key !== "CHURCH_DATA")))
        .then(() => {
          console.log("Logout complete, navigating to get started");
          exitToGetStarted();
        });
    } catch (error) {
      console.error("Error during logout:", error);
      exitToGetStarted();
    } finally {
      setIsLoggingOut(false);
    }
  }, [navigation, exitToGetStarted]);

  useEffect(() => {
    const handleLogout = () => {
      void logoutAction();
    };
    const subscription = eventBus.addListener("do_logout", handleLogout);
    return () => {
      subscription.remove();
    };
  }, [logoutAction]);

  const listItem = (topItem: boolean, item: any) => {
    if (item.linkType === "separator") {
      return <Divider style={styles.separator} />;
    }

    const icon = item.icon ? item.icon.split("_").join("-") : "";
    const iconName = icon === "calendar-month" ? "calendar-today" : icon === "local-library-outlined" ? "local-library" : icon;

    const isActive = checkIsActive(item, pathname, params);
    const linkTypeLower = String(item.linkType || "").toLowerCase();
    const drawerIconColor = isActive ? tc.white : linkTypeLower === "checkin" ? tc.text : tc.primary;

    return (
      <List.Item
        accessibilityRole="menuitem"
        accessibilityLabel={item.text}
        title={item.text}
        left={() => (topItem ? <Image source={{ uri: item.photo }} style={styles.tabIcon} /> : <MaterialIcons name={iconName} size={24} color={drawerIconColor} style={styles.drawerIcon} />)}
        onPress={() => {
          HapticsHelper.selection();
          NavigationUtils.navigateToScreen(item, currentChurch);
          // Use setTimeout to ensure navigation completes before closing drawer
          setTimeout(() => {
            try {
              if (navigation && typeof navigation.closeDrawer === "function") {
                navigation.closeDrawer();
              } else {
                navigation.dispatch(DrawerActions.closeDrawer());
              }
            } catch (error) {
              console.warn("Failed to close drawer:", error);
            }
          }, 100);
        }}
        style={[styles.listItem, { backgroundColor: tc.surface, borderBottomColor: tc.border }, isActive && { backgroundColor: tc.primary }]}
        titleStyle={[styles.listItemText, { color: tc.text }, isActive && { color: tc.white, fontWeight: "600" }]}
      />
    );
  };

  const drawerHeaderComponent = () => (
    <Surface style={[styles.headerContainer, { backgroundColor: tc.surface, borderBottomColor: tc.border }]} elevation={2}>
      <View style={styles.headerContent}>
        {getUserInfo()}
        <Button
          mode="contained"
          onPress={() => router.navigate("/(drawer)/churchSearch")}
          style={styles.churchButton}
          buttonColor={tc.isDark ? tc.border : tc.surface}
          textColor={tc.text}
          icon={!currentChurch ? () => <MaterialIcons name="search" size={20} color={tc.text} /> : undefined}
          accessibilityRole="button">
          {!currentChurch ? t("churchSearch.findChurch") : drawerChurchIndicatorLabel}
        </Button>
        {user ? <DrawerSubscriptionStatus /> : null}
      </View>
    </Surface>
  );

  const getUserInfo = () => {
    const currentUserChurch = useChurchStore.getState().currentUserChurch;
    if (!currentUserChurch?.person || !user) return null;


    return (
      <View style={styles.userInfoSection}>
        <View style={styles.userRow}>
          <View style={styles.userTextContainer}>
            <Text variant="titleMedium" numberOfLines={1} style={[styles.userName, { color: tc.text, fontSize: 18 }]}>
              {`${user.firstName} ${user.lastName}`}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const closeDrawerAndNavigate = (navigateAction: () => void) => {
    setTimeout(() => {
      try {
        if (navigation && typeof navigation.closeDrawer === "function") {
          navigation.closeDrawer();
        } else {
          navigation.dispatch(DrawerActions.closeDrawer());
        }
      } catch (error) {
        console.warn("Failed to close drawer:", error);
      }
      navigateAction();
    }, 100);
  };

  const drawerFooterComponent = () => {
    return (
      <Surface style={[styles.footerContainer, { backgroundColor: tc.surface, borderTopColor: tc.border }]} elevation={1}>
        <Button
          mode="contained"
          onPress={user ? logoutAction : () => router.navigate("/auth/login")}
          style={styles.logoutButton}
          buttonColor="#FFFFFF"
          textColor="#0F1118"
          icon={() => <MaterialIcons name={user ? "logout" : "login"} size={24} color="#0F1118" />}
          loading={isLoggingOut}
          disabled={isLoggingOut}
          accessibilityLabel={user ? "Log out" : "Log in"}
          accessibilityRole="button">
          {isLoggingOut ? t("drawer.signingOut") : user ? t("drawer.logout") : t("drawer.login")}
        </Button>
        <Text variant="bodySmall" style={[styles.versionText, { color: tc.disabled }]}>
          Version {pkg.version}
        </Text>
      </Surface>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: top, backgroundColor: tc.surface }]}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {drawerHeaderComponent()}
        {links.length === 0 ? (
          <View style={{ padding: 20 }}>
            <Text>{t("navigation.loadingNavigation")}</Text>
          </View>
        ) : (
          <View style={[styles.menuContainer, { backgroundColor: tc.surface }]}>
            {drawerMenuLinks.map((item, index) => (
              <View key={(item as any).id ?? `${(item as any).linkType ?? "link"}_${index}`}>{listItem(!!(item as any).photo, item)}</View>
            ))}
          </View>
        )}
        {drawerFooterComponent()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { borderBottomWidth: 1 },
  headerContent: { padding: 16 },
  userInfoSection: { marginBottom: 16 },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  userTextContainer: {
    flex: 1,
    minWidth: 0
  },
  userName: {
    fontWeight: "600",
    fontSize: 18,
    lineHeight: 24,
    marginBottom: 4
  },
  churchButton: {
    borderRadius: 8,
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  menuContainer: { marginTop: 8 },
  listItem: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1
  },
  tabIcon: {
    width: 24,
    height: 24,
    marginRight: 8
  },
  scrollContainer: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 16
  },
  footerContainer: {
    padding: 16,
    marginTop: "auto",
    borderTopWidth: 1
  },
  logoutButton: {
    marginBottom: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)"
  },
  versionText: { textAlign: "center" },
  drawerIcon: {
    marginLeft: 0,
    marginRight: 16,
    alignSelf: "center"
  },
  listItemText: {
    fontSize: 16,
    fontWeight: "500"
  },
  separator: {
    marginVertical: 8,
    height: 1
  },
  activeMenuItem: {},
  activeMenuText: { fontWeight: "600" }
});
