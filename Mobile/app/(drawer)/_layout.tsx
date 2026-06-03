import React from "react";
import { Drawer } from "expo-router/drawer";
import { DrawerActions, getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { TouchableOpacity, View } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { IconButton } from "react-native-paper";
import { useRouter } from "expo-router";

import { CustomDrawer } from "../../src/components/CustomDrawer";
import { ErrorBoundary } from "../../src/components/ErrorBoundary";
import { HeaderProfileAvatar } from "@/components/navigation/HeaderProfileAvatar";
import { useCurrentUserChurch, useUser } from "@/stores/useUserStore";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "@/theme";
import { useThemeContext } from "../../src/theme/ThemeProvider";

export const unstable_settings = { initialRouteName: "(tabs)" };

/** Focused tab screen name (dashboard, sermons, …), not a nested stack leaf — used for header back visibility. */
function getFocusedTabRouteName(tabsRoute: any): string {
  const state = tabsRoute?.state;
  if (!state?.routes || typeof state.index !== "number") return "dashboard";
  const focused = state.routes[state.index];
  return typeof focused?.name === "string" ? focused.name : "dashboard";
}

export default function DrawerLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const currentChurch = useCurrentUserChurch();
  const user = useUser();
  const tc = useThemeColors();
  const { theme: themeMode } = useThemeContext();

  const tabScreenTitle = (tabName: string | undefined) => {
    switch (tabName) {
      case "dashboard":
        return "";
      case "sermons":
        return "";
      case "myGroups":
        return "";
      case "volunteerBrowse":
        return t("volunteer.browseOpportunities");
      case "donation":
        return "";
      case "groupLeaderContact":
        /** Real title is set from the screen (`(tabs)/groupLeaderContact`) when the group loads. */
        return "";
      case "goodNewsDaily":
        return "";
      default:
        return currentChurch?.church?.name || t("navigation.home");
    }
  };

  const renderHeaderProfileAvatar = () => <HeaderProfileAvatar />;

  // Common header options
  const commonHeaderOptions = {
    headerShown: true,
    headerTransparent: false,
    headerShadowVisible: false,
    // Opaque dark header to match default dark-mode pages
    headerStyle: { backgroundColor: "#000000" },
    headerTintColor: tc.white,
    headerTitleAlign: "center" as const,
    drawerStyle: { width: 280, backgroundColor: tc.surface },
    drawerType: "slide" as const,
    overlayColor: "rgba(0, 0, 0, 0.5)",
    sceneStyle: { backgroundColor: tc.background }
  };

  // Header left renderer
  const renderHeaderLeft = (navigation: any, currentRouteName: string) => {
    const isMainTab = ["dashboard", "sermons", "myGroups", "donation"].includes(currentRouteName);
    const isGoodNewsRoute = currentRouteName === "goodNewsDaily";
    const isMyGivingRoute = ["myGiving", "givingOverview", "givingManage", "givingHistory"].includes(currentRouteName);
    const isMyGivingRoot = currentRouteName === "myGiving";
    const isFundStyleBackRoute = ["givingHistory", "givingOverview"].includes(currentRouteName);
    const isProfileEditRoute = currentRouteName === "profileEdit";
    const isMembershipSubscribeRoute = currentRouteName === "membershipSubscribe";
    const onChevronPress = () => {
      if (isGoodNewsRoute) {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/(drawer)/(tabs)/dashboard");
        }
        return;
      }
      if (isMyGivingRoute) {
        if (currentRouteName === "myGiving") {
          router.replace("/(drawer)/(tabs)/donation");
        } else {
          router.replace("/(drawer)/myGiving");
        }
        return;
      }
      if (currentRouteName === "addPaymentMethod") {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/(drawer)/(tabs)/donation");
        }
        return;
      }
      if (currentRouteName === "membershipSubscribe") {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/(drawer)/(tabs)/dashboard");
        }
        return;
      }
      router.replace("/(drawer)/(tabs)/dashboard");
    };

    return (
      <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: !isMainTab ? 10 : 0 }}>
        {!isMainTab &&
          (isFundStyleBackRoute ? (
            <TouchableOpacity
              onPress={onChevronPress}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: "rgba(255,255,255,0.12)",
                alignItems: "center",
                justifyContent: "center"
              }}>
              <MaterialIcons name="keyboard-arrow-down" size={24} color={tc.white} />
            </TouchableOpacity>
          ) : isMyGivingRoute ? (
            <MaterialIcons name="chevron-left" size={27} color={tc.white} onPress={onChevronPress} />
          ) : (
            <MaterialIcons name="chevron-left" size={27} color={tc.white} onPress={onChevronPress} />
          ))}
        {!isMyGivingRoot && !isFundStyleBackRoute && !isGoodNewsRoute && !isProfileEditRoute && !isMembershipSubscribeRoute && (
          <IconButton icon="menu" size={27} iconColor={tc.white} onPress={() => navigation.dispatch(DrawerActions.openDrawer())} />
        )}
      </View>
    );
  };

  return (
    <ErrorBoundary>
      <Drawer
        screenOptions={({ navigation, route }) => {
          const currentRouteName = route.name === "(tabs)" ? getFocusedTabRouteName(route) : route.name;
          const isGroupsTab = currentRouteName === "myGroups";
          const isGoodNewsDailyScreen = currentRouteName === "goodNewsDaily";
          const isMyGivingScreen = currentRouteName === "myGiving";
          const isGivingHistoryScreen = currentRouteName === "givingHistory";
          const isGivingOverviewScreen = currentRouteName === "givingOverview";
          const isProfileEditScreen = currentRouteName === "profileEdit";
          const isMembershipSubscribeScreen = currentRouteName === "membershipSubscribe";

          return {
            ...commonHeaderOptions,
            headerLeft: () => (isGroupsTab ? null : renderHeaderLeft(navigation, currentRouteName)),
            headerRight: () =>
              isGroupsTab ||
              isGoodNewsDailyScreen ||
              isMyGivingScreen ||
              isGivingHistoryScreen ||
              isGivingOverviewScreen ||
              isProfileEditScreen ||
              isMembershipSubscribeScreen ? null : (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {renderHeaderProfileAvatar()}
                </View>
              )
          };
        }}
        drawerContent={props => <CustomDrawer {...props} themeMode={themeMode} />}>
        <Drawer.Screen
          name="(tabs)"
          options={({ route }) => {
            const focusedTab = getFocusedRouteNameFromRoute(route) ?? "dashboard";
            const isGoodNewsDailyTab = focusedTab === "goodNewsDaily";
            const isDashboardTab = focusedTab === "dashboard";
            const tabHeaderOverrides: any = {};
            if (isGoodNewsDailyTab) {
              tabHeaderOverrides.headerRight = () => null;
            } else if (isDashboardTab) {
              // Ensure dashboard/home always shows profile avatar in the header.
              tabHeaderOverrides.headerRight = () => renderHeaderProfileAvatar();
            }
            return {
              title: tabScreenTitle(focusedTab),
              drawerItemStyle: { display: "none" },
              /** Groups tab is full-bleed; nested tab changes must override `screenOptions` headerShown. */
              headerShown: focusedTab !== "myGroups",
              headerLeft: isGoodNewsDailyTab
                ? () => (
                  <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 10 }}>
                    <MaterialIcons
                      name="chevron-left"
                      size={27}
                      color={tc.white}
                      onPress={() => {
                        if (router.canGoBack()) {
                          router.back();
                        } else {
                          router.replace("/(drawer)/(tabs)/dashboard");
                        }
                      }}
                    />
                  </View>
                )
                : undefined,
              ...tabHeaderOverrides
            };
          }}
        />
        <Drawer.Screen
          name="notifications"
          options={{
            title: t("navigation.notifications"),
            headerRight: () => (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {user && (
                  renderHeaderProfileAvatar()
                )}
              </View>
            )
          }}
        />
        <Drawer.Screen
          name="goodNewsDaily"
          options={{
            title: "",
            drawerItemStyle: { display: "none" },
            headerRight: () => null,
            headerLeft: () => (
              <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 10 }}>
                <MaterialIcons
                  name="chevron-left"
                  size={27}
                  color={tc.white}
                  onPress={() => {
                    if (router.canGoBack()) {
                      router.back();
                    } else {
                      router.replace("/(drawer)/(tabs)/dashboard");
                    }
                  }}
                />
              </View>
            )
          }}
        />
        <Drawer.Screen
          name="prayerRequests"
          options={{
            title: "",
            drawerItemStyle: { display: "none" },
            headerRight: () => null,
            headerLeft: () => (
              <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 10 }}>
                <MaterialIcons
                  name="chevron-left"
                  size={27}
                  color={tc.white}
                  onPress={() => {
                    if (router.canGoBack()) {
                      router.back();
                    } else {
                      router.replace("/(drawer)/(tabs)/dashboard");
                    }
                  }}
                />
              </View>
            )
          }}
        />
        <Drawer.Screen name="votd" options={{ title: t("navigation.verseOfTheDay") }} />
        <Drawer.Screen name="service" options={{ title: t("checkin.checkin") }} />
        <Drawer.Screen name="membersSearch" options={{ title: t("navigation.directory") }} />
        <Drawer.Screen name="plan" options={{ title: t("plans.plans") }} />
        <Drawer.Screen name="searchMessageUser" options={{ title: t("navigation.searchMessages") }} />
        <Drawer.Screen name="registrations" options={{ title: "Registrations" }} />
        <Drawer.Screen
          name="addPaymentMethod"
          options={({ navigation }) => ({
            title: "Payment Method",
            drawerItemStyle: { display: "none" },
            headerShown: true,
            headerTitleStyle: { fontSize: 16, fontWeight: "700" },
            headerRight: () => null,
            headerLeft: () => (
              <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 10 }}>
                <MaterialIcons
                  name="chevron-left"
                  size={27}
                  color={tc.white}
                  onPress={() => {
                    if (router.canGoBack()) {
                      router.back();
                    } else {
                      router.replace("/(drawer)/(tabs)/donation");
                    }
                  }}
                />
              </View>
            )
          })}
        />
        <Drawer.Screen
          name="profileEdit"
          options={{
            title: t("profileEdit.profile"),
            drawerItemStyle: { display: "none" }
          }}
        />
        <Drawer.Screen
          name="groupCategory"
          options={{
            title: "Group Category",
            drawerItemStyle: { display: "none" }
          }}
        />
        <Drawer.Screen
          name="groupCategories"
          options={{
            title: "Group Categories",
            drawerItemStyle: { display: "none" }
          }}
        />
        <Drawer.Screen
          name="groupJoin"
          options={{
            headerShown: false,
            drawerItemStyle: { display: "none" }
          }}
        />
        <Drawer.Screen
          name="browseGroups"
          options={{
            title: "Cell Groups",
            drawerItemStyle: { display: "none" },
            headerLeft: () => null,
            headerRight: () => null
          }}
        />
        <Drawer.Screen
          name="churchSearch"
          options={({ navigation }) => ({
            headerShown: false,
            title: "",
            headerRight: () => null,
            headerLeft: () => (currentChurch ? renderHeaderLeft(navigation, "churchSearch") : null)
          })}
        />
        <Drawer.Screen
          name="myGiving"
          options={{
            title: t("donations.myGiving"),
            headerTitleStyle: { fontSize: 18, lineHeight: 24, fontWeight: "700" },
            drawerItemStyle: { display: "none" }
          }}
        />
        <Drawer.Screen
          name="givingOverview"
          options={{
            title: t("donations.yourGivingImpact", "Your Giving Impact"),
            headerTitleStyle: { fontSize: 18, lineHeight: 24, fontWeight: "700" },
            drawerItemStyle: { display: "none" }
          }}
        />
        <Drawer.Screen
          name="givingManage"
          options={{
            title: t("donations.manage"),
            headerTitleStyle: { fontSize: 18, lineHeight: 24, fontWeight: "700" },
            drawerItemStyle: { display: "none" }
          }}
        />
        <Drawer.Screen
          name="givingHistory"
          options={{
            title: t("donations.givingHistory", "Giving History"),
            headerTitleStyle: { fontSize: 18, lineHeight: 24, fontWeight: "700" },
            drawerItemStyle: { display: "none" }
          }}
        />
        <Drawer.Screen
          name="membershipSubscribe"
          options={{
            title: t("subscription.membershipPageTitle"),
            headerTitleStyle: { fontSize: 18, lineHeight: 24, fontWeight: "700" },
            drawerItemStyle: { display: "none" }
          }}
        />
      </Drawer>
    </ErrorBoundary>
  );
}
