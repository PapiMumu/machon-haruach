import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { givingCaption } from "../givingTypography";

type TabSection = "overview" | "donate" | "manage" | "history";

interface DonationTabBarProps {
  activeSection: TabSection;
  onTabChange: (section: TabSection) => void;
}

export const DonationTabBar: React.FC<DonationTabBarProps> = ({ activeSection, onTabChange }) => {
  const { t } = useTranslation();

  const tabs: { key: TabSection; label: string }[] = [
    { key: "overview", label: t("donations.overview") },
    { key: "donate", label: t("donations.donate") },
    { key: "manage", label: t("donations.manage") },
    { key: "history", label: t("donations.history") }
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.tabContainer}>
        {tabs.map(tab => {
          const isActive = activeSection === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive ? styles.tabActive : null]}
              onPress={() => onTabChange(tab.key)}>
              <Text
                variant="labelLarge"
                style={[
                  givingCaption,
                  { color: isActive ? "#FFFFFF" : "rgba(255,255,255,0.72)", fontWeight: "700" }
                ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    marginBottom: 10
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    padding: 4
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 999
  },
  tabActive: { backgroundColor: "rgba(255,255,255,0.16)" }
});
