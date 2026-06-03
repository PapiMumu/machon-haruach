import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useThemeColors } from "../../theme";

export type ProfileTabSection = "profile" | "account";

interface ProfileTabBarProps {
  activeSection: ProfileTabSection;
  onTabChange: (section: ProfileTabSection) => void;
  hasChanges?: boolean;
}

export const ProfileTabBar: React.FC<ProfileTabBarProps> = ({ activeSection, onTabChange, hasChanges }) => {
  const { t } = useTranslation();
  const tc = useThemeColors();

  const tabs: { key: ProfileTabSection; label: string }[] = [
    { key: "profile", label: t("profileEdit.profile") },
    { key: "account", label: t("profileEdit.account") }
  ];
  const activeIndex = Math.max(0, tabs.findIndex(tab => tab.key === activeSection));
  const pillWidthPercent = 100 / tabs.length;

  return (
    <View style={styles.tabContainer}>
      <View style={styles.segmentedTrack}>
        <View
          style={[
            styles.segmentedPill,
            {
              width: `${pillWidthPercent}%`,
              left: `${activeIndex * pillWidthPercent}%`
            }
          ]}
        />
        <View style={styles.segmentedRow}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={styles.tab}
              onPress={() => onTabChange(tab.key)}
              activeOpacity={0.86}
            >
              <View style={styles.tabContent}>
                <Text
                  variant="labelLarge"
                  style={[
                    styles.tabText,
                    { color: activeSection === tab.key ? "#FFFFFF" : "rgba(255,255,255,0.7)" }
                  ]}>
                  {tab.label}
                </Text>
                {tab.key === "profile" && hasChanges && (
                  <View style={[styles.changeIndicator, { backgroundColor: tc.warning }]} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10
  },
  segmentedTrack: {
    borderRadius: 999,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  segmentedPill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)"
  },
  segmentedRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  tab: {
    flex: 1,
    borderRadius: 999
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10
  },
  tabText: { fontWeight: "700", fontSize: 12, letterSpacing: 0.2 },
  changeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4
  }
});
