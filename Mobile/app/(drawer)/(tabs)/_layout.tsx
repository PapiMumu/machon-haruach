import React, { useEffect } from "react";
import { Image, Platform, Text, View } from "react-native";
import { Tabs, router } from "expo-router";
import { BottomTabBar } from "@react-navigation/bottom-tabs";
import { useUser, useCurrentChurch } from "@/stores/useUserStore";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Inactive tab icons; active uses `primary` (spirit blue / church brand). */
const TAB_ICON_INACTIVE = "rgba(255,255,255,0.52)";

const homeIcon = require("../../../assets/tab-bar/home.png");
const mediaIcon = require("../../../assets/tab-bar/play.png");
const groupsIcon = require("../../../assets/tab-bar/users.png");
const givingIcon = require("../../../assets/tab-bar/givingicon.png");

/**
 * PNGs are from different exports: Home / Media / Groups are simple shapes with heavy strokes;
 * Giving is denser (two hands + coin) so it reads thinner at the same pixel size. Optional
 * `visualScale` shrinks busier glyphs to match optical weight.
 */
function TabPngIcon({
  source,
  focused,
  visualScale = 1,
  activeTint
}: {
  source: number;
  focused: boolean;
  visualScale?: number;
  activeTint: string;
}) {
  const base = 26;
  const size = base * visualScale;
  const iconScale = focused ? 1.07 : 1;

  return (
    <View
      style={{
        width: 30,
        height: 30,
        alignItems: "center",
        justifyContent: "center"
      }}>
      <Image
        source={source}
        style={{
          width: size,
          height: size,
          tintColor: focused ? activeTint : TAB_ICON_INACTIVE,
          transform: [{ scale: iconScale }]
        }}
        resizeMode="contain"
      />
    </View>
  );
}

function TabBarLabel({
  label,
  focused,
  color
}: {
  label: string;
  focused: boolean;
  color: string;
}) {
  return (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.85}
      style={{
        color,
        fontSize: 11,
        fontWeight: focused ? "700" : "400",
        marginTop: 2
      }}>
      {label}
    </Text>
  );
}

export default function TabLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  /**
   * Some Android devices report 0 bottom inset even when the system navigation bar
   * overlays app content. Keep a minimum Android-safe pad so tab icons never sit
   * under gesture/3-button navigation.
   */
  const androidNavGuard = Platform.OS === "android" ? 28 : 0;
  const bottomPad = Math.max(insets.bottom, Platform.OS === "ios" ? 10 : androidNavGuard);
  // Match dashboard/home neutral tab treatment: white active, gray inactive.
  const activeTint = "#FFFFFF";
  const user = useUser();
  const currentChurch = useCurrentChurch();

  useEffect(() => {
    if (user && !currentChurch) {
      router.replace("/(drawer)/churchSearch");
    }
  }, [user, currentChurch]);

  return (
    <Tabs
      tabBar={(props) => {
        const activeRoute = props.state.routes[props.state.index]?.name;
        if (activeRoute !== "groupLeaderContact") return <BottomTabBar {...props} />;
        const groupsIndex = props.state.routes.findIndex(route => route.name === "myGroups");
        if (groupsIndex < 0) return <BottomTabBar {...props} />;
        return <BottomTabBar {...props} state={{ ...props.state, index: groupsIndex } as typeof props.state} />;
      }}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          // Match Home's "Healing Institute" card background
          // The card is translucent over black; using the *resulting* solid color here
          // avoids the tab bar looking like a washed-out white block.
          backgroundColor: "#2A2C30",
          borderTopWidth: 1,
          borderTopColor: "rgba(255,255,255,0.12)",
          height: 58 + bottomPad,
          paddingBottom: bottomPad,
          paddingTop: 6
        },
        tabBarActiveTintColor: activeTint,
        tabBarInactiveTintColor: "rgba(255,255,255,0.55)",
        tabBarIconStyle: { marginBottom: -2 },
        tabBarItemStyle: { paddingVertical: 2 }
      }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t("navigation.home"),
          tabBarLabel: ({ focused, color }) => <TabBarLabel label={t("navigation.home")} focused={focused} color={color} />,
          tabBarIcon: ({ focused }) => <TabPngIcon source={homeIcon} focused={focused} activeTint={activeTint} />
        }}
      />
      <Tabs.Screen
        name="sermons"
        options={{
          title: t("navigation.media"),
          tabBarLabel: ({ focused, color }) => <TabBarLabel label={t("navigation.media")} focused={focused} color={color} />,
          tabBarIcon: ({ focused }) => <TabPngIcon source={mediaIcon} focused={focused} activeTint={activeTint} />
        }}
      />
      <Tabs.Screen
        name="myGroups"
        options={{
          title: t("navigation.groupsTab"),
          tabBarLabel: ({ focused, color }) => <TabBarLabel label={t("navigation.groupsTab")} focused={focused} color={color} />,
          tabBarIcon: ({ focused }) => <TabPngIcon source={groupsIcon} focused={focused} activeTint={activeTint} />
        }}
      />
      <Tabs.Screen
        name="donation"
        options={{
          title: t("donations.giving"),
          tabBarLabel: ({ focused, color }) => <TabBarLabel label={t("donations.giving")} focused={focused} color={color} />,
          tabBarIcon: ({ focused }) => <TabPngIcon source={givingIcon} focused={focused} visualScale={0.9} activeTint={activeTint} />
        }}
      />
      {/* Exists for internal navigation; hidden from bottom tabs */}
      <Tabs.Screen
        name="goodNewsDaily"
        options={{
          href: null,
          tabBarStyle: { display: "none" }
        }}
      />
      <Tabs.Screen name="volunteerBrowse" options={{ href: null }} />
      <Tabs.Screen name="groupLeaderContact" options={{ href: null }} />
    </Tabs>
  );
}
